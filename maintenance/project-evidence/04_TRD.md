# Contratos técnicos

FastAPI y SQLAlchemy usan PostgreSQL en producción. La suite ordinaria usa SQLite y la suite de integración usa PostgreSQL con esquemas efímeros.

El catálogo se ejecuta desde el entrypoint y el ciclo de vida. El expediente utiliza `Documento`, `Proyecto` y sus productos reales. `periodo_bimestre` es opcional para registros existentes y obligatorio para informes nuevos. Los endpoints autenticados son `/proyectos/{id}/expediente` y `/proyectos/{id}/expediente/descargar`.

La carga compensa el archivo si falla el commit. El cierre agrupa estado, actividad y notificaciones en una transacción. El retiro físico sucede después del commit; cualquier limpieza pendiente se comunica con IDs. La interfaz comparte autenticación del cliente API y eventos centrales de refresco.

Detalles y límites: `docs/architecture/expediente-proyectos.md`.
