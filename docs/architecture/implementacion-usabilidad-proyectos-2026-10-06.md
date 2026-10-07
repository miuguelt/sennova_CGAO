# Implementación de mejoras para construir proyectos

Fecha: 6 de octubre de 2026. Alcance: creación y edición de proyectos, constructor documental, orientaciones, coherencia, aclaraciones de fuentes y protección de cambios pendientes.

Este documento registra las correcciones del [análisis de usabilidad](analisis-usabilidad-construccion-proyectos-2026-10-06.md). Ese análisis conserva los hallazgos anteriores; los resultados de implementación y verificación se encuentran aquí.

## Cambios observables

| Necesidad | Comportamiento implementado |
| --- | --- |
| Consultar ayuda mientras se escribe | Las consultas de orientaciones y análisis no emiten una actualización de datos. Una actualización real conserva el panel, la pestaña y la edición local. |
| Salir sin perder trabajo por accidente | Cerrar, Escape, cambiar de proyecto o módulo y cerrar sesión consultan los cambios pendientes. El usuario puede seguir editando, descartar o guardar y salir. Un fallo de guardado conserva la edición y permite reintentar. El navegador también avisa antes de recargar o abandonar una página con cambios. |
| Crear un proyecto sin afirmar su aprobación | Los proyectos nuevos parten de En formulación. La duración permanece pendiente hasta que se registre un entero entre 1 y 60 meses. La aprobación requiere una confirmación explícita. Los estados históricos siguen disponibles. |
| Entender el avance | La aplicación distingue Campos diligenciados, Borrador generado y Revisión pendiente o registrada. Cuando termina el diligenciamiento, muestra la tarea de coherencia o revisión que sigue. Se conservan los cálculos y sus ponderaciones. |
| Resolver un pendiente concreto | Las alertas ofrecen Aclarar datos de la fuente y Registrar aclaración con soporte. Revisar coherencia reúne los pendientes y cada acción Ir al dato abre la etapa o el campo correspondiente. |
| Escribir al abrir el proyecto | La cabecera usa el nombre corto cuando existe y limita visualmente los títulos extensos. El detalle de avance y las explicaciones extensas se despliegan a demanda. La apertura desplaza únicamente el cuerpo del panel hasta la etapa; las actualizaciones posteriores conservan la posición. Guardar y continuar queda junto al recorrido y Eliminar Proyecto está en Más acciones. En pantallas pequeñas, las acciones siguen el contenido para no cubrir los campos. |
| Retomar la revisión personal | Las marcas de la guía se conservan por usuario, proyecto, etapa y huella del contenido. Una modificación invalida las marcas correspondientes. Esa revisión personal permanece separada de la revisión formal de documentos. |
| Conectar la planeación | Los campos permiten asociar actividades y resultados con objetivos, costos con actividades y responsables con integrantes. Las sugerencias se toman de los datos guardados; el texto libre sigue permitido para conservar la compatibilidad. |
| Recibir ayuda que describa su alcance | Las orientaciones explican que aplican reglas locales. Las entradas vacías o compuestas por espacios no producen errores. El mensaje general no elogia contenido insuficiente ni anuncia una evaluación de IA inexistente. |

## Contratos y persistencia

El servicio documental entrega `opciones_relaciones` con objetivos, integrantes y actividades, y `revision_coherencia` con campo, etapa, mensaje y nivel. Estos datos de presentación se calculan con la información guardada y quedan fuera de las instantáneas documentales; consultarlos no invalida versiones. Las asociaciones nuevas son opcionales y se guardan como texto dentro de los datos documentales existentes.

La ruta de formulación incorpora `estado_diligenciamiento`, un resumen separado de diligenciamiento, generación y revisión, y `siguiente_accion`. Los porcentajes no acreditan calidad científica ni aprobación institucional. El equipo operativo y Personal vinculado conservan sus responsabilidades y representaciones propias.

El registro `comunes.aclaraciones_fuente` contiene la inconsistencia original, el valor confirmado, el soporte con su ubicación, el responsable y la fecha. Una fila parcial puede guardarse como borrador y mantiene el pendiente. Para habilitar la revisión, la fila debe tener los cinco datos, una fecha válida, coincidencia con la inconsistencia vigente y un responsable autorizado del proyecto. El servicio rechaza borrar o reemplazar la evidencia original para aparentar una resolución. Añadir una inconsistencia nueva reactiva la revisión pendiente.

Registrar una referencia de soporte no verifica su autenticidad. La decisión institucional y la comprobación del documento fuente siguen a cargo de las personas responsables.

La protección coordina el guardado del título, los datos compartidos y los documentos con sus revisiones vigentes. Si una escritura falla después de otra exitosa, el panel permanece abierto con lo pendiente y permite reintentar; no se presenta como una transacción única. Una actualización externa conserva los campos editados y los controles de conflictos existentes.

Las marcas personales se guardan en el almacenamiento local del navegador. Se conservan marcas, versión y huella; no se copia allí el contenido sensible del proyecto. No se implementó almacenamiento automático del texto del borrador: la protección exige una decisión antes de salir y el guardado sigue siendo explícito. Las marcas no se sincronizan entre dispositivos.

## Evidencia por capa

