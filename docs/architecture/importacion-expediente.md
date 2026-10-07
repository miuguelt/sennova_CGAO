# Importación de archivos al expediente

## Decisión

Se amplía el expediente existente de React y FastAPI mediante una funcionalidad de importación. El almacenamiento de originales sigue usando `Documento`; los datos detectados alimentan los formularios `ProjectDocumentation` y `ProjectDocumentDraft`. No se crea un segundo constructor documental.

El investigador selecciona un ZIP o archivos individuales, revisa rutas, clasificación y datos detectados, y confirma el registro en el proyecto abierto. El análisis no escribe datos. La confirmación vuelve a validar los archivos y sus hashes. Solo completa campos vacíos; los valores diferentes ya registrados se conservan y se informan para revisión. Los archivos sin datos reconocibles permanecen como soportes descargables. Las firmas, aprobaciones, integrantes y productos no se inventan ni se registran como aprobados por una importación.

## Contratos y responsabilidades

- `services/project_file_import/archive.py`: límites, rutas y lectura segura del ZIP o archivos sueltos, sin extraer rutas aportadas a disco.
- `services/project_file_import/reader.py`: clasificación y lectura determinista de contenido compatible; propuestas con fuente y advertencias.
- `services/project_file_import/models.py` y `schema.py`: tablas aditivas de procedencia y carpetas, con migración reversible.
- `services/project_file_import/data.py`: aplicación a campos vacíos del catálogo vigente, bajo el bloqueo del proyecto.
- `services/project_file_import/service.py`: análisis y transacción de documentos, procedencia y datos. Compensa archivos escritos si falla la transacción.
- `services/project_file_import/export.py`: reconstrucción de rutas sin colisiones, compatible con los documentos anteriores.
- `routers/project_file_import.py`: multipart autenticado, permisos, validación de la selección y límites de lectura.
- `components/projects/ProjectFileImport*.jsx` y `api/projectFileImport.js`: selección, revisión, confirmación y actualización del expediente.

La API publica `POST /proyectos/{id}/expediente/analizar-archivos` y `POST /proyectos/{id}/expediente/importar-archivos`. Recibe `files`, `carpeta` y `tipo`; la confirmación añade `seleccion` con ruta, hash, bimestre e indicación de registrar datos. La descarga existente del expediente incorpora las rutas conservadas y las carpetas vacías. Las descargas individuales y la generación por versión siguen usando sus contratos actuales.

Las dependencias van desde la interfaz hacia las rutas, los servicios de importación y los modelos persistentes. Se reutilizan el catálogo, los permisos y la generación documental. Se descarta un proceso de IA externo para evitar inferencias y transferencias de documentos no solicitadas; tampoco se usa una extracción genérica que prometa convertir cualquier archivo en campos.

## Verificación y límites

Las pruebas cubren análisis sin escrituras, importación ZIP y suelta, restauración de carpetas, archivos repetidos, separación entre proyectos, errores y reversión, preservación de campos diligenciados, permisos y regeneración desde los datos registrados. La suite y la compuerta de funciones existentes incluyen los módulos nuevos. Se ejecuta una integración en PostgreSQL con esquema temporal cuando la conexión de pruebas esté disponible.

Límites: ZIP de 50 MB, 200 MB expandidos o de archivos individuales en conjunto, 10 MB por archivo, 500 archivos y 1.500 entradas. Se rechazan rutas inseguras, enlaces, cifrado, archivos dañados y colisiones internas. No se aplica OCR. Los datos y los formatos generados requieren revisión institucional.

## Verificación realizada el 7 de octubre de 2026

| Capa | Responsable | Entrada y salida | Dependencia | Estado |
| --- | --- | --- | --- | --- |
| Lectura | Agente de lectores | Archivos → manifiesto y propuesta | Catálogo existente | Verificada |
| Datos y API | Coordinador | Propuesta revisada → originales y campos persistidos | Lectores y modelos | Verificada |
| Interfaz | Agente de interfaz | Selección → revisión y confirmación | Contrato HTTP | Verificada |
| Integración | Coordinador | Importación → consulta, regeneración y descarga | Capas anteriores | Verificada |

- `python -m pytest tests/ --cov=app`: **678 pruebas aprobadas**. Reportes bajo `test-results/project-file-import/`.
- `python -m pytest integration_tests/`: **17 pruebas aprobadas** en PostgreSQL real, cada una con esquema temporal propio. Se verificaron UUID, JSONB, migración reversible, originales, carpetas e idempotencia.
- `npm run test:coverage`: **818 pruebas aprobadas**. Las compuertas globales de funciones aprobaron **536/536** en backend y **2641/2641** en frontend. Los contratos existentes de CI descubren automáticamente todas las pruebas nuevas y publican los reportes de cobertura.
- `npm run build`: compilación aprobada.
- Componentes renderizados con CSS compilado: **12 combinaciones** de ancho y zoom sin desbordamientos detectados. Capturas y mediciones en `artifacts/project-file-import/`. Esta revisión visual usa datos de prueba y no reemplaza la integración HTTP comprobada por las pruebas de API.
- `Invoke-DevBrainGitGate.ps1 -Mode WorkingTree`: aprobado. La compuerta de modularidad no encontró errores; conservó advertencias de tamaño para el lector de 399 líneas y el archivo principal existente. Se revisó el lector como una capacidad cohesiva de lectura y propuesta, con 100 % de sus funciones ejecutadas por pruebas.

Las regresiones incluyeron nombres largos, carpetas llamadas como los manifiestos del ZIP, informes incompatibles con la duración importada y atención concurrente mientras se analiza una carga. La migración se verificó mediante pruebas reales porque la compuerta estática solo detecta archivos en directorios convencionales de migraciones y no cuenta esta migración incremental del arranque. No se instalaron dependencias nuevas ni se inició el runtime de la aplicación durante la verificación.
