# Persistencia y reversibilidad

`project_file_batches` registra proyecto, carpetas, autor y fecha. `project_imported_files` vincula cada original `Documento` con ruta, hash, texto y propuesta. Se reutilizan `project_documentation` y `project_document_drafts` para los datos reconocidos, aumentando su revisión cuando cambian.

La migración añade tablas sin modificar columnas anteriores. Su reversión solo permite retirarlas cuando están vacías. Las pruebas comprueban idempotencia, UUID/JSONB, relaciones y protección de registros en PostgreSQL.

Se preserva la autorización de la API existente para administradores e investigadores. Este proyecto usa PostgreSQL con SQLAlchemy; no incorpora Supabase ni cambia su modelo de autorización.
