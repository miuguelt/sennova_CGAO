# Contenido propuesto para completar CAP-14-2026

**Estado:** borrador generado para revisión del equipo del proyecto. No es un documento aprobado ni una fuente institucional.

**Base:** formulación, presentación, acta de inicio, informe bimensual y plantilla final adjuntos en la carpeta de CAP-14-2026.

**Criterio:** se redactan contenidos narrativos coherentes con esos archivos. Los datos administrativos, cronológicos, presupuestales y de medición que no están confirmados quedan pendientes.

## Identificación confirmada en la formulación

- **Proyecto:** Sistema de información para la gestión de proyectos de investigación del CGAO.
- **Entidad:** SENA, Regional Santander, Centro de Gestión Agroempresarial del Oriente (CGAO).
- **Objetivo general:** desarrollar un sistema que permita gestionar eficientemente los proyectos de investigación del CGAO.
- **Objetivos específicos:** identificar necesidades y requisitos; diseñar una herramienta Excel para el seguimiento y análisis de indicadores de clasificación de Minciencias; diseñar la estructura funcional y la base de datos; desarrollar módulos para registrar y hacer seguimiento y control de proyectos, cronogramas y productos; implementar consultas y generación de reportes; validar el sistema mediante pruebas con usuarios.

El acta y los documentos no coinciden en el objetivo de la reunión ni en el nombre del semillero. Esta identificación no resuelve esas diferencias.

## Redacción sugerida

### Introducción

La gestión de los proyectos de investigación del Centro de Gestión Agroempresarial del Oriente (CGAO) requiere organizar información sobre proyectos, responsables, actividades, cronogramas, productos y evidencias. Cuando estos datos se encuentran en documentos o herramientas separados, su consulta, actualización y consolidación demandan trabajo adicional y dificultan el seguimiento de cada proyecto. CAP-14-2026 propone desarrollar un sistema de información que centralice estos registros y facilite su administración, consulta y elaboración de reportes. Como apoyo al seguimiento de la producción de los investigadores, la propuesta también contempla una herramienta en Excel para organizar indicadores asociados a la clasificación de Minciencias. El alcance y los criterios de aceptación de ambos componentes deben validarse con sus usuarios y responsables institucionales.

### Planteamiento del problema

La información necesaria para administrar los proyectos de investigación del CGAO no se presenta en las fuentes como un conjunto centralizado que permita relacionar de manera consistente los proyectos, sus equipos, actividades, cronogramas, productos y soportes. La dispersión o el manejo manual de estos datos dificulta verificar avances, consultar antecedentes, identificar información faltante y preparar reportes. También limita la trazabilidad entre los objetivos formulados y los resultados que se registran durante la ejecución. Se requiere precisar con los usuarios cuáles son los procesos actuales, qué herramientas utilizan, cuáles son los problemas más frecuentes y qué requisitos debe cumplir el sistema para atenderlos.

### Justificación

Un sistema de información para la gestión de proyectos de investigación puede ofrecer un punto común para registrar y consultar los datos que hoy se necesitan durante la formulación, el seguimiento y el cierre. La relación entre proyectos, cronogramas, productos, responsables y evidencias puede facilitar la revisión de avances y la preparación de reportes, siempre que los registros estén completos y se mantengan actualizados. La herramienta Excel prevista en la formulación puede organizar los datos disponibles sobre investigadores y productos para apoyar su revisión. El sistema y la herramienta no sustituyen la validación de la información por los responsables ni las reglas de la versión aplicable del modelo de Minciencias.

### Alcance funcional propuesto

El sistema comprende el registro y consulta de proyectos de investigación; la asociación de responsables y equipos; el seguimiento de actividades y cronogramas; el registro de productos y sus soportes; y la generación de consultas y reportes. La herramienta complementaria en Excel organiza por investigador los productos y campos de perfil disponibles, permite observar categorías registradas o derivables de códigos explícitos y señala datos faltantes. Los requisitos de usuarios, permisos, estados, aprobaciones e integración con otros sistemas deben confirmarse durante el levantamiento de información.

La matriz Excel implementada en la aplicación es descriptiva: no calcula puntajes ni declara la categoría oficial de investigadores o grupos.

### Metodología propuesta

1. **Levantamiento de requisitos:** documentar los procesos actuales, fuentes de información, usuarios, permisos, problemas y necesidades mediante revisión documental y sesiones con los actores que confirme el equipo.
2. **Diseño:** establecer la estructura funcional, el modelo de datos, las relaciones entre entidades y los criterios de aceptación de las consultas, reportes y herramienta Excel.
3. **Desarrollo:** implementar y configurar los módulos aprobados para proyectos, cronogramas, productos, consultas y reportes; preparar la herramienta de seguimiento de indicadores con los datos disponibles.
4. **Pruebas y validación:** definir los casos de prueba y probar los flujos con la población que se autorice. Registrar hallazgos, ajustes, resultados y evidencias.
5. **Ajustes y entrega:** resolver hallazgos priorizados, documentar la versión entregada y registrar las decisiones de aceptación y puesta en servicio.

Esta secuencia organiza las fases de la formulación y la presentación. No asigna fechas ni afirma que las actividades hayan concluido.

