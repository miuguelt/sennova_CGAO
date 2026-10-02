"""Migración reversible de grupos heredados a semilleros de investigación."""

import json
import uuid
from datetime import date, datetime
from typing import Callable

from sqlalchemy import Column, MetaData, String, Table, Text, delete, inspect, select, text
from sqlalchemy.orm import Session

from app.models import (
    Aprendiz,
    Grupo,
    Proyecto,
    Semillero,
    User,
    grupo_integrantes,
    semillero_investigadores,
)

_archive_metadata = MetaData()
_legacy_archive = Table(
    "research_group_migration_archive",
    _archive_metadata,
    Column("legacy_group_id", String(36), primary_key=True),
    Column("payload", Text, nullable=False),
)

SeedbedResolver = Callable[[Grupo], tuple[str | None, str, str | None]]


def _serialize_value(value):
    """Convierte valores SQLAlchemy a valores JSON portables."""
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if value is None or isinstance(value, (str, int, float, bool, list, dict)):
        return value
    return str(value)


def _database_uuid(db: Session, value):
    """Adapta identificadores al tipo UUID nativo de PostgreSQL."""
    if value is None:
        return None
    if db.get_bind().dialect.name == "postgresql":
        return uuid.UUID(str(value))
    return str(value)


def _dump_snapshot(snapshot: dict) -> str:
    """Serializa un respaldo de migración sin perder fechas ni UUID."""
    return json.dumps(snapshot, ensure_ascii=False, default=_serialize_value)


def _snapshot_legacy_group(db: Session, group: Grupo, target: Semillero) -> dict:
    """Respalda los datos y vínculos que cambiará la normalización."""
    group_fields = (
        "id", "nombre", "nombre_completo", "codigo_gruplac", "clasificacion",
        "gruplac_url", "lineas_investigacion", "director_nombre", "director_email",
        "fecha_reconocimiento", "vigencia_hasta", "descripcion_grupo", "mision",
        "vision", "plan_operativo_path", "mision_path", "convocatoria_activa",
        "owner_id", "is_publico", "estado", "created_at",
    )
    members = db.execute(
        select(
            grupo_integrantes.c.user_id,
            grupo_integrantes.c.rol_en_grupo,
            grupo_integrantes.c.fecha_vinculacion,
        ).where(grupo_integrantes.c.grupo_id == group.id)
    ).all()
    semilleros = db.query(Semillero).filter(Semillero.grupo_id == group.id).all()
    projects = db.query(Proyecto).filter(Proyecto.grupo_id == group.id).all()
    return {
        "group": {field: _serialize_value(getattr(group, field)) for field in group_fields},
        "target_seedbed_id": str(target.id),
        "target_seedbed_created": target.id == group.id,
        "main_group_id": str(target.grupo_id),
        "members": [
            {
                "user_id": str(row.user_id),
                "rol_en_grupo": row.rol_en_grupo,
                "fecha_vinculacion": _serialize_value(row.fecha_vinculacion),
            }
            for row in members
        ],
        "semilleros": [str(row.id) for row in semilleros],
        "projects": [
            {"id": str(row.id), "semillero_id": str(row.semillero_id) if row.semillero_id else None}
            for row in projects
        ],
        "added_main_members": [],
        "added_seedbed_researchers": [],
        "created_apprentices": [],
    }


def _find_seedbed(
    db: Session,
    group: Grupo,
    resolver: SeedbedResolver,
    main_group: Grupo,
) -> tuple[Semillero, bool]:
    """Reutiliza el semillero equivalente o convierte la fila de grupo."""
    sigla, name, description = resolver(group)
    seedbed = db.query(Semillero).filter(Semillero.id == group.id).first()
    if seedbed is None and sigla:
        seedbed = db.query(Semillero).filter(Semillero.sigla.ilike(sigla)).first()
    if seedbed is None:
        seedbed = db.query(Semillero).filter(Semillero.nombre.ilike(name)).first()
    if seedbed is not None:
        return seedbed, False

    seedbed = Semillero(
        id=group.id,
        nombre=name,
        sigla=sigla,
        descripcion=description,
        lider_nombre=group.director_nombre,
        linea_investigacion=(
            ", ".join(group.lineas_investigacion)
            if isinstance(group.lineas_investigacion, list)
            else group.lineas_investigacion
        ),
        estado=group.estado or "activo",
        grupo_id=main_group.id,
        owner_id=group.owner_id,
    )
    db.add(seedbed)
    db.flush()
    return seedbed, True


def _insert_main_member(db: Session, main_group: Grupo, member: dict) -> bool:
    """Copia el vínculo de investigador al grupo institucional si hace falta."""
    exists = db.execute(
        select(grupo_integrantes.c.user_id).where(
            grupo_integrantes.c.grupo_id == main_group.id,
            grupo_integrantes.c.user_id == _database_uuid(db, member["user_id"]),
        )
    ).first()
    if exists:
        return False
    db.execute(grupo_integrantes.insert().values(
        grupo_id=main_group.id,
        user_id=_database_uuid(db, member["user_id"]),
        rol_en_grupo=member["rol_en_grupo"] or "Investigador",
        fecha_vinculacion=_restore_date(member["fecha_vinculacion"]),
    ))
    return True


