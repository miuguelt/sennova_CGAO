"""Campos guiados y estructura del expediente, sin datos personales predeterminados."""


def _field(key, label, type="text", *, required=True, help=None, **extra):
    return {"key": key, "label": label, "type": type, "help": help or f"Registra {label.lower()} con información verificable del proyecto.",
            "required": required, **extra}


def _rows(key, label, columns, *, required=True, help=None, details_label=None, details_help=None):
    details = {key: value for key, value in (("details_label", details_label), ("details_help", details_help)) if value}
    return _field(key, label, "rows", columns=columns, required=required, help=help, **details)


COMMON_FIELDS = (
    _field("codigo_cap", "Código CAP", required=False, help="Registra el código de la convocatoria cuando aplique. Conserva las discrepancias para su revisión."),
    _field("centro", "Centro de formación", required=False, help="Escribe el nombre completo del centro vinculado al proyecto, tal como aparece en el soporte de formulación o de inicio."),
    _field("regional", "Regional", required=False, help="Identifica la regional a la que pertenece el centro. Confirma este dato en los documentos del proyecto, sin deducirlo de la ciudad."),
    _field("ciudad", "Ciudad", required=False, help="Indica el municipio en el que se desarrolla el proyecto. Si abarca varios lugares, aclara cuáles en el contexto de la formulación."),
    _field("responsable", "Responsable del proyecto", required=False, help="Registra a la persona o al equipo encargado de coordinar el proyecto. Su designación no acredita por sí sola asistencia, autoría ni aprobación de documentos."),
    _field("fecha_inicio", "Fecha de inicio del proyecto", "date", required=False, help="Indica la fecha de inicio respaldada por el acta o la planeación confirmada. Si las fuentes difieren, registra la inconsistencia antes de darla por validada."),
    _field("fecha_fin", "Fecha de terminación del proyecto", "date", required=False, help="Indica la fecha de terminación registrada en la planeación confirmada. Debe ser igual o posterior al inicio; no la sustituyas por una fecha de cierre parcial."),
    _field("nivel_formacion", "Nivel de formación", required=False, help="Registra el nivel de formación solo si el proyecto formativo o la convocatoria lo solicita. Usa la denominación confirmada; de lo contrario, déjalo vacío."),
    _field("programa_formacion", "Programa de formación", required=False, help="Indica el programa vinculado únicamente cuando corresponda y su nombre esté confirmado en la ficha institucional."),
    _field("competencia", "Competencia relacionada", "textarea", required=False, project_summary=True, help="Relaciona la competencia con el proyecto solo cuando aplique. Usa la formulación institucional confirmada y no la deduzcas del tema."),
    _field("resultados_aprendizaje", "Resultados de aprendizaje relacionados", "textarea", required=False, project_summary=True, help="Registra los resultados de aprendizaje asociados únicamente cuando el proyecto formativo o la convocatoria los solicite. Distingue los resultados previstos de los ya alcanzados."),
    _field("fase_proyecto_formativo", "Fase del proyecto formativo", required=False, help="Indica la fase institucional confirmada cuando el proyecto haga parte de un proceso formativo."),
    _field("categoria_proyecto", "Categoría del proyecto", required=False, help="Registra la categoría si la convocatoria la solicita. Usa la clasificación vigente y confirma su pertinencia con la coordinación."),
    _field("area_investigacion", "Área de investigación", required=False, help="Escribe el área de investigación cuando la convocatoria la solicite y la clasificación esté confirmada."),
    _rows("equipo", "Personal vinculado", [
        _field("nombre", "Nombre", help="Registra el nombre de la persona realmente vinculada al proyecto. No copies integrantes de otro proyecto o de una plantilla."),
        _field("rol", "Rol", help="Describe la función acordada dentro del equipo. Ejemplo ilustrativo: coordinación metodológica; no equivale a una aprobación del documento."),
        _field("actividades", "Actividades a liderar", "textarea", help="Relaciona las actividades concretas que liderará esta persona, su alcance y su aporte a los objetivos. Evita asignaciones genéricas como apoyo a todo el proyecto."),
        _field("programa", "Programa", required=False, help="Indica el programa de formación o la dependencia vinculada cuando corresponda. Déjalo vacío si no está confirmado."),
        _field("identificacion", "Documento de identidad", required=False, optional_detail=True, help="Regístralo únicamente si el formato vigente lo solicita y tienes autorización para tratar este dato. Déjalo vacío si no aplica."),
        _field("correo_contacto", "Correo de contacto", required=False, optional_detail=True, help="Inclúyelo solo si el formato exige un contacto y la persona autorizó su uso para este proyecto."),
        _field("telefono_contacto", "Teléfono de contacto", required=False, optional_detail=True, help="Inclúyelo solo si el formato exige un teléfono y la persona autorizó su uso para este proyecto."),
    ], required=False,
       help="Incluye una fila por integrante real y define sus roles y actividades. Comprueba que todas las responsabilidades del cronograma tengan una persona o equipo encargado.",
       details_label="Datos de autoría y contacto (cuando el formato los solicite)",
       details_help="Usa esta sección solo si el formato vigente requiere identificar o contactar a cada autor y tienes autorización para registrar esos datos."),
    _rows("presupuesto", "Presupuesto y cronograma de ejecución", [
        _field("rubro", "Rubro", help="Identifica la categoría del gasto según el presupuesto del proyecto. Ejemplos ilustrativos: personal o materiales; usa únicamente las categorías que correspondan."),
        _field("valor_planeado", "Valor planeado", "number", unit="COP", help="Registra el monto previsto en pesos colombianos según su soporte. Este campo no representa el gasto ejecutado; no completes valores ausentes con estimaciones sin respaldo."),
        _field("uso", "Descripción de su uso", "textarea", help="Explica qué se financiará, para qué actividad se necesita y cómo contribuye al proyecto. Identifica el soporte de la estimación cuando exista."),
        _field("fecha_ejecucion", "Fecha de ejecución", help="Indica cuándo se prevé utilizar el recurso: una fecha confirmada o un período. Ejemplo ilustrativo: Mes 1; no conviertas un período de la fuente en una fecha inventada."),
    ], required=False, help="Desglosa los rubros, sus valores planeados, usos y períodos de ejecución con soporte. La suma debe coincidir con el presupuesto total confirmado del proyecto; identifica cualquier diferencia pendiente."),
    _rows("cronograma", "Descripción de actividades", [
        _field("actividad", "Actividad", "textarea", help="Describe una acción concreta vinculada a un objetivo, su alcance y el trabajo necesario. Ejemplo ilustrativo: clasificar una serie documental; adapta la acción a tu proyecto."),
        _field("encargado", "Encargado", help="Identifica al integrante o equipo responsable de ejecutar y reportar esta actividad. Debe corresponder a las responsabilidades acordadas en el equipo."),
        _field("fecha_textual", "Fecha o período", help="Conserva el período planeado, por ejemplo Mes 1 a Mes 2, o escribe la fecha real."),
        _field("resultado", "Entregable o resultado", "textarea", help="Define el producto verificable que debe dejar la actividad y cómo se comprobará. Un entregable planeado no debe presentarse como un resultado ya obtenido."),
    ], required=False, help="Ordena las actividades por períodos y relaciona cada una con su encargado y entregable previsto. Conserva los períodos de la fuente y distingue planeación de ejecución real."),
    _field("inconsistencias_fuente", "Datos de la fuente pendientes de aclaración", "textarea", required=False,
           help="Describe códigos, fechas, duraciones o valores contradictorios y el soporte necesario para confirmarlos. No los corrijas sin evidencia."),
)

