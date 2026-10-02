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
├── docker-compose.yml
├── coolify.json
└── .env.example
```

### 1.2 Configurar Variables de Entorno

1. Copia el archivo de ejemplo, que contiene solo las tres variables obligatorias:
   ```bash
   cp .env.example .env
   ```

2. Asigna valores seguros a estas variables en `.env`:
   ```env
   DB_PASSWORD=<CLAVE_SEGURA_DE_POSTGRES>
   JWT_SECRET=<CLAVE_ALEATORIA_DE_32_CARACTERES_O_MAS>
   INITIAL_ADMIN_PASSWORD=<CLAVE_SEGURA_DEL_ADMINISTRADOR>
   ```

El frontend usa `/api` a través del proxy interno de Nginx. Los demás parámetros
se resuelven con valores predeterminados y solo requieren ajuste en despliegues
con una topología diferente.

## 🌐 Paso 2: Configurar en Coolify

### 2.1 Crear Nuevo Proyecto

1. Inicia sesión en tu panel de Coolify.
2. Haz clic en **"New Project"**.
3. Selecciona **"Docker Compose"** como tipo de aplicación.
4. Conecta tu repositorio de GitHub o GitLab.
5. Selecciona la rama principal (`main` o `master`).

### 2.2 Configuración de Variables de Entorno

En la sección **"Environment Variables"** de Coolify, configura solo estas tres variables:

| Variable | Descripción |
|----------|-------------|
| `DB_PASSWORD` | Contraseña de PostgreSQL. Usa una clave segura de al menos 12 caracteres. |
| `JWT_SECRET` | Clave aleatoria para firmar sesiones; debe tener al menos 32 caracteres. |
| `INITIAL_ADMIN_PASSWORD` | Contraseña para crear el administrador inicial. |

No necesitas registrar variables para el proxy del frontend ni CORS en la
instalación estándar. Coolify aplica los valores predeterminados; ajusta otras
opciones solo cuando las necesites.

### 2.3 Configurar Dominios

1. Frontend: configura el dominio principal (por ejemplo, `sennova.tucoolify.app`).

El frontend enruta las solicitudes de `/api` al backend por la red interna de
Docker. No necesitas asignar un dominio público al backend para la instalación
estándar.

### 2.4 Configurar Volúmenes Persistentes

El archivo `docker-compose.yml` declara los volúmenes persistentes de la base de
datos, los archivos cargados y las copias de seguridad. Confirma que Coolify los
conserve entre despliegues.

## 🚀 Paso 3: Desplegar

### 3.1 Primera Configuración

1. En Coolify, clic en **"Deploy"**
2. Espera a que se complete la construcción de las imágenes
3. Verifica que todos los servicios estén healthy

### 3.2 Verificar Despliegue

1. **Estado del backend**:
   ```
   https://sennova.tucoolify.app/health
   ```
   Debe responder: `{"status": "ok", "version": "2.0.0"}`

2. La documentación interactiva de la API está desactivada en producción.

3. **Frontend**:
   ```
   https://sennova.tucoolify.app
   ```

## 🔒 Paso 4: Configuraciones de Seguridad

### 4.1 Confirmar el acceso inicial

1. Inicia sesión con el correo predeterminado `admin@sena.edu.co` y el valor de
   `INITIAL_ADMIN_PASSWORD` que configuraste en Coolify.
2. Entra a **Gestión de Usuarios** y cambia la contraseña cuando la política
   institucional lo requiera.

### 4.2 Configurar HTTPS

Coolify configura HTTPS automáticamente con Let's Encrypt si tienes:
- Un dominio configurado
- Puerto 443 abierto

### 4.3 Firewall y Seguridad

Expón el frontend por los puertos 80/443. El backend y PostgreSQL deben
permanecer en la red interna; Nginx enruta las solicitudes de API desde el
frontend.

## 🔄 Paso 5: Mantenimiento

### 5.1 Backups Automáticos

El sistema incluye un servicio de respaldo que crea copias cada 24 horas:

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

**Solución**: Si el frontend y la API usan dominios diferentes, configura
`ALLOWED_ORIGINS` con el origen exacto del frontend. En la instalación estándar,
ambos se comunican mediante el proxy interno de Nginx.

### Problema: Base de datos no conecta

**Solución**:
1. Verifica que el servicio `postgres` esté healthy
2. Confirma que PostgreSQL y el backend reciban el mismo valor de `DB_PASSWORD`.
3. Verifica la URL de conexión en los logs del backend

### Problema: Frontend no muestra datos

**Solución**:
1. Confirma que el frontend use `/api` y que el proxy interno de Nginx esté activo.
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
3. El servicio `sennova-backup` crea copias automáticas cada 24 horas.

## 🆘 Soporte

Si encuentras problemas:

1. Revisa los logs en Coolify (Deployment Logs)
2. Verifica la conectividad entre servicios
3. Confirma que estén configuradas `DB_PASSWORD`, `JWT_SECRET` e `INITIAL_ADMIN_PASSWORD`.
4. Consulta la documentación de Coolify: https://coolify.io/docs/

---

**¡Listo! Tu sistema SENNOVA CGAO está desplegado en Coolify.** 🎉
