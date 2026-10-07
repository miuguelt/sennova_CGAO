"""Escenario propuesto para probar CAP-14; no acredita ejecución institucional."""

NOTICE = (
    "Escenario de validación preparado para comprobar formularios y generación documental. "
    "Las fechas de terminación, metas, distribución de actividades, productos y cierres son propuestas; "
    "no acreditan reuniones, gastos, pruebas con usuarios, aceptación ni resultados institucionales. "
    "Se conserva la fuente original sin alterarla. El código SGPS, el semillero, la discrepancia CAP-14/CAP-16, "
    "la fecha final del 23/12/2026 y la aplicabilidad de GCDTP-F-023 requieren confirmación institucional. "
    "El escenario utiliza seis meses desde el 29/05/2026 hasta el 28/11/2026."
)
REFERENCES = (
    "Fuentes locales consultadas: formulación, presentación, acta de inicio e informe bimensual de CAP-14-2026, "
    "conservados en docs/CAP-14-2026 Sistemade Información Investigación/. "
    "Contratos técnicos: backend/app/services/documentation_catalog.py, backend/app/services/documentation_state.py "
    "y docs/architecture/modelo-funcional-y-datos.md. "
    "Las referencias bibliográficas de las fuentes deben cotejarse antes de la presentación institucional."
)
ACTIVITIES = [
    {"fase": "Fase I", "actividad": "Levantar y priorizar requisitos de proyectos, cronogramas, productos y reportes", "encargado": "Fredy Zafra", "fecha_textual": "29/05/2026 a 28/06/2026", "fecha": "2026-06-28", "resultado": "Matriz de requisitos y criterios de aceptación"},
    {"fase": "Fase II", "actividad": "Diseñar la estructura funcional, los permisos y el modelo de datos", "encargado": "Miguel Ángel Tejedor", "fecha_textual": "29/06/2026 a 28/07/2026", "fecha": "2026-07-28", "resultado": "Diseño funcional y diccionario de datos"},
    {"fase": "Fase II", "actividad": "Diseñar la herramienta Excel de indicadores por investigador", "encargado": "Miguel Ángel Tejedor", "fecha_textual": "29/06/2026 a 28/07/2026", "fecha": "2026-07-28", "resultado": "Libro de indicadores y guía de uso"},
    {"fase": "Fase III", "actividad": "Implementar y probar los módulos de proyectos, cronogramas y productos", "encargado": "Miguel Ángel Tejedor", "fecha_textual": "29/07/2026 a 28/09/2026", "fecha": "2026-09-28", "resultado": "Versión del sistema con pruebas automatizadas"},
    {"fase": "Fase III", "actividad": "Integrar consultas, reportes y generación documental", "encargado": "Miguel Ángel Tejedor", "fecha_textual": "29/09/2026 a 28/10/2026", "fecha": "2026-10-28", "resultado": "Catálogo de reportes y expediente generado"},
    {"fase": "Fase Final", "actividad": "Validar con usuarios, registrar ajustes y preparar el cierre", "encargado": "Alba Zoraida Vargas Hurtado", "fecha_textual": "29/10/2026 a 28/11/2026", "fecha": "2026-11-28", "resultado": "Informe de validación, manual y propuesta de cierre"},
]
BUDGET = [
    {"rubro": "Servicios personales instructores del área administrativa", "valor_planeado": "10000000", "uso": "Dedicación del equipo a requisitos, diseño, desarrollo, pruebas y elaboración documental. Se conserva el único valor explícito de la fuente; su ejecución y disponibilidad requieren soporte financiero.", "fecha_ejecucion": "29/05/2026 a 28/11/2026"},
]
EXPECTED = [
    {"resultado": "Requisitos priorizados", "indicador": "Requisitos documentados con criterio de aceptación", "meta": "20", "unidad": "requisitos", "medio_verificacion": "Matriz de requisitos versionada por elaborar"},
    {"resultado": "Herramienta Excel de indicadores", "indicador": "Libros con guía y diccionario de datos revisados", "meta": "1", "unidad": "libro", "medio_verificacion": "Libro exportado y lista de revisión por registrar"},
    {"resultado": "Diseño funcional y base de datos", "indicador": "Paquetes de diseño revisados", "meta": "1", "unidad": "paquete", "medio_verificacion": "Modelo de datos, permisos y acta de revisión por registrar"},
    {"resultado": "Módulos de gestión", "indicador": "Módulos sometidos a aceptación funcional", "meta": "3", "unidad": "módulos", "medio_verificacion": "Casos de proyectos, cronogramas y productos por ejecutar con usuarios"},
    {"resultado": "Consultas y reportes", "indicador": "Reportes priorizados sometidos a aceptación", "meta": "4", "unidad": "reportes", "medio_verificacion": "Catálogo y resultados de pruebas por registrar"},
    {"resultado": "Validación con usuarios", "indicador": "Casos de aceptación ejecutados y documentados", "meta": "12", "unidad": "casos", "medio_verificacion": "Plan de pruebas, resultados y autorización de participantes por registrar"},
]
FORMULATION = {
    "introduccion": "El proyecto propone centralizar la gestión de la investigación del CGAO mediante un sistema que articule proyectos, responsables, cronogramas, productos, documentos y consultas. La herramienta Excel complementará el seguimiento descriptivo por investigador. Este documento organiza un escenario de validación para revisar la coherencia entre objetivos, actividades, recursos y archivos.",
    "contexto": "El escenario se sitúa en el Centro de Gestión Agroempresarial del Oriente, Subsede Vélez, Regional Santander. La formulación recibida describe registros dispersos y dificultades para consolidar información. El diagnóstico cuantitativo de tiempos, duplicidad y calidad de datos debe levantarse con el equipo antes de medir mejoras.",
    "planteamiento_problema": "La dispersión de registros dificulta consultar el estado de los proyectos y relacionar sus actividades con productos y evidencias. ¿Cómo organizar una fuente central que permita registrar, actualizar y consultar esa información con permisos definidos y trazabilidad documental? El alcance excluye certificaciones automáticas de clasificación de investigadores.",
    "justificacion": "Una fuente central facilitaría el seguimiento de responsabilidades, fechas y soportes, y reduciría la consolidación manual. La pertinencia se verificará mediante casos de uso acordados y comparación de tiempos antes y después del piloto. La propuesta aprovecha las capacidades de desarrollo del equipo y deja la aceptación institucional como decisión documentada.",
    "referente_teorico": "El diseño relaciona sistemas de información, gestión del conocimiento, ingeniería de requisitos y trazabilidad. Se usarán una matriz de requisitos, relaciones entre entidades, control de permisos y versiones documentales. Estos conceptos orientan el diseño; no constituyen por sí solos evidencia de mejora. Las fuentes recibidas citan a Laudon y Laudon, Pressman y Maxim, Sommerville y Kendall y Kendall; deben cotejarse las ediciones y citas.",
    "marco_normativo": "La propuesta requiere revisar los lineamientos SENNOVA de la convocatoria, el procedimiento de gestión documental, las autorizaciones para tratar datos personales y el modelo Minciencias aplicable. Este escenario no certifica la vigencia ni el cumplimiento jurídico de una norma. La coordinación debe identificar versiones, responsables y soportes antes de la adopción.",
    "metodologia": "Desarrollo aplicado e incremental: identificar usuarios y requisitos, modelar datos y permisos, construir funciones prioritarias, ejecutar pruebas automatizadas y validar tareas con usuarios autorizados. Cada incremento conserva versión, criterio de aceptación y registro de hallazgos. Se separan las pruebas técnicas de la aceptación institucional.",
    "poblacion_muestra": "La población propuesta corresponde a quienes coordinan, investigan y apoyan proyectos del CGAO. Se propone una muestra intencional de seis participantes: dos de coordinación, tres investigadores y un aprendiz, sujeta a autorización y disponibilidad. El piloto evaluará doce tareas; no busca estimar resultados representativos de todo el SENA.",
    "tecnicas_recoleccion": "Entrevistas semiestructuradas, revisión autorizada de formatos y observación de tareas. La matriz recogerá necesidad, prioridad, responsable y criterio de aceptación. En el piloto se registrarán resultado, duración y dificultad de cada tarea con datos preparados para pruebas, sin cargar registros personales reales.",
    "fases": "Fase I: requisitos y planeación. Fase II: diseño funcional, datos y herramienta Excel. Fase III: desarrollo, pruebas e integración de consultas. Fase Final: validación, ajustes y preparación del cierre. Las seis actividades del cronograma precisan responsables, períodos y entregables previstos.",
    "resultados_esperados": EXPECTED,
    "impactos": "Se espera facilitar la consulta de información, la trazabilidad y la formación en desarrollo de software. El piloto medirá tareas completadas, errores y tiempos de consulta. Las metas propuestas no demuestran impactos sociales, económicos ni una clasificación Minciencias; esos efectos requieren medición y soportes independientes.",
    "conclusiones": "La propuesta conecta una necesidad de organización con requisitos, diseño, implementación y validación. El presupuesto conserva el monto de la fuente y el cronograma utiliza seis meses. La adopción depende de aprobar el alcance, conciliar las fuentes y obtener resultados de aceptación con usuarios.",
    "referencias": REFERENCES,
}
REPORT = {
    "antecedentes": "La referencia CAP-14 plantea desarrollar una plataforma de gestión y una herramienta Excel. El presente escenario organiza su seguimiento sin convertir la planeación en ejecución acreditada.",
    "metodologia": "Revisión de fuentes locales, contratos del repositorio y datos del formulario. Los indicadores separan meta propuesta de logro institucional confirmado; se usa cero cuando no existe constancia de aceptación. Las pruebas técnicas de generación se registran por separado.",
    "resultados": [{"entidad": "Equipo de investigación CGAO", "actividades_ejecutadas": "Organización del escenario documental a partir de los archivos recibidos; no se reporta ejecución del piloto.", "resultados_alcanzados": "Formularios y borradores preparados para validación técnica; aceptación institucional sin registrar.", "indicador": "Casos de aceptación institucional documentados", "meta": "12", "logro": "0", "unidad": "casos", "evidencia": "Fuentes locales y borradores del expediente. No existe registro de aceptación con usuarios en este escenario."}],
    "discusion": "Los archivos recibidos y el código permiten organizar un expediente de prueba. La existencia de funciones y borradores no demuestra aprobación por usuarios ni cumplimiento de todas las metas. El resultado de aceptación se conserva en cero hasta contar con registros verificables.",
    "fortalezas": "La fuente contiene objetivos y responsabilidades, y el repositorio cuenta con módulos de proyectos, cronogramas, productos y documentación. Estas capacidades facilitan preparar casos de prueba trazables.",
    "dificultades": "Las fuentes difieren en fechas, código mencionado en el objetivo del acta y semillero. Faltan aprobaciones, mediciones con usuarios y soportes de ejecución presupuestal. Estas ausencias limitan las conclusiones institucionales.",
    "acciones_futuras": "La coordinación conciliará identificación, duración y formatos. El equipo técnico ejecutará las pruebas propuestas y registrará evidencias. La responsable revisará el expediente y solicitará las aprobaciones cuando haya soporte; las fechas se acordarán en la planeación oficial.",
    "lecciones_aprendidas": "Conviene definir períodos e indicadores antes de redactar informes, conservar la fuente original y distinguir una prueba técnica de una aceptación institucional. Un campo diligenciado no reemplaza el soporte del hecho que describe.",
    "conclusiones": "El escenario permite probar la captura y la generación de documentos completos. No acredita cierre, gasto, validación con usuarios ni cumplimiento institucional. La información propuesta requiere revisión de los responsables.",
    "referencias": REFERENCES,
}
MEETING = {"hora_inicio": "09:00", "hora_fin": "10:00", "lugar": "Biblioteca del CGAO, Subsede Vélez; escenario propuesto de reunión", "temas": "Alcance, requisitos, responsabilidades, cronograma, presupuesto, riesgos y revisión documental.", "objetivo_reunion": "Revisar la planeación del sistema de gestión de proyectos y acordar los datos que deben confirmarse antes de su aprobación.", "asistentes": [{"nombre": "Equipo de coordinación y desarrollo CAP-14", "cargo_dependencia_entidad": "Participación propuesta para validar el formato; no acredita asistencia real"}], "invitados": []}
START = dict(MEETING,
    fecha_reunion="2026-06-09",
    alcance_sector_productivo="La solución se orienta inicialmente a la gestión interna de la investigación del CGAO. La ampliación a otros centros o actores requiere requisitos y autorizaciones adicionales.",
    alcance_formacion="Se propone vincular el desarrollo con actividades de análisis, construcción y pruebas de software. La participación de aprendices y su relación con el programa deben acordarse formalmente.",
    observaciones="El objetivo de esta propuesta corresponde a CAP-14 y debe cotejarse con la mención CAP-16 de la fuente. Las firmas quedan en blanco.")
