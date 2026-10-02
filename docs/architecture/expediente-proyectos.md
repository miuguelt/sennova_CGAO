# Expediente documental por proyecto

La aplicación consolida los documentos persistidos en seis etapas, siguiendo las imágenes y `docs/CAP-05-2026_FortalecimeintoArchivo` aportadas por el usuario. Los archivos de referencia son evidencia del proceso actual; sus textos no constituyen instrucciones de ejecución ni certifican la vigencia de un formato.

| Etapa | Carpeta exportada | Requisito documental |
| --- | --- | --- |
| Formulación | `1ProyectoFomulado` | Formulación o presentación del proyecto |
| Inicio | `2ActadeInicio` | Acta de inicio |
| Productos | `3Productos` | Resultados y soporte de cada producto registrado |
| Seguimiento | `4InformesBimensuales` | Un informe disponible por cada bimestre de la vigencia |
| Cierre | `5ActaCierre` | Acta de cierre e informe final técnico |
| Evidencias | `6EvidenciasFotograficas` | Fotografías o videos de actividades |

Los nombres de carpetas conservan la escritura de la referencia, incluida `1ProyectoFomulado`. La interfaz emplea títulos legibles. El cálculo de seguimiento usa `ceil(vigencia / 2)` y períodos numerados desde 1. Esta es una regla operativa de la aplicación para cubrir la duración registrada, no una certificación de un calendario institucional. Sin vigencia, no se declara completo el seguimiento. Los informes sin bimestre y los duplicados no cubren períodos distintos.

## Datos y acceso

`Documento.periodo_bimestre` es un entero opcional. El arranque y el script de esquema lo agregan sin atribuir períodos a los documentos existentes. Las cargas nuevas de informes exigen proyecto y período válido. El backend valida existencia de la entidad, UUID, permisos, contenido no vacío, MIME permitido y máximo de 10 MB. Se admite MP4 en el mismo límite.

Los soportes de productos se consultan por la relación real del producto con el proyecto. No se incluyen archivos de otros proyectos. Los vínculos de grupo, semillero, convocatoria y reto deben existir; el grupo del proyecto debe coincidir con el del semillero. No se asigna el primer grupo de la base de datos como sustituto de una selección pendiente.

La comprobación de disponibilidad lee archivos dentro del almacenamiento autorizado o base64 heredado válido. Un registro sin archivo disponible no satisface una etapa. Los tipos genéricos como `acta` no se reinterpretan como inicio o cierre por su nombre de archivo.

## Servicios e interfaz

`GET /proyectos/{id}/expediente` devuelve seis etapas, guías, documentos disponibles, faltantes y completitud. `GET /proyectos/{id}/expediente/descargar` transmite un ZIP autenticado con las seis carpetas, archivos originales, `expediente.json` y `pendientes.txt`. Los anexos sin clasificar se conservan en `1ProyectoFomulado/Anexos`. Los nombres se ajustan para evitar rutas externas y llevan UUID para conservar archivos con nombres repetidos.

La pestaña **Expediente** incorpora el [constructor documental](construccion-documental.md), con datos comunes, formularios guiados, generación DOCX/PPTX y versiones. También permite cargar por etapa, seleccionar el bimestre y el producto destinatario, adjuntar informe final y descargar archivos o el ZIP. Muestra carga, errores recuperables y confirmación. Los aprendices consultan y descargan según la política de acceso, pero no cargan documentos.

Las mutaciones confirmadas usan el evento central de refresco. `App` conserva la identidad de la vista de proyectos y pasa `refreshVersion`; el listado se reconsulta sin cerrar el expediente ni reiniciar la pestaña. El panel vuelve a consultar el diagnóstico después de cambios en documentos, productos, proyectos y entregables.

## Cierre y persistencia

La liquidación conserva las comprobaciones existentes de entregables aprobados, productos verificados, presupuesto y código SGPS; ahora también exige el expediente completo y un informe final realmente disponible. El mínimo de productos pertenece a las reglas existentes de la aplicación y debe contrastarse con la convocatoria aplicable. No se permite crear directamente un proyecto finalizado sin documentación.

