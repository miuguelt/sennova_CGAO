
from app.database import SessionLocal
from app.models import Proyecto, Reto

def fix_encoding():
    db = SessionLocal()
    try:
        proyectos = db.query(Proyecto).all()
        for p in proyectos:
            try:
                # Caso común: UTF-8 leído como Latin-1 y guardado
                # "ó" (C3 B3) -> "Ã³" (C3 83 C2 B3)
                # Probamos a codificar en latin-1 y decodificar en utf-8
                fixed = p.estado.encode('latin-1').decode('utf-8')
                if fixed != p.estado:
                    p.estado = fixed
                    print(f"Fixed project {p.id}: {p.estado}")
            except:
                # Si falla, probamos reemplazo manual de caracteres comunes
                original = p.estado
                p.estado = p.estado.replace("Ã³", "ó").replace("Ã©", "é").replace("Ã¡", "á").replace("Ã", "í").replace("Ãº", "ú").replace("Ã±", "ñ")
                if p.estado != original:
                    print(f"Manual fix project {p.id}: {p.estado}")
        
        retos = db.query(Reto).all()
        for r in retos:
            try:
                fixed = r.estado.encode('latin-1').decode('utf-8')
                if fixed != r.estado:
                    r.estado = fixed
                    print(f"Fixed reto {r.id}: {r.estado}")
            except:
                original = r.estado
                r.estado = r.estado.replace("Ã³", "ó").replace("Ã©", "é").replace("Ã¡", "á").replace("Ã", "í").replace("Ãº", "ú").replace("Ã±", "ñ")
                if r.estado != original:
                    print(f"Manual fix reto {r.id}: {r.estado}")
        
        db.commit()
        print("Encoding fix completed.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_encoding()
