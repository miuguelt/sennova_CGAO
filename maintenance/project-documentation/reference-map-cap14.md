# Mapa de datos de la referencia CAP-14-2026

Esta nota registra las fuentes locales del proyecto **Sistema de información para la gestión de proyectos de investigación del CGAO**. La referencia se importa en desarrollo como un proyecto privado de validación. Sus datos no se convierten en valores predeterminados ni en una plantilla pública.

## Archivos fuente

La carpeta `docs/CAP-14-2026 Sistemade Información Investigación` contiene cinco documentos Office: una formulación DOCX, una presentación PPTX, un acta de inicio DOCX, un informe bimensual DOCX y una plantilla vacía de informe final GCDTP-F-023 V01. El registro de referencia conserva las rutas, los hashes SHA-256, los tamaños y el texto extraído de los documentos. La fuente puede contener nombres y datos de contacto; la referencia permanece privada en la base local.

La plantilla de informe final se conserva como fuente del formato, no como un informe diligenciado. No se crea un acta de cierre ni un producto porque la carpeta no aporta esos documentos.

## Datos incorporados

El acta de inicio y la formulación identifican el código CAP-14-2026, el centro, la regional, Vélez, la responsable, el objetivo general y seis objetivos específicos. También se conservan el equipo, las actividades, el presupuesto consignado, el alcance, los asistentes, la metodología, las referencias y el contenido narrativo del informe bimensual. El snapshot de fuentes preserva el contenido completo para consultar la procedencia.

El proyecto no recibe un código SGPS por equivalencia con CAP. Las asociaciones a grupos o semilleros no se crean automáticamente a partir de texto documental.

## Diferencias y datos pendientes

- El encabezado del acta identifica CAP-14-2026 y el proyecto de gestión de investigación; el objetivo de la reunión menciona CAP-16-2026 y el banco de uniformes. Se conserva y se solicita conciliación.
- El informe bimensual no aporta un rango formal de fechas. El bimestre 1 se usa temporalmente para organizar el borrador y no confirma el período oficial.
- El informe presenta avances narrativos, pero no aporta una tabla con indicadores, metas, logros y soportes completos. No se derivan cifras de logro.
- La formulación, la presentación y el informe registran clasificaciones diferentes. La referencia no cambia permisos ni decide la clasificación.
- El informe final es una plantilla vacía con instrucciones; sus instrucciones no se presentan como hechos o resultados del proyecto.

## Formatos de salida y verificación

El catálogo define la formulación y el acta de inicio como DOCX, y la presentación como PPTX. Las pruebas comprueban los paquetes Office y sus partes internas para ambos formatos. Los servicios de generación mantienen pendientes los campos obligatorios ausentes; el renderizador puede preparar una salida de vista previa, pero esa salida no equivale a una versión guardada o revisada.

El objetivo específico de diseñar una herramienta Excel de indicadores se cubre con el reporte **Indicadores de clasificación** en el Centro de Reportes. La descarga organiza perfiles y productos registrados por investigador, aplica el año de reporte o, si falta, el año de publicación, e indica categorías y soportes faltantes. Es una matriz descriptiva; no calcula puntajes ni certifica una clasificación de MinCiencias. Los criterios, la edición del modelo y el periodo deben confirmarse antes de usarla para decisiones institucionales.

## Correspondencia de objetivos y validación

La [matriz de trazabilidad de CAP-14](../../docs/generados-referencias-sennova-2026-10-04/CAP-14-2026-sistema-informacion/trazabilidad_cap14_objetivos.md) cruza los seis objetivos de la formulación con módulos y rutas del repositorio. La revisión encontró implementados en el código los módulos centrales de proyectos, cronogramas, productos y reportes, además de la matriz Excel recién agregada. La evidencia de requisitos aprobados y la validación con usuarios siguen pendientes; las pruebas automatizadas del software no las reemplazan. El documento incluye un protocolo propuesto y los datos que debe confirmar el equipo antes de ejecutarlo.

El objetivo de diseño funcional y de datos tiene una descripción técnica vigente en [Modelo funcional y de datos de SENNOVA CGAO](../../docs/architecture/modelo-funcional-y-datos.md). El documento deriva las entidades y relaciones del código; el equipo aún debe validarlo contra los requisitos institucionales aprobados.
