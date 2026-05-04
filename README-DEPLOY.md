# 🚀 Guía de Despliegue SENNOVA CGAO en Coolify

Esta guía te ayudará a desplegar el sistema SENNOVA CGAO en Coolify usando Docker Compose.

## 📋 Requisitos Previos

- Acceso a una instancia de Coolify v4 o superior
- Repositorio del proyecto en GitHub/GitLab
- Conocimiento básico de Docker y variables de entorno

## 🔧 Paso 1: Preparar el Repositorio

### 1.1 Verificar Archivos Necesarios

Asegúrate de que estos archivos estén en tu repositorio:

```
.
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
├── docker-compose.prod.yml
├── coolify.json
└── .env.example
```

### 1.2 Configurar Variables de Entorno

1. Copia el archivo de ejemplo:
   ```bash
   cp .env.example .env
   ```

2. Edita `.env` con valores seguros para producción:
   ```env
   DB_PASSWORD=tu_contraseña_segura_de_postgres_2024
   JWT_SECRET=genera_un_string_de_32_caracteres_o_mas_aqui
   ALLOWED_ORIGINS=https://sennova.tucoolify.app,https://api-sennova.tucoolify.app
   VITE_API_URL=https://api-sennova.tucoolify.app
   INITIAL_ADMIN_EMAIL=admin@sena.edu.co
   INITIAL_ADMIN_PASSWORD=admin_password_segura_2024
   ```

> ⚠️ **IMPORTANTE**: Genera un JWT_SECRET seguro con al menos 32 caracteres.

## 🌐 Paso 2: Configurar en Coolify

### 2.1 Crear Nuevo Proyecto

1. Inicia sesión en tu panel de Coolify
2. Clic en **"New Project"**
3. Selecciona **"Docker Compose"** como tipo de aplicación
4. Conecta tu repositorio de GitHub/GitLab
5. Selecciona la rama principal (main/master)

### 2.2 Configuración de Variables de Entorno

En la sección **"Environment Variables"** de Coolify, agrega todas las variables del archivo `.env`:

| Variable | Valor de Ejemplo | Descripción |
|----------|------------------|-------------|
| `DB_PASSWORD` | `SecureP4ssw0rd!` | Contraseña de PostgreSQL |
| `JWT_SECRET` | `min32chars_secret_key_here_abc123xyz` | Secret para JWT |
| `ALLOWED_ORIGINS` | `https://sennova.tu.coolify.app` | Dominios permitidos CORS |
| `VITE_API_URL` | `https://api-sennova.tu.coolify.app` | URL del backend |
| `INITIAL_ADMIN_EMAIL` | `admin@sena.edu.co` | Email admin inicial |
| `INITIAL_ADMIN_PASSWORD` | `AdminP4ss!` | Contraseña admin inicial |

### 2.3 Configurar Dominios

1. Frontend: Configura el dominio principal (ej: `sennova.tucoolify.app`)
2. Backend: Configura el subdominio para la API (ej: `api-sennova.tucoolify.app`)
3. pgAdmin (opcional): `pgadmin-sennova.tucoolify.app`

### 2.4 Configurar Volúmenes Persistentes

En Coolify, asegúrate de configurar estos volúmenes:

```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data    # Datos de BD
  - sennova_storage:/app/storage               # Archivos del sistema
  - backup_data:/backups                       # Backups automáticos
```

## 🚀 Paso 3: Desplegar

### 3.1 Primera Configuración

1. En Coolify, clic en **"Deploy"**
2. Espera a que se complete la construcción de las imágenes
3. Verifica que todos los servicios estén healthy

### 3.2 Verificar Despliegue

1. **Health Check Backend**:
   ```
   https://api-sennova.tucoolify.app/health
   ```
   Debe responder: `{"status": "ok", "version": "2.0.0"}`

2. **Documentación API**:
   ```
   https://api-sennova.tucoolify.app/docs
   ```

3. **Frontend**:
   ```
   https://sennova.tucoolify.app
   ```

## 🔒 Paso 4: Configuraciones de Seguridad

### 4.1 Cambiar Contraseñas por Defecto

1. Accede al sistema con las credenciales iniciales
2. Ve a "Gestión de Usuarios"
3. Cambia la contraseña del administrador

### 4.2 Configurar HTTPS

Coolify configura HTTPS automáticamente con Let's Encrypt si tienes:
- Un dominio configurado
- Puerto 443 abierto

### 4.3 Firewall y Seguridad

En Coolify, el único servicio expuesto externamente debe ser:
- **Frontend**: Puerto 80/443
- **Backend**: Puerto 8000 (si accedes directamente)

Los demás servicios (PostgreSQL, pgAdmin) deben estar en la red interna.

## 🔄 Paso 5: Mantenimiento

### 5.1 Backups Automáticos

El sistema incluye un servicio de backup que crea dumps cada 6 horas:

```bash
# Ver backups en el contenedor
docker exec sennova-backup ls -la /backups/

# Restaurar un backup (ejecutar en postgres)
docker exec -i sennova-postgres psql -U sennova -d sennova < backup_file.sql
```

### 5.2 Actualizar el Sistema

1. Actualiza tu repositorio con los nuevos cambios
2. En Coolify, clic en **"Redeploy"**
3. Los volúmenes persistentes mantendrán los datos

### 5.3 Monitoreo

Usa el health check integrado:
```bash
curl https://api-sennova.tucoolify.app/health
```

## 🛠️ Solución de Problemas

### Problema: CORS Error

**Solución**: Verifica que `ALLOWED_ORIGINS` incluya tu dominio exacto de Coolify.

### Problema: Base de datos no conecta

**Solución**:
1. Verifica que el servicio `postgres` esté healthy
2. Revisa que `DB_PASSWORD` coincida en todas las variables
3. Verifica la URL de conexión en los logs del backend

### Problema: Frontend no muestra datos

**Solución**:
1. Verifica que `VITE_API_URL` apunte correctamente al backend
2. Revisa la consola del navegador (F12)
3. Verifica que el backend responda correctamente

### Problema: Volúmenes no persistentes

**Solución**: En Coolify, asegúrate de marcar los volúmenes como persistentes en la configuración.

## 📊 Recursos Recomendados

| Servicio | CPU | Memoria |
|----------|-----|---------|
| PostgreSQL | 0.5 - 1 core | 512MB - 1GB |
| Backend | 0.5 - 1 core | 256MB - 512MB |
| Frontend | 0.25 - 0.5 core | 128MB - 256MB |

## 📝 Notas Importantes

1. **NO** subas el archivo `.env` real al repositorio
2. Los volúmenes de Coolify persisten entre despliegues
3. El servicio `backup` crea dumps automáticos cada 6 horas
4. pgAdmin está comentado en `docker-compose.prod.yml` por seguridad
5. El backend usa SQLite como fallback solo si PostgreSQL no está disponible

## 🆘 Soporte

Si encuentras problemas:

1. Revisa los logs en Coolify (Deployment Logs)
2. Verifica la conectividad entre servicios
3. Asegúrate de que todas las variables de entorno estén configuradas
4. Consulta la documentación de Coolify: https://coolify.io/docs/

---

**¡Listo! Tu sistema SENNOVA CGAO está desplegado en Coolify.** 🎉