CLOSE = dict(MEETING,
    tipo_cierre="final", fecha_reunion="2026-11-28", periodo_desde="2026-05-29", periodo_hasta="2026-11-28",
    evaluacion_actividades=[{"actividad_etapa": "Planeación, diseño, desarrollo y validación", "entregable": "Sistema, herramienta Excel y expediente", "observacion": "Entregables previstos; no se acredita aceptación institucional. El cierre es un escenario para revisar el formato."}],
    balance=[{"rubro": row["rubro"], "valor_planeado": row["valor_planeado"], "valor_real": "", "observacion": "La fuente no aporta comprobantes ni gasto ejecutado; se requiere conciliación financiera."} for row in BUDGET],
    fortalezas=REPORT["fortalezas"], dificultades=REPORT["dificultades"], acciones_futuras=REPORT["acciones_futuras"], lecciones_aprendidas=REPORT["lecciones_aprendidas"],
    listado_activos=[{"activo": "Repositorio de la aplicación y expediente documental", "estado": "Disponible para revisión técnica; transferencia institucional pendiente", "custodio": "Equipo de desarrollo propuesto", "soporte": "backend/, frontend/ y docs/CAP-14-2026 Sistemade Información Investigación/"}],
    observaciones="Esta acta propone el contenido de cierre para validar el generador. No declara terminación real ni aceptación de entregables.")
