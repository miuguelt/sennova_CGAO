# Diseño técnico de importación CAP

## Componentes

- `ProjectFormulationImport.jsx` administra selección, lectura, reintento y estados accesibles.
- `ProyectosAPI` envía solicitudes multipart para analizar o confirmar una formulación.
- FastAPI expone `POST /proyectos/analizar-formulacion` y `POST /proyectos/importar-formulacion`.
- `proyecto_import_service.py` lee el OOXML con la biblioteca estándar y no ejecuta macros ni instrucciones del archivo.

## Reglas de extracción

- Se admiten archivos `.docx` de máximo 10 MB.
- El lector limita a 30 MB el tamaño expandido del paquete y rechaza XML con entidades o DTD.
- Un middleware limita el cuerpo multipart antes del análisis: 10 MB más 256 KiB para previsualización, y 10 MB de archivo más hasta 60 MB de contenido expandido serializado (2 × 30 MB) y 256 KiB de margen al guardar los campos revisados.
- Solo se sugieren campos con rótulos CAP reconocibles. La persona confirma todos los valores.
- Al volver a analizar, los campos ya diligenciados se conservan; solo se completan campos vacíos.
- No se interpretan autores, casillas de selección, presupuesto, vigencia ni clasificación cuando el documento no permite distinguirlos con certeza.

## Persistencia y acceso

- El proyecto y su registro `Documento` se confirman juntos; si falla el almacenamiento, se revierte la creación.
- Los archivos se nombran internamente con UUID y se guardan en el almacenamiento configurado.
- El servidor aplica autenticación y bloquea el flujo de importación para aprendices.
- El DOCX original se lista y descarga desde la pestaña Formatos. Los permisos del adjunto heredan la política del proyecto, incluidos los aprendices vinculados al semillero.

## Alineación institucional

- El importador CAP prepara datos para la gestión interna y conserva el archivo fuente; no integra ni reemplaza SENAVANCE.
- La Circular 3-2026-000074 limita SENAVANCE a planes, proyectos y estrategias financiados con recursos del artículo 16 de la Ley 344 de 1996. La aplicación no debe inferir esa fuente de financiación por el solo rótulo SENNOVA o CAP.
- La Circular 3-2025-000188 describe tipologías y fases para la vigencia 2026; la circular de abril de 2026 regula el uso y seguimiento en SENAVANCE. Antes de añadir validaciones, el responsable debe confirmar convocatoria, fuente de financiación, tipología y plantilla vigente.
- No se debe afirmar cumplimiento por el solo hecho de cargar un DOCX. Las reglas de validación deben versionarse por instrumento y vigencia.