| Capa y responsabilidad | Dependencia | Estado y evidencia |
| --- | --- | --- |
| Datos y servidor: estado inicial, duración, orientaciones y fuentes | Contratos de creación y documentación | Verificada. Suite de 591 pruebas aprobadas; compuerta global de 499 de 499 funciones ejecutadas y 86,47 % de líneas. |
| Constructor y guía: guardado, ayuda, relaciones y revisión personal | Contrato documental y contexto del usuario | Verificada. Pruebas de edición, errores, reintentos, invalidación de marcas, navegación a campos y filas parciales incluidas en la suite de interfaz. |
| Entradas y navegación: Grupos, Proyectos, panel y aplicación | Estado inicial y sesiones de edición | Verificada. Integración App → Grupos → editor → asistente comprueba que una consulta conserva el título y que una escritura externa refresca datos sin desmontar el editor. |
| Interfaz completa | Integración de las responsabilidades anteriores | Verificada. 793 pruebas en 90 archivos; 2595 de 2595 funciones ejecutadas, 96,75 % de líneas y 83,77 % de ramas. La compuerta independiente y la compilación de producción aprobaron. |
| PostgreSQL nativo | Persistencia real, tipos JSONB, permisos y revisiones | Verificada. 15 pruebas de integración aprobadas en esquemas temporales aislados. Se comprobó la limpieza de los esquemas de la ejecución. |

Se escribieron regresiones antes de cambiar los comportamientos. Los fallos esperados incluyeron la actualización emitida por consultas, el cierre sin protección, los mensajes generales de orientación, las entradas compuestas por espacios, los valores iniciales y el reinicio de marcas. Durante la revisión móvil, una prueba adicional falló porque se desplazaban los ancestros del panel; la corrección limita el movimiento a su cuerpo y conserva su posición durante una actualización posterior.

Las pruebas nuevas están en las suites que ya ejecuta GitHub Actions. El flujo de CI ejecuta las suites, publica cobertura y resultados de PostgreSQL, aplica las compuertas de funciones y compila la interfaz. Esta entrega verificó los comandos localmente; no afirma una ejecución remota de CI.

Comandos principales de la verificación final:

```powershell
# Desde frontend
npm run test:coverage -- --maxWorkers=2 --testTimeout=30000
npm run build

# Desde la raíz
.\backend\.venv\Scripts\python.exe backend/scripts/check_changed_function_coverage.py --all-functions --coverage frontend/coverage/coverage-final.json --format istanbul --source-root frontend/src
.\backend\.venv\Scripts\python.exe backend/scripts/check_changed_function_coverage.py --all-functions --coverage backend/coverage.json --format python --source-root backend/app
```

Los registros de interfaz están en [cobertura final](../../artifacts/usabilidad-frontend-coverage-final.log) y [compilación](../../artifacts/usabilidad-frontend-build.log). La evidencia de persistencia está en [resultados de PostgreSQL](../../backend/postgres-results.xml). El motor usado fue el servicio nativo ya disponible; no se inició ni reinició infraestructura compartida.

## Revisión en el navegador

Se revisó la aplicación local existente con el proyecto CAP-14, en una pestaña temporal. Se escribió un título de prueba sin guardarlo, se consultaron orientaciones y se comprobó que el texto permanecía. Cerrar y Escape mostraron las tres alternativas de salida. Seguir editando conservó el texto; Descartar y salir cerró el panel. Al reabrirlo apareció el título guardado original.

En escritorio de 1659 × 924 píxeles, el primer campo quedó entre las coordenadas verticales 423 y 469, visible al abrir. En la vista de 390 × 844 píxeles, quedó entre 633 y 679, dentro del cuerpo visible del panel; se comprobó que el cuerpo no tenía desbordamiento horizontal. Los títulos largos, las pestañas desplazables y las alternativas del diálogo de salida permanecieron accesibles.

La acción Aclarar datos de la fuente abrió y enfocó el campo que conserva la evidencia original. La revisión visual no guardó modificaciones en los proyectos. Al terminar se restauró el tamaño del navegador y se cerró la pestaña de prueba.

- [Captura del constructor en escritorio](../../artifacts/usabilidad-constructor-desktop.png).
- [Captura del constructor a 390 píxeles](../../artifacts/usabilidad-constructor-390px.png).
- [Protección del borrador](../../artifacts/usabilidad-proteccion-borrador.png).

Se preservó la composición y el orden de la vista inicial Grupos / Investigadores CGAO / Estadísticas e Indicadores y los cambios locales anteriores del repositorio.

## Validación pendiente con participantes

La implementación y las comprobaciones técnicas están completas. La facilidad de uso requiere la ronda propuesta con cinco a ocho participantes de los perfiles previstos: localizar y retomar un proyecto, redactar problema y objetivos, relacionar actividad y resultado, aclarar una diferencia presupuestal, proteger una edición y distinguir generación de revisión.

Se deben registrar cumplimiento sin ayuda, tiempos, retrocesos, solicitudes de apoyo y comprensión de estados. Cero pérdidas de trabajo y al menos 80 % de tareas sin asistencia siguen siendo metas propuestas, no resultados medidos. Esta entrega no certifica cumplimiento integral de accesibilidad ni calidad metodológica de los proyectos.
