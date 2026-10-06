# Trazabilidad de objetivos y validación de CAP-14-2026

**Estado:** auditoría técnica del repositorio y protocolo propuesto para revisión. No constituye aceptación institucional ni evidencia de pruebas con usuarios.

**Corte:** 5 de octubre de 2026.

**Fuentes del proyecto:** formulación, presentación, acta de inicio, informe bimensual y plantilla de informe final recibidos para CAP-14-2026. La aplicación se inspeccionó en el repositorio; esta revisión no comprueba disponibilidad del despliegue ni acceso a producción.

## Matriz de trazabilidad

Los objetivos se resumen de la formulación. La columna de estado describe lo que puede comprobarse en el repositorio y separa la implementación técnica de la aprobación y las evidencias institucionales.

Las pruebas automatizadas no equivalen a validación con usuarios. Demuestran el comportamiento cubierto por los casos de software; no acreditan que los perfiles previstos acepten los flujos ni que sus requisitos estén aprobados.

| Objetivo de CAP-14 | Evidencia técnica localizada | Estado comprobable | Pendiente para darlo por aceptado |
|---|---|---|---|
| Identificar necesidades y requisitos | El asistente de formulación y la importación CAP permiten capturar y revisar información del proyecto. El constructor documental presenta campos, requisitos de diligenciamiento y pendientes. Referencias: `frontend/src/components/projects/ProjectFormulationWizard.jsx`, `backend/app/routers/proyectos.py` y `backend/app/routers/project_documentation.py`. | **Parcial.** Hay herramientas para registrar información y orientar el diligenciamiento. | Levantar y aprobar los requisitos con los usuarios responsables: procesos actuales, perfiles, permisos, datos obligatorios, reportes, estados y criterios de aceptación. El código no demuestra entrevistas ni aprobación de requisitos.
| Diseñar una herramienta Excel para indicadores de clasificación de Minciencias | El endpoint `GET /reportes/indicadores-minciencias`, el servicio `minciencias_indicator_workbook.py` y la tarjeta del Centro de Reportes generan un libro con resumen, investigadores, productos y metodología. | **Implementado en el repositorio como matriz descriptiva.** Expone faltantes y no asigna puntajes ni certifica clasificaciones oficiales. | Aprobar la edición del modelo, el periodo, las tipologías y las fuentes. Revisar el libro con la persona responsable antes de usarlo para decisiones institucionales.
| Diseñar la estructura funcional y la base de datos | Los modelos `Proyecto`, `Producto`, `Entregable`, `Actividad`, `Documento` y `User` están definidos en `backend/app/models.py`. `docs/architecture/modelo-funcional-y-datos.md` los resume; las rutas implementan operaciones sobre esos registros. | **Implementado técnicamente en la aplicación y documentado a partir del código.** | Confirmar el diseño contra los requisitos aprobados, los permisos y los procesos reales del CGAO. La inspección del código no equivale a aprobación del diseño por el equipo del proyecto.
| Desarrollar módulos para registrar y hacer seguimiento y control de proyectos, cronogramas y productos | `ProyectosModule`, `CronogramaModule` y `ProductosModule` consumen operaciones de proyectos, entregables y productos; hay asociación de equipos, estados y documentos según cada flujo. Referencias: `frontend/src/components/projects/ProyectosModule.jsx`, `frontend/src/components/deliverables/CronogramaModule.jsx`, `frontend/src/components/products/ProductosModule.jsx` y las rutas correspondientes en `backend/app/routers/`. | **Implementado en el repositorio.** | Validar campos, permisos, estados y transiciones con los responsables. Comprobar los flujos en el entorno y versión que se vayan a aceptar.
| Implementar consultas y generación de reportes | `ReportesModule` ofrece consolidados de proyectos, grupos, productos, semilleros y talento, además de la matriz de indicadores. `stats.py` incluye búsqueda global. | **Implementado en el repositorio.** | Acordar el catálogo oficial de consultas, filtros, formatos, periodos y destinatarios. Contrastar los resultados con datos de referencia aprobados.
| Validar el sistema mediante pruebas con usuarios | La integración continua ejecuta pruebas automatizadas de backend y frontend. Estas comprueban el comportamiento del software, pero no sustituyen una sesión de aceptación con usuarios previstos. | **Pendiente de evidencia de validación con usuarios.** El informe bimensual recibido deja sin diligenciar el apartado de validación. | Definir participantes, perfiles, casos, ambiente, criterios de aprobación, responsable y tratamiento de hallazgos. Ejecutar el protocolo propuesto a continuación y registrar resultados reales.

