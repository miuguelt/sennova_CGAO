# Construcción y versiones de documentación por proyecto

La aplicación recopila información en formularios guiados y produce documentos editables. La ruta de uso es **Proyectos I+D+i → proyecto → Expediente → Construir documentación**. Los datos generales pertenecen al proyecto; los datos comunes se diligencian una vez y cada documento solicita su información específica. Guardar un formulario permite continuar después. Generar exige completar sus campos requeridos. Revisar exige que el archivo y los datos sigan vigentes.

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

Las ayudas solicitan equipo, responsabilidades, presupuesto, cronograma, metodología, indicadores, resultados, activos, pendientes y demás campos del formato correspondiente. Las filas tienen validación de estructura y límites. Las fechas deben ser válidas y conservar el orden del período. Los campos desconocidos se rechazan. Un proyecto sin productos debe registrarlos antes de generar documentos vinculados a ellos.

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

Docker instala los generadores desde `requirements.txt`. Coolify debe conservar el volumen de documentos y la base PostgreSQL. El catálogo de grupos continúa en el bootstrap inicial. Los documentos personales de ejemplo no se importan al desplegar ni se usan como valores por defecto de otros proyectos.

En desarrollo se importaron dos referencias privadas con estado **Referencia**: **Fortalecimiento de los procesos de organización documental en entidades territoriales y públicas de la provincia de Vélez** y **Sistema de información para la gestión de proyectos de investigación del CGAO**. Se conserva el texto fuente, sus huellas y las discrepancias sin convertirlos en datos de plantilla. CAP permanece en los datos comunes; SGPS queda pendiente cuando la fuente no lo aporta. La referencia CAP-14 conserva el acta, la formulación, la presentación y el informe bimensual; la plantilla final vacía se conserva como fuente, no como informe diligenciado. No se crean cuentas, productos verificados ni firmas. El detalle de CAP-14 está en el [mapa de datos de la referencia](../../maintenance/project-documentation/reference-map-cap14.md).

La importación utiliza UUID estable derivado de la fuente. Repetirla conserva las ediciones posteriores. El comando exige `DEBUG=true` y un administrador existente; el fixture real está excluido de Git. Sus pruebas usan datos sintéticos. El mapa de fuentes y pendientes está en `maintenance/project-documentation/reference-map.md`.

Los ejemplos discrepan en CAP-05/CAP-06, duración, fechas y presupuesto; además, el acta de cierre es parcial y algunos activos sólo se enumeran. Se guardan literalmente las fuentes sin decidir qué dato es correcto. El investigador debe conciliar estas diferencias y completar los campos ausentes para generar y revisar las versiones oficiales del proyecto de referencia.

## Verificación y límites

Las pruebas ejercitan los nueve tipos de salida, lectura de los paquetes Office, descarga individual, estructura ZIP, revisiones, permisos, contenido alterado, colisiones de archivo y fallos de persistencia. PostgreSQL se prueba en esquemas temporales, incluyendo JSONB, claves foráneas, unicidad, generación simultánea y migración reversible sin retirar datos reales. GitHub Actions ejecuta ambas suites y las compuertas globales de funciones; el frontend también compila.

La revisión visual usa Word y PowerPoint instalados en instancias separadas para exportar PDF y comprobar páginas y diapositivas. LibreOffice no está disponible en este equipo; no se presenta esa herramienta como una verificación ejecutada. Las previsualizaciones de fuentes incompletas se identifican como provisionales y no se registran como documentos aceptados.

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