def _insert_seedbed_researcher(db: Session, seedbed: Semillero, member: dict) -> bool:
    """Vincula investigadores heredados al semillero que corresponde."""
    exists = db.execute(
        select(semillero_investigadores.c.user_id).where(
            semillero_investigadores.c.semillero_id == seedbed.id,
            semillero_investigadores.c.user_id == _database_uuid(db, member["user_id"]),
        )
    ).first()
    if exists:
        return False
    db.execute(semillero_investigadores.insert().values(
        semillero_id=seedbed.id,
        user_id=_database_uuid(db, member["user_id"]),
        rol_en_semillero=member["rol_en_grupo"] or "Investigador",
        fecha_vinculacion=_restore_date(member["fecha_vinculacion"]),
    ))
    return True


def _ensure_apprentice_profile(db: Session, seedbed: Semillero, member: dict) -> str | None:
    """Conserva en el semillero a los aprendices que solo estaban en un grupo."""
    user = db.query(User).filter(
        User.id == _database_uuid(db, member["user_id"])
    ).first()
    if user is None or user.rol != "aprendiz":
        return None
    profile = db.query(Aprendiz).filter(Aprendiz.user_id == user.id).first()
    if profile is not None:
        return None
    profile = Aprendiz(
        user_id=user.id,
        semillero_id=seedbed.id,
        nombre=user.nombre,
        ficha=user.ficha,
        programa=user.programa_formacion,
        estado="activo",
    )
    db.add(profile)
    db.flush()
    return str(profile.id)


def _move_group_links(
    db: Session,
    legacy_group: Grupo,
    main_group: Grupo,
    seedbed: Semillero,
) -> None:
    """Reasigna semilleros y proyectos antes de retirar el grupo legado."""
    for existing in db.query(Semillero).filter(Semillero.grupo_id == legacy_group.id):
        existing.grupo_id = main_group.id
    for project in db.query(Proyecto).filter(Proyecto.grupo_id == legacy_group.id):
        if project.semillero_id is None:
            project.semillero_id = seedbed.id
        project.grupo_id = main_group.id
    db.flush()


def _archive_group(db: Session, group: Grupo, payload: dict) -> None:
    """Guarda el estado anterior dentro de la misma transacción."""
    db.execute(_legacy_archive.insert().values(
        legacy_group_id=str(group.id), payload=_dump_snapshot(payload)
    ))


def upgrade_legacy_groups(
    db: Session,
    main_group: Grupo,
    resolver: SeedbedResolver,
) -> int:
    """Convierte todo grupo adicional en semillero y conserva sus relaciones."""
    connection = db.connection()
    _legacy_archive.create(connection, checkfirst=True)
    groups = db.query(Grupo).order_by(Grupo.created_at, Grupo.id).all()
    legacy_groups = [group for group in groups if str(group.id) != str(main_group.id)]

    for legacy_group in legacy_groups:
        seedbed, seedbed_created = _find_seedbed(
            db, legacy_group, resolver, main_group
        )
        payload = _snapshot_legacy_group(db, legacy_group, seedbed)
        payload["target_seedbed_created"] = seedbed_created
        for member in payload["members"]:
            user = db.query(User).filter(
                User.id == _database_uuid(db, member["user_id"])
            ).first()
            if user is None:
                continue
            if user.rol == "investigador":
                if _insert_main_member(db, main_group, member):
                    payload["added_main_members"].append(member["user_id"])
                if _insert_seedbed_researcher(db, seedbed, member):
                    payload["added_seedbed_researchers"].append(member["user_id"])
            elif user.rol == "aprendiz":
                profile_id = _ensure_apprentice_profile(db, seedbed, member)
                if profile_id:
                    payload["created_apprentices"].append(profile_id)
        _archive_group(db, legacy_group, payload)
        _move_group_links(db, legacy_group, main_group, seedbed)
        db.execute(delete(grupo_integrantes).where(
            grupo_integrantes.c.grupo_id == legacy_group.id
        ))
        db.expire(legacy_group, ["semilleros", "proyectos", "integrantes"])
        db.delete(legacy_group)
        db.flush()
    return len(legacy_groups)


def ensure_single_group_index(db: Session) -> None:
    """Aplica una restricción SQL que no permite una segunda fila de grupo."""
    db.execute(text(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_grupos_singleton ON grupos ((1))"
    ))


def _restore_datetime(value):
    """Reconstruye una marca de tiempo serializada en el archivo de migración."""
    return datetime.fromisoformat(value) if value else None


def _restore_date(value):
    """Reconstruye una fecha serializada en el archivo de migración."""
    return date.fromisoformat(value) if value else None