## Resultado de la revisión de implementación

La brecha funcional que se pudo asociar directamente con los seis objetivos era la ausencia de una matriz Excel por investigador para apoyar la revisión de indicadores de clasificación; esa descarga se agregó al Centro de Reportes. La inspección del repositorio no encontró otra función de los objetivos 3, 4 o 5 completamente ausente. Esto confirma presencia de código, no disponibilidad en producción, aprobación de requisitos, exactitud de datos institucionales ni aceptación de usuarios.

Los objetivos 1 y 6 siguen abiertos en su dimensión institucional: el sistema permite diligenciar información y pasa pruebas automatizadas, pero faltan requisitos aprobados y resultados de uso con participantes autorizados. No se agrega un flujo nuevo de aprobación al producto sin conocer antes los roles, responsables y reglas que debe implementar.

## Protocolo propuesto para validar con usuarios

Este protocolo está listo para que el responsable lo revise y programe. Antes de aplicarlo, se deben aprobar los perfiles participantes, el ambiente, los criterios de aceptación y la política de manejo de datos. Los casos de ejemplo deben usar registros de prueba o información autorizada; no se deben copiar datos personales a capturas o informes de hallazgos sin autorización.

### Preparación

1. Registrar la versión de la aplicación, el ambiente de prueba y la fecha de la sesión.
2. Confirmar los perfiles que participarán y qué operaciones puede realizar cada perfil.
3. Preparar cuentas y registros de prueba para proyectos, actividades, productos y documentos. No usar una referencia documental privada como dato público o semilla de producción.
4. Acordar antes de la sesión qué resultado se considerará aprobado, qué defectos bloquean la aceptación y quién toma la decisión final.
5. Asignar a cada participante un código de registro. Anotar su perfil funcional, no más datos personales de los necesarios.

### Casos propuestos

| Caso | Objetivo relacionado | Tarea para la persona participante | Resultado observable propuesto | Evidencia por recoger |
|---|---|---|---|---|
| VU-01 | Requisitos; módulo de proyectos | Crear un proyecto de prueba, editar un dato permitido y volver a consultarlo. | Los datos guardados se conservan y el proyecto aparece en la consulta correspondiente. | Resultado, campos confusos, errores y ayuda requerida.
| VU-02 | Módulo de cronograma y seguimiento | Registrar o actualizar una actividad/entregable de prueba con fechas y estado; consultar luego el cronograma. | La actividad queda asociada al proyecto, presenta las fechas y el estado ingresados y se puede volver a consultar. | Resultado, errores, diferencias entre lo esperado y lo observado.
| VU-03 | Módulo de productos | Registrar un producto de prueba, asociarlo al proyecto y adjuntar o consultar su soporte según el permiso aprobado. | El producto queda relacionado con el investigador/proyecto esperado y su soporte es visible para los perfiles autorizados. | Resultado, fallos de asociación o acceso y datos requeridos que no estén claros.
| VU-04 | Consultas y reportes | Buscar el proyecto o producto y descargar el reporte consolidado acordado. | El registro correcto aparece y el archivo abre con los filtros y columnas acordados. | Archivo de prueba, filtros usados y discrepancias frente al dato de referencia.
| VU-05 | Herramienta Excel de indicadores | Descargar y revisar la matriz. Identificar un dato disponible y uno marcado como faltante. | El libro abre; identifica investigadores/productos registrados y distingue datos faltantes sin presentar una clasificación oficial calculada. | Archivo, observaciones sobre columnas, periodo y comprensión de las advertencias.
| VU-06 | Permisos y acceso | Intentar una operación permitida y otra no permitida con los perfiles de prueba definidos. | El sistema permite la operación autorizada y bloquea la no autorizada según la matriz de permisos aprobada. | Perfil usado, operación, resultado y mensaje recibido.

Los casos VU-01 a VU-06 y sus resultados esperados son **propuestos**, porque los requisitos y permisos finales no aparecen aprobados en los documentos recibidos. Ajustarlos antes de la sesión si el responsable define otro flujo, reporte o perfil.

