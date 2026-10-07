# Construcción y versiones de documentación por proyecto

La aplicación recopila información en formularios guiados y produce documentos editables. La ruta de uso es **Proyectos I+D+i → proyecto → Documentación**; también se puede abrir desde los proyectos del Grupo CGAO. La pestaña Documentación se abre primero y ofrece redacción guiada, documentos y versiones, datos compartidos y descarga conjunta de la carpeta. Los datos generales pertenecen al proyecto; los datos comunes se diligencian una vez y cada documento solicita su información específica. Guardar un formulario permite continuar después. Generar exige completar sus campos requeridos. Revisar exige que el archivo y los datos sigan vigentes.

## Decisión de almacenamiento

Se conserva PostgreSQL y SQLAlchemy, con relaciones existentes para proyecto, usuarios, productos y archivos. Los formularios complementarios usan JSONB, validado por un catálogo declarativo. Esta combinación evita duplicar el proyecto en tablas de cada formato y permite evolucionar los formularios sin perder la integridad de sus relaciones. SQLite usa JSON exclusivamente en las pruebas herméticas.

| Entidad | Responsabilidad y garantías |
| --- | --- |
| `Proyecto`, `Producto` y entidades existentes | Fuente vigente de título, objetivo, duración, presupuesto, vínculos y productos registrados. Los formularios no sustituyen estas relaciones. |
| `project_documentation` | Un registro por proyecto, datos comunes JSONB, revisión, autor, fecha y copia opcional de las fuentes importadas. |
| `project_document_drafts` | Un borrador por proyecto y clave documental. Vincula tipo, bimestre y producto cuando corresponden. Sus datos JSONB pueden estar incompletos. |
| `project_document_versions` | Copia de contexto, datos comunes, formulario y versión de plantilla usados al generar; número de versión, SHA256, autor y revisión del contenido. La unicidad impide repetir números de versión. |
| `Documento` | Metadatos y vínculo al archivo real, compartidos con el expediente y la descarga autenticada existente. |
| Volumen persistente de documentos | Contenido binario DOCX, PPTX y anexos. La base conserva la relación y la huella; no guarda los nuevos binarios en JSONB. |

Los valores monetarios complementarios se normalizan como cadenas decimales exactas. El presupuesto total sigue siendo el dato del proyecto existente. No se convierten montos pendientes en cero. Una discrepancia entre el desglose y el total impide marcar una versión como revisada.

La eliminación del proyecto retira sus datos documentales por cascada. La eliminación de un producto desvincula su borrador sin alterar la copia de versiones anteriores. La eliminación de un archivo conserva el historial con su vínculo vacío; esa versión deja de satisfacer un requisito documental.

### Alternativas evaluadas

- Una tabla completa por cada formato multiplica campos repetidos y dificulta conservar versiones de las plantillas. Las relaciones y los índices permanecen normalizados; sólo el contenido variable usa JSONB.
- Guardar únicamente archivos impide solicitar datos faltantes y reconstruir qué información produjo una versión.
- Sobrescribir el último archivo pierde trazabilidad. Se guardan versiones y el ZIP usa la última versión de cada borrador; las anteriores permanecen descargables desde su historial.
- Crear productos o integrantes globales a partir de nombres en un ejemplo mezcla hechos documentales con entidades verificadas. La importación conserva esos textos como fuente y deja pendientes las relaciones que requieren confirmación.

## Documentos y formularios

| Carpeta exacta | Documentos generados |
| --- | --- |
| `1ProyectoFomulado` | Formulación DOCX y presentación PPTX. |
| `2ActadeInicio` | Acta de inicio DOCX. |
| `3Productos` | Resultado del producto DOCX y póster PPTX, por cada producto registrado. |
| `4InformesBimensuales` | Informe DOCX por bimestre, con rango real de fechas, actividades, resultados, dificultades y referencias. |
| `5ActaCierre` | Acta de cierre DOCX e informe final DOCX. El acta distingue cierre parcial y final. |
| `6EvidenciasFotograficas` | Registro DOCX y archivos fotográficos o audiovisuales reales. El registro no sustituye esas evidencias. |