FINAL = dict(REPORT,
    autor_informe="Equipo de documentación CAP-14; autoría propuesta para revisión", fecha_entrega="2026-11-28", clasificacion_informacion="publica",
    codigo_idea="No aplica en este escenario; no se asigna un código institucional", experto_proyecto="No aplica; designación de experto sin confirmar", linea_tecnologica="Desarrollo de sistemas de información; propuesta para revisión", tecnoparque="No aplica en el escenario interno del CGAO",
    introduccion=FORMULATION["introduccion"], planteamiento_problema=FORMULATION["planteamiento_problema"],
    estado_arte_tecnica="El escenario considera una aplicación web con API, base de datos relacional y expediente versionado. El repositorio muestra React, FastAPI y SQLAlchemy. La comparación formal con alternativas y la revisión bibliográfica siguen pendientes; no se afirma novedad tecnológica.",
    desarrollo_proyecto="Se organizaron campos comunes, formulación, reuniones, productos, tres informes por período, cierre y evidencias. El código contiene módulos y generación Office. La construcción de borradores constituye una verificación técnica del sistema, no una ejecución del proyecto institucional.",
    viabilidad_tecnica="El repositorio dispone de funciones de persistencia y generación. La viabilidad de operación requiere pruebas de aceptación, revisión de seguridad y verificación del ambiente de despliegue; no se certifica con este informe.",
    viabilidad_operativa="Se propone asignar coordinación, administración de acceso, soporte y respaldo. Deben acordarse dedicación, capacitación, procedimiento de actualización y atención de incidentes antes de operar con registros institucionales.",
    viabilidad_economica="La fuente registra $10.000.000 en servicios personales. El escenario conserva ese monto y supone infraestructura existente sin compra adicional. No hay soporte de gastos ejecutados, ahorro medido ni análisis financiero aprobado.",
    viabilidad_normativa=FORMULATION["marco_normativo"],
    viabilidad_mercado="El uso propuesto es interno en el CGAO. No se plantean ventas ni se dispone de estudio comercial. La adopción debe evaluarse con usuarios, disponibilidad de soporte y autorización de la coordinación.",
    propiedad_intelectual_transferencia="Los activos previstos son código, diseño, herramienta Excel y manuales. La titularidad, licencias y condiciones de entrega requieren revisión institucional; no se declaran registros ni cesiones. Se propone transferencia mediante repositorio versionado y capacitación.",
    impacto_proyecto=FORMULATION["impactos"],
    anexos="Formulación, presentación, acta e informe recibidos en docs/CAP-14-2026 Sistemade Información Investigación/. Modelo funcional en docs/architecture/modelo-funcional-y-datos.md. Este índice no acredita fotografías, pruebas con usuarios ni actas de aprobación.",
    cumplimiento_objetivos="Los seis objetivos orientan los entregables propuestos y sus indicadores. Su cumplimiento institucional no está acreditado. La revisión técnica comprobará formularios y archivos; las metas requieren aceptación y evidencia independientes.",
    balance_final="Presupuesto planeado: $10.000.000. Ejecución financiera sin confirmar. Permanecen pendientes identificación SGPS, semillero, conciliación de fuentes, aceptación de usuarios y autorización del formato final.")