## Criterios de aceptación pendientes de aprobación

Antes de convocar participantes, el responsable debe aprobar los perfiles, el ambiente, los casos que aplican, la meta mínima de aceptación, la severidad de los defectos bloqueantes y quién toma la decisión final. Hasta entonces, el protocolo no se debe presentar como una prueba institucional ya acordada.

### Registro de resultados

| Código de participante | Perfil aprobado | Caso | Resultado (aprobado / requiere ajuste / bloqueado) | Ayuda requerida | Hallazgo y severidad | Evidencia autorizada | Decisión y responsable |
|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |

La tasa de casos aprobados puede calcularse como `casos aprobados / casos ejecutados × 100`. La meta numérica y el tratamiento de casos no aplicables se deben aprobar antes de la prueba; este documento no asigna una meta institucional.

## Información necesaria para cerrar CAP-14

| Información por confirmar | Por qué hace falta | Evidencia que permitiría cerrar el punto |
|---|---|---|
| Código SGPS o confirmación de que no aplica; correspondencia oficial con CAP-14-2026 | El código CAP no demuestra por sí mismo la existencia de un código SGPS. | Registro o confirmación de la dependencia responsable.
| Objetivo correcto del acta de inicio | El acta identificada como CAP-14 menciona CAP-16 y el banco de uniformes en el objetivo de la reunión. | Acta corregida o aclaración formal adjunta.
| Nombre y sigla oficial del semillero | Las fuentes usan formas distintas. | Confirmación del responsable y registro institucional correspondiente.
| Fechas, duración y periodos de informe | Las fuentes consignan mayo-diciembre de 2026 y también seis meses; no aparece un periodo bimensual formal. | Cronograma aprobado y periodos de reporte confirmados.
| Distribución del presupuesto | Solo se encontró un rubro por $10.000.000, sin desglose suficiente. | Presupuesto aprobado con rubros, valores y periodos.
| Requisitos funcionales, roles, permisos y reportes requeridos | No se puede decidir acceso o agregar flujos de aprobación a partir de los roles actuales de la aplicación solamente. | Matriz de requisitos y permisos revisada por responsables.
| Edición y periodo del modelo de Minciencias | La matriz actual describe datos registrados, pero no dispone de reglas oficiales confirmadas para puntuar o clasificar. | Instrucción vigente, tipologías, periodo y fuentes autorizadas.
| Participantes y aprobación de las pruebas | El apartado de validación del informe bimensual está vacío. | Plan aprobado, participantes autorizados, resultados y decisiones de aceptación.
| Despliegue y disponibilidad | Una dirección mencionada en un informe no demuestra que la versión esté activa ni aceptada. | Versión, ambiente, responsable y evidencia de disponibilidad.
| Resultados, productos, metas y soportes | Las fuentes no incluyen un consolidado completo de mediciones y evidencias. | Registro aprobado de productos y resultados con sus soportes.
| Aplicabilidad de GCDTP-F-023 V01 | La plantilla está vacía e incluye campos de TecnoParque y TRL cuya pertinencia no se confirma. | Instrucción institucional que confirme el formato vigente para CAP-14.

## Referencias del repositorio inspeccionadas

- Formulación y seis objetivos: `docs/CAP-14-2026 Sistemade Información Investigación/`.
- Modelo relacional: `backend/app/models.py`.
- Proyectos e importación CAP: `backend/app/routers/proyectos.py` y `frontend/src/components/projects/ProyectosModule.jsx`.
- Constructor documental: `backend/app/routers/project_documentation.py` y `frontend/src/components/projects/ProjectDocumentationEditor.jsx`.
- Cronograma: `backend/app/routers/entregables.py` y `frontend/src/components/deliverables/CronogramaModule.jsx`.
- Productos: `backend/app/routers/productos_query.py`, `backend/app/routers/productos_commands.py` y `frontend/src/components/products/ProductosModule.jsx`.
- Consultas y reportes: `backend/app/routers/reportes.py`, `backend/app/routers/stats.py` y `frontend/src/components/reports/ReportesModule.jsx`.
- Indicadores Excel: `backend/app/services/minciencias_indicator_workbook.py`.