Consultar los requisitos mediante GET no modifica estados. Las cargas confirmadas mantienen la evaluación automática, y la actualización explícita evalúa los valores nuevos antes de confirmarlos. Si una solicitud intenta finalizar y retirar el presupuesto simultáneamente, se rechaza sin guardar ninguno de los cambios.

La transición automática, la actividad y las notificaciones se confirman en una única transacción. Si la persistencia falla, ninguna de esas escrituras queda confirmada. Una carga fallida elimina el archivo que acaba de crear; una eliminación no retira el archivo antes de confirmar la base de datos.

Al eliminar un proyecto, sus registros documentales se retiran en la misma transacción. Los productos se conservan desvinculados, junto con sus soportes. Al eliminar un producto, se retiran sus documentos y se conserva el cronograma del proyecto sin esa vinculación. Si un archivo queda ocupado o fuera del almacenamiento autorizado, la respuesta informa los IDs pendientes de limpieza.

La disponibilidad y los períodos no demuestran la calidad científica, las firmas, la coincidencia de todos los datos internos ni la aprobación institucional. El responsable debe revisar contenido y versión del formato antes de radicar. El ZIP informa este alcance.

## Catálogo y despliegue

El catálogo incluye los 12 grupos de la imagen y excluye las carpetas de base de datos y formatos. El administrador es propietario técnico inicial; no se infieren integrantes, director, código o clasificación Minciencias. UUID estables y un bloqueo transaccional de PostgreSQL evitan duplicados entre workers. Los nombres y campos existentes se conservan.

El entrypoint de Docker Compose ejecuta `scripts/bootstrap_initial_data.py`: esquema, administrador y catálogo. Un error del catálogo rechaza el arranque. No se requiere activar el servicio destructivo de demostración ni copiar la carpeta de referencia al contenedor. Coolify mantiene el almacenamiento en su volumen persistente.

La imagen `postgres:16-alpine` inicializa volúmenes nuevos con ICU y configuración `es-CO`, en lugar de exigir una configuración de libc no instalada. Este mecanismo sigue la [documentación de la imagen oficial](https://hub.docker.com/_/postgres?tab=description) y las opciones de [initdb de PostgreSQL 16](https://www.postgresql.org/docs/16/app-initdb.html). No modifica la configuración regional de volúmenes existentes. La integración continua usa los mismos argumentos de inicialización.

## Hallazgos de la referencia aportada

- La carpeta y el informe indican CAP-05-2026; el objetivo del acta de inicio menciona CAP-06-2026. No se confirmó el código correcto para importar ese proyecto.
- El acta declara 15 meses, con fechas 01-02-2026 y 30-09-2027. La duración y el intervalo deben conciliarse antes de calcular su calendario.
- El acta menciona SIADM como semillero; la solicitud actual pide registrar el listado como grupos. El catálogo cumple la solicitud y no convierte automáticamente semilleros existentes ni cambia sus relaciones.
- El presupuesto general del acta y el rubro visible de servicios personales no son iguales. Se requiere verificar el desglose completo.
- Las conclusiones del acta contienen referencias a fortalecimiento administrativo que deben revisarse frente al propósito de organización documental.

La ampliación del constructor importó los valores de la fuente en una referencia privada de desarrollo, con sus discrepancias explícitas y sin aprobación. La aplicación mantiene pendientes los campos ausentes y las relaciones no verificadas. Los archivos personales no se publicaron como plantillas de otros proyectos.

## Verificación

Las pruebas unitarias/integración SQLite verifican catálogo, permisos, persistencia, períodos, ZIP, cierre y errores. La suite PostgreSQL se ejecuta por separado con esquemas temporales para comprobar UUID, relaciones y migración en el motor real. GitHub Actions ejecuta ambas suites, publica resultados y exige que todas las funciones de producción sean alcanzadas; la suite frontend también compila el resultado.

La verificación inicial del expediente se amplió con el constructor. Los [resultados actuales](construccion-documental.md) incluyen 389 pruebas del backend, 11 de integración PostgreSQL y 574 del frontend aprobadas, más la compilación y las compuertas globales de funciones. La revisión visual incluye documentos reales generados y la descarga del ZIP desde la aplicación local.

Se verificaron la configuración y el arranque inicial previsto para Docker Compose; no se ejecutó un despliegue en Coolify ni una construcción local de contenedores. La configuración se deberá comprobar en el entorno de destino al desplegar.