Las ayudas solicitan equipo, responsabilidades, presupuesto, cronograma, metodología, indicadores, resultados, activos, pendientes y demás campos del formato correspondiente. Las filas tienen validación de estructura y límites. Las fechas deben ser válidas y conservar el orden del período. Los campos desconocidos se rechazan. Un proyecto sin productos debe registrarlos antes de generar documentos vinculados a ellos. La orientación metodológica usa estructuras genéricas y no aporta requisitos ni datos del proyecto; el usuario debe confirmarlos con fuentes vigentes. Las recomendaciones se calculan con reglas locales del servidor; la interfaz no las presenta como contenido generado por inteligencia artificial.

Los archivos son paquetes Office reales: tablas y párrafos en Word, texto y diapositivas editables en PowerPoint. La presentación pagina contenido extenso y el póster tiene tamaño de impresión. Todas las salidas se identifican como borradores para revisión; las firmas permanecen vacías. La formulación, la presentación y el informe final requieren objetivos específicos registrados en el proyecto. No se certifica la vigencia institucional de los formatos a partir de los ejemplos.

La plantilla suministrada `GCDTP-F-023_V01_Formato_Informe_Final.docx` está empaquetada en `backend/app/templates` y se usa para generar el informe final en su estructura institucional. El generador llena la ficha del proyecto, marca la clasificación elegida, presenta resultados con actividades, indicadores, metas, logros y soportes, elimina las instrucciones y el control de cambios que la plantilla ordena retirar, y conserva las imágenes recibidas como anexos fotográficos. Autor y fecha de entrega son explícitos; TecnoParque y TRL se completan cuando el investigador los registra. El ejemplar usado corresponde a la versión recibida (junio de 2026); no se confirmó por separado su vigencia institucional.

## Contratos y concurrencia

- `GET /proyectos/{id}/documentacion`: contexto, catálogo de campos, borradores, pendientes, advertencias e historial; no escribe.
- `PUT /documentacion/comunes`: guarda `revision` y `datos` compartidos.
- `PUT /documentacion/borradores/{clave}`: guarda `revision` y `datos` del formulario.
- `POST /documentacion/generar/{clave}`: recibe `revision` y `revision_comunes`; genera una versión sólo con datos completos.
- `POST /documentacion/revisar/{documento_id}`: registra una observación de revisión del contenido.

Las rutas están bajo el proyecto y verifican UUID, existencia y acceso. Administradores e investigadores autorizados escriben; aprendices autorizados consultan y descargan. La revisión optimista devuelve HTTP 409 si otro cambio dejó desactualizado el formulario y la interfaz conserva la edición local para recuperarla.

Las escrituras bloquean la fila del proyecto en PostgreSQL. Dos solicitudes simultáneas de generación con los mismos datos conservan una sola versión y un archivo cuando la huella coincide. El archivo se crea de forma exclusiva antes de confirmar la transacción; un fallo elimina únicamente el archivo creado por esa operación. La revisión comprueba también SHA256 y el contexto vigente. Un cambio posterior del proyecto o del formulario vuelve pendiente la versión anterior.

Marcar el contenido como revisado no aporta firmas ni aprobación institucional. Un cierre parcial y un documento desactualizado no satisfacen el cierre definitivo. Las versiones nuevas nacen como borradores y no finalizan automáticamente el proyecto.

## Esquema, despliegue y ejemplos

El arranque y `scripts/bootstrap_initial_data.py` llaman al helper de esquema documental, que crea las tres tablas y agrega `fuente_snapshot` si falta. Es idempotente y usa bloqueo transaccional en PostgreSQL. Su reversión rechaza cualquier tabla con registros; no se ejecutó una reversión sobre la base vigente.

