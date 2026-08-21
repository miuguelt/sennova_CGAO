import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
# Sin DSN de reserva: el anterior llevaba una contraseña literal y apuntaba al
# puerto 5432, que la topología del workspace prohíbe (PostgreSQL vive en 5434).
# Si existiera un servidor allí, este script volcaba usuarios de otra base.
db_url = os.getenv('DATABASE_URL')
if not db_url:
    raise SystemExit(
        "Falta DATABASE_URL. Defínela en el entorno o en el .env local del "
        "proyecto antes de ejecutar este diagnóstico."
    )
engine = create_engine(db_url)

try:
    with engine.connect() as conn:
        res = conn.execute(text('SELECT email, rol, is_active FROM users LIMIT 10'))
        print("USUARIOS:")
        for row in res:
            print(f"Email: {row[0]}, Rol: {row[1]}, Activo: {row[2]}")
except Exception as e:
    print(f"Error: {e}")
