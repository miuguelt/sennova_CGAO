# Persistencia en PostgreSQL

Proyecto y Producto conservan identidad, relaciones, objetivos y presupuesto del sistema. ProjectDocumentation usa proyecto_id como PK y FK, revisión optimista y datos complementarios JSONB. ProjectDocumentDraft usa UUID, FK al proyecto, clave única por proyecto, tipo, producto o bimestre, revisión y datos JSONB. ProjectDocumentVersion usa FK al borrador y Documento, número único por borrador, revisiones fuente, snapshot JSONB, SHA256, estado y autor de revisión.

Las versiones conservan la información usada para generar cada archivo; una edición no altera un snapshot anterior. Documento almacena la ruta del archivo en el volumen persistente. La información común se reutiliza y los resultados por bimestre o producto conservan su contexto.

La fuente íntegra del ejemplo se conserva exclusivamente en fuente_snapshot del proyecto privado de referencia, con hashes, ubicación y observaciones. No se usa como catálogo global ni semillado de producción.

El esquema es aditivo e idempotente; su reversión rechaza tablas con datos. La aplicación conserva PostgreSQL y la política de acceso existente; este cambio no incorpora otro proveedor de base de datos.
