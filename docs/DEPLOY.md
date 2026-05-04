# 🚀 Guía de Deploy - SENNOVA CGAO

Esta guía te ayudará a desplegar el sistema SENNOVA CGAO en **Coolify** o cualquier servidor con Docker.

## 📋 Índice
- [Requisitos](#requisitos)
- [Deploy en Coolify](#deploy-en-coolify)
- [Deploy Manual con Docker](#deploy-manual)
- [Configuración de Variables](#configuración-de-variables)
- [Backups](#backups)
- [Troubleshooting](#troubleshooting)

---

## 🔧 Requisitos

- **Coolify** v4+ instalado (o servidor con Docker y Docker Compose)
- **Git** para clonar el repositorio
- Dominio configurado (opcional, Coolify genera uno automáticamente)

---

## 🚀 Deploy en Coolify

### Paso 1: Crear Proyecto en Coolify

1. Accede a tu panel de Coolify (`https://tu-coolify.example.com`)
2. Clic en **"Create New Project"**
3. Selecciona **"Docker Compose"** como tipo de proyecto
4. Nombre: `sennova-cgao`

### Paso 2: Configurar Repositorio

1. En el proyecto, clic en **"Add New Resource"**
2. Selecciona **"Docker Compose"**
3. Configura:
   - **Repository**: URL de tu repo (ej: `https://github.com/tuusuario/sennova-cgao`)
   - **Branch**: `main`
   - **Docker Compose Path**: `docker-compose.yml`

### Paso 3: Configurar Variables de Entorno

Ve a la sección **"Environment Variables"** y configura:

```bash
# Base de datos (REQUERIDO)
DB_PASSWORD=tu_password_seguro_aqui

# Seguridad JWT (REQUERIDO - cambiar en producción!)
JWT_SECRET=una_clave_secreta_larga_y_aleatoria_minimo_32_caracteres

# CORS - dominios permitidos
ALLOWED_ORIGINS=https://tu-dominio.com,https://app.tu-dominio.com

# pgAdmin (opcional)
PGADMIN_EMAIL=admin@sena.edu.co
PGADMIN_PASSWORD=tu_password_pgadmin
```

### Paso 4: Persistent Volumes

En Coolify, asegúrate de marcar estos volúmenes como persistentes:
- `postgres_data` - Datos de PostgreSQL
- `pgadmin_data` - Configuración pgAdmin
- `backup_data` - Backups automáticos

### Paso 5: Deploy

1. Clic en **"Deploy"**
2. Espera a que Coolify construya y despliegue los servicios
3. Verifica en los logs que PostgreSQL y el backend iniciaron correctamente

### Paso 6: Acceder

Coolify generará URLs automáticamente:
- **API**: `https://api-sennova-cgao.tucoolify.com`
- **pgAdmin**: `https://pgadmin-sennova-cgao.tucoolify.com`

---

## 🐳 Deploy Manual con Docker

Si prefieres deployar manualmente en tu servidor:

```bash
# 1. Clonar repositorio
git clone https://github.com/tuusuario/sennova-cgao.git
cd sennova-cgao

# 2. Crear archivo de variables
cp .env.example .env
# Editar .env con tus valores

# 3. Iniciar servicios
docker-compose up -d

# 4. Verificar logs
docker-compose logs -f backend
docker-compose logs -f postgres
```

---

## 🔐 Configuración de Variables

### Variables Obligatorias

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DB_PASSWORD` | Contraseña PostgreSQL | `S3gur4_2024!` |
| `JWT_SECRET` | Clave secreta JWT | `minimo-32-caracteres-seguros` |

### Variables Opcionales

| Variable | Default | Descripción |
|----------|---------|-------------|
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Dominios permitidos (CORS) |
| `JWT_EXPIRATION_HOURS` | `24` | Duración de tokens JWT |
| `PGADMIN_EMAIL` | `admin@sena.edu.co` | Email pgAdmin |
| `PGADMIN_PASSWORD` | `admin123` | Password pgAdmin |

---

## 💾 Backups

### Backups Automáticos

El servicio `backup` en docker-compose crea dumps automáticos:
- **Frecuencia**: Cada 6 horas
- **Retención**: 7 días (los más antiguos se eliminan)
- **Ubicación**: Volumen `backup_data`

### Backup Manual

```bash
# Crear backup
docker exec sennova-postgres pg_dump -U sennova sennova > backup_$(date +%Y%m%d).sql

# Copiar desde contenedor
docker cp sennova-postgres:/backups/backup_20240101.sql ./
```

### Restaurar Backup

```bash
# Restaurar a PostgreSQL
docker exec -i sennova-postgres psql -U sennova sennova < backup_20240101.sql
```

---

## 🔧 Troubleshooting

### El backend no conecta a PostgreSQL

1. Verificar que PostgreSQL esté saludable:
   ```bash
   docker-compose ps
   ```

2. Revisar logs:
   ```bash
   docker-compose logs postgres
   docker-compose logs backend
   ```

3. Verificar DATABASE_URL en el backend

### Error de CORS

Actualizar `ALLOWED_ORIGINS` con tu dominio exacto:
```bash
ALLOWED_ORIGINS=https://tu-dominio.com
```

### pgAdmin no conecta a PostgreSQL

Configurar conexión en pgAdmin:
- **Host**: `postgres` (nombre del servicio)
- **Port**: `5432`
- **Database**: `sennova`
- **Username**: `sennova`
- **Password**: (valor de DB_PASSWORD)

### Reiniciar servicios

```bash
# Reiniciar todo
docker-compose restart

# Reiniciar solo backend
docker-compose restart backend

# Reconstruir y reiniciar
docker-compose up -d --build backend
```

---

## 📊 Verificación Post-Deploy

Después del deploy, verifica que todo funciona:

1. **Health Check**: `https://tu-api.com/health`
   - Debe retornar: `{"status": "ok"}`

2. **API Docs**: `https://tu-api.com/docs`
   - Swagger UI debe cargar

3. **Login**: Intenta iniciar sesión con:
   - Email: `admin@sena.edu.co`
   - Password: `123456`

4. **pgAdmin**: `https://tu-pgadmin.com`
   - Debe mostrar login de pgAdmin4

---

## 🆘 Soporte

Si tienes problemas:
1. Revisar logs: `docker-compose logs -f`
2. Verificar variables de entorno
3. Confirmar volúmenes persistentes están configurados
4. Contactar administrador del servidor

---

## 📚 Recursos

- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **Coolify Docs**: https://coolify.io/docs/
- **PostgreSQL**: https://www.postgresql.org/docs/
