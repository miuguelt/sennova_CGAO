# Mapa de campos de las referencias documentales del proyecto

Este mapa describe los cinco archivos Word y PowerPoint aportados en `docs/CAP-05-2026_FortalecimeintoArchivo`. Sirve para diseñar formularios, conservar las relaciones entre campos y probar la generación de documentos. Los datos narrados en los ejemplos permanecen como información de la fuente; este análisis no certifica resultados, firmas, cifras ejecutadas ni vigencia normativa.

La carga de ejemplo está en `backend/tests/fixtures/project_documentation_reference.json`. Incluye los datos por tipo de documento, los bloques OOXML completos con ubicación, los valores pendientes y las observaciones que requieren confirmación. Las personas, los correos, las entidades participantes y los resultados de este proyecto no deben convertirse en valores predeterminados de plantillas globales.

## Inventario y alcance de revisión

| Documento | Ubicación dentro de la carpeta fuente | Estructura encontrada | Papel en el expediente |
| --- | --- | --- | --- |
| Presentación del proyecto | `1ProyectoFomulado/presentacion PROYECTO.pptx` | 17 diapositivas, 219 párrafos OOXML y una tabla de cronograma | Formulación y exposición del proyecto |
| Acta de inicio | `2ActadeInicio/GIC-F-037ActaIniciodeProyectoMod (2).docx` | 214 párrafos, nueve tablas y cinco partes de texto | Inicio del proyecto y acuerdos de ejecución |
| Póster | `3Productos/2PosteryEventos/POSTER_PLANTILLA_2026 (1) (1) (1) (1).pptx` | Una diapositiva vertical, 19 párrafos OOXML y títulos de sección integrados en imágenes | Producto de divulgación y presentación en eventos |
| Informe bimensual | `4InformesBimensuales/INFORME_BIMENSUAL_PROYECTO_FORTALECIMIENTO_DOCUMENTAL.docx` | 118 párrafos, una tabla y siete partes de texto | Avances, resultados, dificultades y planificación del siguiente período |
| Acta de cierre | `5ActaCierre/017-__Acta_Cierre_Proyecto.docx` | 212 párrafos, once tablas y nueve partes de texto; una tabla pertenece al encabezado | Evaluación y cierre del período ejecutado |

El conteo de párrafos incluye párrafos vacíos y de tablas. La extracción conserva también encabezados, pies, notas al pie, notas finales y cuadros de texto presentes. Las notas de diapositiva no aparecen en los dos paquetes PPTX. Los textos repetidos por estructuras anidadas se conservan con su ubicación para no perder contenido.

La carpeta contiene además dos PDF de productos, una fotografía JPG y un video MP4. El inventario del JSON conserva sus rutas y tamaños. Este mapa no extrae el contenido de los PDF ni certifica lo que prueban. La mera mención de un activo en el acta no demuestra que su archivo esté disponible.

## Campos comunes y relaciones

| Campo o conjunto | Tipo recomendado | Relación que debe conservarse |
| --- | --- | --- |
| Nombre del proyecto y código CAP | Texto con procedencia | El código que aparece en cada documento debe poder compararse con el código confirmado del proyecto. Una discrepancia requiere revisión explícita. |
| Objetivo general y objetivos específicos | Texto y lista de textos | El objetivo general se reutiliza, pero las variantes de redacción del ejemplo no se sustituyen automáticamente. |
| Centro, regional, grupo y semillero | Campos independientes con referencia opcional a registros | La fuente mezcla una denominación de grupo con SIADM como semillero. No convertir una frase compuesta en dos asociaciones de base de datos sin confirmación. |
| Equipo | Tabla de nombre, rol y actividades | Las funciones asignadas a cada persona se conservan en la misma fila. Programa y correo sólo se llenan cuando la fuente los aporta. |
| Actividades y cronograma | Tabla de actividad, responsable, período textual y resultado | Los valores «Mes 1» o «Mes 1 - Mes 2» no son fechas ISO. Deben admitirse períodos relativos, además de fechas cuando estén confirmadas. |
| Presupuesto | Tabla de rubro, descripción, valor planeado, valor real y uso | Un valor vacío permanece pendiente. La descripción «Pago de honorarios» no equivale a un monto ejecutado. |
| Entidad, actividad, resultado y evidencia | Tabla de filas relacionadas | Cada resultado debe mantener su entidad y su soporte. Una descripción narrativa no sustituye el archivo que acredita ese resultado. |
| Reunión | Ciudad, fecha textual, fecha confirmada, horas, lugar, temas y objetivos | La fecha de la reunión, las fechas del proyecto y el período del informe tienen significados distintos. |
| Evaluación | Fortalezas, dificultades, acciones futuras y lecciones aprendidas | Son secciones independientes que reaparecen en el informe y el cierre. |
| Asistentes e invitados | Tablas de nombre, cargo, dependencia o entidad y firma | Un nombre escrito y una celda de firma vacía no prueban una firma válida. |
| Referencias y enlaces | Listas separadas de referencias y URL | Una instrucción residual sobre bibliografía no constituye una referencia ni un enlace. |

