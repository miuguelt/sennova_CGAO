import psycopg
import sys

connection_strings = [
    # 5434 (mapped to 5432 in container)
    ("admin @ 5434 (master_db)", "postgresql://admin:devbrain_secure_pwd@127.0.0.1:5434/master_db"),
    ("admin @ 5434 (sennova)", "postgresql://admin:devbrain_secure_pwd@127.0.0.1:5434/sennova"),
    ("postgres @ 5434 (postgres)", "postgresql://postgres:devbrain_secure_pwd@127.0.0.1:5434/postgres"),
    # 5432
    ("admin @ 5432 (master_db)", "postgresql://admin:devbrain_secure_pwd@127.0.0.1:5432/master_db"),
    ("admin @ 5432 (sennova)", "postgresql://admin:devbrain_secure_pwd@127.0.0.1:5432/sennova"),
    ("postgres @ 5432 (postgres)", "postgresql://postgres:devbrain_secure_pwd@127.0.0.1:5432/postgres"),
]

print("==========================================")
print("🐘 COMPROBACIÓN DE CONEXIONES POSTGRESQL")
print("==========================================")

for label, conn_str in connection_strings:
    try:
        conn = psycopg.connect(conn_str, connect_timeout=3)
        conn.close()
        print(f"✅ {label}: CONEXIÓN EXITOSA")
    except Exception as e:
        print(f"❌ {label}: FALLÓ - {e}")
print("==========================================")