MEETING_FIELDS = (
    _field("fecha_reunion", "Fecha de la reunión", "date", help="Registra la fecha real en la que ocurrió la reunión. No la infieras del nombre del archivo, de la fecha de carga ni de una fecha sin año confirmado."),
    _field("hora_inicio", "Hora de inicio", help="Registra la hora real de apertura en formato HH:MM de 24 horas. Ejemplo ilustrativo: 08:00; no es una hora predeterminada."),
    _field("hora_fin", "Hora de finalización", help="Registra la hora real de cierre en formato HH:MM de 24 horas. Ejemplo ilustrativo: 10:00; comprueba su relación con la hora de inicio."),
    _field("lugar", "Lugar", help="Indica el sitio de la reunión o su modalidad virtual y plataforma cuando corresponda. No deduzcas el lugar de la ciudad del proyecto."),
    _field("temas", "Temas", "textarea", help="Relaciona los asuntos efectivamente tratados, en el orden de la reunión. Distingue revisión de actividades, presupuesto, riesgos y acuerdos cuando corresponda."),
    _field("objetivo_reunion", "Objetivos de la reunión", "textarea", help="Explica para qué se realizó la reunión y qué decisiones o acuerdos se buscaban. No confundas este propósito con el objetivo general del proyecto."),
)
ATTENDEE_FIELDS = (
    _rows("asistentes", "Asistentes", [
        _field("nombre", "Nombre", help="Registra el nombre de quien realmente asistió. La presencia en el equipo del proyecto no demuestra asistencia a esta reunión."),
        _field("cargo_dependencia_entidad", "Cargo dependencia o entidad", help="Indica el cargo, la dependencia o la entidad que representó esta persona en la reunión. Usa la información confirmada por la persona o por el registro de asistencia."),
    ],
          help="Registra los asistentes reales. El documento deja las firmas en blanco para su revisión y firma posterior."),
    _rows("invitados", "Invitados", [
        _field("nombre", "Nombre", help="Registra el nombre de la persona invitada según la convocatoria real. Una invitación no acredita que haya asistido."),
        _field("cargo", "Cargo", help="Indica el cargo confirmado de la persona invitada, pertinente para su participación. No asignes un rol de aprobación por inferencia."),
        _field("entidad", "Entidad", help="Indica la entidad que representa la persona invitada según la información confirmada. No deduzcas su vinculación a partir de otras referencias."),
    ], required=False, help="Relaciona las personas convocadas como invitadas cuando existan. Distingue la invitación de la asistencia efectiva y evita trasladar nombres de ejemplos."),
)
RESULT_FIELDS = (
    _field("antecedentes", "Antecedentes", "textarea", help="Resume el punto de partida, los avances previos y los acuerdos relevantes para este informe. Ubica el período que se reporta sin repetir todo el planteamiento del problema."),
    _field("metodologia", "Metodología", "textarea", help="Describe el procedimiento efectivamente aplicado, las fuentes, instrumentos y criterios usados en el período. Explica cambios frente a la planeación y sus razones; no presentes actividades previstas como ejecutadas."),
    _rows("resultados", "Resultados alcanzados", [
        _field("entidad", "Entidad o población", help="Identifica la entidad, población o grupo beneficiario al que corresponde este resultado. No atribuyas beneficios a participantes no confirmados."),
        _field("actividades_ejecutadas", "Actividades ejecutadas", "textarea", help="Describe lo realizado, su alcance y período, y quién participó. Distingue estas acciones de las actividades pendientes del cronograma."),
        _field("resultados_alcanzados", "Resultados alcanzados", "textarea", help="Describe el producto, cambio o avance realmente obtenido y su relación con el objetivo. Una actividad realizada no equivale por sí sola a un resultado demostrado."),
        _field("indicador", "Indicador", help="Define qué se mide y cómo se calcula o verifica. Usa el indicador planeado o explica el cambio; evita expresiones que no puedan comprobarse."),
        _field("meta", "Meta", "number", help="Registra la cantidad planeada para este indicador y período, con su unidad y soporte de planeación. La meta no corresponde al resultado ejecutado."),
        _field("logro", "Logro", "number", help="Registra la cantidad realmente alcanzada y respaldada en el período, usando la misma unidad de la meta. Si no hay medición confirmada, no inventes el valor."),
        _field("unidad", "Unidad", help="Indica la unidad común para comparar meta y logro. Ejemplos ilustrativos: documentos, participantes o porcentaje; no mezcles cantidades y porcentajes."),
        _field("evidencia", "Evidencia", "textarea", help="Identifica el archivo, producto o enlace y su ubicación, y explica qué demuestra. No declares un soporte que no existe ni uses una mención como sustituto del archivo real."),
    ], help="Incluye una fila por resultado demostrado, con actividad, indicador, meta planeada, logro medido, unidad y soporte. Si faltan mediciones o evidencias, conserva el asunto pendiente sin inventar datos."),
    _field("discusion", "Discusión de resultados", "textarea", help="Interpreta los resultados frente a los objetivos y metas, explica diferencias y compara con las fuentes pertinentes. Señala límites de la evidencia y evita afirmar causalidad que no se haya demostrado."),
    _field("fortalezas", "Fortalezas", "textarea", help="Identifica capacidades, prácticas o condiciones que favorecieron el trabajo y aporta ejemplos observados. Explica su efecto en las actividades o resultados."),
    _field("dificultades", "Dificultades y limitaciones", "textarea", help="Describe obstáculos, actividades afectadas y efectos en tiempos, recursos o alcance. Distingue problemas resueltos de asuntos pendientes y reconoce los límites de los datos."),
    _field("acciones_futuras", "Acciones futuras", "textarea", help="Propón acciones concretas para continuar o resolver pendientes, con responsables y períodos previstos. Preséntalas como propuestas, sin afirmar que ya fueron ejecutadas."),
    _field("lecciones_aprendidas", "Lecciones aprendidas", "textarea", help="Explica qué enseñó la experiencia, qué conviene mantener o cambiar y cómo se aplicará en próximas actividades. Relaciona cada aprendizaje con una situación observada."),
    _field("conclusiones", "Conclusiones", "textarea", help="Sintetiza hallazgos respaldados, cumplimiento de objetivos y asuntos pendientes. Distingue lo demostrado de lo esperado y no incorpores resultados nuevos sin evidencia."),
    _field("referencias", "Referencias", "textarea", help="Registra las fuentes consultadas con autor, título, año y enlace o identificador cuando exista."),
)
PROJECT_REQUIRED = ["centro", "regional", "ciudad", "responsable", "fecha_inicio", "fecha_fin"]
FORMULATION_FIELDS = (
    _field("introduccion", "Introducción", "textarea", help="Presenta el propósito del proyecto, su tema, alcance y relación con la necesidad del territorio o del sector. Orienta la lectura sin adelantar resultados que aún no se han obtenido."),
    _field("contexto", "Contexto del problema", "textarea", help="Describe el territorio, sector, institución y población involucrados, con condiciones y antecedentes respaldados por fuentes. Delimita dónde y para quién surge la necesidad."),
    _field("planteamiento_problema", "Planteamiento del problema", "textarea", help="Define la situación que se investigará, sus causas, consecuencias y evidencia disponible. Delimita el alcance y formula la pregunta o necesidad concreta que guiará el proyecto."),
    _field("justificacion", "Justificación", "textarea", help="Explica la pertinencia de abordar el problema, los beneficios esperados, la población beneficiaria y el aporte formativo o productivo. Sustenta por qué conviene realizar el proyecto, sin prometer impactos demostrados."),
    _field("referente_teorico", "Referente teórico", "textarea", help="Explica los conceptos y enfoques que orientan el análisis, con autores y fuentes citados. Relaciona cada referente con el problema y el método; no incluyas una lista de definiciones sin conexión."),
    _field("marco_normativo", "Marco normativo", "textarea", help="Identifica normas o lineamientos pertinentes, la fuente consultada y su relación con el proyecto. Verifica su vigencia y alcance antes de declararlos aplicables; no asumas requisitos actuales sin confirmación."),
    _field("metodologia", "Metodología", "textarea", help="Define el enfoque, diseño y procedimiento previsto para responder la pregunta del proyecto. Explica pasos, criterios de análisis, recursos y validación, y su relación con los objetivos."),
    _field("poblacion_muestra", "Población y muestra", "textarea", help="Delimita la población o unidades de análisis, los criterios de inclusión y exclusión, y el método de selección de la muestra. Justifica su tamaño cuando corresponda y explica límites de representatividad."),
    _field("tecnicas_recoleccion", "Técnicas de recolección de información", "textarea", help="Describe las técnicas e instrumentos para obtener datos, quién los aplicará, cuándo y cómo se analizarán. Ejemplos ilustrativos: entrevista u observación; explica su pertinencia y el manejo autorizado de la información."),
    _field("fases", "Fases del proyecto", "textarea", help="Organiza el procedimiento en fases con actividades, responsables, períodos y entregables. Explica la secuencia y relación con los objetivos, y conserva su coherencia con el cronograma."),
    _rows("resultados_esperados", "Resultados esperados", [
        _field("resultado", "Resultado", help="Define el producto o cambio que se espera obtener y su relación con un objetivo. Expresa una expectativa verificable, sin presentarla como un logro ya alcanzado."),
        _field("indicador", "Indicador", help="Indica qué variable o cantidad permitirá evaluar este resultado y cómo se medirá. Debe permitir una comparación clara con la meta prevista."),
        _field("meta", "Meta", "number", help="Registra la cantidad planeada para el indicador al final del período definido. Justifica su factibilidad y úsala con la unidad de medida seleccionada."),
        _field("unidad", "Unidad", help="Especifica la unidad en que se medirá la meta. Ejemplos ilustrativos: documentos o participantes; evita unidades ambiguas o mezcladas."),
        _field("medio_verificacion", "Medio de verificación", help="Define qué soporte permitirá comprobar el resultado cuando se obtenga y dónde se registrará. Un soporte previsto no debe declararse como un archivo ya disponible."),
    ], help="Relaciona los resultados previstos con indicadores, metas, unidades y medios de verificación. Cada fila debe responder a un objetivo y poder comprobarse al ejecutar el proyecto."),
    _field("impactos", "Impactos institucional formativo y social", "textarea", help="Describe los efectos esperados para la institución, la formación y la población, con beneficiarios y condiciones necesarias. Explica cómo se recogerá evidencia y distingue expectativas de impactos ya demostrados."),
    _field("conclusiones", "Conclusiones", "textarea", help="Resume la coherencia entre problema, objetivos, método y resultados previstos, y reconoce los límites del alcance. No declares conclusiones de una ejecución que aún no ha ocurrido."),
    _field("referencias", "Referencias", "textarea", help="Relaciona cada fuente citada con autor, título, año y enlace o identificador cuando exista. Usa un estilo de citación consistente y comprueba que las referencias correspondan a fuentes realmente consultadas."),
)