Los campos comunes propuestos `codigo_cap`, `regional`, `centro`, `fecha_elaboracion`, `equipo`, `presupuesto` y `cronograma` son adecuados siempre que permitan valores pendientes y no impongan fechas absolutas a los períodos relativos. Deben agregarse `fecha_textual`, `fecha_ejecucion_textual`, `valor_real_textual`, `alcance_cierre` y procedencia por campo.

## Acta de inicio GIC F 037 V02

El título institucional es «ACTA DE INICIO DE PROYECTOS» dentro del proceso «GESTIÓN DE INNOVACIÓN Y COMPETITIVIDAD». El pie contiene `GIC-F-037 V02`.

| Sección | Campos y columnas que deben conservarse |
| --- | --- |
| Reunión | Nombre del proyecto; ciudad y fecha; hora de inicio; hora final; lugar; dirección general, regional o centro; temas; objetivos de la reunión |
| Información general | Responsable; objetivo general; valor; centro de formación; grupo o semillero ejecutor; duración; fecha de inicio; fecha de terminación |
| Personal vinculado | Nombre; rol; descripción de actividades a liderar |
| Descripción de actividades | Actividad; encargado; fecha o período textual |
| Presupuesto y cronograma | Rubro; valor planeado; descripción de su uso; fecha de ejecución |
| Alcance e impacto | Sector productivo; academia o formación |
| Observaciones y conclusiones | Acuerdos y observaciones del equipo |
| Asistentes | Nombre; cargo, dependencia o entidad; firma |
| Invitados opcionales | Nombre; cargo; entidad |

La tabla de actividades contiene once filas completas. La tabla presupuestal enumera ocho rubros y sólo uno tiene monto. Estos renglones vacíos no deben eliminarse del formulario ni convertirse en cero durante la carga de ejemplo.

## Informe bimensual

La estructura desarrolla el proyecto de investigación y sus avances. Contiene autores, antecedentes, objetivo general, siete objetivos específicos, metodología, resultados narrativos, discusión, fortalezas, dificultades, acciones futuras, lecciones aprendidas, conclusión y siete referencias bibliográficas.

La tabla de resultados contiene las columnas **Entidad**, **Actividades ejecutadas**, **Resultados alcanzados** y **Evidencia**. Presenta tres entidades: Concejo Municipal de Cimitarra, Hospital San Martín E.S.E. La Belleza e INPEC Vélez. El texto menciona la Resolución No. 041 y reconocimientos institucionales; estas menciones deben conservar su nivel de certeza y relacionarse con soportes cuando existan.

El documento se presenta como primer informe bimensual, pero no identifica el rango de fechas en un campo formal. La carga deja esas fechas y el número formal de bimestre pendientes. No debe inferirse un período únicamente para completar el expediente.

## Acta de cierre GIC F 017

El encabezado presenta «ACTA DE CIERRE DE PROYECTOS» y el pie contiene `GIC-F-017`.

| Sección | Campos y columnas que deben conservarse |
| --- | --- |
| Reunión e información general | Los mismos campos identificadores del acta de inicio |
| Evaluación de actividades y entregables | Actividad o etapa; entregable; observación |
| Balance presupuestal | Rubro; valor planeado; valor real |
| Evaluación del proyecto | Fortalezas; dificultades; acciones futuras; lecciones aprendidas |
| Listado de activos | Documentos, productos, soportes formativos y medio de almacenamiento |
| Observaciones y conclusiones | Resultados, continuidad, recomendaciones y pendientes |
| Asistentes e invitados | Tablas de identificación y firmas |

El cierre declara expresamente que corresponde al período o etapa ejecutada y **no implica la terminación definitiva del proyecto**. El formulario debe solicitar el alcance del cierre. El registro o la generación de esta acta parcial no debe finalizar automáticamente el proyecto.

La evaluación presenta cuatro fases y una fila «OTROS». El inventario de activos menciona el proyecto formulado, diagnóstico, FUID, archivos organizados, soportes de digitalización, informe final, informes bimensuales, actas, reconocimientos, fotografías y evidencias formativas. No todos esos archivos están aportados de manera independiente en la carpeta revisada.

## Presentación del proyecto

La secuencia de la fuente es:

