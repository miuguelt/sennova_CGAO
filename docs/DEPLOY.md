# Guía de despliegue de SENNOVA CGAO

Esta guía cubre el despliegue con Coolify o Docker Compose. La instalación estándar requiere tres variables de entorno; las demás opciones tienen valores predeterminados.

## Requisitos

- Coolify o Docker Compose instalado en el servidor.
- El repositorio disponible en el servidor.
- Un dominio para publicar el frontend.

## Variables obligatorias

Configura estos valores en Coolify o en el archivo `.env` local:

| Variable | Uso |
|---|---|
| `DB_PASSWORD` | Contraseña que usan PostgreSQL y los procesos de respaldo. |
| `JWT_SECRET` | Clave aleatoria de al menos 32 caracteres para firmar sesiones. |
| `INITIAL_ADMIN_PASSWORD` | Contraseña del administrador creado durante el primer arranque. |

No uses valores predeterminados para estas contraseñas. En Coolify, guarda cada una como secreto. Para un despliegue local, copia `.env.example` a `.env` y reemplaza los marcadores antes de iniciar Compose.

El frontend usa `/api` y Nginx envía esas solicitudes al backend por la red interna. No necesitas configurar `VITE_API_URL` ni `ALLOWED_ORIGINS` para esta topología. Si publicas el backend en otro dominio, configura ambas variables según tus dominios.

## Despliegue con Coolify

1. Crea un recurso de tipo **Docker Compose** y conecta el repositorio.
2. Usa `docker-compose.yml` como archivo de Compose.
3. Configura las tres variables obligatorias de la tabla.
4. Asigna un dominio al frontend y conserva el backend y PostgreSQL en la red interna.
5. Confirma que los volúmenes declarados en Compose persistan entre despliegues.
6. Inicia el despliegue y revisa el estado de los servicios.

## Despliegue manual

```bash
git clone "$REPOSITORY_URL"
cd sennova
cp .env.example .env
```

Define `REPOSITORY_URL` con la dirección del repositorio antes de ejecutar el
comando. Edita `.env` para reemplazar los tres marcadores. Luego inicia y revisa
los servicios:

```bash
docker compose up -d
docker compose ps
docker compose logs -f sennova-backend
```

No publiques PostgreSQL ni el backend directamente en Internet. El frontend expone `/api` mediante Nginx.

## Verificación y copias de seguridad

Abre `https://<DOMINIO_DEL_FRONTEND>/health`. El servicio debe responder con el estado de la API. La documentación interactiva permanece desactivada en producción.

Compose conserva los datos en los volúmenes `pg_data`, `storage_data`, `uploads_data` y `backups_data`. El servicio `sennova-backup` crea una copia cada 24 horas y conserva las siete más recientes.

## Solución de problemas

- **La base de datos no inicia:** confirma que `DB_PASSWORD` tenga un valor y que PostgreSQL y el backend reciban el mismo secreto.
- **El administrador no puede iniciar sesión:** verifica que el correo predeterminado sea `admin@sena.edu.co` y que `INITIAL_ADMIN_PASSWORD` coincida con el valor configurado antes del primer arranque.
- **El navegador reporta CORS:** en la instalación estándar, usa la dirección del frontend y el proxy `/api`. Para dominios separados, configura `ALLOWED_ORIGINS` y `VITE_API_URL`.
- **No aparecen archivos cargados tras un redespliegue:** confirma que `storage_data` y `uploads_data` persistan en Coolify.

No subas el archivo `.env` real al repositorio. Las credenciales de producción deben permanecer en el almacén de secretos de Coolify.
