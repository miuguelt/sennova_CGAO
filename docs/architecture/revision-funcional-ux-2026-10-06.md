# Revisión funcional y de experiencia de uso — 6 de octubre de 2026

## Resultado y alcance

La revisión priorizó el recorrido del investigador: localizar un proyecto, redactar su formulación, completar datos compartidos, generar documentos editables y descargar la carpeta. Se conservaron los cambios locales anteriores y los archivos fuente de CAP-14. No se publicó ni se envió documentación a terceros.

La interfaz autenticada conserva Grupos como entrada y Control GrupLAC / CvLAC como primera pestaña. Los proyectos abren Documentación, con acceso al asistente, versiones y campos compartidos. El tablero del investigador ofrece una acción de construcción documental. Se agregaron un enlace para saltar al contenido y nombres accesibles de diálogo sin títulos duplicados.

## Contratos y correcciones

- **Documentación y concurrencia:** el editor registra qué campos cambió la persona. Una actualización del servidor incorpora los campos no editados; si ambas personas cambiaron un campo, compara los valores y bloquea el guardado y la generación hasta elegir los valores locales o guardados. La revisión nueva no habilita por sí sola una sobrescritura silenciosa. La identificación del proyecto envía únicamente los campos editados.
- **Productos y persistencia:** creación, consulta individual, listado y actualización conservan `categoria`, `año_reporte` y `requisitos_cumplidos`. Los valores ausentes permanecen ausentes. Los permisos existentes de modificación se conservan.
- **Catálogo:** los identificadores A1, B1 y similares se mantienen como catálogo interno CGAO, versión 1. No representan una clasificación oficial ni una equivalencia automática con Minciencias. Las listas orientan el seguimiento de soportes; el reconocimiento exige verificar el modelo y la convocatoria aplicable.
- **Cronograma:** Grupos reutiliza `ProjectTimelinePanel`, que consulta el detalle autorizado y la documentación. Se respeta la fase persistida de cada entregable; no se distribuyen fases por posición en una lista. La línea de tiempo permite abrir el formulario relacionado o editar la planeación documental.
- **Fechas:** `calendarDate.js` distingue fechas de calendario de marcas de tiempo. Las cadenas `YYYY-MM-DD` conservan su día al mostrarse en Colombia. Fechas imposibles se señalan; vencimientos de hoy tienen cero días restantes. Tablero, convocatorias, cronograma y PDF usan este límite compartido cuando corresponde.
- **Contenido de referencia:** se usan los nombres Centro de Gestión Agroempresarial del Oriente y Sistema de Investigación, Desarrollo Tecnológico e Innovación. GrupLAC no inventa códigos ni clasificación cuando faltan. Los PDF no asignan 80 horas, 20 horas semanales ni 12 meses por ausencia de datos; las horas cero se conservan. Las salidas de participación se identifican como borradores que requieren soportes, revisión y firmas autorizadas.
- **Descarga:** el constructor usa la descarga autenticada de expediente. El ZIP reúne las últimas versiones generadas, los adjuntos disponibles, las carpetas por etapa, `expediente.json` y `pendientes.txt`. Los cambios sin guardar bloquean la descarga. No se generan documentos ni se cambia su estado al descargar.

## Fuentes consultadas

- [SENA — SENNOVA](https://historico.sena.edu.co/es-co/formacion/Paginas/tecnologia-innovacion.aspx): denominación del sistema y propósito institucional.
- [Minciencias — modelo de reconocimiento y medición 2024](https://minciencias.gov.co/sites/default/files/upload/convocatoria/m601pr04g01_modelo_medicion_grupos_investigacion_tecnologica_o_innovacion_y_reconocimiento_investigadores_-_2024_1.pdf): referencia para distinguir productos, categorías y requisitos oficiales de los códigos internos. Se identifica su año; no se presenta como confirmación de una convocatoria futura.
- [Minciencias — tipología de proyectos, versión 7](https://minciencias.gov.co/sites/default/files/upload/paginas/documento_de_tipologia_de_proyectos_de_caracter_cientifico_tecnologico_e_innovacion_vr.07.pdf): orientación para distinguir investigación, desarrollo tecnológico e innovación.

## Evidencia de esta ejecución

Los cambios funcionales se verificaron con pruebas de regresión que fallaron antes de la corrección y pasaron después. La suite y las compuertas de cobertura permanecen en la integración continua.

- Servidor: 512 pruebas aprobadas. La compuerta global verificó 491 de 491 funciones; la cobertura agregada de líneas es 86 %, no 100 %.
- PostgreSQL nativo: 14 pruebas de integración aprobadas en esquemas aislados, sin modificar los datos vigentes.
- Interfaz: 705 pruebas aprobadas, 82 archivos de pruebas. Cobertura V8 de funciones: 2422 de 2422; líneas: 96,55 %; ramas: 83,09 %. La compuerta independiente también pasó.
- La compilación de producción, TypeScript y Ruff de los archivos Python trabajados pasaron. El control DevBrain `WorkingTree` pasó con advertencias sobre el tamaño de módulos heredados; no certifica las comprobaciones que su salida indica como omitidas.
- La descarga desde el constructor de CAP-14 produjo un ZIP válido de 4.394.613 bytes: 13 documentos generados —10 DOCX y 3 PPTX— y cinco archivos fuente, además de su diagnóstico. Se comprobó la integridad del ZIP.
- Se revisaron capturas a 1440 y 375 píxeles de ancho. En 375 píxeles, tanto la página como el espacio documental midieron 375 píxeles de ancho sin desbordamiento horizontal. Las capturas están en `output/playwright/cap14-carpeta-2026-10-06.png` y `output/playwright/cap14-carpeta-movil-2026-10-06.png`.

## Límites y pendientes

CAP-14 es una referencia de validación y sus salidas generadas describen un escenario propuesto. La presencia de un archivo o el avance del diligenciamiento no acredita ejecución, reconocimiento de productos, aprobación institucional ni firmas. El ZIP conserva el diagnóstico: están pendientes revisiones de versiones, soportes de los productos y evidencias fotográficas. Los archivos fuente no se modificaron para ocultar diferencias de código o fechas.

La revisión funcional no sustituye una auditoría de seguridad ni la confirmación de formatos y convocatorias por el responsable institucional. Las advertencias de dependencias y modularidad registradas en la documentación previa requieren seguimiento antes de una liberación de producción.
