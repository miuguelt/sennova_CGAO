import socket
import sys

ports_to_test = [5432, 5433, 5434, 6379, 6380, 8050]
host = "127.0.0.1"

print("==========================================")
print("🔌 DIAGNÓSTICO DE PUERTOS DE INFRAESTRUCTURA")
print("==========================================")

for port in ports_to_test:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(2.0)
    try:
        s.connect((host, port))
        print(f"✅ Puerto {port} ({'PostgreSQL' if port in [5432, 5433, 5434] else 'Redis'}): ACCESIBLE (Listening)")
    except Exception as e:
        print(f"❌ Puerto {port} ({'PostgreSQL' if port in [5432, 5433, 5434] else 'Redis'}): NO ACCESIBLE - {e}")
    finally:
        s.close()
print("==========================================")
