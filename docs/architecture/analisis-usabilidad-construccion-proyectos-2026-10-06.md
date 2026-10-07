# Análisis de usabilidad y apoyo a la construcción de proyectos

Fecha: 6 de octubre de 2026.

## Dictamen

La aplicación ofrece una estructura útil para formular proyectos y preparar documentos. Sin embargo, el recorrido revisado tiene fallas que interrumpen la escritura, pueden perder cambios y transmiten una confianza que las validaciones actuales no sustentan. Todavía no hay evidencia suficiente para afirmar que una persona nueva puede construir un proyecto con facilidad y sin asistencia.

La prioridad es conservar el trabajo y el contexto de edición. Después corresponde mejorar la orientación sobre qué desarrollar, qué falta y cómo comprobar la coherencia del proyecto.

## Alcance y evidencia

Se revisaron la captura recibida, la aplicación local en Chrome con el rol administrador, el recorrido desde Grupos hacia CAP-14, las ayudas, los estados de avance y el formulario de creación. También se inspeccionaron los contratos de la interfaz y del servidor y se ejecutaron las suites existentes.

CAP-14 se trató como referencia de validación. No se crearon proyectos, no se guardaron cambios en los registros vigentes y no se generaron documentos. Una edición temporal del título permitió comprobar la protección al cerrar; el valor persistido permaneció intacto. Los cambios locales anteriores del repositorio se conservaron.

Los hallazgos de interfaz se limitan al rol y al recorrido indicados. Esta ejecución no incluyó participantes externos, una nueva prueba en celular ni una auditoría completa de accesibilidad. Las mejoras descritas son propuestas, no cambios implementados.

## Capacidades que conviene conservar

- La ruta de diez etapas organiza identificación, diagnóstico, objetivos, referentes, metodología, resultados, recursos, referencias y generación.
- Los bloques reducen la cantidad de campos que se editan al mismo tiempo.
- Las ayudas por campo, la escritura ampliada y los ejemplos ofrecen apoyo durante la redacción.
- La tabla de resultados ya registra indicador, meta, unidad y medio de verificación.
- Los datos compartidos, las revisiones de borrador y las versiones generadas permiten reutilizar información y conservar trazabilidad.
- La generación distingue borradores de documentos revisados; la carpeta descargable incluye un reporte de pendientes.

## Hallazgos priorizados

### 1. La consulta de orientaciones cierra el proyecto

**Prioridad: alta. Estado: reproducido dos veces en la aplicación.**

Desde Grupos → Proyectos y documentación → CAP-14 → Consultar orientaciones metodológicas, la app muestra brevemente la consulta y después cierra el proyecto. Grupos vuelve a Estadísticas e Indicadores. La persona no puede leer la orientación en el contexto de su escritura.

La causa se encuentra en el contrato de refresco: `getRecommendation` usa POST; `fetchAPI` considera todo POST exitoso una mutación y emite `sennova:data-refresh`. `AppContent` incrementa `dataVersion` y cambia la clave del contenedor de Grupos, lo que desmonta su estado. El módulo Proyectos tiene una excepción para conservar su montaje, pero Grupos no la tiene. La consulta de recomendaciones del servidor no modifica el proyecto.

Fuentes: [API documental](../../frontend/src/api/projectDocumentation.js), [cliente HTTP](../../frontend/src/api/config.js), [contenedor de la app](../../frontend/src/App.tsx), [refresco de datos](../../frontend/src/utils/dataRefresh.js) y [ruta de recomendaciones](../../backend/app/routers/project_documentation.py).

**Corrección propuesta:** distinguir consultas de escrituras efectivas y actualizar los datos afectados conservando el panel, la etapa y los borradores. Mantener la vista inicial protegida de Grupos al iniciar sesión o recargar; esa decisión no exige regresar al inicio durante una consulta.

**Aceptación:** abrir una orientación desde Grupos mantiene el proyecto y los textos editados; cerrar la ayuda devuelve al mismo bloque. Una escritura confirmada actualiza indicadores y versiones sin descartar otras ediciones pendientes. Esta prueba debe montar la app, Grupos y el editor juntos, además de las pruebas aisladas de componentes.