## Resultados e indicadores sugeridos

Las siguientes metas son **propuestas de diligenciamiento**, no compromisos aprobados. Deben confirmarse con la persona responsable antes de incorporarse a una formulación o informe institucional.

| Objetivo relacionado | Resultado verificable sugerido | Indicador sugerido | Meta sugerida para aprobación | Medio de verificación |
|---|---|---|---|---|
| Identificar necesidades y requisitos | Documento de requisitos revisado con los usuarios responsables. | Requisitos aprobados / requisitos documentados × 100. | 100 %, una vez acordado el inventario y sus aprobadores. | Matriz de requisitos con fecha, versión y constancia de revisión. |
| Diseñar herramienta Excel de indicadores | Libro Excel con campos, cálculos descriptivos, alertas de faltantes y guía de uso. | Herramientas diseñadas y revisadas. | 1 herramienta, pendiente de aprobación. | Archivo versionado y acta o registro de revisión. |
| Diseñar estructura funcional y base de datos | Diseño funcional y modelo de datos documentados. | Entregables de diseño aprobados / entregables de diseño previstos × 100. | Definir la lista de entregables antes de aprobar el porcentaje. | Diagramas, diccionario de datos y registro de revisión. |
| Desarrollar módulos de proyectos, cronogramas y productos | Módulos implementados y revisados con base en los requisitos aprobados. | Módulos que superan sus pruebas de aceptación / módulos aprobados × 100. | Definir módulos y casos de aceptación en el levantamiento. | Casos de prueba, resultados y versión de la aplicación. |
| Implementar consultas y reportes | Consultas y reportes priorizados disponibles. | Consultas y reportes aprobados que funcionan / consultas y reportes priorizados × 100. | Definir el inventario y la prioridad con los usuarios. | Catálogo de reportes y pruebas con datos de ejemplo. |
| Validar el sistema con usuarios | Validación realizada y hallazgos documentados. | Casos aceptados / casos ejecutados × 100; participantes por registrar. | Definir muestra, casos y criterio de aceptación antes de la sesión. | Plan de validación, asistencia autorizada, resultados y registro de ajustes. |

No se recomiendan cifras de clasificación ni totales de productos hasta validar su fuente, periodo, tipología, soporte y regla vigente aplicable.

## Información que falta confirmar

1. **Identificación administrativa:** código SGPS, si aplica, y correspondencia oficial entre CAP-14-2026 y los registros del sistema. El código CAP no se asume como código SGPS.
2. **Acta de inicio:** confirmar el objetivo de la reunión, pues el acta de CAP-14 menciona CAP-16 y el banco de uniformes.
3. **Semillero relacionado:** confirmar el nombre y la sigla correctos. La formulación y la presentación mencionan SIADM y SEMINPROVEL; el acta usa SEMIPROVEL.
4. **Duración y fechas:** aprobar inicio, terminación, duración y periodos de los informes. El acta consigna fechas de mayo a diciembre de 2026 y, a la vez, seis meses; estas referencias no coinciden.
5. **Presupuesto:** aprobar distribución por rubro, uso y periodo. El acta contiene un rubro por $10.000.000 y deja los demás rubros sin diligenciar; no se distribuye ese valor por inferencia.
6. **Requisitos y operación:** precisar roles, permisos, responsables de validación, flujos, estados y reportes requeridos por cada tipo de usuario.
7. **Indicadores Minciencias:** confirmar edición del modelo, convocatoria, periodo, reglas de inclusión, tipologías y fuentes oficiales que debe usar el equipo. El libro nuevo solo refleja datos registrados y no reemplaza esta definición.
8. **Clasificación y acceso a la información:** la presentación marca clasificaciones distintas entre secciones. Definir la clasificación válida, los permisos de consulta y las condiciones de acceso antes de cargar información personal o reservada.
9. **Pruebas con usuarios:** definir población y muestra, casos, criterios de aceptación, responsables y evidencias. El informe bimensual tiene el apartado de validación sin diligenciar.
10. **Estado del despliegue:** confirmar versión, dirección de acceso, responsables, condiciones de prueba y evidencias. El informe bimensual menciona una dirección de aplicación, pero no prueba por sí solo su disponibilidad ni la aceptación de usuarios.
11. **Resultados y productos:** registrar entregables aprobados, datos medidos y soportes. No se encontró en el expediente un registro completo de productos, metas, indicadores, logros y evidencias.
12. **Informe final:** confirmar si el formato GCDTP-F-023 V01 aplica a CAP-14. El archivo adjunto está vacío y contiene campos de TecnoParque y TRL; se conserva como referencia sin asumir que sea el formato exigido.

## Brecha de implementación cerrada en esta revisión

La aplicación ya tenía reportes de grupos y productos, pero no reunía los datos de perfil y productos por investigador en una matriz de seguimiento. Se añadió una descarga Excel con hojas de resumen, investigadores, productos y metodología. La matriz identifica datos faltantes y limita expresamente el alcance de sus conteos.

La revisión no puede completar por software la confirmación administrativa, la asignación presupuestal, los periodos ejecutados, la evaluación con usuarios ni la aprobación de los formatos. Esos puntos dependen de decisiones o evidencias del proyecto.
