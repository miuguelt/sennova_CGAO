import psycopg
try:
    conn = psycopg.connect("postgresql://admin:devbrain_pass@localhost:5434/sennova")
    print("Connection to 5434 OK")
    conn.close()
except Exception as e:
    print(f"Error connecting to 5434: {e}")

try:
    conn = psycopg.connect("postgresql://sennova:sennova_local_dev_2024@localhost:5432/sennova")
    print("Connection to 5432 OK")
    conn.close()
except Exception as e:
    print(f"Error connecting to 5432: {e}")