### 2. Cerrar el panel pierde la edición sin advertencia

**Prioridad: alta. Estado: reproducido en la aplicación.**

Se cambió temporalmente el título, sin guardarlo. El formulario indicó cambios pendientes. Al pulsar Cerrar panel, el proyecto se cerró sin confirmación ni recuperación. Al abrirlo de nuevo, apareció el título persistido y desapareció la edición temporal.

El editor conserva borradores en el estado de React. El cierre de Grupos no consulta ese estado y `Drawer` desmonta su contenido cuando deja de estar abierto.

Fuentes: [panel del proyecto en Grupos](../../frontend/src/components/groups/GrupoModule.jsx), [editor documental](../../frontend/src/components/projects/ProjectDocumentationEditor.jsx), [asistente](../../frontend/src/components/projects/ProjectFormulationWizard.jsx) y [Drawer](../../frontend/src/components/ui/Drawer.jsx).

**Corrección propuesta:** proteger todos los cierres —botón, Escape y fondo— cuando exista una edición pendiente. Ofrecer Guardar y salir, Seguir editando y Descartar cambios. Una recuperación de borradores debe conservar el control de revisiones y los permisos del proyecto.

**Aceptación:** ningún cierre descarta trabajo sin una decisión explícita. Un error al guardar mantiene el texto y el panel abiertos. También deben comprobarse cambio de proyecto, salida del módulo y recarga del navegador.

### 3. Las orientaciones pueden aprobar un texto sin evaluarlo

**Prioridad: alta. Estado: comprobado ejecutando la función real del servidor.**

La entrada `introduccion = "xyz"` recibe una respuesta que califica positivamente la estructura preliminar. No hay una regla que evalúe la introducción: es la respuesta general para un texto no vacío cuando no se produce otra recomendación.

También se comprobó que un objetivo compuesto únicamente por espacios produce `IndexError`. Para un campo vacío sin regla específica, el mensaje anuncia un análisis de IA, aunque el servicio implementa reglas locales. La función recibe solo un campo y su texto; no puede verificar la relación con el resto del proyecto.

Fuente: [orientación metodológica local](../../backend/app/services/formulation_ai_service.py).

**Corrección propuesta:** normalizar entradas vacías, describir con precisión el alcance de la ayuda y devolver una orientación neutral cuando no exista una comprobación. Ofrecer preguntas y ejemplos pertinentes para cada apartado. La revisión entre apartados requiere recibir su contexto y señalar relaciones concretas pendientes, con evidencia; no basta con revisar longitud y palabras clave.

**Aceptación:** texto vacío, espacios o contenido insuficiente no generan errores internos ni elogios de calidad. La ayuda distingue una sugerencia de una validación y conserva el texto del usuario.

### 4. El proyecto nuevo parte de una aprobación no confirmada

**Prioridad: alta. Estado: observado en el formulario e inspeccionado en código.**

Nuevo Proyecto de Investigación abre con Aprobado seleccionado. Sus opciones son Aprobado, En ejecución y Finalizado; no incluyen un estado de construcción. En Grupos, el formulario también parte de doce meses y aplica ese valor al guardar cuando no hay una duración válida, aunque la duración no aparece entre los campos visibles de ese formulario.

Fuente: [creación de proyectos en Grupos](../../frontend/src/components/groups/GrupoModule.jsx).

**Corrección propuesta:** acordar un estado de formulación o borrador dentro del contrato del proyecto y permitir registrar una duración explícita. La aprobación debe requerir una decisión respaldada. Los datos ausentes deben aparecer como pendientes.

**Aceptación:** crear un proyecto no acredita aprobación ni asigna una duración que la persona no confirmó. Los valores de referencia se presentan como propuestas editables, cuando corresponda.

### 5. El avance mezcla diligenciamiento y revisión

**Prioridad: media. Estado: observado en la aplicación y comprobado en código.**

