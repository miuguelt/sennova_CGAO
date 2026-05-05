# 📋 Guía de Configuración - SENNOVA CGAO

## 🎯 Principio Fundamental: Anti-Hardcoding

**NINGUNA** configuración sensible, URL, o parámetro de entorno debe estar hardcodeado en el código fuente. Todo debe provenir de variables de entorno (`.env`).

---

## 📁 Estructura de Archivos de Configuración

```
SENNOVA/
├── .env                          # ❌ NO commitear - Valores reales
├── .env.example                  # ✅ Template documentado
├── .gitignore                    # ✅ Debe incluir .env
├── frontend/
│   ├── .env.local               # ❌ NO commitear - Valores reales
│   └── .env.example             # ✅ Template para frontend
├── backend/
│   └── app/
│       └── config.py            # ✅ Carga centralizada de config
├── docker-compose.yml           # ✅ Usa variables de entorno
├── coolify.json                 # ✅ Define variables requeridas
└── scripts/
    └── validate-env.sh          # ✅ Validador anti-hardcoding
```

---

## 🔧 Variables de Entorno Requeridas

### 🔐 Seguridad (CRÍTICAS)

| Variable | Descripción | Ejemplo Local | Ejemplo Producción |
|----------|-------------|---------------|-------------------|
| `JWT_SECRET` | Clave secreta para tokens JWT (32+ chars) | `dev-secret-key...` | `$(openssl rand -base64 32)` |
| `JWT_ALGORITHM` | Algoritmo de firma | `HS256` | `HS256` |
| `JWT_EXPIRATION_HOURS` | Horas de validez del token | `24` | `24` |

### 🗄️ Base de Datos

| Variable | Descripción | Ejemplo Local | Ejemplo Producción |
|----------|-------------|---------------|-------------------|
| `DATABASE_URL` | URL completa de PostgreSQL | - | `postgresql://...` |
| `DB_HOST` | Host de PostgreSQL | `localhost` | `postgres` (docker) |
| `DB_PORT` | Puerto de PostgreSQL | `5432` | `5432` |
| `DB_NAME` | Nombre de la base de datos | `sennova` | `sennova` |
| `DB_USER` | Usuario de PostgreSQL | `sennova` | `sennova` |
| `DB_PASSWORD` | Contraseña de PostgreSQL | `devpass` | `secure-password` |

### 🌐 CORS y URLs

| Variable | Descripción | Ejemplo Local | Ejemplo Producción |
|----------|-------------|---------------|-------------------|
| `ALLOWED_ORIGINS` | Orígenes CORS permitidos | `http://localhost:5173,...` | `https://sennova.enlinea.sbs` |
| `VITE_API_URL` | URL del backend para frontend | `http://localhost:8000` | `/api` (proxy) |
| `FRONTEND_URL` | URL pública del frontend | `http://localhost:5173` | `https://sennova.enlinea.sbs` |
| `BACKEND_URL` | URL pública del backend | `http://localhost:8000` | `https://api.dominio.com` |

### 👤 Configuración Inicial

| Variable | Descripción | Valor |
|----------|-------------|-------|
| `INITIAL_ADMIN_EMAIL` | Email del admin inicial | `admin@sena.edu.co` |
| `INITIAL_ADMIN_PASSWORD` | Contraseña del admin inicial | Cambiar en producción |

### ⚙️ Aplicación

| Variable | Descripción | Local | Producción |
|----------|-------------|-------|------------|
| `DEBUG` | Modo debug | `true` | `false` |
| `APP_NAME` | Nombre de la app | `SENNOVA CGAO API` | `SENNOVA CGAO API` |
| `LOG_LEVEL` | Nivel de logging | `DEBUG` | `INFO` |

---

## 🚀 Flujo de Configuración

### 1. Desarrollo Local

```bash
# 1. Copiar template
cp .env.example .env
cp frontend/.env.example frontend/.env.local

# 2. Editar con valores locales
# - DEBUG=true
# - VITE_API_URL=http://localhost:8000
# - ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# 3. Verificar que .env está en .gitignore
grep "^\.env$" .gitignore || echo ".env" >> .gitignore
grep "\.env.local" frontend/.gitignore || echo ".env.local" >> frontend/.gitignore
```

### 2. Preparación para Producción

```bash
# 1. Generar JWT_SECRET seguro
openssl rand -base64 32
# Copiar resultado a JWT_SECRET en Coolify

# 2. Configurar en Coolify
# Ir a: Resources → Environment Variables

# 3. Variables obligatorias en Coolify:
# - JWT_SECRET: [valor generado arriba]
# - DB_PASSWORD: [contraseña segura]
# - ALLOWED_ORIGINS: https://sennova.enlinea.sbs
# - VITE_API_URL: /api (recomendado con proxy)
# - DEBUG: false
```

