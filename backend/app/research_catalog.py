"""Estructura institucional base del CGAO y su catálogo de semilleros."""

import re
import uuid
from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models import Grupo, Semillero, User
from app.services.research_structure_migration import (
    upgrade_legacy_groups,
    ensure_single_group_index,
)

CANONICAL_GROUP_NAME = "Investigadores CGAO"
RESEARCH_SEEDBED_CATALOG = (
    ("SEMIPROVEL", "Sistemas y Programación"),
    ("SIAMB", "Ambiental"),
    ("SIACF", "Contabilidad y Finanzas"),
    ("SENAGRO2", "Agropecuaria y Agroindustria"),
    ("SISSTYSIG", "Seguridad y Salud en el Trabajo y SG Integ"),
    ("SIDECI", "Deporte y Ciencia"),
    ("FORMARTE", "Investigación Pedagógica"),
    ("SINVESCON", "Construcción"),
    ("SIADM", "Administración"),
    ("SEMITEC", "Motos y Mecánica"),
    ("SITURISMO", "Turismo y cultura"),
    ("SIASA", "Salud"),
)
CATALOG_LOCK_ID = 53454


class ResearchCatalogError(RuntimeError):
    """La estructura institucional no pudo guardarse con integridad."""


@dataclass(frozen=True)
class ResearchCatalogResult:
    """Resumen de filas creadas o normalizadas durante el arranque."""

    created: int
    existing: int
    group_created: bool
    groups_migrated: int


def _normalized(value: str | None) -> str:
    """Compara nombres sin prefijos numéricos ni diferencias de formato."""
    if not value:
        return ""
    return re.sub(r"[^a-z0-9]+", "", value.casefold())


def _legacy_seedbed_details(group: Grupo) -> tuple[str | None, str, str | None]:
    """Deriva el semillero legado sin asumir que sus datos son de Gruplac."""
    possible_names = (group.nombre, group.nombre_completo, group.descripcion_grupo)
    for sigla, name in RESEARCH_SEEDBED_CATALOG:
        if any(_normalized(value).startswith(_normalized(sigla)) for value in possible_names):
            return sigla, name, group.descripcion_grupo or name
        if any(_normalized(value) == _normalized(name) for value in possible_names):
            return sigla, name, group.descripcion_grupo or name
    name = group.nombre_completo or group.nombre or "Semillero migrado"
    return None, name, group.descripcion_grupo or group.mision


def _main_group(db: Session, admin: User) -> tuple[Grupo, bool]:
    """Obtiene o crea el único grupo institucional con identidad estable."""
    groups = db.query(Grupo).order_by(Grupo.created_at, Grupo.id).all()
    candidates = [
        group for group in groups
        if _normalized(CANONICAL_GROUP_NAME) in _normalized(group.nombre)
        or _normalized(CANONICAL_GROUP_NAME) in _normalized(group.nombre_completo)
    ]
    group = candidates[0] if candidates else None
    created = group is None
    if group is None:
        stable_id = uuid.uuid5(uuid.NAMESPACE_URL, "sennova-cgao/grupo/investigadores")
        group = Grupo(
            id=(stable_id if db.get_bind().dialect.name == "postgresql" else str(stable_id)),
            nombre=CANONICAL_GROUP_NAME,
            nombre_completo="Grupo institucional de investigadores del CGAO",
            descripcion_grupo="Grupo de investigadores del Centro de Gestión Agroempresarial del Oriente.",
            lineas_investigacion=[],
            owner_id=admin.id,
            is_publico=True,
            estado="activo",
        )
        db.add(group)
        db.flush()
    elif group.nombre != CANONICAL_GROUP_NAME:
        group.nombre_completo = group.nombre_completo or group.nombre
        group.nombre = CANONICAL_GROUP_NAME
        db.flush()
    return group, created


def _ensure_seedbed_catalog(db: Session, group: Grupo, admin: User) -> tuple[int, int]:
    """Crea únicamente los semilleros base que todavía no están registrados."""
    semilleros = db.query(Semillero).all()
    by_sigla = {
        _normalized(semillero.sigla): semillero
        for semillero in semilleros if semillero.sigla
    }
    by_name = {_normalized(semillero.nombre): semillero for semillero in semilleros}
    created = 0
    for sigla, name in RESEARCH_SEEDBED_CATALOG:
        semillero = by_sigla.get(_normalized(sigla)) or by_name.get(_normalized(name))
        if semillero is None:
            semillero = Semillero(
                nombre=name,
                sigla=sigla,
                descripcion=name,
                linea_investigacion=name,
                estado="activo",
                grupo_id=group.id,
                owner_id=admin.id,
            )
            db.add(semillero)
            by_sigla[_normalized(sigla)] = semillero
            by_name[_normalized(name)] = semillero
            created += 1
        elif str(semillero.grupo_id) != str(group.id):
            semillero.grupo_id = group.id
    db.flush()
    return created, len(RESEARCH_SEEDBED_CATALOG) - created


def ensure_research_catalog(db: Session) -> ResearchCatalogResult:
    """Deja una sola agrupación CGAO y sus semilleros sin borrar vínculos."""
    try:
        if db.get_bind().dialect.name == "postgresql":
            db.execute(
                text("SELECT pg_advisory_xact_lock(:catalog_lock)"),
                {"catalog_lock": CATALOG_LOCK_ID},
            )
        admin = db.query(User).filter(
            User.rol == "admin", User.is_active.is_(True)
        ).order_by(User.created_at, User.id).first()
        if admin is None:
            raise ResearchCatalogError(
                "La estructura institucional requiere un administrador activo. "
                "Configure las credenciales iniciales y vuelva a iniciar."
            )

        main_group, group_created = _main_group(db, admin)
        groups_migrated = upgrade_legacy_groups(
            db, main_group, _legacy_seedbed_details
        )
        seedbeds_created, seedbeds_existing = _ensure_seedbed_catalog(
            db, main_group, admin
        )
        ensure_single_group_index(db)
        db.commit()
        return ResearchCatalogResult(
            created=seedbeds_created,
            existing=seedbeds_existing,
            group_created=group_created,
            groups_migrated=groups_migrated,
        )
    except ResearchCatalogError:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        raise ResearchCatalogError(
            "No se pudo guardar la estructura de investigadores y semilleros. "
            "Revise la conexión y los permisos de la base de datos antes de reintentar."
        ) from exc