CAP-14 muestra diez de diez pasos y 100 % de formulación, junto a una advertencia por aclarar. El avance documental muestra 90 %, trece archivos vigentes y cero de trece documentos revisados. Los porcentajes miden cosas distintas; no se encontró un error aritmético en esa diferencia. El problema es que Paso completo puede interpretarse como contenido correcto o revisado.

La ruta considera completo un paso cuando no tiene campos faltantes; las advertencias no cambian ese estado. En la etapa final, una versión vigente de la formulación satisface el paso de generación sin acreditar revisión.

Fuentes: [ruta de formulación](../../backend/app/services/formulation_route.py), [avance documental](../../backend/app/services/documentation_progress.py) y [presentación del avance](../../frontend/src/components/projects/ProjectDocumentationProgress.jsx).

**Corrección propuesta:** distinguir Campos diligenciados, Borrador generado y Revisión pendiente o registrada. Dar una siguiente acción cuando todo esté diligenciado y aún existan aclaraciones. Conservar el cálculo documentado salvo una decisión expresa sobre sus pesos.

**Aceptación:** la persona identifica qué porcentaje representa escritura y qué tareas siguen pendientes. Ningún indicador presenta diligenciamiento como aprobación institucional.

### 6. La alerta no lleva al dato que se debe aclarar

**Prioridad: media. Estado: observado en la aplicación.**

La advertencia general no identifica los puntos por aclarar ni ofrece un acceso al campo. Para leerlos se debe descubrir Datos compartidos, abrir Datos comunes y localizar Datos de la fuente pendientes de aclaración. Allí se registra un texto extenso sobre el escenario y sus confirmaciones institucionales.

Fuentes: [alerta del editor](../../frontend/src/components/projects/ProjectDocumentationEditor.jsx), [campo de aclaraciones](../../backend/app/services/documentation_catalog.py) y [regla de consistencia](../../backend/app/services/documentation_state.py).

**Corrección propuesta:** mostrar el pendiente, su origen, el soporte necesario y una acción que abra el campo correspondiente. Registrar cómo se resolvió una discrepancia, conservando su evidencia. Quitar una advertencia o vaciar un texto no debe sustituir esa comprobación.

**Aceptación:** cada pendiente permite llegar al campo relacionado en una acción y explica cómo continuar. Esta orientación coincide con el criterio del W3C sobre [sugerencias para corregir errores](https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html); esta revisión no certifica cumplimiento WCAG.

### 7. La cabecera desplaza la tarea de escritura

**Prioridad: media. Estado: observado y medido en escritorio.**

La pantalla reúne navegación del proyecto, herramientas documentales, dos resúmenes de avance, alerta, nota de ejemplo, etapa y bloques. En la ventana revisada de 1659 × 924 píxeles, el primer campo empezaba en la coordenada vertical 987: se necesitaba desplazamiento para comenzar a escribir. El pie fijo prioriza Eliminar Proyecto y Cerrar; guardar y continuar están dentro del contenido.

**Corrección propuesta:** usar el nombre corto del proyecto en la cabecera, resumir el avance y mostrar la etapa actual y su siguiente acción. Mantener Guardar y continuar cerca de la escritura. Ubicar las acciones administrativas en un menú secundario y ofrecer un mapa de etapas accesible. Las instrucciones deben ser suficientes sin saturar el formulario, como explica el W3C en [etiquetas e instrucciones](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html).

**Aceptación:** al abrir una etapa en una ventana de escritorio comparable, su instrucción y primer campo quedan visibles. El diseño también debe comprobarse en celular, con teclado y con nombres largos; esa comprobación queda pendiente.

### 8. La revisión personal no conserva sus marcas

**Prioridad: media. Estado: reproducido en la aplicación.**

Se marcó un criterio y la guía mostró 1/3. Después de cerrar y volver a abrir la ayuda, mostró 0/3. Las marcas viven en el estado del componente que se desmonta al cerrar.

Fuente: [guía de formulación](../../frontend/src/components/projects/ProjectFormulationGuide.jsx).

**Corrección propuesta:** conservar la autoevaluación por proyecto y etapa e indicar qué versión del contenido se revisó. Una edición posterior puede requerir volver a comprobar los criterios afectados. La autoevaluación debe permanecer separada de la revisión documental formal.

