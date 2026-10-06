# Alcance documental y fuentes de SENNOVA

**Fecha de revisión:** 5 de octubre de 2026.

## Qué documentos mandan

La carpeta `docs/CAP-14-2026 Sistemade Información Investigación` y la carpeta `docs/CAP-05-2026_FortalecimeintoArchivo` contienen ejemplos del proyecto. Son evidencia para identificar secciones, relaciones y campos; no demuestran que cada plantilla siga vigente ni convierten sus datos en valores por defecto para todos los proyectos.

La norma, convocatoria y plantilla institucional vigente deben confirmarse con la Coordinación SENNOVA antes de presentar o radicar un archivo. La plantilla GCDTP-F-023 V01 encontrada en los ejemplos se identificó como versión de junio de 2026, pero su vigencia no se ha confirmado. El [mapa CAP-14](../../maintenance/project-documentation/reference-map-cap14.md) y el [mapa CAP-05/CAP-06](../../maintenance/project-documentation/reference-map.md) registran procedencia, discrepancias y límites de extracción.

El `AGENTS.md` de este proyecto apunta a `.antigravityrules` como fuente central de reglas para Codex. Esas reglas orientan el trabajo de desarrollo, pero no son una especificación funcional de la aplicación. El apartado sobre una bitácora Humano–IA aplica a guías interactivas de aprendizaje; no define una función de bitácora para este sistema de gestión de proyectos de investigación.

## Alcance que sí tiene respaldo

El expediente se construye en el espacio **Documentación** del proyecto. Los ejemplos aportados respaldan contenido sobre formulación y presentación, acta de inicio, informes bimensuales, productos y evidencias, informe final y acta de cierre. Los originales de formulación se consultan en **Expediente**. La bóveda central permite consultar evidencias institucionales; no reemplaza el expediente de un proyecto.

El plan anual del grupo se conserva como archivo opcional de gestión interna. Los ejemplos CAP no lo establecen como requisito del expediente de cada proyecto.

La interfaz ya no ofrece modelos inventados de planeación de etapa productiva ni formatos de seguimiento ajenos al expediente de investigación. Las rutas y pantallas de bitácora se retiraron. La inicialización actual elimina la tabla heredada `bitacora_entries` y las columnas `formato_bitacora_path` y `formato_seguimiento_path`; conserva los registros técnicos `actividades` y `audit_logs`, los documentos de proyecto y la ruta heredada de informe final. Las cargas nuevas del tipo `evidencia_bitacora` se rechazan y las notificaciones antiguas dirigen a Proyectos. La migración no elimina archivos físicos que pudieran estar referenciados por los adjuntos heredados; primero se debe confirmar que son exclusivos de las bitácoras. La [descripción del modelo funcional y de datos](modelo-funcional-y-datos.md) documenta el esquema vigente.

## Estado de las dos referencias

El paquete CAP-14 configura 11 salidas documentales y registra 404 campos obligatorios pendientes. La referencia CAP-05/CAP-06 configura 16 salidas y registra 802 campos obligatorios pendientes. Ninguna tiene un código SGPS confirmado, productos registrados ni versiones documentales guardadas. Los paquetes y manifiestos fechados el 4 de octubre de 2026 están en [referencias generadas](../generados-referencias-sennova-2026-10-04/README.md); sus archivos son borradores de revisión, no documentos listos para radicar.

CAP-14 tiene una contradicción entre el código y asunto de su acta de inicio (CAP-14 frente a CAP-16). El informe bimensual no indica un rango formal de fechas y las fuentes difieren en clasificación. La referencia CAP-05/CAP-06 también contiene campos vacíos y discrepancias descritas en su mapa. La aplicación conserva esas diferencias como pendientes; no debe escoger ni inventar el dato correcto.

## Información pendiente para cerrar la aplicación

1. **Fuentes institucionales vigentes:** plantillas aprobadas, códigos y versiones, convocatoria aplicable, fuente de financiación y lineamientos de presentación y archivo.
2. **Datos confirmados de cada proyecto:** código SGPS, fechas y períodos, cifras planeadas y ejecutadas, indicadores, productos, responsables, resultados, soportes y aprobaciones. Para CAP-14 también se debe conciliar la referencia CAP-14/CAP-16.
3. **Reglas de revisión y firma:** quién redacta, revisa, aprueba y firma cada documento; cuándo se permite generar una versión y qué significa “listo para radicar”.
4. **Política de archivos:** responsables de custodia, permisos, retención, tratamiento de datos personales, límites de tamaño y almacenamiento de fotografías y videos.
5. **Plan anual del grupo:** confirmar si se requiere, quién lo actualiza y cuál es su formato vigente. Hasta entonces permanece opcional.
6. **Integraciones externas:** confirmar si se requiere interoperabilidad con SENAVANCE u otro sistema y para qué fuente de financiación. No se debe inferir por el solo rótulo SENNOVA o CAP.

## Referencias de implementación

- [Expediente de proyectos](expediente-proyectos.md)
- [Construcción documental](construccion-documental.md)
- [Mapa de referencia CAP-14](../../maintenance/project-documentation/reference-map-cap14.md)
- [Mapa de referencia CAP-05/CAP-06](../../maintenance/project-documentation/reference-map.md)
