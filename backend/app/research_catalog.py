"""Catálogo de grupos suministrado por el CGAO, sin registros de demostración."""

import re
import uuid
from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models import Grupo, User

# Se conserva literalmente la descripción de cada carpeta de la fuente.
# Los directorios de formatos y bases de datos no representan grupos.
RESEARCH_GROUP_CATALOG = (
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


class ResearchCatalogError(RuntimeError):
    """La instalación no pudo persistir el catálogo institucional."""


@dataclass(frozen=True)
class ResearchCatalogResult:
    created: int
    existing: int


def _catalog_name(name: str) -> str:
    """Reconoce siglas y nombres de carpetas sin modificar el registro original."""
    return re.sub(r"^\d+\s*", "", name.split("(", 1)[0].strip()).strip().casefold()


def ensure_research_catalog(db: Session) -> ResearchCatalogResult:
    """Agrega únicamente los grupos ausentes y conserva todos los datos existentes.

    El administrador es el responsable técnico inicial; no se infiere que sea
    director o integrante de los grupos. Los códigos, categorías y enlaces de
    Minciencias quedan pendientes de su verificación institucional.

    PostgreSQL serializa esta operación durante el arranque de varios workers.
    Los UUID estables impiden que renombrar un grupo creado por este catálogo
    cause un duplicado durante el siguiente despliegue.
    """
    try:
        if db.get_bind().dialect.name == "postgresql":
            db.execute(
                text("SELECT pg_advisory_xact_lock(:catalog_lock)"),
                {"catalog_lock": 53454},
            )
        admin = db.query(User).filter(
            User.rol == "admin", User.is_active.is_(True)
        ).order_by(User.created_at, User.id).first()
        if admin is None:
            raise ResearchCatalogError(
                "El catálogo requiere un administrador activo. Verifique el "
                "administrador inicial antes de iniciar la aplicación."
            )

        groups = db.query(Grupo).all()
        existing_names = {_catalog_name(group.nombre) for group in groups}
        existing_ids = {str(group.id) for group in groups}
        created = 0
        for acronym, area in RESEARCH_GROUP_CATALOG:
            group_id = uuid.uuid5(uuid.NAMESPACE_URL, f"sennova-cgao/grupos/{acronym}")
            if acronym.casefold() in existing_names or str(group_id) in existing_ids:
                continue
            db.add(Grupo(
                id=str(group_id),
                nombre=acronym,
                nombre_completo=f"{acronym} ({area})",
                descripcion_grupo=area,
                lineas_investigacion=[],
                owner_id=admin.id,
                is_publico=True,
                estado="activo",
            ))
            created += 1
        db.commit()
        return ResearchCatalogResult(created=created, existing=len(RESEARCH_GROUP_CATALOG) - created)
    except ResearchCatalogError:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        raise ResearchCatalogError(
            "No se pudo guardar el catálogo de grupos. Revise la conexión y los "
            "permisos de la base de datos antes de reintentar el despliegue."
        ) from exc
