# Datos obligatorios del primer despliegue

**Fecha:** 2026-08-18 · **Alcance:** `backend/app/bootstrap.py`, `backend/scripts/bootstrap_initial_data.py`, `backend/entrypoint.sh`, `docker-compose.yml`, `docker-compose.coolify.yml`

## Qué datos deben existir antes de que la aplicación sirva tráfico

El modelo de datos no tiene tablas de catálogo: roles, estados, tipologías,
categorías Minciencias y las fases del cronograma SENNOVA están en el código
(`app/routers/plantillas.py`, columnas con `default` en `app/models.py`). Por eso
el único dato de negocio que la base de datos necesita antes del primer login es
**un usuario con rol `admin`**.

Todo lo demás — grupos, semilleros, proyectos, convocatorias, retos, aprendices,
productos, entregables — lo crea ese administrador desde la interfaz y tiene
`owner_id` apuntando a un usuario, así que no puede precargarse sin un
administrador previo.

Fuente de esos datos, por orden de dependencia:

| Dato | Variable | Obligatorio | Notas |
|---|---|---|---|
| Correo del admin | `INITIAL_ADMIN_EMAIL` | Sí (tiene default) | `admin@sena.edu.co` por defecto; es único en `users.email`. |
| Contraseña del admin | `INITIAL_ADMIN_PASSWORD` | **Sí, sin default** | Mínimo 12 caracteres con `DEBUG=false`. Sin ella el contenedor falla al arrancar. |
| Nombre, sede | `INITIAL_ADMIN_NOMBRE`, `INITIAL_ADMIN_SEDE` | No | Solo presentación. |
| Documento | `INITIAL_ADMIN_DOCUMENTO` | No | Único en `users.documento`; si ya está ocupado el arranque falla con el correo del dueño. |
| Firma de sesiones | `JWT_SECRET` | **Sí, sin default** | Mínimo 32 caracteres; `validate_production_settings` lo bloquea en producción. |
| Base de datos | `DATABASE_URL` o `DB_*` | Sí | Sin `DB_PASSWORD` ni `DATABASE_URL` la app cae a SQLite local. |
| Origen del frontend | `ALLOWED_ORIGINS` | Sí en producción | Sin él, el navegador bloquea toda petición autenticada. |
| API del frontend | `VITE_API_URL` (build arg) | No | Default `/api`, que es lo correcto detrás de nginx. Se hornea en el build. |

## Dónde se ejecuta

En el **entrypoint del contenedor de backend**, no en un servicio aparte:

```
entrypoint.sh → espera PostgreSQL → scripts/bootstrap_initial_data.py → uvicorn
```

Se eligió el entrypoint sobre un servicio `db-init` dedicado porque:

- corre exactamente una vez por arranque de backend, sin carrera con el propio
  backend por el mismo esquema;
- funciona igual en `docker compose up`, en Coolify y en `docker run`, sin que el
  operador tenga que acordarse de un paso previo;
- si falla, el contenedor no queda arriba sirviendo una instalación a medias.

El servicio `sennova-db-init` que existía en `docker-compose.coolify.yml` se
eliminó: ejecutaba `alembic upgrade head` y el repositorio no tiene ni
`alembic.ini` ni carpeta de migraciones, así que fallaba en todo despliegue. El
esquema lo materializan `Base.metadata.create_all` y `scripts/fix_db_schema.py`.

## Contrato del bootstrap

`app.bootstrap.ensure_initial_admin` es la única implementación; la usan el
script del entrypoint y el `lifespan` de FastAPI (arranque local en Windows), de
modo que ambos caminos producen el mismo estado.

1. **No publica credenciales por defecto.** Contraseña vacía o de menos de 12
   caracteres con `DEBUG=false` ⇒ `AdminBootstrapError` y salida distinta de
   cero. Antes, con `INITIAL_ADMIN_PASSWORD` sin definir se creaba
   `admin@sena.edu.co` con contraseña vacía y `LoginRequest` no exige longitud,
   así que cualquiera entraba como administrador.
2. **Es idempotente.** Si ya existe un administrador (por correo objetivo o por
   rol) no crea otro ni reescribe su contraseña: un redespliegue no puede
   revertir la credencial que el operador cambió desde la aplicación.
3. **Falla con mensaje accionable** cuando `INITIAL_ADMIN_DOCUMENTO` ya pertenece
   a otro usuario, en vez de romper con un error de integridad.

Pruebas: `backend/tests/test_bootstrap_admin.py`.

## Poblado de demostración

`SEED_INITIAL_DATA=true` ejecuta `scripts/seed_demo_data.py`, que **borra**
grupos, semilleros, proyectos, productos, retos, convocatorias, aprendices,
bitácora y todos los usuarios distintos de `admin@sena.edu.co`, y crea usuarios
con contraseñas de ejemplo. Solo se ejecuta con `DEBUG=true`; en producción se
ignora con un aviso explícito en el log.
