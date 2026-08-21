# -*- coding: utf-8 -*-
"""Inicialización de un despliegue nuevo (idempotente).

Lo ejecuta el entrypoint del contenedor antes de arrancar Uvicorn:

1. crea el esquema que falte,
2. aplica las columnas añadidas después de la última versión del esquema,
3. crea el administrador inicial a partir del entorno.

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
from app.database import Base, SessionLocal, engine  # noqa: E402
from app import models  # noqa: E402,F401  (registra todas las tablas en Base)
from scripts.fix_db_schema import fix_schema  # noqa: E402


def bootstrap() -> int:
    settings = get_settings()

    print("🗄️  Verificando esquema de base de datos...")
    Base.metadata.create_all(bind=engine)
    fix_schema()

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
    except AdminBootstrapError as exc:
        print(f"❌ {exc}")
        return 1
    finally:
        db.close()

    print(f"✅ {result.detail}")
    return 0


if __name__ == "__main__":
    sys.exit(bootstrap())