1. Portada con nombre, semillero, programa y centro.
2. Introducción.
3. Contexto del problema y entidades analizadas.
4. Problema central y consecuencias.
5. Justificación e impactos.
6. Objetivo general.
7. Objetivos específicos.
8. Referente teórico y autores.
9. Marco normativo.
10. Metodología, población, muestra y muestreo.
11. Técnicas de recolección de información.
12. Fases y cronograma matricial por meses.
13. Resultados esperados.
14. Impacto institucional, formativo y social.
15. Conclusiones.
16. Referencias.
17. Cierre institucional con «Gracias».

El tipo de investigación declarado es **investigación aplicada**, con enfoque cualitativo, investigación-acción, estudio de casos múltiples y muestreo no probabilístico intencional. Los procesos archivísticos descritos son clasificación, ordenación, foliación, inventario, digitalización e indexación. Estas expresiones describen el ejemplo; no justifican asignarle una categoría Minciencias que la fuente no aporta.

El cronograma tiene cuatro fases y seis columnas de meses. Diagnóstico abarca meses 1 y 2; organización documental, meses 2 y 3; digitalización e indexación, mes 4; evaluación y cierre, meses 5 y 6. La diapositiva 14 tiene su texto integrado como imagen y se transcribió después de la revisión visual.

La presentación usa relación 16:9 y tamaño OOXML de `12192000 × 6858000` EMU. Mezcla Arial, Calibri, Times New Roman y Work Sans, con tamaños de 10 a 44 puntos. La nueva salida debe conservar la cobertura temática y revisar los desbordes; no necesita copiar la mezcla de estilos ni la lámina ornamental final como un requisito del proyecto.

## Póster

El póster contiene nombre del proyecto, autores y correos, fotografía, introducción, planteamiento del problema, justificación, objetivos, referente teórico, metodología, avances, bibliografía y enlaces de acceso. Sus títulos de sección están integrados en imágenes y se verificaron en el render.

Su tamaño OOXML es `32399288 × 43200638` EMU, aproximadamente 90 × 120 cm y relación 3:4 vertical. El texto editable utiliza Work Sans con tamaños de 40 y 60 puntos. Una generación nueva debe mantener las secciones completas y permitir reorganizar el contenido cuando su extensión aumente.

El bloque «Avances» conserva una instrucción sobre tipo, diseño, población, muestra y técnicas. «Links de acceso» conserva una frase de plantilla, sin URL. La carga conserva ambos textos como fuente y deja los avances confirmados y los enlaces pendientes.

## Diferencias y datos pendientes

| Tema | Valores encontrados | Tratamiento de la carga |
| --- | --- | --- |
| Código | Inicio: CAP-06-2026. Carpeta, informe y cierre: CAP-05-2026. El cierre pide verificar el código. | Mantener los valores de cada fuente y solicitar confirmación. |
| Duración y fechas | Inicio: 15 meses, 01-02-2026 a 30-09-2027. Cierre: «De 6 a 12 meses», 01-03-2026 a 30-12-2026. Presentación: cronograma de seis meses. | No resolver automáticamente la duración ni las fechas. |
| Presupuesto | Total de inicio y cierre: $10.996.585. Único rubro con monto en inicio: $10.000.000. Cierre: rubro planeado de $10.996.585, valor real escrito como descripción. | Mantener rubros vacíos y monto ejecutado pendiente. |
| Alcance | Inicio mezcla organización documental con Talento Humano, Servicio al cliente, clima organizacional y Manual de funciones. | Conservar los textos y señalar la inconsistencia para revisión. |
| Grupo y semillero | Referencias: «Grupo Ejecutor Administrativo / Semillero SIADM». Catálogo suministrado por el usuario: SIADM como grupo. | No inferir asociaciones de base de datos desde una frase. |
| Personas | Variantes de «Malgon» y «Malagón», así como «Gonzalez» y «González». | No crear identidades globales por coincidencia parcial. |
| Fecha del cierre | «Vélez, 18 septiembre», sin año; lugar y dependencia de la reunión vacíos. | Dejar fecha confirmada, lugar y dependencia pendientes. |
| Fotografías | El póster y fotos de la presentación muestran fechas de octubre de 2024. | No cambiar fechas ni atribuirlas automáticamente a actividades de 2026. |
| Informe bimensual | «Primer informe», sin fechas de período ni campo formal de número. | Conservar la denominación textual y solicitar el período. |
| Firmas | Existen columnas de firma, sin texto que certifique su validez. | No generar firmas ni declarar aprobación documental por nombres digitados. |
| Soportes ausentes | No se aportan formulación DOCX, informe final independiente, diagnóstico independiente ni FUID como archivos identificados. | Su mención en el acta permanece como inventario declarado, sin sustituir el archivo. |

