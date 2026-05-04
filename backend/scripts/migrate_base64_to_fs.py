import os
import sys
import base64
import sqlite3
from pathlib import Path

# Add backend dir to path
sys.path.append(str(Path(__file__).parent.parent))

from app.database import engine, Base
from app.models import Documento
from sqlalchemy.orm import Session
from sqlalchemy import text

STORAGE_DIR = Path(__file__).parent.parent / "storage" / "documentos"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

def migrate():
    print("Iniciando migración de Base64 a File System...")
    
    # Add column if not exists (SQLite specific)
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE documentos ADD COLUMN file_path VARCHAR(255)"))
            conn.commit()
            print("Columna 'file_path' añadida a la tabla documentos.")
    except Exception as e:
        if "duplicate column name" in str(e).lower():
            print("La columna 'file_path' ya existe.")
        else:
            print(f"Advertencia al añadir columna: {e}")

    with Session(engine) as db:
        documentos = db.query(Documento).filter(Documento.data_base64.isnot(None)).all()
        count = 0
        
        for doc in documentos:
            try:
                if not doc.data_base64:
                    continue
                
                # Create a physical file
                file_ext = doc.nombre_archivo.split('.')[-1] if '.' in doc.nombre_archivo else 'bin'
                file_name = f"{doc.id}.{file_ext}"
                file_path = STORAGE_DIR / file_name
                
                # Decode and save
                content = base64.b64decode(doc.data_base64)
                with open(file_path, "wb") as f:
                    f.write(content)
                
                # Update DB record
                # We store a relative path or just filename for easier moving later
                doc.file_path = f"storage/documentos/{file_name}"
                doc.data_base64 = None  # Clean up DB
                count += 1
            except Exception as e:
                print(f"Error procesando documento {doc.id}: {e}")
                
        db.commit()
        print(f"Migración completada. {count} documentos migrados a disco.")

if __name__ == "__main__":
    migrate()