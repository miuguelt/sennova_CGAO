import uuid
import sqlite3
from datetime import datetime, timezone

# Configuración
DB_PATH = 'backend/sennova.db'
OWNER_ID = '4a9681d2-f043-4013-a218-35d80deaae21'

RETOS_DATA = [
    {
        "titulo": "Optimización de Secado de Café",
        "descripcion": "Se requiere un sistema automatizado para el monitoreo de humedad y temperatura en silos de secado de café para pequeños productores de la región, buscando mantener la calidad del grano y reducir el consumo energético.",
        "sector_productivo": "Agroindustria",
        "empresa_solicitante": "Cooperativa de Caficultores del Cauca",
        "contacto_email": "proyectos@cafecauca.org",
        "estado": "abierto",
        "prioridad": "alta"
    },
    {
        "titulo": "Gestión de Residuos de Construcción (RCD)",
        "descripcion": "Desarrollo de una plataforma digital para el seguimiento y trazabilidad de escombros en obras civiles de Popayán, permitiendo conectar generadores con centros de aprovechamiento autorizados.",
        "sector_productivo": "Construcción",
        "empresa_solicitante": "Camacol Regional Cauca",
        "contacto_email": "innovacion@camacolcauca.co",
        "estado": "abierto",
        "prioridad": "media"
    },
    {
        "titulo": "Trazabilidad de Cadena de Frío para Lácteos",
        "descripcion": "Implementación de sensores IoT en vehículos de transporte de leche para garantizar que la temperatura se mantenga entre 4°C y 6°C durante todo el trayecto desde la finca hasta la planta procesadora.",
        "sector_productivo": "Alimentos",
        "empresa_solicitante": "Lácteos de la Pradera",
        "contacto_email": "calidad@lacteospradera.com",
        "estado": "en_estudio",
        "prioridad": "alta"
    },
    {
        "titulo": "Realidad Aumentada para Mantenimiento Industrial",
        "descripcion": "Creación de guías interactivas con RA para técnicos que realizan mantenimiento preventivo en maquinaria de carpintería del centro, facilitando la identificación de piezas y procedimientos de seguridad.",
        "sector_productivo": "Tecnología",
        "empresa_solicitante": "CGAO - Área de Mantenimiento",
        "contacto_email": "mantenimiento.cgao@sena.edu.co",
        "estado": "abierto",
        "prioridad": "media"
    },
    {
        "titulo": "Análisis de Datos para el Sector Turismo",
        "descripcion": "Minería de datos sobre el flujo de turistas en la Semana Santa de Popayán para predecir demandas hoteleras y optimizar la oferta de servicios gastronómicos en años futuros.",
        "sector_productivo": "Turismo",
        "empresa_solicitante": "Secretaría de Turismo Municipal",
        "contacto_email": "info@turismopopayan.gov.co",
        "estado": "abierto",
        "prioridad": "baja"
    }
]

def populate_retos():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Verificar si la tabla existe
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='retos'")
    if not cursor.fetchone():
        print("Error: La tabla 'retos' no existe. Ejecuta las migraciones primero.")
        return

    # Limpiar datos previos si existen (opcional, para esta tarea lo haremos para asegurar carga limpia)
    cursor.execute("DELETE FROM retos")
    
    now = datetime.now(timezone.utc).isoformat()
    
    for reto in RETOS_DATA:
        reto_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO retos (
                id, titulo, descripcion, sector_productivo, 
                empresa_solicitante, contacto_email, estado, 
                prioridad, owner_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            reto_id, 
            reto['titulo'], 
            reto['descripcion'], 
            reto['sector_productivo'],
            reto['empresa_solicitante'], 
            reto['contacto_email'], 
            reto['estado'],
            reto['prioridad'], 
            OWNER_ID, 
            now
        ))
    
    conn.commit()
    print(f"Éxito: Se han cargado {len(RETOS_DATA)} retos al banco.")
    conn.close()

if __name__ == "__main__":
    populate_retos()