Docker instala los generadores desde `requirements.txt`. Coolify debe conservar el volumen de documentos y la base PostgreSQL. El bootstrap inicial conserva un grupo institucional y prepara su catálogo de semilleros. Los documentos personales de ejemplo no se importan al desplegar ni se usan como valores por defecto de otros proyectos.

En desarrollo se importaron dos referencias privadas con estado **Referencia**: **Fortalecimiento de los procesos de organización documental en entidades territoriales y públicas de la provincia de Vélez** y **Sistema de información para la gestión de proyectos de investigación del CGAO**. Se conserva el texto fuente, sus huellas y las discrepancias sin convertirlos en datos de plantilla. CAP permanece en los datos comunes; SGPS queda pendiente cuando la fuente no lo aporta. La referencia CAP-14 conserva el acta, la formulación, la presentación y el informe bimensual; la plantilla final vacía se conserva como fuente, no como informe diligenciado. No se crean cuentas, productos verificados ni firmas. El detalle de CAP-14 está en el [mapa de datos de la referencia](../../maintenance/project-documentation/reference-map-cap14.md).

La importación utiliza UUID estable derivado de la fuente. Repetirla conserva las ediciones posteriores. El comando exige `DEBUG=true` y un administrador existente; el fixture real está excluido de Git. Sus pruebas usan datos sintéticos. El mapa de fuentes y pendientes está en `maintenance/project-documentation/reference-map.md`.

Los ejemplos discrepan en CAP-05/CAP-06, duración, fechas y presupuesto; además, el acta de cierre es parcial y algunos activos sólo se enumeran. Se guardan literalmente las fuentes sin decidir qué dato es correcto. El investigador debe conciliar estas diferencias y completar los campos ausentes para generar y revisar borradores del proyecto de referencia. Estos ejemplos no confirman la vigencia de los formatos institucionales.

Los paquetes de salida por referencia están en [generados-referencias-sennova-2026-10-04](../generados-referencias-sennova-2026-10-04/README.md). Se actualizaron después de aplicar correcciones locales respaldadas por fuentes guardadas en SENNOVA. Cada paquete contiene originales, muestras, borradores por formulario y un manifiesto con huellas SHA-256 y pendientes. Los slots marcados `identico_a_muestra` son copias binarias exactas. El informe final de esa referencia usa la plantilla recibida GCDTP-F-023 V01; no se ha confirmado que esa versión esté vigente. Los tipos o períodos sin ejemplo equivalente se renderizan con la aplicación y no se declaran idénticos a una muestra ausente.

## Verificación y límites

Las pruebas ejercitan los nueve tipos de salida, lectura de los paquetes Office, descarga individual, estructura ZIP, revisiones, permisos, contenido alterado, colisiones de archivo y fallos de persistencia. PostgreSQL se prueba en esquemas temporales, incluyendo JSONB, claves foráneas, unicidad, generación simultánea y migración reversible sin retirar datos reales. GitHub Actions ejecuta ambas suites y las compuertas globales de funciones; el frontend también compila.

La revisión visual comprueba las páginas de Word y las diapositivas de PowerPoint con motores Office o compatibles. Las previsualizaciones basadas en fuentes incompletas se identifican como provisionales y no se registran como documentos aceptados. Para el corte local del 4 de octubre de 2026, los DOCX se renderizaron con LibreOffice y los PPTX con el motor de presentaciones del entorno.

El límite de archivos existente es 10 MB. El video original de la referencia supera ese límite y requiere compresión o una decisión posterior sobre almacenamiento de videos. El informe final independiente no se deduce del acta de cierre ni se marca como aportado. No se ejecutó despliegue en Coolify.