def _restore_group(db: Session, fields: dict) -> Grupo:
    """Recrea una fila de grupo con sus tipos SQL originales."""
    values = dict(fields)
    values["id"] = _database_uuid(db, values["id"])
    values["owner_id"] = _database_uuid(db, values["owner_id"])
    values["fecha_reconocimiento"] = _restore_date(values.get("fecha_reconocimiento"))
    values["vigencia_hasta"] = _restore_date(values.get("vigencia_hasta"))
    values["created_at"] = _restore_datetime(values.get("created_at"))
    group = Grupo(**values)
    db.add(group)
    db.flush()
    return group


def _restore_group_members(db: Session, group: Grupo, members: list[dict]) -> None:
    """Restaura integrantes del grupo que existían antes de la migración."""
    for member in members:
        user_id = _database_uuid(db, member["user_id"])
        if db.query(User).filter(User.id == user_id).first() is None:
            continue
        exists = db.execute(select(grupo_integrantes.c.user_id).where(
            grupo_integrantes.c.grupo_id == group.id,
            grupo_integrantes.c.user_id == user_id,
        )).first()
        if exists:
            continue
        db.execute(grupo_integrantes.insert().values(
            grupo_id=group.id,
            user_id=user_id,
            rol_en_grupo=member["rol_en_grupo"],
            fecha_vinculacion=_restore_date(member["fecha_vinculacion"]),
        ))


def _restore_links(db: Session, payload: dict, group: Grupo) -> None:
    """Devuelve al grupo legado los semilleros y proyectos que movió la mejora."""
    main_id = _database_uuid(db, payload["main_group_id"])
    for semillero_id in payload["semilleros"]:
        semillero = db.query(Semillero).filter(
            Semillero.id == _database_uuid(db, semillero_id)
        ).first()
        if semillero is not None and str(semillero.grupo_id) == str(main_id):
            semillero.grupo_id = group.id
    for original in payload["projects"]:
        project = db.query(Proyecto).filter(
            Proyecto.id == _database_uuid(db, original["id"])
        ).first()
        if project is not None and str(project.grupo_id) == str(main_id):
            project.grupo_id = group.id
            project.semillero_id = _database_uuid(db, original["semillero_id"])


def _remove_migration_links(db: Session, payload: dict) -> None:
    """Retira solo asociaciones y perfiles creados por esta migración."""
    seedbed_id = _database_uuid(db, payload["target_seedbed_id"])
    main_id = _database_uuid(db, payload["main_group_id"])
    for user_id in payload["added_main_members"]:
        db.execute(delete(grupo_integrantes).where(
            grupo_integrantes.c.grupo_id == main_id,
            grupo_integrantes.c.user_id == _database_uuid(db, user_id),
        ))
    for user_id in payload["added_seedbed_researchers"]:
        db.execute(delete(semillero_investigadores).where(
            semillero_investigadores.c.semillero_id == seedbed_id,
            semillero_investigadores.c.user_id == _database_uuid(db, user_id),
        ))
    for profile_id in payload["created_apprentices"]:
        profile = db.query(Aprendiz).filter(
            Aprendiz.id == _database_uuid(db, profile_id)
        ).first()
        if profile is not None and str(profile.semillero_id) == str(seedbed_id):
            db.delete(profile)
    db.flush()


def _remove_empty_migrated_seedbed(db: Session, payload: dict) -> None:
    """Elimina la fila creada por la migración solo si nadie la usa."""
    if not payload["target_seedbed_created"]:
        return
    seedbed = db.query(Semillero).filter(
        Semillero.id == _database_uuid(db, payload["target_seedbed_id"])
    ).first()
    if seedbed is None:
        return
    used_by_project = db.query(Proyecto.id).filter(
        Proyecto.semillero_id == seedbed.id
    ).first()
    used_by_apprentice = db.query(Aprendiz.id).filter(
        Aprendiz.semillero_id == seedbed.id
    ).first()
    used_by_researcher = db.execute(select(semillero_investigadores.c.user_id).where(
        semillero_investigadores.c.semillero_id == seedbed.id
    )).first()
    if not (used_by_project or used_by_apprentice or used_by_researcher):
        db.delete(seedbed)


def downgrade_legacy_groups(db: Session) -> int:
    """Restaura grupos, integrantes y enlaces desde el respaldo transaccional."""
    inspector = inspect(db.get_bind())
    if _legacy_archive.name not in inspector.get_table_names():
        return 0
    rows = db.execute(select(_legacy_archive)).all()
    if not rows:
        return 0
    db.execute(text("DROP INDEX IF EXISTS uq_grupos_singleton"))
    for row in rows:
        payload = json.loads(row.payload)
        group = _restore_group(db, payload["group"])
        _restore_group_members(db, group, payload["members"])
        _restore_links(db, payload, group)
        _remove_migration_links(db, payload)
        _remove_empty_migrated_seedbed(db, payload)
    count = len(rows)
    _legacy_archive.drop(db.connection(), checkfirst=True)
    db.commit()
    return count
