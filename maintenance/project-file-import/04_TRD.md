# Contrato técnico

Se conserva React/Vite, FastAPI, SQLAlchemy y PostgreSQL. El frontend usa multipart autenticado y el mecanismo central de actualización de datos. El análisis marca `mutates: false`; únicamente el registro confirmado refresca las vistas.

Las rutas son `POST /proyectos/{id}/expediente/analizar-archivos` e `importar-archivos`. Reciben `files`, `carpeta` y `tipo`. La confirmación añade `seleccion` con rutas, hashes, bimestres e indicación de aplicar datos. El servidor vuelve a analizar, bloquea el proyecto, valida el resultado y confirma la transacción.

Los originales usan identificadores internos de almacenamiento. Las rutas aportadas se conservan como metadatos y se validan al exportar; nunca se usan para extraer archivos directamente sobre el disco. La lectura y persistencia se ejecutan fuera del bucle de atención de solicitudes.