También hay instrucciones residuales de plantilla en encabezados y pies del informe. La presentación mezcla las etiquetas «Pública», «Pública clasificada» y «Pública reservada». Esas etiquetas no deben cambiar permisos de la aplicación por inferencia.

La importación de referencia conserva literalmente en el proyecto el objetivo general y los seis objetivos específicos explícitos de la presentación. Los exportadores reutilizan esos campos en la formulación DOCX y en la presentación PPTX. Si la presentación no aporta un objetivo general, se conserva el del acta de inicio; si no aporta objetivos específicos, la lista permanece vacía. La fuente completa conserva ambas formulaciones y su procedencia, sin conciliar ni sobrescribir fechas, valores, códigos o resultados. El código CAP permanece en su campo documental; la fuente no aporta un SGPS confirmado y no se llena por equivalencia.

## Tipos adicionales que requieren diseño propio

La carpeta aporta cinco tipos directamente verificables. Los formularios de **proyecto formulado en Word**, **informe final**, **ficha técnica de producto** y **registro de evidencias fotográficas** pueden construirse como extensiones de la aplicación, pero deben identificarse como formatos nuevos. La estructura académica del proyecto puede aprovechar los campos de la presentación y el informe; el formulario final puede reutilizar la evaluación y los resultados del cierre; esas relaciones no convierten una salida nueva en un formato institucional aportado.

El registro de evidencias requiere al menos archivo, fecha confirmada de actividad, entidad o lugar, descripción, relación con objetivo o producto y procedencia. La fotografía del ejemplo no autoriza a completar datos que no estén confirmados.

## Verificación de extracción y límites visuales

### Referencia adicional para el informe final

Se revisó en modo de lectura `docs/CAP-14-2026 Sistemade Información Investigación/GCDTP-F-023_V01_Formato_Informe_Final.docx`, SHA-256 `3f02d01c22ce56cfc42a35b4d37bb2b7f0d2b620a4fa5e681719064ad3747ced`. El archivo identifica internamente el formato como GCDTP-F-023 V01, junio de 2026. Esta identificación no certifica su vigencia institucional. Es una plantilla vacía: la tabla de información general no contiene valores y los apartados narrativos contienen instrucciones, sin hechos ni personas del proyecto CAP-14. No se importa como proyecto ni se reutilizan instrucciones como resultados.

La plantilla propone catorce apartados y permite adaptarlos a la naturaleza, alcance y propósito del proyecto. El formulario de informe final conserva sus campos previos de antecedentes, metodología, resultados, discusión, fortalezas, dificultades, acciones futuras, lecciones, conclusiones, referencias, cumplimiento de objetivos y balance. Agrega introducción, planteamiento del problema, estado del arte y de la técnica, desarrollo del proyecto, viabilidad técnica, operativa, económica, normativa y de mercado, propiedad intelectual y transferencia, impacto y anexos. Cada apartado permite justificar que no aplica o declarar que no hay evaluación, activos o soportes confirmados, según corresponda. Esa declaración no sustituye una evidencia inexistente.

El autor del informe, la fecha real de entrega y la clasificación de la información son campos requeridos. Las opciones de clasificación son Pública, Pública Clasificada y Pública Reservada; su registro no cambia los permisos de acceso del proyecto. Código de idea, experto, línea tecnológica, TRL inicial y alcanzado entre 0 y 9, y TecnoParque son campos opcionales cuando aplique. No se completan por equivalencia inferida con SGPS, responsable, tipología, línea de investigación o centro de formación.

El DOCX generado identifica su estado de borrador y escribe los datos capturados en el formulario. No declara ser una copia certificada del formato institucional. El campo de anexos registra el índice de soportes reales y su ubicación; no adjunta archivos por el solo hecho de mencionar sus nombres.

La extracción conserva íntegramente las partes de texto pertinentes de los cinco paquetes y sus tablas. El JSON contiene SHA-256 de cada fuente para detectar cambios. Los párrafos mantienen índices por parte y las tablas mantienen orden de filas y celdas.

Las 17 diapositivas de la presentación y la lámina del póster se renderizaron con el motor bundled de presentaciones y se inspeccionaron visualmente. En las diapositivas 8 y 9 hay contenido muy próximo al borde inferior. Los formularios y exportadores nuevos deben revisar legibilidad y desbordes antes de entregar.

Se intentó ejecutar `render_docx.py` sobre el acta de inicio. El programa falló porque **LibreOffice `soffice.exe` no está disponible en PATH**, y tampoco se encontró en las rutas nativas habituales. No se instaló software ni se modificaron las referencias. La estructura y el contenido de Word sí se revisaron desde OOXML; su paginación y su apariencia final quedan sin verificación visual en este equipo.