PRODUCTS = [
    {"nombre": "Sistema de gestión de proyectos de investigación CGAO", "tipo": "Software (propuesto)", "descripcion": "Producto previsto: módulos de proyectos, cronogramas, productos, consultas y expediente. No se registra como software aprobado ni producto Minciencias verificado."},
    {"nombre": "Herramienta Excel de indicadores por investigador", "tipo": "Herramienta Excel (propuesta)", "descripcion": "Producto previsto: resumen descriptivo, investigadores, productos y metodología. No calcula ni certifica clasificación oficial de Minciencias."},
]
PRODUCT_REPORT = {
    "descripcion_resultado": "Producto previsto y documentado como escenario. La existencia de funciones en el repositorio no acredita la aceptación institucional del producto.",
    "metodologia": "Definir requisitos, documentar diseño, construir incrementos, ejecutar pruebas técnicas y solicitar aceptación de usuarios con casos acordados.",
    "indicadores": [{"indicador": "Productos con aceptación institucional documentada", "meta": "1", "logro": "0", "unidad": "producto", "evidencia": "Repositorio y documentación técnica disponibles; acta de aceptación sin registrar."}],
    "requisitos_minciencias": "Tipología oficial y modelo aplicable sin confirmar. No se declara categoría, registro, certificación ni verificación. Se deberán aportar autoría, versión, documentación, soporte de uso y los requisitos que determine la convocatoria vigente.",
    "impacto": "Se espera facilitar consulta y trazabilidad del equipo de investigación. La utilidad y los tiempos de uso deben medirse durante un piloto autorizado.", "referencias": REFERENCES,
}
POSTER = {"introduccion": FORMULATION["introduccion"], "planteamiento_problema": FORMULATION["planteamiento_problema"], "justificacion": FORMULATION["justificacion"], "referente_teorico": FORMULATION["referente_teorico"], "metodologia": FORMULATION["metodologia"], "avances": "Escenario documental preparado. Meta: un producto aceptado; logro institucional confirmado: cero. La validación con usuarios y sus resultados aún no se registran.", "bibliografia": REFERENCES, "links_acceso": "Fuentes locales: backend/, frontend/ y docs/architecture/modelo-funcional-y-datos.md; acceso sujeto a los permisos del repositorio."}
EVIDENCE = {"indice": [{"nombre": "Proyecto CAPSistema Informacion Investigación (2).docx", "tipo": "Formulación de referencia", "actividad": "Revisar requisitos y objetivos", "descripcion": "Fuente recibida para organizar el escenario; no acredita aceptación ni ejecución.", "ubicacion": "docs/CAP-14-2026 Sistemade Información Investigación/1ProyectoFomulado/Proyecto CAPSistema Informacion Investigación (2).docx"}], "observaciones": "El índice vincula archivos locales. No se adjuntan fotografías ni se declaran soportes de ejecución inexistentes."}
