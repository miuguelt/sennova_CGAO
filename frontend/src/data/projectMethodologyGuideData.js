/**
 * Catálogo pre-programado de orientaciones metodológicas, checklists interactivas,
 * validaciones en vivo y documentos descargables para la formulación de proyectos I+D+i SENNOVA CGAO.
 * Centro de Gestión Agroempresarial y del Oriente - Regional Santander.
 */

export const STEP_METHODOLOGY_GUIDE = {
  identificacion: {
    titulo: 'Identificación, Objetivos y Alcance del Proyecto',
    badge: 'Paso 1 · Núcleo del Proyecto',
    queInformacionAgregar: [
      {
        campo: 'Título del proyecto',
        instruccion: 'Debe formularse en tiempo presente afirmativo (sin iniciar con verbos en infinitivo). Debe responder a tres preguntas fundamentales: ¿Qué se va a realizar?, ¿Sobre qué objeto, proceso o población? y ¿En qué contexto geográfico o sector productivo? (ej. Provincia de Vélez / Santander).',
        ejemplo: 'Desarrollo de un sistema IoT y bioprocesos para optimización de fermentación en cafés especiales del CGAO Vélez.'
      },
      {
        campo: 'Objetivo general',
        instruccion: 'Debe iniciar obligatoriamente con un verbo en infinitivo medible (ej: Desarrollar, Evaluar, Diseñar, Implementar, Validar). Debe describir el logro principal, el método o solución aplicada y la finalidad o impacto esperado en el Centro y la región.',
        ejemplo: 'Desarrollar un prototipo biotecnológico para la estandarización del secado y fermentación en cafés de la provincia de Vélez, mejorando su perfil en taza.'
      },
      {
        campo: 'Objetivos específicos',
        instruccion: 'Redacta entre 3 y 4 objetivos secuenciales y cronológicos que correspondan a las fases de investigación: 1) Diagnóstico y caracterización, 2) Diseño y desarrollo experimental, 3) Validación y pruebas de campo, 4) Transferencia de conocimiento y apropiación social.',
        ejemplo: '1. Diagnosticar las variables físico-químicas de partida.\n2. Diseñar el protocolo de fermentación controlada.\n3. Validar el desempeño técnico del prototipo.\n4. Transferir los resultados a los productores locales.'
      },
      {
        campo: 'Duración (vigencia) y Presupuesto total',
        instruccion: 'Indica la vigencia planeada en meses (habitualmente 10 a 12 meses para convocatorias anuales SENNOVA) y el presupuesto total estimado en pesos colombianos ($ COP). Recuerda que el desglose de recursos en el paso de presupuesto debe sumar este valor.',
        ejemplo: 'Vigencia: 12 meses · Presupuesto: $ 45.000.000 COP'
      }
    ],
    checklist: [
      'El título está redactado en tiempo presente afirmativo y delimita objeto y territorio sin verbos infinitivos.',
      'El objetivo general inicia con un verbo en infinitivo de alcance claro y medible.',
      'Hay entre 3 y 4 objetivos específicos secuenciales que cubren diagnóstico, desarrollo, validación y transferencia.',
      'La vigencia en meses es coherente con el calendario SENNOVA y el presupuesto total está definido.'
    ],
    documentosEnConstruccion: [
      {
        id: 'ficha_tecnica',
        nombre: 'Ficha Técnica de Identificación I+D+i (PDF)',
        tipo: 'pdf',
        descripcion: 'Genera el resumen preliminar de la propuesta con título, objetivos, duración y presupuesto.',
        accion: 'ficha'
      }
    ],
    ejemploModelo: {
      titulo: 'Proyecto Modelo: Cafés Especiales Vélez',
      texto: 'Título: Implementación de tecnologías de fermentación controlada y sensores IoT en microempresas cafeteras de la provincia de Vélez.\n\nObjetivo General: Implementar un modelo de fermentación controlada asistido por sensórica IoT para estandarizar perfiles de calidad en microlotes de café de la provincia de Vélez.\n\nObjetivos Específicos:\n1. Caracterizar las variables ambientales y térmicas del proceso tradicional de beneficio.\n2. Diseñar el sistema de monitoreo en tiempo real de temperatura y pH.\n3. Evaluar el impacto en la calidad sensorial y taza del grano.\n4. Capacitar a semilleristas y caficultores locales en el manejo tecnológico.'
    }
  },
  institucional: {
    titulo: 'Datos Institucionales y Ubicación Territorial',
    badge: 'Paso 2 · Contexto CGAO',
    queInformacionAgregar: [
      {
        campo: 'Centro de Formación y Regional',
        instruccion: 'Registra el Centro de Gestión Agroempresarial y del Oriente (CGAO) y la Regional Santander. Estos datos vinculan formalmente la propuesta a los grupos y semilleros de investigación institucional.',
        ejemplo: 'Centro: Centro de Gestión Agroempresarial y Oriente · Regional: Santander · Ciudad: Vélez'
      },
      {
        campo: 'Responsable del proyecto y Código CAP',
        instruccion: 'Indica al investigador líder o instructor formulador responsable ante la Coordinación SENNOVA, y el código de convocatoria CAP cuando aplique.',
        ejemplo: 'Responsable: Investigador Principal CGAO'
      },
      {
        campo: 'Fechas de inicio y terminación',
        instruccion: 'Fechas acordadas dentro del calendario de ejecución de la vigencia. La fecha final debe ser igual o posterior a la inicial y concordar con los meses de duración.',
        ejemplo: 'Inicio: 2026-02-01 · Fin: 2026-11-30'
      }
    ],
    checklist: [
      'El centro de formación y la regional corresponden a la sede de radicación del proyecto (CGAO Vélez).',
      'El responsable designado cuenta con horas de dedicación asignadas en la planeación.',
      'Las fechas de inicio y terminación cubren exactamente la vigencia planeada.'
    ],
    documentosEnConstruccion: [
      {
        id: 'ficha_tecnica',
        nombre: 'Ficha de Registro Institucional (PDF)',
        tipo: 'pdf',
        descripcion: 'Ficha técnica oficial con ubicación institucional y responsables del centro.',
        accion: 'ficha'
      }
    ],
    ejemploModelo: {
      titulo: 'Modelo Institucional CGAO',
      texto: 'Centro: Centro de Gestión Agroempresarial y Oriente - CGAO\nRegional: Santander\nMunicipio: Vélez (con impacto en Chipatá, Guavatá y Barbosa)\nLíder: Investigador Principal SENNOVA CGAO\nFechas: Vigencia anual de 10 meses'
    }
  },
  problema: {
    titulo: 'Planteamiento del Problema, Causas y Justificación',
    badge: 'Paso 3 · Diagnóstico y Necesidad',
    queInformacionAgregar: [
      {
        campo: 'Planteamiento del problema y contexto',
        instruccion: 'Describe la situación no resuelta, necesidad insatisfecha u oportunidad tecnológica evidenciada en el sector agropecuario, agroindustrial o de servicios. Evita definir el problema como la simple "falta de dinero" o "falta de equipos".',
        ejemplo: 'Alta variabilidad en la calidad del secado y pérdidas poscosecha de hasta el 28% en fincas panelero-cafeteras por métodos empíricos y clima adverso.'
      },
      {
        campo: 'Causas y consecuencias (Árbol de problemas)',
        instruccion: 'Identifica al menos 3 causas directas e indirectas (ej. falta de control térmico, desconocimiento de curvas de humedad) y sus efectos negativos medibles (pérdidas económicas, bajo precio de venta).',
        ejemplo: 'Causas: 1) Monitoreo manual esporádico. 2) Fluctuaciones climáticas no amortiguadas.\nEfectos: Merma en precio de venta y rechazo de lotes.'
      },
      {
        campo: 'Justificación y pertinencia SENNOVA',
        instruccion: 'Sustenta por qué es prioritario desarrollar esta investigación desde el SENA: impacto en la formación profesional de los aprendices, transferencia a los sectores campesinos y comunitarios, e innovación.',
        ejemplo: 'El proyecto fortalece la formación por proyectos en aprendices ADSO y Agroindustria, impactando a más de 40 familias rurales de la provincia.'
      }
    ],
    checklist: [
      'El problema está enfocado en una causa técnica y no en la ausencia de recursos presupuestales.',
      'Se describen causas directas, indirectas y consecuencias económicas, sociales o ambientales.',
      'La justificación explicita el beneficio formativo para aprendices SENA y el sector productivo.'
    ],
    documentosEnConstruccion: [
      {
        id: 'ficha_tecnica',
        nombre: 'Ficha Técnica Actualizada (PDF)',
        tipo: 'pdf',
        descripcion: 'Documento que consolida los objetivos y la justificación del proyecto.',
        accion: 'ficha'
      }
    ],
    ejemploModelo: {
      titulo: 'Ejemplo de Justificación y Problema',
      texto: 'Problema: Los caficultores tradicionales de la provincia de Vélez presentan pérdidas del 25% por fermentación heterogénea debido a la ausencia de control térmico y microbiológico.\n\nJustificación: La implementación de un fermentador controlado con IoT desarrollado en el CGAO permitirá a los aprendices adquirir competencias en Industria 4.0 y a los productores obtener cafés con puntaje superior a 84 puntos SCA, incrementando los ingresos en un 35%.'
    }
  },
  marco: {
    titulo: 'Marco Teórico, Antecedentes y Marco Normativo',
    badge: 'Paso 4 · Sustento Científico',
    queInformacionAgregar: [
      {
        campo: 'Referente teórico y estado del arte',
        instruccion: 'Cita autores, investigaciones previas, patentes o proyectos similares que demuestren el conocimiento de frontera en la temática. Evita un glosario de términos aislados; integra los conceptos en una narrativa coherente.',
        ejemplo: 'Se revisan modelos de fermentación controlada (Silva et al., 2021) y sensórica distribuida de bajo costo en agricultura de precisión (FAO, 2023).'
      },
      {
        campo: 'Marco normativo y regulatorio',
        instruccion: 'Identifica resoluciones, decretos y normas técnicas pertinentes (ej. Buenas Prácticas Agrícolas BPA, normas ICA, INVIMA, MinCiencias o ISO aplicables).',
        ejemplo: 'Resolución ICA 30021 de 2017 sobre BPA, lineamientos de propiedad intelectual SENA y lineamientos MinCiencias.'
      }
    ],
    checklist: [
      'Se citan al menos 3 fuentes bibliográficas o antecedentes técnicos pertinentes.',
      'Se identifican las normas técnicas, sanitarias o ambientales aplicables.',
      'El marco teórico sustenta la metodología propuesta en el paso siguiente.'
    ],
    documentosEnConstruccion: [
      {
        id: 'ficha_tecnica',
        nombre: 'Ficha Técnica de Investigación (PDF)',
        tipo: 'pdf',
        descripcion: 'Resumen con estado de formulación actual.',
        accion: 'ficha'
      }
    ],
    ejemploModelo: {
      titulo: 'Modelo de Referentes y Normas',
      texto: 'Referente Teórico: La fermentación anaerobia de café en biorreactores herméticos permite elevar compuestos volátiles deseables como ésteres y alcoholes superiores (López, 2022). La integración de microcontroladores y sensores digitales posibilita la telemetría en tiempo real.\n\nNormativo: Guía de bioseguridad CGAO, Decreto 1075 de 2015 del sector educación y Política de CTeI SENA.'
    }
  },
  metodologia: {
    titulo: 'Metodología, Diseño Experimental y Fases',
    badge: 'Paso 5 · Estrategia de I+D+i',
    queInformacionAgregar: [
      {
        campo: 'Enfoque de investigación y tipo de estudio',
        instruccion: 'Declara si la investigación es de enfoque cuantitativo, cualitativo o mixto, y clasifícala según MinCiencias (Investigación Aplicada o Desarrollo Experimental).',
        ejemplo: 'Enfoque cuantitativo experimental, tipo Desarrollo Tecnológico e Innovación (TRL 3 a TRL 5).'
      },
      {
        campo: 'Población, muestra o unidades experimentales',
        instruccion: 'Define la cantidad de muestras, repeticiones, lotes experimentales o usuarios participantes en las pruebas.',
        ejemplo: 'Se realizarán 3 repeticiones por cada uno de los 4 tratamientos de fermentación (12 unidades experimentales de 50 kg).'
      },
      {
        campo: 'Técnicas de recolección y análisis',
        instruccion: 'Describe instrumentos de medición, sensores, software de análisis estadístico (ej. ANOVA, R, Python) y protocolos de laboratorio.',
        ejemplo: 'Monitoreo de pH con sensor analógico, temperatura (°C) y análisis estadístico por diseño de bloques al azar con p < 0.05.'
      },
      {
        campo: 'Fases del proyecto',
        instruccion: 'Organiza el procedimiento en fases claras: Fase 1 (Diagnóstico), Fase 2 (Diseño y prototipado), Fase 3 (Validación y ensayos), Fase 4 (Socialización y transferencia).',
        ejemplo: 'Fase I: Línea base. Fase II: Ensamble del prototipo. Fase III: Pruebas de fermentación. Fase IV: Guía técnica y capacitación.'
      }
    ],
    checklist: [
      'El tipo de investigación está claramente delimitado (Investigación Aplicada o Desarrollo Tecnológico).',
      'El diseño experimental incluye repeticiones o unidades suficientes para validar hipótesis.',
      'Las fases corresponden secuencialmente con los objetivos específicos planteados en el paso 1.'
    ],
    documentosEnConstruccion: [
      {
        id: 'ficha_tecnica',
        nombre: 'Ficha Metodológica del Proyecto (PDF)',
        tipo: 'pdf',
        descripcion: 'Ficha técnica que incluye la descripción del diseño experimental y las fases.',
        accion: 'ficha'
      }
    ],
    ejemploModelo: {
      titulo: 'Estructura Metodológica Modelo',
      texto: 'Fase 1: Caracterización fisicoquímica inicial de variedades Castillo y Colombia en Vélez.\nFase 2: Fabricación del biorreactor en acero inoxidable 304 con sensores de temperatura, humedad relativa y pH.\nFase 3: Pruebas comparativas de fermentación tradicional vs. asistida, evaluando curvas de acidez y azúcares.\nFase 4: Catación bajo protocolo SCA con catadores certificados y taller de socialización a 30 aprendices del semillero SIACF.'
    }
  },
  equipo: {
    titulo: 'Equipo de Investigadores y Vinculación de Semilleros',
    badge: 'Paso 6 · Talento Humano CTeI',
    queInformacionAgregar: [
      {
        campo: 'Investigador Principal (IP) y Coinvestigadores',
        instruccion: 'Registra a los instructores o contratistas con su perfil profesional, rol en el proyecto y dedicación horaria (habitualmente entre 10 y 20 horas semanales).',
        ejemplo: 'Investigador Principal: Ing. Agroindustrial (20 h/sem) · Coinvestigador: Instructor Software (15 h/sem)'
      },
      {
        campo: 'Aprendices Semilleristas vinculados',
        instruccion: 'Vincula aprendices de programas de formación pertinentes (ej. ADSO, Producción Agropecuaria, Agroindustria) con planes de concertación de actividades de investigación formativa.',
        ejemplo: '2 Aprendices ADSO para desarrollo de software y 2 aprendices Agroindustria para ensayos de campo (20 h/sem cada uno).'
      },
      {
        campo: 'Actividades a liderar por integrante',
        instruccion: 'Describe puntualmente qué actividades del cronograma liderará cada miembro para garantizar trazabilidad y evaluación posterior.',
        ejemplo: 'IP: Dirección metodológica y análisis de datos. Coinvestigador: Programación de telemetría y pruebas de sensórica.'
      }
    ],
    checklist: [
      'Se designó claramente el Investigador Principal responsable del proyecto.',
      'El equipo cuenta con instructores técnicos y aprendices semilleristas formalmente vinculados.',
      'Cada integrante tiene actividades asignadas y horas de dedicación semanales verificables.'
    ],
    documentosEnConstruccion: [
      {
        id: 'acta_inicio',
        nombre: 'Acta de Inicio y Conformación de Equipo (PDF)',
        tipo: 'pdf',
        descripcion: 'Genera el Acta formal de conformación del equipo con firmas y dedicación horaria.',
        accion: 'acta'
      }
    ],
    ejemploModelo: {
      titulo: 'Conformación de Equipo Recomendada',
      texto: '1. Investigador Principal (IP): 20 horas/semana - Coordinación técnica, redacción de artículos y gestión presupuestal.\n2. Coinvestigador Técnico: 15 horas/semana - Fabricación del prototipo, calibración de sensores.\n3. Aprendiz Semillerista SIACF 1: 20 horas/semana - Registro de bitácoras de temperatura y toma de muestras.\n4. Aprendiz Semillerista SIACF 2: 20 horas/semana - Desarrollo de la interfaz web de visualización de datos.'
    }
  },
  recursos: {
    titulo: 'Presupuesto por Rubros y Cronograma de Actividades',
    badge: 'Paso 7 · Finanzas & Tiempos',
    queInformacionAgregar: [
      {
        campo: 'Rubros elegibles SENNOVA',
        instruccion: 'Desglosa los gastos en los rubros aprobados: 1) Talento Humano, 2) Materiales y Suministros, 3) Servicios Tecnológicos y Software, 4) Viáticos y Salidas de Campo, 5) Maquinaria y Equipos.',
        ejemplo: 'Materiales: Reactivos y sensores ($ 12.000.000) · Equipos: Biorreactor ($ 20.000.000) · Servicios: Pruebas de laboratorio ($ 8.000.000) · Viáticos: Salidas a fincas ($ 5.000.000)'
      },
      {
        campo: 'Balance y coherencia presupuestal',
        instruccion: 'La suma de todos los rubros planeados debe ser exactamente igual al Presupuesto Total definido en el Paso 1. Cualquier diferencia generará una alerta de inconsistencia.',
        ejemplo: 'Suma de rubros: $ 45.000.000 COP = Presupuesto Total: $ 45.000.000 COP (Balance: 100%)'
      },
      {
        campo: 'Cronograma de actividades y entregables',
        instruccion: 'Relaciona cada actividad con su período (ej. Mes 1 a Mes 3 o Bimestre 1), el encargado del equipo y el entregable concreto que sustentará el avance.',
        ejemplo: 'Actividad: Adquisición de componentes | Mes 1-2 | Encargado: Coinvestigador | Entregable: Facturas e inventario de piezas'
      }
    ],
    checklist: [
      'Todos los rubros presupuestales cuentan con justificación técnica vinculada a los objetivos.',
      'La suma del desglose presupuestal coincide al 100% con el presupuesto total del proyecto.',
      'Las actividades del cronograma cubren toda la vigencia y cuentan con un entregable verificable.'
    ],
    documentosEnConstruccion: [
      {
        id: 'reporte_seguimiento',
        nombre: 'Reporte de Seguimiento y Cronograma (PDF)',
        tipo: 'pdf',
        descripcion: 'Reporte institucional con los hitos y el cronograma programado del proyecto.',
        accion: 'seguimiento'
      }
    ],
    ejemploModelo: {
      titulo: 'Ejemplo de Balance Presupuestal y Cronograma',
      texto: 'Rubro Materiales: $ 15.000.000 COP (Acero 304, microcontroladores, sensores, reactivos de titulación)\nRubro Equipos: $ 18.000.000 COP (Medidor multiparamétrico de pH y conductividad)\nRubro Servicios: $ 7.000.000 COP (Análisis cromatográfico en laboratorio acreditado)\nRubro Viáticos: $ 5.000.000 COP (Transporte y visitas de recolección en fincas de Vélez)\nTotal: $ 45.000.000 COP\n\nCronograma: Bimestre 1 (Línea base), Bimestre 2 (Construcción), Bimestre 3 (Ensayos), Bimestre 4 (Validación), Bimestre 5-6 (Catación y entrega final).'
    }
  },
  resultados: {
    titulo: 'Resultados Esperados, Impactos y Productos MinCiencias',
    badge: 'Paso 8 · Productos CTeI',
    queInformacionAgregar: [
      {
        campo: 'Tipología de Productos MinCiencias',
        instruccion: 'Todo proyecto SENNOVA debe clasificar sus resultados en las 4 categorías MinCiencias: 1) Generación de Nuevo Conocimiento (artículos, ponencias), 2) Desarrollo Tecnológico e Innovación (software, prototipos, patentes), 3) Apropiación Social del Conocimiento (talleres, manuales, eventos), 4) Formación de Talento (aprendices en semillero).',
        ejemplo: '1 Prototipo funcional (DTI) + 1 Registro de Software (DTI) + 1 Artículo de investigación (NC) + 1 Cartilla técnica (ASC).'
      },
      {
        campo: 'Indicadores, Metas y Medios de Verificación',
        instruccion: 'Define para cada resultado su indicador (ej. Cantidad de prototipos evaluados), la meta numérica (ej. 1), la unidad (ej. prototipo) y el archivo o soporte de verificación.',
        ejemplo: 'Meta: 1 | Indicador: Prototipo validado en ambiente relevante | Evidencia: Informe técnico de pruebas y fotografías.'
      },
      {
        campo: 'Impactos previstos',
        instruccion: 'Describe impactos tangibles en cuatro dimensiones: 1) Impacto económico (reducción de costos), 2) Impacto social (bienestar comunitario), 3) Impacto ambiental (sostenibilidad), 4) Impacto en la formación SENA.',
        ejemplo: 'Aumento del 25% en ingresos de 15 fincas productoras y actualización curricular del programa Agroindustria.'
      }
    ],
    checklist: [
      'Se comprometió al menos un producto de desarrollo tecnológico (software, prototipo o diseño).',
      'Se definieron indicadores y metas numéricas con sus unidades de medida claras.',
      'Los impactos contemplan beneficios concretos en el sector productivo y en la formación de aprendices.'
    ],
    documentosEnConstruccion: [
      {
        id: 'informe_final',
        nombre: 'Modelo de Informe Final y Productos (PDF)',
        tipo: 'pdf',
        descripcion: 'Formato preliminar de cierre y relación de productos de Ciencia, Tecnología e Innovación.',
        accion: 'informe_final'
      }
    ],
    ejemploModelo: {
      titulo: 'Matriz Modelo de Productos MinCiencias',
      texto: 'Producto 1 (Desarrollo Tecnológico): Prototipo de Biorreactor Automatizado para Fermentación de Café (TRL 5). Evidencia: Ficha técnica y video demostrativo.\nProducto 2 (Apropiación Social): Cartilla Práctica de Buenas Prácticas de Fermentación para Caficultores de Santander. Evidencia: Publicación con registro ISBN/Depósito legal.\nProducto 3 (Formación): 4 Aprendices certificados en desarrollo de prototipos agroindustriales y análisis sensorial.'
    }
  },
  generar: {
    titulo: 'Consolidación, Auditoría y Descarga de Documentación',
    badge: 'Paso 9 · Radicación & Cierre',
    queInformacionAgregar: [
      {
        campo: 'Revisión y Auditoría Integral de Formulación',
        instruccion: 'Verifica que todos los pasos previos no presenten campos obligatorios vacíos ni inconsistencias en el presupuesto o en los objetivos. El sistema valida automáticamente el cumplimiento antes de generar las versiones finales.',
        ejemplo: 'Estado: 100% de requisitos completados. Listo para generación oficial.'
      },
      {
        campo: 'Generación de Documentos Oficiales Word (.docx) y PowerPoint (.pptx)',
        instruccion: 'Genera el documento oficial de formulación técnica SGPS listo para radicación y las diapositivas oficiales de sustentación del proyecto para el comité evaluador.',
        ejemplo: 'Formulación SGPS v1.0 (.docx) y Presentación de Sustentación v1.0 (.pptx).'
      },
      {
        campo: 'Gestión de Firmas y Radicación',
        instruccion: 'Descarga los documentos, revisa ortografía y redacción, recopila las firmas de los investigadores y del Subdirector de Centro, y adjunta la copia final al Expediente institucional.',
        ejemplo: 'Radicación en el Sistema de Gestión de Proyectos SGPS.'
      }
    ],
    checklist: [
      'Todos los pasos metodológicos se encuentran completos y verificados.',
      'Se generaron las versiones preliminares en Word y PowerPoint.',
      'Se descargó el paquete documental completo para socialización y firmas.'
    ],
    documentosEnConstruccion: [
      {
        id: 'ficha_tecnica',
        nombre: 'Ficha Técnica Consolidada (PDF)',
        tipo: 'pdf',
        descripcion: 'Ficha resumen completa con todos los datos y el equipo del proyecto.',
        accion: 'ficha'
      },
      {
        id: 'acta_inicio',
        nombre: 'Acta de Inicio Oficial (PDF)',
        tipo: 'pdf',
        descripcion: 'Acta formal con compromisos, cronograma y equipo vinculante.',
        accion: 'acta'
      },
      {
        id: 'seguimiento',
        nombre: 'Reporte de Seguimiento (PDF)',
        tipo: 'pdf',
        descripcion: 'Seguimiento técnico para monitoreo del avance.',
        accion: 'seguimiento'
      },
      {
        id: 'informe_final',
        nombre: 'Informe de Cierre Preliminar (PDF)',
        tipo: 'pdf',
        descripcion: 'Estructura de informe final y productos.',
        accion: 'informe_final'
      }
    ],
    ejemploModelo: {
      titulo: 'Recomendaciones Finales de Radicación',
      texto: 'Antes de radicar en la convocatoria:\n1. Revisa que el código SGPS coincida con el formulario oficial.\n2. Confirma que el presupuesto sume exactamente el valor registrado en la plataforma.\n3. Adjunta las cartas de intención o acuerdos de confidencialidad con las fincas o empresas beneficiarias.\n4. Imprime el Acta de Inicio para recolección de firmas en el CGAO.'
    }
  }
};

export const PROJECT_METHODOLOGY_GUIDE = STEP_METHODOLOGY_GUIDE;

export function getMethodologyGuideForStep(stepId) {
  return STEP_METHODOLOGY_GUIDE[stepId] || {
    titulo: 'Formulación Técnica del Proyecto',
    badge: 'Orientación Metodológica',
    queInformacionAgregar: [],
    checklist: [],
    documentosEnConstruccion: [],
    ejemploModelo: { titulo: 'Orientación General', texto: 'Diligencie los campos solicitados.' }
  };
}

export function getMethodologyTipsForField(stepId, fieldKey) {
  const guide = STEP_METHODOLOGY_GUIDE[stepId];
  if (!guide || !Array.isArray(guide.queInformacionAgregar)) return null;

  const clean = (str) =>
    String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/_/g, ' ')
      .trim();

  const normalizedField = clean(fieldKey);
  return (
    guide.queInformacionAgregar.find((tip) => {
      const tipField = clean(tip.campo);
      return tipField.includes(normalizedField) || normalizedField.includes(tipField);
    }) || null
  );
}