DOCUMENT_DEFINITIONS = {
    "formulacion_proyecto": {
        "title": "Formulación del proyecto", "folder": "1ProyectoFormulado", "format": "docx",
        "required_common": PROJECT_REQUIRED + ["equipo", "presupuesto", "cronograma"], "fields": list(FORMULATION_FIELDS),
    },
    "presentacion_proyecto": {
        "title": "Presentación del proyecto", "folder": "1ProyectoFormulado", "format": "pptx",
        "required_common": PROJECT_REQUIRED + ["equipo", "presupuesto", "cronograma"], "fields": list(FORMULATION_FIELDS),
    },
    "acta_inicio": {
        "title": "Acta de inicio del proyecto", "folder": "2ActadeInicio", "format": "docx",
        "required_common": PROJECT_REQUIRED + ["equipo", "presupuesto", "cronograma"],
        "fields": list(MEETING_FIELDS) + [
            _field("alcance_sector_productivo", "Alcance e impacto en el sector productivo", "textarea"),
            _field("alcance_formacion", "Alcance e impacto en la academia y la formación", "textarea"),
            _field("observaciones", "Observaciones y conclusiones", "textarea"),
        ] + list(ATTENDEE_FIELDS),
    },
    "producto_resultado": {
        "title": "Informe del producto o resultado", "folder": "3Productos", "format": "docx",
        "required_common": PROJECT_REQUIRED,
        "fields": [
            _field("descripcion_resultado", "Descripción del resultado", "textarea"),
            _field("metodologia", "Metodología para obtener el producto", "textarea"),
            _rows("indicadores", "Indicadores del producto", [
                _field("indicador", "Indicador"), _field("meta", "Meta", "number"), _field("logro", "Logro", "number"),
                _field("unidad", "Unidad"), _field("evidencia", "Evidencia"),
            ]),
            _field("requisitos_minciencias", "Requisitos y soportes de Minciencias", "textarea", help="Identifica la tipología y los soportes existentes. La generación de este informe no verifica ni aprueba el producto."),
            _field("impacto", "Impacto y población beneficiaria", "textarea"), _field("referencias", "Referencias", "textarea"),
        ],
    },
    "poster_producto": {
        "title": "Póster del producto", "folder": "3Productos", "format": "pptx",
        "required_common": ["centro", "regional", "responsable", "equipo"],
        "fields": [
            _field("introduccion", "Introducción", "textarea"), _field("planteamiento_problema", "Planteamiento del problema", "textarea"),
            _field("justificacion", "Justificación", "textarea"), _field("referente_teorico", "Referente teórico", "textarea"),
            _field("metodologia", "Metodología", "textarea"),
            _field("avances", "Avances y resultados cuantificables", "textarea", help="Describe resultados reales, cantidades, unidades y soportes. Las instrucciones de la plantilla no son resultados."),
            _field("bibliografia", "Bibliografía", "textarea"),
            _field("links_acceso", "Enlaces de acceso a soportes", "textarea", required=False, help="Incluye únicamente enlaces reales a productos o evidencias disponibles."),
        ],
    },
    "informe_bimensual": {
        "title": "Informe bimestral del proyecto", "folder": "4InformesBimensuales", "format": "docx",
        "required_common": PROJECT_REQUIRED,
        "fields": [
            _field("periodo_desde", "Inicio del período informado", "date"), _field("periodo_hasta", "Fin del período informado", "date"),
        ] + list(RESULT_FIELDS),
    },
    "acta_cierre": {
        "title": "Acta de cierre del proyecto", "folder": "5ActaCierre", "format": "docx", "required_common": PROJECT_REQUIRED,
        "fields": [
            _field("tipo_cierre", "Alcance del cierre", "select", options=[
                {"value": "final", "label": "Cierre final"}, {"value": "parcial", "label": "Cierre parcial del período"},
            ], help="Selecciona el alcance real. Un cierre parcial del período no declara la terminación del proyecto."),
            _field("periodo_desde", "Inicio del período que se cierra", "date"), _field("periodo_hasta", "Fin del período que se cierra", "date"),
        ] + list(MEETING_FIELDS) + [
            _rows("evaluacion_actividades", "Evaluación de actividades y entregables", [
                _field("actividad_etapa", "Actividad o etapa"), _field("entregable", "Entregable"), _field("observacion", "Observación", "textarea"),
            ]),
            _rows("balance", "Balance presupuestal", [
                _field("rubro", "Rubro"), _field("valor_planeado", "Valor planeado", "number", unit="COP"),
                _field("valor_real", "Valor real", "number", unit="COP", required=False),
                _field("observacion", "Observación o valor pendiente de confirmar", "textarea", required=False,
                       help="Conserva la explicación cuando el soporte no contenga un monto verificable."),
            ]),
            _field("fortalezas", "Fortalezas", "textarea"), _field("dificultades", "Dificultades", "textarea"),
            _field("acciones_futuras", "Acciones futuras", "textarea"), _field("lecciones_aprendidas", "Lecciones aprendidas", "textarea"),
            _rows("listado_activos", "Listado de activos del proyecto", [
                _field("activo", "Activo o archivo"), _field("estado", "Estado"), _field("custodio", "Custodio"), _field("soporte", "Soporte"),
            ]), _field("observaciones", "Observaciones y conclusiones", "textarea"),
        ] + list(ATTENDEE_FIELDS),
    },
    "informe_final": {
        "title": "Informe final del proyecto", "folder": "5ActaCierre", "format": "docx", "required_common": PROJECT_REQUIRED,
        "fields": [
            _field("autor_informe", "Autor del informe", help="Registra el nombre de quien elaboró este informe. No asumas que es el responsable del proyecto."),
            _field("fecha_entrega", "Fecha de entrega del informe", "date", help="Registra la fecha real de entrega. No la sustituyas por la fecha de cierre o por la fecha del sistema."),
            _field("clasificacion_informacion", "Clasificación de la información", "select", options=[
                {"value": "publica", "label": "Pública"},
                {"value": "publica_clasificada", "label": "Pública Clasificada"},
                {"value": "publica_reservada", "label": "Pública Reservada"},
            ], help="Selecciona la clasificación de este informe diligenciado según los lineamientos institucionales aplicables. La selección no cambia por sí sola los permisos del proyecto."),
            _field("codigo_idea", "Código de la idea", required=False,
                   help="Registra el código de la idea cuando aplique a este proyecto. No lo copies del código SGPS sin confirmar que corresponden."),
            _field("experto_proyecto", "Experto del proyecto", required=False,
                   help="Registra el experto vinculado cuando aplique. No asumas que el responsable o el autor del informe cumple este rol."),
            _field("linea_tecnologica", "Línea tecnológica", required=False,
                   help="Registra la línea tecnológica cuando aplique. No la deduzcas de la tipología ni de la línea de investigación."),
            _field("trl_inicial", "TRL inicial", "number", required=False, min=0, max=9,
                   help="Registra el nivel de madurez tecnológica inicial de 0 a 9 cuando aplique y exista soporte. Déjalo vacío si no corresponde o no está confirmado."),
            _field("trl_alcanzado", "TRL alcanzado", "number", required=False, min=0, max=9,
                   help="Registra el nivel de madurez tecnológica alcanzado de 0 a 9 cuando aplique y esté respaldado por pruebas. No declares avances sin evidencia."),
            _field("tecnoparque", "TecnoParque de desarrollo del proyecto", required=False,
                   help="Registra el TecnoParque en el que se desarrolló el proyecto cuando aplique. No sustituyas este dato por el centro de formación."),
            _field("introduccion", "Introducción", "textarea",
                   help="Describe el contexto general, el propósito y el entorno de ejecución del proyecto. Si este apartado no corresponde, escribe No aplica y justifica la razón."),
            _field("planteamiento_problema", "Planteamiento del problema", "textarea",
                   help="Explica la necesidad identificada, sus causas, consecuencias y efectos, con fuentes verificables. Si no corresponde, escribe No aplica y justifica la razón."),
            _field("estado_arte_tecnica", "Estado del arte y estado de la técnica", "textarea",
                   help="Sintetiza investigaciones, tecnologías y soluciones existentes, sus referentes y el aporte frente a las alternativas. Si no corresponde, escribe No aplica y justifica la razón; no inventes antecedentes."),
        ] + list(RESULT_FIELDS) + [
            _field("desarrollo_proyecto", "Desarrollo del proyecto", "textarea",
                   help="Describe las actividades ejecutadas, las decisiones y los avances de diseño, construcción, configuración, integración o puesta en funcionamiento que correspondan. Si no hubo ejecución o no aplica, explícalo; puedes escribir No aplica con su justificación."),
            _field("viabilidad_tecnica", "Viabilidad técnica", "textarea",
                   help="Evalúa requisitos técnicos, pruebas, limitaciones y condiciones para implementar o continuar la solución. Si no fue evaluada, declara esa ausencia; si no corresponde, escribe No aplica y justifica la razón."),
            _field("viabilidad_operativa", "Viabilidad operativa", "textarea",
                   help="Describe recursos, capacidades, mantenimiento y condiciones de uso o adopción. Si no fue evaluada, deja constancia; si no corresponde, escribe No aplica y justifica la razón."),
            _field("viabilidad_economica", "Viabilidad económica", "textarea",
                   help="Analiza costos, financiación, beneficios y sostenibilidad con valores respaldados. Declara los datos o análisis ausentes; si no corresponde, escribe No aplica y justifica la razón."),
            _field("viabilidad_normativa", "Viabilidad normativa", "textarea",
                   help="Identifica requisitos normativos aplicables, condiciones de cumplimiento y asuntos pendientes de verificar. Si no fue evaluada, indícalo; si no corresponde, escribe No aplica y justifica la razón."),
            _field("viabilidad_mercado", "Viabilidad de mercado", "textarea",
                   help="Analiza usuarios, demanda, adopción, comercialización o escalabilidad según el alcance del proyecto. Declara si no se evaluó; si no corresponde, escribe No aplica y justifica la razón."),
            _field("propiedad_intelectual_transferencia", "Propiedad intelectual y transferencia tecnológica", "textarea",
                   help="Identifica activos generados, titularidad o protección por confirmar y estrategias de transferencia, adopción o apropiación. No afirmes registros ni derechos sin soporte. Si no hay activos o estrategias, decláralo; si no corresponde, escribe No aplica y justifica la razón."),
            _field("impacto_proyecto", "Impacto del proyecto", "textarea",
                   help="Describe efectos tecnológicos, sociales, económicos, ambientales o productivos y sus evidencias. Distingue impactos observados de los esperados. Si no se midieron, indícalo; si no corresponde, escribe No aplica y justifica la razón."),
            _field("anexos", "Anexos", "textarea",
                   help="Relaciona los soportes reales del informe con nombre, ubicación o enlace: fotografías, diagramas, manuales, pruebas, actas, código o registros. Si no existen, decláralo; si no corresponden, escribe No aplica y justifica la razón. Este índice no adjunta archivos automáticamente."),
            _field("cumplimiento_objetivos", "Cumplimiento de los objetivos", "textarea"),
            _field("balance_final", "Balance final y asuntos pendientes", "textarea"),
        ],
    },
    "registro_evidencias": {
        "title": "Registro de evidencias del proyecto", "folder": "6EvidenciasFotograficas", "format": "docx",
        "required_common": ["centro", "regional", "ciudad", "responsable"],
        "fields": [
            _rows("indice", "Índice de evidencias", [
                _field("nombre", "Nombre del archivo"), _field("tipo", "Tipo de evidencia"), _field("fecha", "Fecha real", "date", required=False),
                _field("actividad", "Actividad relacionada"), _field("descripcion", "Descripción", "textarea"),
                _field("ubicacion", "Ubicación o enlace del soporte"),
            ]),
            _field("observaciones", "Observaciones sobre los soportes", "textarea", required=False),
        ],
    },
}
