"""Importa explícitamente el ejemplo local para validar formularios en desarrollo.

No forma parte del arranque ni del semillado de un despliegue.
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy.exc import SQLAlchemyError

from app.config import get_settings
from app.database import SessionLocal
from app.models import User
from app.services.documentation_schema import upgrade_documentation_schema
from app.services.reference_documentation_import import ReferenceImportError, import_reference_data


def main(argv=None):
    parser = argparse.ArgumentParser(description="Importa una de las referencias locales de proyecto en una base de desarrollo.")
    parser.add_argument("--input", required=True, help="Ruta del JSON de una referencia admitida del proyecto.")
    parser.add_argument("--owner-id", help="UUID de un administrador activo existente; si falta, se usa el primero por fecha de creación.")
    args = parser.parse_args(argv)
    if not get_settings().DEBUG:
        print("La importación de referencias requiere DEBUG=true y un entorno de desarrollo.")
        return 1
    try:
        payload = json.loads(Path(args.input).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        print("No se pudo leer el JSON de referencia. Verifique la ruta y su contenido antes de reintentar.")
        return 1
    try:
        with SessionLocal() as db:
            upgrade_documentation_schema(db.get_bind())
            query = db.query(User).filter(User.rol == "admin", User.is_active.is_(True))
            admin = query.filter(User.id == args.owner_id).first() if args.owner_id else query.order_by(User.created_at, User.id).first()
            if admin is None:
                print("La base de desarrollo debe tener un administrador activo existente; no se crean usuarios al importar.")
                return 1
            result = import_reference_data(db, admin, payload)
            print(json.dumps(result, ensure_ascii=False, indent=2))
            return 0
    except ReferenceImportError as error:
        print(str(error))
        return 1
    except SQLAlchemyError:
        print("No se pudo acceder a la base de desarrollo. Verifique la conexión y el esquema; no se importaron datos.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
