# Persistencia de importación

La importación usa las tablas existentes `proyectos` y `documentos`; no requiere una nueva tabla ni una migración. El registro de documento queda relacionado mediante `entidad_tipo="proyecto"` y el identificador del proyecto.

El proyecto y el documento se guardan en la misma sesión SQLAlchemy. Si no se puede almacenar el DOCX o confirmar la transacción, se revierte el proyecto y se elimina el archivo temporal.

Este repositorio usa FastAPI, SQLAlchemy y PostgreSQL/SQLite; no usa Supabase. Por eso, el control de acceso de esta función se aplica con el usuario autenticado y las rutas protegidas ya existentes, en lugar de agregar políticas RLS de Supabase que no operarían en esta aplicación.
