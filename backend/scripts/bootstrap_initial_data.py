# -*- coding: utf-8 -*-
"""Inicialización de un despliegue nuevo (idempotente).

Lo ejecuta el entrypoint del contenedor antes de arrancar Uvicorn:

1. crea el esquema que falte,
2. aplica las columnas añadidas después de la última versión del esquema,
3. crea el administrador inicial a partir del entorno.
4. conserva un solo grupo, migra los grupos anteriores a semilleros y completa
   el catálogo base sin borrar proyectos ni integrantes.

Termina con código distinto de cero cuando la configuración no permite crear un
administrador seguro, para que el despliegue falle en el arranque en vez de
publicar una instalación abierta.
"""

import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.bootstrap import (  # noqa: E402
    AdminBootstrapError,
    credentials_from_settings,
    ensure_initial_admin,
)
from app.config import get_settings  # noqa: E402
from app.database import SessionLocal, engine  # noqa: E402
from app.services.database_startup import initialize_schema  # noqa: E402
from app.research_catalog import (  # noqa: E402
    ResearchCatalogError,
    ensure_research_catalog,
)


def bootstrap() -> int:
    settings = get_settings()

    print("🗄️  Verificando esquema de base de datos...")
    try:
        initialize_schema(engine)
    except Exception:
        print(
            "❌ No se pudo preparar el esquema de la base de datos. "
            "Revise la conexión, la versión del motor y los permisos de migración."
        )
        return 1

    print("👤 Verificando administrador inicial...")
    db = SessionLocal()
    try:
        result = ensure_initial_admin(
            db,
            credentials_from_settings(settings),
            # En desarrollo (DEBUG=true) se permite una contraseña corta; en
            # producción la exigencia de longitud no es negociable.
            enforce_strong_password=not settings.DEBUG,
        )
        catalog = ensure_research_catalog(db)
        from app.services.reference_files_sync import sync_reference_project_files
        sync_result = sync_reference_project_files(db)
        print(f"📁 Archivos base sincronizados: {sync_result['documentos_sincronizados']} documentos.")
    except (AdminBootstrapError, ResearchCatalogError) as exc:
        print(f"❌ {exc}")
        return 1
    finally:
        db.close()

    print(f"✅ {result.detail}")
    print(
        "✅ Estructura institucional: "
        f"grupo {'creado' if catalog.group_created else 'verificado'}; "
        f"{catalog.created} semilleros creados, "
        f"{catalog.existing} existentes y {catalog.groups_migrated} grupos anteriores consolidados."
    )
    return 0


if __name__ == "__main__":
    sys.exit(bootstrap())