---

## ❌ Ejemplos de Hardcoding (PROHIBIDO)

### JavaScript/TypeScript - NO HACER

```javascript
// ❌ PROHIBIDO: URL hardcodeada
const API_URL = 'http://localhost:8000';

// ❌ PROHIBIDO: Secrets en código
const jwtSecret = 'mi-clave-secreta-123';

// ❌ PROHIBIDO: Orígenes CORS hardcodeados
const allowedOrigins = ['http://localhost:3000'];
```

### Python - NO HACER

```python
# ❌ PROHIBIDO
ALLOWED_ORIGINS = ["http://localhost:3000", "http://localhost:5173"]
JWT_SECRET = "clave-secreta-desarrollo"
DATABASE_URL = "postgresql://user:pass@localhost:5432/db"
```

---

## ✅ Patrones Correctos

### JavaScript/TypeScript

```javascript
// ✅ CORRECTO: Usar import.meta.env (Vite)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ✅ CORRECTO: Fallback opcional
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:3000'
];
```

### Python

```python
# ✅ CORRECTO: Usar os.getenv con validación
import os

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise ValueError("JWT_SECRET no está configurado. Verifica tu archivo .env")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",")
if not ALLOWED_ORIGINS or ALLOWED_ORIGINS == ['']:
    ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "http://localhost:3000"
    ]

# ✅ CORRECTO: Construcción dinámica de DATABASE_URL
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Construir desde componentes si DATABASE_URL no está definida
    DB_USER = os.getenv("DB_USER", "sennova")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "sennova")
    
    if DB_PASSWORD:
        DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
```

---

## 🔍 Validación Anti-Hardcoding

### Script de Validación

```bash
# Ejecutar validador antes de commit
./scripts/validate-env.sh
```

### Verificación Manual

```bash
# Buscar URLs hardcodeadas
grep -r "http://localhost" frontend/src backend/app \
  --include="*.js" --include="*.py" | \
  grep -v "env\|process.env\|os.getenv"

# Buscar posibles secrets
grep -ri "secret.*=.*['\"]" frontend/src backend/app \
  --include="*.js" --include="*.py" | \
  grep -vi "env\|getenv\|example\|test"
```

---

## 📋 Checklist Pre-Deploy

Antes de cada deploy en producción, verificar:

- [ ] `JWT_SECRET` tiene mínimo 32 caracteres aleatorios
- [ ] `DB_PASSWORD` es fuerte (12+ caracteres)
- [ ] `ALLOWED_ORIGINS` solo incluye dominios de producción (sin localhost)
- [ ] `VITE_API_URL` apunta correctamente al backend
- [ ] `DEBUG` está en `false`
- [ ] No hay URLs hardcodeadas en el código
- [ ] No hay secrets hardcodeados en el código
- [ ] `.env` está en `.gitignore`
- [ ] Ejecutar `./scripts/validate-env.sh` sin errores

---

## 🛠️ Solución de Problemas

### "Cannot find module" o "env is not defined"

Asegúrate de que las variables tienen el prefijo correcto:
- **Frontend (Vite)**: Usar `VITE_` prefix → `import.meta.env.VITE_API_URL`
- **Backend (Node)**: Usar `process.env.API_URL`
- **Backend (Python)**: Usar `os.getenv("API_URL")`

### Cambios en .env no se reflejan

Para el **frontend**:
```bash
cd frontend
rm -rf node_modules/.vite  # Limpiar cache
cd ..
docker-compose up --build frontend  # Reconstruir
```

Para el **backend**:
```bash
docker-compose restart backend  # Suficiente para Python
```

### CORS errors en producción

1. Verificar `ALLOWED_ORIGINS` incluye el dominio exacto (con https://)
2. Verificar que no hay espacios después de las comas en la lista
3. Si usas proxy nginx, asegúrate de que `VITE_API_URL=/api`

---

## 📚 Recursos Adicionales

- [12-Factor App: Config](https://12factor.net/config)
- [Vite Env Variables](https://vitejs.dev/guide/env-and-mode.html)
- [FastAPI Settings](https://fastapi.tiangolo.com/advanced/settings/)
- [Coolify Environment Variables](https://coolify.io/docs/environment-variables)

---

## 🎯 Reglas de Oro

1. **NUNCA** hardcodear URLs, secrets o configuraciones
2. **SIEMPRE** usar `.env.example` como template documentado
3. **NUNCA** commitear archivos `.env` reales
4. **SIEMPRE** validar con `./scripts/validate-env.sh` antes de commit
5. **NUNCA** incluir `localhost` en `ALLOWED_ORIGINS` de producción
6. **SIEMPRE** usar proxies internos cuando sea posible (elimina CORS)