La auditoría de dependencias del 1 de octubre de 2026 reportó 51 vulnerabilidades: 14 en el conjunto npm y 37 en cinco paquetes Python (`python-jose`, `python-multipart`, `python-dotenv`, `starlette` y `ecdsa`). Es una comprobación pendiente de resolver antes de liberar; las pruebas funcionales aprobadas no certifican seguridad de las librerías. El análisis ejecutado no reportó vulnerabilidades en `python-docx` ni `python-pptx`. El uso local de los ejemplos responde a la solicitud explícita del usuario; el tratamiento institucional de datos personales en producción conserva su decisión pendiente en `docs/legal/`.

### Resultados locales del 1 de octubre de 2026

- Backend: **389 pruebas aprobadas**, con compuerta global de **399/399 funciones ejecutadas**. El porcentaje agregado de líneas es 84 %; no se presenta como 100 % de líneas ni de ramas.
- PostgreSQL 18 nativo: **11 pruebas aprobadas** en esquemas aislados, sin modificar datos vigentes.
- Frontend: **574 pruebas aprobadas** y **22 contratos suplementarios de API**. La compuerta global alcanzó **2300/2300 funciones**; V8 registró 2215/2215 funciones, 96,30 % de líneas y 81,39 % de ramas. La compilación de producción pasó.
- Ruff aprobó los archivos Python trabajados y la revisión de diferencias del alcance no encontró errores. La compuerta `WorkingTree` pasó; los avisos de tamaño del legado no se presentan como una reorganización completa del repositorio.
- Las seis previsualizaciones de la referencia conservaron sus datos y objetivos; **63 páginas y diapositivas** se revisaron visualmente. La revisión sintética de los nueve tipos comprendió **40 páginas y diapositivas**, incluido el informe final ampliado. No se guardaron esas previsualizaciones como documentos aceptados.
- La aplicación local mostró la referencia separada de Aprobado, los datos precargados, las guías de campos y la generación incompleta bloqueada. Se revisaron pantallas de 320, 390, 768, 1440, 1920 y 2560 píxeles; los formularios y el panel conservaron su ancho. En 320 píxeles la página de fondo conserva un desborde de cuatro píxeles; el constructor no mostró ese desborde. No se verificó una ampliación real al 200 % porque la herramienta de navegación no expuso un control de zoom efectivo.
- La descarga del ZIP parcial desde el navegador produjo un archivo real con las seis carpetas exactas, `expediente.json` y `pendientes.txt`.

Las previsualizaciones finales están en `C:/Users/Miguel/AppData/Local/Temp/sennova-referencia-qa-_g4gk30d`; son evidencia local de desarrollo y no forman parte del seed de producción. La captura de interfaz está en `C:/Users/Miguel/AppData/Local/Temp/sennova-constructor-documental-verificado.png`.

### Corrección y verificación local del 4 de octubre de 2026

- El flujo del constructor dejó de ofrecer descargas rápidas que asignaban código SGPS, presupuesto o duración predeterminados. La guía dirige a las tarjetas de documentos de referencia y señala que la generación se habilita al completar los campos configurados en la aplicación; esto no confirma el cumplimiento de una convocatoria. Las recomendaciones se identifican como orientaciones metodológicas locales.
- CAP-14 contiene 11 salidas documentales, 404 pendientes y 4 copias exactas de ejemplos adjuntos. Fortalecimiento documental contiene 16 salidas, 802 pendientes y 5 copias exactas. Se aplicaron al registro las secciones de formulación detectadas en CAP-14 y la regional confirmada en la carta de aval de CAP-05/CAP-06. Ambos paquetes preservan archivos fuente, con sus huellas; ningún borrador se guardó como versión.
- Backend: **410 pruebas aprobadas** y compuerta global de **457/457 funciones**. La cobertura de líneas es 85 %.
- Frontend: **604 pruebas** en la suite principal y **21 contratos suplementarios de API**; compuerta global de **2375/2375 funciones**. V8 registró 100 % de funciones, 96,23 % de líneas y 81,48 % de ramas en la suite principal.
- La compilación de producción pasó. Los 4 archivos PPTX se renderizaron y revisaron visualmente. Los 23 DOCX generados y las 2 copias de la plantilla vacía, incluidas en cada paquete para comparación, se renderizaron con LibreOffice: 25 archivos y 118 páginas revisadas en seis hojas de contacto. No se observaron páginas en blanco inesperadas ni desbordes de tablas. La validación estructural confirmó los 27 documentos generados y los dos ZIP, incluidas las huellas indicadas en los manifiestos.
- La base local actual muestra que ambas referencias carecen de código SGPS, productos y versiones documentales persistidas. Esos datos no se suplieron con valores inventados; los manifiestos enumeran los campos pendientes. Los documentos de muestra existentes se copiaron de forma idéntica donde su tipo coincidía con un slot. No hay una muestra disponible para cada tipo o período, por lo que no es posible afirmar identidad en esos casos. El respaldo completo previo a los cambios está fuera del repositorio en `C:/Users/Miguel/Documents/Aplicaciones/_backups/sennova/`.

