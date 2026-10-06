/**
 * Orientaciones metodológicas internas para organizar la formulación de proyectos.
 * Los ejemplos son estructuras editables; los requisitos y datos deben confirmarse con fuentes vigentes.
 */

export const STEP_METHODOLOGY_GUIDE = {
  identificacion: {
    titulo: 'Identificación del proyecto',
    badge: 'Paso 1 · Datos básicos',
    referenciaEjemplo: {
      fuente: 'Formato Proyecto Capacidad Instalada · CAP-14-2026',
      secciones: ['Información general', '1. Título'],
      nota: 'La muestra registra el título en la ficha inicial y lo repite en el contenido. La duración y el presupuesto se completan con los datos confirmados del proyecto.'
    },
    queInformacionAgregar: [
      {
        campo: 'Título del proyecto',
        instruccion: 'Describe con claridad el objeto o proceso del proyecto y el alcance respaldado por sus fuentes. Confirma las reglas de titulación que establezca la convocatoria.',
        ejemplo: '[Acción o resultado] sobre [objeto o proceso] en [ámbito confirmado].'
      },
      {
        campo: 'Duración (vigencia) y Presupuesto total',
        instruccion: 'Registra la duración y el presupuesto que consten en la fuente del proyecto. Contrasta el presupuesto con el desglose del paso de recursos.',
        ejemplo: 'Duración: [período confirmado] · Presupuesto total: [valor y moneda confirmados].'
      }
    ],
    checklist: [
      'El título describe el proyecto con el formato solicitado y usa un alcance respaldado por sus fuentes.',
      'La duración y el presupuesto coinciden con las fuentes aprobadas del proyecto.'
    ],
    ejemploModelo: {
      titulo: 'Ficha inicial del proyecto',
      texto: 'Título: [nombre respaldado por el proyecto].\nDuración: [período confirmado].\nPresupuesto total: [valor confirmado].'
    }
  },
  institucional: {
    titulo: 'Datos institucionales y equipo',
    badge: 'Paso 2 · Información general',
    referenciaEjemplo: {
      fuente: 'Formato Proyecto Capacidad Instalada · CAP-14-2026',
      secciones: ['Información general'],
      nota: 'La ficha de la muestra también incluye nivel de formación, programa, competencia y resultados de aprendizaje. Registra estos datos, la fase formativa y las clasificaciones solo si el proyecto o la convocatoria los solicita; confirma su fuente y deja vacíos los que no apliquen.'
    },
    queInformacionAgregar: [
      {
        campo: 'Centro de Formación y Regional',
        instruccion: 'Registra el centro, la regional y el territorio que consten en la fuente aprobada del proyecto. Confirma los campos requeridos para esta convocatoria.',
        ejemplo: 'Centro: [según la fuente] · Regional: [según la fuente] · Territorio: [si aplica].'
      },
      {
        campo: 'Responsables y código de convocatoria',
        instruccion: 'Registra responsables y códigos solo cuando estén confirmados en la fuente del proyecto o en la convocatoria vigente.',
        ejemplo: 'Responsable: [nombre y rol confirmados] · Código: [si la convocatoria lo asigna].'
      },
      {
        campo: 'Fechas de inicio y terminación',
        instruccion: 'Registra las fechas aprobadas y verifica que correspondan con la duración y el cronograma del proyecto.',
        ejemplo: 'Inicio: [fecha confirmada] · Fin: [fecha confirmada].'
      },
      {
        campo: 'Datos de formación y convocatoria (cuando apliquen)',
        instruccion: 'Completa nivel, programa, competencia, resultados de aprendizaje, fase formativa, categoría o área solo si el proyecto o la convocatoria los solicita. Confirma cada dato con una fuente institucional y deja vacío lo que no aplique.',
        ejemplo: 'Nivel: [denominación confirmada, si aplica] · Programa: [nombre confirmado, si aplica] · Competencia y resultados: [según fuente institucional].'
      },
      {
        campo: 'Integrantes y responsabilidades',
        instruccion: 'Agrega a las personas vinculadas al proyecto y asocia cada una con su rol y las actividades que le corresponden.',
        ejemplo: 'Integrante: [persona confirmada] · Rol: [función acordada] · Actividad: [tarea del proyecto].'
      }
    ],
    checklist: [
      'Los datos institucionales coinciden con la fuente aprobada y la convocatoria.',
      'Las personas responsables y sus roles están confirmados.',
      'Las fechas coinciden con la duración y el cronograma aprobados.'
    ],
    ejemploModelo: {
      titulo: 'Estructura para completar con fuentes del proyecto',
      texto: 'Centro: [dato confirmado]\nRegional: [dato confirmado]\nTerritorio: [dato confirmado, si aplica]\nResponsables: [nombres y roles confirmados]\nFechas: [período aprobado]\nDatos formativos o de convocatoria: [solo los que solicite el formato vigente].'
    }
  },
  problema: {
    titulo: 'Introducción, problema y justificación',
    badge: 'Paso 3 · Necesidad del proyecto',
    referenciaEjemplo: {
      fuente: 'Formato Proyecto Capacidad Instalada · CAP-14-2026',
      secciones: ['2. Introducción', '3. Planteamiento del problema', '4. Justificación'],
      nota: 'La muestra desarrolla estos apartados antes de los objetivos. Usa el orden para explicar de dónde surge la necesidad y por qué se propone atenderla.'
    },
    queInformacionAgregar: [
      {
        campo: 'Planteamiento del problema y contexto',
        instruccion: 'Describe la situación que el proyecto busca atender y susténtala con las fuentes disponibles. No agregues cifras, población ni causas que no estén documentadas.',
        ejemplo: 'Situación: [descripción respaldada] · Evidencia: [fuente y fecha] · Alcance: [dato confirmado].'
      },
      {
        campo: 'Causas y consecuencias (Árbol de problemas)',
        instruccion: 'Relaciona las causas y consecuencias que estén respaldadas por el diagnóstico. Si una relación aún no está comprobada, identifícala como una hipótesis por validar.',
        ejemplo: 'Causa documentada: [descripción] · Situación observada: [descripción] · Consecuencia sustentada: [descripción].'
      },
      {
        campo: 'Justificación y pertinencia',
        instruccion: 'Explica por qué se propone el proyecto, cómo se relaciona con sus objetivos y a quiénes podría beneficiar. Sustenta cada beneficio con la fuente correspondiente.',
        ejemplo: 'Necesidad atendida: [dato confirmado] · Beneficio esperado: [resultado sustentado] · Población: [si está identificada].'
      }
    ],
    checklist: [
      'La situación y su alcance están respaldados por fuentes identificables.',
      'Las causas, consecuencias y supuestos se distinguen con claridad.',
      'Los beneficios esperados se relacionan con los objetivos y tienen sustento.'
    ],
    ejemploModelo: {
      titulo: 'Estructura para completar con fuentes del proyecto',
      texto: 'Problema: [situación respaldada por diagnóstico o evidencia].\n\nJustificación: [relación con los objetivos, resultado esperado y población, según fuentes verificables].'
    }
  },
  objetivos: {
    titulo: 'Objetivos del proyecto',
    badge: 'Paso 4 · Propósito y resultados parciales',
    referenciaEjemplo: {
      fuente: 'Formato Proyecto Capacidad Instalada · CAP-14-2026',
      secciones: ['5. Objetivos'],
      nota: 'La muestra presenta el objetivo general y después los objetivos específicos. Conserva esa relación y usa la cantidad que corresponda a tu proyecto y a sus requisitos vigentes.'
    },
    queInformacionAgregar: [
      {
        campo: 'Objetivo general',
        instruccion: 'Expresa el resultado principal que busca el proyecto, su objeto y alcance. Comprueba que responda a la necesidad planteada.',
        ejemplo: '[Verbo y resultado esperado] para [objeto o población], en [ámbito confirmado].'
      },
      {
        campo: 'Objetivos específicos',
        instruccion: 'Define resultados parciales que, en conjunto, permitan alcanzar el objetivo general. Ordena la secuencia de trabajo y confirma si la convocatoria pide una estructura particular.',
        ejemplo: '1. [Resultado parcial que responda al problema].\n2. [Resultado parcial que prepare la solución].\n3. [Resultado parcial que permita verificarla, si aplica].'
      }
    ],
    checklist: [
      'El objetivo general responde a la necesidad descrita y señala un resultado esperado.',
      'Los objetivos específicos se relacionan con el objetivo general y siguen una secuencia comprensible.'
    ],
    ejemploModelo: {
      titulo: 'Relación entre los objetivos',
      texto: 'Objetivo general: [resultado principal y alcance confirmado].\n\nObjetivos específicos:\n1. [resultado parcial].\n2. [resultado parcial].\n3. [resultado parcial, si se requiere].'
    }
  },
  marco: {
    titulo: 'Marco Teórico, Antecedentes y Marco Normativo',
    badge: 'Paso 5 · Sustento teórico y normativo',
    referenciaEjemplo: {
      fuente: 'Formato Proyecto Capacidad Instalada · CAP-14-2026',
      secciones: ['6. Referente teórico'],
      nota: 'El ejemplo incluye referentes teóricos. La aplicación también permite registrar normativa cuando sea pertinente y esté verificada.'
    },
    queInformacionAgregar: [
      {
        campo: 'Referente teórico y estado del arte',
        instruccion: 'Resume literatura, antecedentes y proyectos relacionados que hayas consultado. Registra citas completas y verifica cada fuente antes de incluirla.',
        ejemplo: 'Antecedente: [autor o entidad, título, año y hallazgo pertinente, verificados].'
      },
      {
        campo: 'Marco normativo y regulatorio',
        instruccion: 'Incluye únicamente normas y lineamientos vigentes que apliquen al proyecto. Confirma su número, versión, alcance y entidad emisora en una fuente oficial.',
        ejemplo: 'Norma o lineamiento: [identificador y versión confirmados] · Aplicación al proyecto: [descripción].'
      }
    ],
    checklist: [
      'Las fuentes citadas existen, son pertinentes y tienen datos bibliográficos verificables.',
      'Las normas mencionadas se confirmaron en fuentes oficiales y aplican al proyecto.',
      'El marco teórico sustenta la metodología propuesta en el paso siguiente.'
    ],
    ejemploModelo: {
      titulo: 'Estructura para completar con fuentes verificadas',
      texto: 'Antecedente: [fuente verificada y relación con el proyecto].\n\nNorma o lineamiento: [fuente oficial, versión vigente y requisito aplicable].'
    }
  },
  metodologia: {
    titulo: 'Metodología, Diseño Experimental y Fases',
    badge: 'Paso 6 · Cómo se desarrollará',
    referenciaEjemplo: {
      fuente: 'Formato Proyecto Capacidad Instalada · CAP-14-2026',
      secciones: ['7. Metodología'],
      nota: 'La muestra describe el enfoque, la población, las técnicas de recolección y las pruebas con usuarios; organiza el método que realmente seguirá este proyecto.'
    },
    queInformacionAgregar: [
      {
        campo: 'Enfoque de investigación y tipo de estudio',
        instruccion: 'Describe el enfoque y tipo de estudio que correspondan al método y a los objetivos. Usa la clasificación solicitada por la convocatoria, si aplica.',
        ejemplo: 'Enfoque: [descripción sustentada] · Tipo de estudio: [clasificación requerida, si aplica].'
      },
      {
        campo: 'Población, muestra o unidades experimentales',
        instruccion: 'Identifica la población, muestra o unidades de análisis que realmente contempla el proyecto. Sustenta cantidades y criterios de selección.',
        ejemplo: 'Población o unidades: [definición] · Cantidad: [dato sustentado, si está disponible].'
      },
      {
        campo: 'Técnicas de recolección y análisis',
        instruccion: 'Describe las técnicas, instrumentos y procedimientos de análisis que el proyecto realmente propone. Indica las fuentes o protocolos aplicables.',
        ejemplo: 'Técnica: [método] · Instrumento: [si aplica] · Análisis: [procedimiento sustentado].'
      },
      {
        campo: 'Fases del proyecto',
        instruccion: 'Ordena las actividades necesarias para alcanzar los objetivos. Usa fases solo si corresponden al método y al cronograma aprobados.',
        ejemplo: 'Fase 1: [actividad y resultado] · Fase 2: [actividad y resultado] · Fase 3: [actividad y resultado, si aplica].'
      }
    ],
    checklist: [
      'El enfoque y el tipo de estudio se justifican a partir de los objetivos y el método.',
      'La población, las muestras y las cantidades tienen sustento metodológico.',
      'Las actividades se relacionan con los objetivos y el cronograma del proyecto.'
    ],
    ejemploModelo: {
      titulo: 'Estructura para completar con el método aprobado',
      texto: 'Actividad 1: [procedimiento y resultado].\nActividad 2: [procedimiento y resultado].\nValidación: [criterios y evidencias definidos por el proyecto, si aplica].'
    }
  },
  recursos: {
    titulo: 'Presupuesto por Rubros y Cronograma de Actividades',
    badge: 'Paso 8 · Recursos y tiempos',
    referenciaEjemplo: {
      fuente: 'Formato Proyecto Capacidad Instalada · CAP-14-2026',
      secciones: ['9. Cronograma'],
      nota: 'El cronograma aparece después de los resultados. El presupuesto se registra como dato complementario de la aplicación y debe coincidir con la fuente aprobada.'
    },
    queInformacionAgregar: [
      {
        campo: 'Rubros del presupuesto',
        instruccion: 'Usa las categorías y conceptos del presupuesto aprobado y del formato vigente de la convocatoria. La aplicación no determina la elegibilidad de un gasto.',
        ejemplo: 'Rubro: [categoría del formato vigente] · Concepto: [descripción sustentada] · Valor: [valor aprobado].'
      },
      {
        campo: 'Balance y coherencia presupuestal',
        instruccion: 'Contrasta el desglose con el presupuesto total que aparece en la fuente aprobada. La validación aritmética de la aplicación no confirma la elegibilidad ni la aprobación de los valores.',
        ejemplo: 'Total del desglose: [valor calculado] · Total aprobado: [valor de la fuente].'
      },
      {
        campo: 'Cronograma de actividades y entregables',
        instruccion: 'Relaciona las actividades con los períodos, responsables y entregables del cronograma aprobado. Usa la unidad de tiempo exigida por el formato vigente.',
        ejemplo: 'Actividad: [actividad confirmada] · Período: [según cronograma] · Responsable: [asignado] · Entregable: [verificable].'
      }
    ],
    checklist: [
      'Los conceptos presupuestales están justificados y respaldados por la fuente aprobada.',
      'La suma del desglose coincide con el total documentado; la elegibilidad debe confirmarse aparte.',
      'Las actividades, períodos, responsables y entregables coinciden con el cronograma aprobado.'
    ],
    ejemploModelo: {
      titulo: 'Estructura para contrastar presupuesto y cronograma',
      texto: 'Presupuesto: [rubros y valores de la fuente aprobada].\nTotal: [valor confirmado].\n\nCronograma: [actividades, períodos, responsables y entregables aprobados].'
    }
  },
  resultados: {
    titulo: 'Resultados, productos e impactos esperados',
    badge: 'Paso 7 · Resultados esperados',
    referenciaEjemplo: {
      fuente: 'Formato Proyecto Capacidad Instalada · CAP-14-2026',
      secciones: ['8. Resultados esperados'],
      nota: 'La muestra presenta resultados esperados después de la metodología y antes del cronograma. Distingue las expectativas de los logros que se comprueben durante la ejecución.'
    },
    queInformacionAgregar: [
      {
        campo: 'Resultados esperados',
        instruccion: 'Describe los productos o cambios previstos y su relación con los objetivos. Incluye indicadores, metas, unidades y medios de verificación cuando estén definidos.',
        ejemplo: 'Resultado: [descripción prevista] · Indicador: [si está definido] · Meta: [valor y unidad confirmados] · Verificación: [soporte previsto].'
      },
      {
        campo: 'Impactos previstos',
        instruccion: 'Describe los impactos que tengan relación con los objetivos y puedan sustentarse. No presentes beneficios, porcentajes o población como hechos si son proyecciones sin validar.',
        ejemplo: 'Impacto esperado: [descripción] · Población o proceso: [dato confirmado] · Indicador: [si está definido].'
      }
    ],
    checklist: [
      'Los resultados previstos responden a los objetivos del proyecto.',
      'Los indicadores, metas, unidades y soportes corresponden a la información aprobada.',
      'Los impactos esperados se distinguen de resultados comprobados.'
    ],
    ejemploModelo: {
      titulo: 'Estructura para completar con compromisos aprobados',
      texto: 'Producto o resultado: [descripción confirmada].\nClasificación: [solo si se requiere].\nMeta e indicador: [según fuente aprobada].\nEvidencia prevista: [soporte correspondiente].'
    }
  },
  referencias: {
    titulo: 'Referencias',
    badge: 'Paso 9 · Fuentes consultadas',
    referenciaEjemplo: {
      fuente: 'Formato Proyecto Capacidad Instalada · CAP-14-2026',
      secciones: ['10. Referencias'],
      nota: 'La muestra cierra el contenido del proyecto con sus referencias. Incluye las fuentes que citaste en la formulación y verifica sus datos.'
    },
    queInformacionAgregar: [
      {
        campo: 'Referencias bibliográficas y documentales',
        instruccion: 'Relaciona las fuentes que consultaste y citaste en los apartados anteriores. Registra autor o entidad, título, año y un enlace o identificador cuando exista.',
        ejemplo: 'Autor o entidad. (Año). Título. Editorial o sitio. [Enlace o identificador, si existe].'
      }
    ],
    checklist: [
      'Cada fuente citada en el texto aparece en la lista de referencias.',
      'Los datos bibliográficos permiten identificar y consultar las fuentes.'
    ],
    ejemploModelo: {
      titulo: 'Registro de una fuente',
      texto: 'Autor o entidad. (Año). Título de la fuente. Editorial o sitio. [Enlace o identificador, si existe].'
    }
  },
  generar: {
    titulo: 'Consolidación, revisión y descarga de borradores',
    badge: 'Paso 10 · Revisión y preparación',
    referenciaEjemplo: {
      fuente: 'Formato Proyecto Capacidad Instalada · CAP-14-2026',
      secciones: [],
      nota: 'La revisión y la generación de borradores son funciones de la aplicación; no corresponden a apartados del documento de ejemplo.'
    },
    queInformacionAgregar: [
      {
        campo: 'Revisión de la formulación',
        instruccion: 'Revisa los campos que la aplicación marca como pendientes y comprueba la coherencia entre el presupuesto, los objetivos y las fuentes del proyecto. Esta revisión no valida requisitos externos ni confirma la vigencia del formato.',
        ejemplo: 'Campos configurados completos; falta validar los requisitos de la convocatoria.'
      },
      {
        campo: 'Generación de borradores Word (.docx) y PowerPoint (.pptx)',
        instruccion: 'Genera borradores editables con la información registrada y compáralos con el formato vigente de la convocatoria. Confirma con la coordinación si su estructura sirve para presentar el proyecto.',
        ejemplo: 'Borrador de formulación (.docx) y presentación de apoyo (.pptx).'
      },
      {
        campo: 'Revisión, firmas y presentación',
        instruccion: 'La aplicación no gestiona firmas ni radica el proyecto. Confirma responsables, requisitos y canal de presentación con la convocatoria; si corresponde, carga la copia final aprobada y la constancia en el Expediente.',
        ejemplo: 'Requisitos y responsables confirmados; versión revisada y constancia anexada cuando aplique.'
      }
    ],
    checklist: [
      'Todos los pasos metodológicos se encuentran completos y verificados.',
      'Se generaron las versiones preliminares en Word y PowerPoint.',
      'Se descargaron los borradores necesarios para revisión y se contrastaron con los requisitos vigentes.'
    ],
    ejemploModelo: {
      titulo: 'Verificaciones antes de presentar',
      texto: 'Antes de presentar el proyecto:\n1. Confirma con la convocatoria el formato, el código y los campos requeridos.\n2. Contrasta presupuesto, fechas y cifras con las fuentes del proyecto y resuelve las diferencias.\n3. Adjunta los soportes que exige la convocatoria y que hayan aprobado sus responsables.\n4. Tramita la revisión y las firmas por el canal vigente; carga la versión final y la constancia en el Expediente cuando corresponda.'
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
    ejemploModelo: { titulo: 'Orientación general', texto: 'Diligencia los campos solicitados.' }
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
