# SENNOVA CGAO - Backend API

Backend RESTful para el Sistema de Gestión de Investigación del CGAO Vélez - SENNOVA.

## 🏗️ Arquitectura

- **Framework:** FastAPI (Python 3.11)
- **Base de Datos:** PostgreSQL 15
- **ORM:** SQLAlchemy 2.0
- **Auth:** JWT (python-jose) + bcrypt
- **Deploy:** Docker + Coolify

## 🚀 Instalación Local

### 1. Requisitos

```bash
# Instalar PostgreSQL
docker run -d \
  --name sennova-postgres \
  -e POSTGRES_USER=sennova \
  -e POSTGRES_PASSWORD=sennova123 \
  -e POSTGRES_DB=sennova \
  -p 5432:5432 \
  postgres:15-alpine
```

### 2. Backend

```bash
# Crear virtualenv
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Iniciar servidor
uvicorn app.main:app --reload --port 8000
```

### 3. Documentación API

Una vez iniciado, acceder a:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

## 🐳 Docker Compose (Coolify)

```bash
# Copiar variables de entorno
cp .env.example .env

# Editar .env con tus valores
nano .env

# Iniciar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f backend
```

### Servicios incluidos:

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| Backend | 8000 | API FastAPI |
| PostgreSQL | 5432 | Base de datos |
| pgAdmin | 5050 | Admin de BD (admin@sena.edu.co / admin123) |

## 📁 Estructura

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py           # Entry point
│   ├── config.py         # Configuración
│   ├── database.py       # Conexión DB
│   ├── models.py         # Modelos SQLAlchemy
│   ├── schemas.py        # Pydantic schemas
│   ├── auth.py          # JWT + hashing
│   └── routers/
│       ├── auth.py       # Login, registro, usuarios
│       ├── proyectos.py  # CRUD proyectos
│       ├── grupos.py     # CRUD grupos
│       ├── semilleros.py # CRUD semilleros + aprendices
│       ├── convocatorias.py # CRUD convocatorias
│       └── productos.py  # CRUD productos
├── Dockerfile
└── requirements.txt
```

## 🔐 Autenticación

Todos los endpoints protegidos requieren header:
```
Authorization: Bearer <token>
```

### Obtener token:
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@sena.edu.co", "password": "123456"}'
```

### Roles:
- `admin`: Acceso total
- `investigador`: Acceso limitado a sus datos

## 📊 Endpoints principales

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/auth/login` | Login | ❌ |
| POST | `/auth/register` | Registro | ❌ |
| GET | `/auth/me` | Perfil actual | ✅ |
| GET | `/proyectos` | Listar proyectos | ✅ |
| POST | `/proyectos` | Crear proyecto | ✅ |
| GET | `/grupos` | Listar grupos | ✅ |
| GET | `/semilleros` | Listar semilleros | ✅ |
| GET | `/convocatorias` | Listar convocatorias | ✅ |
| GET | `/productos` | Listar productos | ✅ |
| GET | `/stats/dashboard` | Stats dashboard | ✅ |

## 🔄 Migración desde IndexedDB

1. Exportar JSON desde el sistema antiguo (Configuración > Exportar)
2. Guardar como `backup_sennova.json`
3. Ejecutar migración:

```bash
python scripts/migrate_from_indexeddb.py backup_sennova.json
```

## 💾 Backup y Restore

### Backup automático (cada 6 horas):
```bash
# Configurado en docker-compose.yml
# Backups en: ./backups/
```

### Backup manual:
```bash
docker exec sennova-postgres pg_dump -U sennova sennova > backup_$(date +%Y%m%d).sql
```

### Restore:
```bash
docker exec -i sennova-postgres psql -U sennova sennova < backup_20240115.sql
```

## 🔧 Variables de Entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `DATABASE_URL` | postgresql://... | URL de conexión PostgreSQL |
| `JWT_SECRET` | sennova-secret... | Clave secreta para JWT |
| `JWT_EXPIRATION_HOURS` | 24 | Horas de validez del token |
| `ALLOWED_ORIGINS` | localhost:5173 | Orígenes CORS permitidos |

## 🧪 Testing

```bash
# Run tests
pytest

# Con coverage
pytest --cov=app
```

## 📝 Licencia

SENA - Centro de Gestión Agroempresarial del Oriente (CGAO) Vélez