### Información propuesta e indicadores CAP-14 (5 de octubre de 2026)

- Se añadió `contenido_propuesto_cap14.md` al paquete de referencia. Contiene redacción propuesta para la introducción, el problema, la justificación, el alcance y la metodología, además de resultados e indicadores sugeridos. Las metas se marcan como propuestas y las fechas, presupuesto y datos de ejecución permanecen pendientes.
- Se agregó `GET /reportes/indicadores-minciencias` y su acceso en **Reportes > Consolidados > Indicadores de clasificación**. El libro Excel resume perfiles y productos de integrantes activos de **Investigadores CGAO**, separa productos por investigador y deja visibles los datos de perfil, categoría y soporte faltantes. No otorga puntajes ni calcula clasificaciones oficiales.
- Verificación posterior al cambio: backend **434 pruebas aprobadas** y compuerta global de funciones en **475/475**; frontend **620 pruebas aprobadas** más **21 pruebas complementarias de API**, compuerta global combinada en **2328/2328 funciones** y compilación de producción aprobada. La primera ejecución de cobertura del frontend tuvo tres tiempos de espera bajo carga paralela; la repetición sin concurrencia pasó.
- Para completar CAP-14 aún se requiere confirmación institucional del código SGPS (si aplica), acta, semillero, fechas, periodos, distribución presupuestal, versión del modelo Minciencias, requisitos de usuarios, pruebas de aceptación, evidencias y aplicabilidad del formato final.
- Se agregó al paquete de CAP-14 una matriz de trazabilidad para los seis objetivos y un protocolo propuesto de validación con usuarios. El protocolo no reporta resultados; requiere aprobación de perfiles, criterios y ambiente antes de convocar participantes. No se confirmó otra ausencia funcional en los objetivos de proyectos, cronogramas, productos y reportes al inspeccionar el repositorio.
- Se retiró del modelo de datos la bitácora heredada y los campos de formatos de etapa productiva. La inicialización elimina esos datos de instalaciones existentes; conserva la auditoría general y la documentación de investigación. El [modelo funcional y de datos](modelo-funcional-y-datos.md) y el README describen esta limpieza.

### Verificación final de jerarquía, expediente y cronograma — 5 de octubre de 2026

- Backend: **498 pruebas aprobadas** y compuerta de **488/488 funciones** alcanzadas.
- Frontend: **672 pruebas aprobadas en 80 archivos** y compuerta de **2401/2401 funciones** alcanzadas. La compilación de producción pasó.
- Ruff, validación de reglas y revisión de higiene del repositorio pasaron. La revisión de modularidad no reportó errores; mantiene avisos en archivos heredados grandes.
- La suite de integración PostgreSQL no se ejecutó localmente en esta revisión porque no hay un DSN de pruebas dedicado. GitHub Actions conserva su servicio PostgreSQL aislado.
- El expediente exportado usa los nombres de carpeta de las referencias CAP aportadas, y las pruebas comparan la estructura exportada con esas fuentes. La función retirada de bitácoras queda limitada a migración y limpieza de datos heredados.