**Aceptación:** cerrar la ayuda o cambiar de etapa conserva los criterios; actualizar el contenido no mantiene una validación anterior como si fuera actual.

## Cómo convertir la guía en apoyo efectivo

El siguiente incremento debería ayudar a conectar las decisiones del proyecto. La app ya pide buena parte de estos datos, pero los campos y las orientaciones no construyen una relación verificable entre ellos.

La relación propuesta es: problema → objetivo específico → actividad → resultado y entregable → indicador y meta → medio de verificación, con responsable, fecha y recursos asociados. La app puede detectar actividades sin objetivo, resultados sin soporte previsto o responsables no asignados. No debe certificar automáticamente la calidad científica o la aprobación institucional.

La tabla documental Personal vinculado y el equipo operativo son representaciones distintas. Lo mismo ocurre con la planeación documental y los entregables de seguimiento. Conviene facilitar la selección de integrantes autorizados y la relación entre una actividad planeada y su entregable, conservando las diferencias entre planeación, ejecución y versiones históricas. No se propone copiarlas o fusionarlas sin establecer ese contrato.

En cada etapa, la persona debería ver una instrucción breve, un ejemplo explicado, sus datos pertinentes, los pendientes y una acción principal. El cierre de formulación debería mostrar un resumen de coherencia y revisión antes de generar las salidas.

## Orden propuesto de implementación

1. Corregir la consulta que desmonta Grupos y proteger las ediciones pendientes. Agregar regresiones del recorrido completo antes de cambiar la lógica.
2. Corregir entradas y mensajes de orientación; acordar el estado inicial y la captura de duración.
3. Hacer explícitos los estados de avance y convertir los pendientes en accesos útiles.
4. Reducir la cabecera, conservar la revisión personal y conectar objetivos, actividades, resultados y soportes.
5. Validar con personas de los perfiles previstos y ajustar los puntos donde se detengan o interpreten mal la información.

## Prueba propuesta con usuarios

Se propone una primera ronda con cinco a ocho participantes de los perfiles previstos, en un entorno de pruebas con casos preparados para aprender. Las tareas de escritura se asignan solo a roles con permiso; los aprendices realizan las consultas y actividades que les correspondan.

Las tareas serían localizar un proyecto, retomar una etapa, redactar un problema y sus objetivos, relacionar una actividad con un resultado, corregir una diferencia presupuestal, recuperar una edición y distinguir borrador generado de documento revisado.

Registrar cumplimiento sin ayuda, tiempo por tarea, retrocesos, solicitudes de ayuda, pérdida de texto y comprensión del estado documental. Como criterios iniciales propuestos: cero pérdidas de trabajo, cero cierres inesperados y al menos 80 % de tareas completadas sin asistencia. Estos valores son metas por acordar; no son resultados medidos ni garantías estadísticas.

## Verificación técnica de esta ejecución

- Ocho archivos de pruebas relacionados con formulación, editor, validación e importación: 91 pruebas aprobadas.
- Suite completa de interfaz: 705 pruebas aprobadas en 82 archivos. Cobertura V8: 2422 de 2422 funciones, 96,55 % de líneas y 83,15 % de ramas. La compuerta independiente de funciones también pasó.
- Suite completa del servidor: 512 pruebas aprobadas. Esta ejecución no volvió a medir su cobertura ni ejecutó las integraciones adicionales con PostgreSQL.
- Comprobaciones directas del servicio real: respuesta positiva para introducción insuficiente, error con objetivo de espacios y referencia a IA en un mensaje de reglas locales.
- Recorrido real: cierre al consultar orientaciones desde Grupos, pérdida de una edición temporal al cerrar, reinicio de la revisión personal, estado inicial Aprobado y medición de la ubicación del primer campo.

Las pruebas existentes pasan y permiten confiar en los comportamientos que cubren. Los problemas reproducidos muestran que faltan escenarios de integración y criterios de utilidad en esa cobertura. La cobertura de funciones no acredita facilidad de uso, coherencia metodológica ni aprobación del proyecto.
