/**
 * Catálogo interno de modelos de referencia SENNOVA CGAO
 * Centro de Gestión Agroempresarial y del Oriente - SENA Regional Santander
 */

const FORMATOS_REFERENCIA = [
  {
    id: 'GTH-F-074',
    codigo: 'GTH-F-074 (V04)',
    titulo: 'Informe Mensual de Actividades e Informe Técnico SENNOVA',
    categoria: 'contractual',
    categoriaLabel: 'Gestión Contractual & Técnica',
    color: 'emerald',
    extension: 'docx',
    version: '4.0',
    descripcion: 'Modelo interno para organizar el reporte mensual de actividades y avances técnicos.',
    aplicaA: 'Investigadores, Instructores y Contratistas SENNOVA',
    requisitos: ['Bitácora de actividades', 'Soportes de entregables', 'Firma digital o manuscrita'],
    isSmartTemplate: true,
    smartType: 'monthly_report',
    templateContent: `SERVICIO NACIONAL DE APRENDIZAJE SENA
SISTEMA INTEGRADO DE GESTIÓN Y AUTOCONTROL
PROCESO: GESTIÓN DE TALENTO HUMANO / SENNOVA
MODELO INTERNO DE REFERENCIA: INFORME MENSUAL DE ACTIVIDADES E INFORME TÉCNICO
CÓDIGO: GTH-F-074 | VERSIÓN: 04

1. INFORMACIÓN GENERAL
- Centro de Formación: Centro de Gestión Agroempresarial y del Oriente - CGAO Vélez
- Regional: Santander
- Nombre del Contratista / Investigador: [NOMBRE_INVESTIGADOR]
- Documento de Identidad: [DOCUMENTO]
- Rol SENNOVA: [ROL_SENNOVA]
- Periodo Reportado: [PERIODO_MES_AÑO]
- Proyecto Asociado (SGPS): [CODIGO_SGPS] - [NOMBRE_PROYECTO]

2. OBLIGACIONES CONTRACTUALES Y ACTIVIDADES EJECUTADAS
[Detalle de actividades realizadas en el mes según minuta contractual y plan de trabajo de investigación]

3. RESULTADOS TÉCNICOS Y ENTREGABLES ALCANZADOS
- Hitos de Cronograma completados: [HITOS]
- Productos de CTeI avanzados o concluidos: [PRODUCTOS]
- Participación de aprendices semilleristas tutorados: [APRENDICES]

4. BALANCE DE HORAS Y DEDICACIÓN
- Total horas del mes ejecutadas: [HORAS] horas
- Porcentaje de avance técnico: [PORCENTAJE]%

5. FIRMAS DE CONFORMIDAD
_____________________________                  _____________________________
[NOMBRE_INVESTIGADOR]                          LÍDER SENNOVA / SUPERVISOR
Investigador / Contratista                     CGAO - SENA Regional Santander`
  },
  {
    id: 'F-023-PE-04',
    codigo: 'F-023-PE-04 (V03)',
    titulo: 'Planeación, Seguimiento y Evaluación de Etapa Productiva (Semilleristas)',
    categoria: 'semilleros',
    categoriaLabel: 'Investigación Formativa & Semilleros',
    color: 'blue',
    extension: 'docx',
    version: '3.0',
    descripcion: 'Modelo interno para organizar la planeación y el seguimiento de etapa productiva.',
    aplicaA: 'Líderes de Semillero, Tutores y Aprendices',
    requisitos: ['Ficha de caracterización', 'Plan de concertación', 'Bitácoras quincenales'],
    isSmartTemplate: true,
    smartType: 'etapa_productiva',
    templateContent: `SERVICIO NACIONAL DE APRENDIZAJE SENA
DIRECCIÓN DE FORMACIÓN PROFESIONAL
FORMATO DE PLANEACIÓN, SEGUIMIENTO Y EVALUACIÓN DE ETAPA PRODUCTIVA
CÓDIGO: F-023-PE-04 | CENTRO CGAO VÉLEZ

1. DATOS DEL APRENDIZ
- Nombre: [NOMBRE_APRENDIZ]
- Documento: [DOCUMENTO]
- Ficha: [FICHA]
- Programa de Formación: [PROGRAMA]
- Semillero de Investigación: [NOMBRE_SEMILLERO] (SIACF / SEMIPROVEL / SIAMB)
- Modalidad: Proyecto de Innovación y Desarrollo Tecnológico SENNOVA

2. CONCERTACIÓN DE ACTIVIDADES
[Definición de actividades de investigación aplicada y desarrollo experimental a ejecutar durante la etapa práctica]

3. SEGUIMIENTO DE BITÁCORAS QUINCENALES
[Registro de cumplimiento de bitácoras técnicas y avances en prototipos, ensayos de campo o desarrollo de software]

4. EVALUACIÓN Y JUICIO DE EVALUACIÓN
- Desempeño Técnico: APROBADO ( ) NO APROBADO ( )
- Actitudinal y Compromiso: APROBADO ( ) NO APROBADO ( )

Firmas:
_____________________________                  _____________________________
Instructor Tutor / Investigador               Aprendiz Semillerista CGAO`
  },
  {
    id: 'SGPS-IDI-2025',
    codigo: 'SGPS-IDi-2025',
    titulo: 'Plantilla Maestra de Formulación de Proyectos I+D+i (SGPS / SIGP)',
    categoria: 'formulacion',
    categoriaLabel: 'Formulación & Convocatorias',
    color: 'indigo',
    extension: 'docx',
    version: '2025.1',
    descripcion: 'Estructura interna de referencia para organizar componentes de formulación de proyectos I+D+i.',
    aplicaA: 'Investigadores Principales y Coinvestigadores',
    requisitos: ['Alineación con líneas CGAO', 'Presupuesto detallado', 'Cronograma de entregables'],
    isSmartTemplate: false,
    templateContent: `SISTEMA DE GESTIÓN DE PROYECTOS SENNOVA (SGPS)
PLANTILLA DE FORMULACIÓN TÉCNICA DE PROYECTOS I+D+i - CGAO

1. RESUMEN EJECUTIVO DEL PROYECTO
- Título del Proyecto: [TITULO_COMPLETO]
- Centro de Formación: Centro de Gestión Agroempresarial y del Oriente - CGAO Vélez
- Línea Programática: Línea 66 / Línea 23 / Línea 82
- Semillero / Grupo de Investigación: Grupo de Innovación CGAO

2. ÁRBOL DE PROBLEMAS Y JUSTIFICACIÓN
- Problema Central:
- Causas Directas e Indirectas:
- Efectos e Impactos en la Provincia de Vélez:
- Justificación y Estado del Arte:

3. OBJETIVOS
- Objetivo General:
- Objetivos Específicos:
  1.
  2.
  3.

4. METODOLOGÍA Y DISEÑO EXPERIMENTAL
[Descripción de fases metodológicas, población objeto, pruebas de laboratorio, trabajo de campo y análisis de datos]

5. RESULTADOS ESPERADOS Y PRODUCTOS MINCIENCIAS
- Generación de Nuevo Conocimiento:
- Desarrollo Tecnológico e Innovación (Software, Prototipos, Diseños):
- Apropiación Social del Conocimiento y Divulgación:
- Formación de Talento Humano (Aprendices Semilleristas):

6. PRESUPUESTO DESAGREGADO POR RUBROS
- Materiales y Suministros: $
- Servicios Tecnológicos: $
- Viáticos y Salidas de Campo: $
- Software y Equipamiento: $`
  },
  {
    id: 'PI-CGAO-01',
    codigo: 'PI-CGAO-01',
    titulo: 'Acuerdo de Confidencialidad y Cesión de Derechos Patrimoniales de PI',
    categoria: 'legal',
    categoriaLabel: 'Propiedad Intelectual & Legal',
    color: 'amber',
    extension: 'docx',
    version: '2.0',
    descripcion: 'Documento vinculante de confidencialidad y cesión patrimonial sobre software, patentes, diseños y obras protegidas generadas en el marco de SENNOVA CGAO.',
    aplicaA: 'Todo el personal ejecutor (Investigadores, Instructores y Aprendices)',
    requisitos: ['Firma previa al inicio del proyecto', 'Registro de titularidad SENA'],
    isSmartTemplate: false,
    templateContent: `ACUERDO DE CONFIDENCIALIDAD, NO DIVULGACIÓN Y CESIÓN DE DERECHOS PATRIMONIALES
CENTRO DE GESTIÓN AGROEMPRESARIAL Y DEL ORIENTE - CGAO VÉLEZ
SISTEMA SENNOVA - SERVICIO NACIONAL DE APRENDIZAJE SENA

Entre los suscritos, el SERVICIO NACIONAL DE APRENDIZAJE - SENA (CGAO Vélez) y el integrante del equipo de investigación:
Nombre: [NOMBRE_INTEGRANTE]
Documento: [DOCUMENTO]
Calidad: ( ) Investigador Principal  ( ) Coinvestigador  ( ) Aprendiz Semillerista

CLÁUSULA PRIMERA - OBJETO: El presente acuerdo regula el manejo de información confidencial, secretos industriales y la cesión de derechos patrimoniales sobre los resultados, software, bases de datos, diseños y modelos de utilidad generados durante la ejecución del proyecto: "[NOMBRE_PROYECTO]".

CLÁUSULA SEGUNDA - TITULARIDAD: De conformidad con la Ley 23 de 1982 y la Decisión Andina 351 de 1993, los derechos morales corresponden a los autores, mientras que los derechos patrimoniales radicarán en cabeza del SENA.

CLÁUSULA TERCERA - CONFIDENCIALIDAD: Las partes se comprometen a no divulgar, reproducir ni transferir a terceros información técnica reservada sin previa autorización escrita del Comité SENNOVA CGAO.`
  },
  {
    id: 'ACTA-INI-SENN',
    codigo: 'ACTA-INI-SENN',
    titulo: 'Modelo de Acta de Inicio y Socialización de Proyecto I+D+i',
    categoria: 'proyectos',
    categoriaLabel: 'Gestión de Proyectos',
    color: 'sky',
    extension: 'docx',
    version: '2.1',
    descripcion: 'Acta formal de instalación del equipo de trabajo, asignación de responsabilidades, validación de presupuesto asignado y socialización con el centro CGAO.',
    aplicaA: 'Investigador Principal, Coinvestigadores y Subdirección CGAO',
    requisitos: ['Aprobación SGPS', 'Resolución de asignación presupuestal'],
    isSmartTemplate: false,
    templateContent: `ACTA DE INICIO Y SOCIALIZACIÓN DE PROYECTO SENNOVA
CENTRO DE GESTIÓN AGROEMPRESARIAL Y DEL ORIENTE - CGAO VÉLEZ

Fecha: [FECHA_ACTUAL]
Lugar: Instalaciones CGAO Vélez / Sala de Juntas SENNOVA

1. INFORMACIÓN DEL PROYECTO
- Código SGPS: [CODIGO_SGPS]
- Nombre del Proyecto: [NOMBRE_PROYECTO]
- Vigencia: [VIGENCIA] meses
- Presupuesto Aprobado: $[PRESUPUESTO_TOTAL] COP

2. ASISTENTES Y EQUIPO EJECUTOR
- [NOMBRE_IP] - Investigador Principal
- [NOMBRE_CO1] - Coinvestigador
- [NOMBRE_APRENDICES] - Aprendices Semilleristas
- Subdirector de Centro CGAO / Líder SENNOVA

3. COMPROMISOS ACORDADOS
- Cumplimiento de entregables en las fechas pactadas en el cronograma.
- Carga periódica de bitácoras firmadas en la plataforma SENNOVA CGAO.
- Gestión oportuna de compras y rubros presupuestales asignados.`
  },
  {
    id: 'ACTA-COM-SEM',
    codigo: 'ACTA-COM-SEM',
    titulo: 'Formato de Acta de Comité Técnico y Reunión de Semillero',
    categoria: 'semilleros',
    categoriaLabel: 'Investigación Formativa & Semilleros',
    color: 'blue',
    extension: 'docx',
    version: '1.5',
    descripcion: 'Plantilla para documentar sesiones periódicas de semilleros (SIACF, SEMIPROVEL, SIAMB), acuerdos técnicos, asignación de tareas y revisión de bitácoras.',
    aplicaA: 'Líderes de Semillero y Aprendices',
    requisitos: ['Listado de asistencia', 'Registro de compromisos'],
    isSmartTemplate: false,
    templateContent: `ACTA DE COMITÉ TÉCNICO / REUNIÓN PERIÓDICA DE SEMILLERO
CENTRO CGAO VÉLEZ - SENA REGIONAL SANTANDER

Semillero: [NOMBRE_SEMILLERO]
Fecha: [FECHA] | Hora Inicio: [HORA_INI] | Hora Fin: [HORA_FIN]
Líder / Tutor: [LIDER_SEMILLERO]

ORDEN DEL DÍA:
1. Verificación de asistencia.
2. Revisión de avances en bitácoras técnicas de la quincena.
3. Asignación de tareas experimentales y de desarrollo.
4. Varios y compromisos para la próxima sesión.

DESARROLLO DE LA REUNIÓN Y COMPROMISOS:
[Registro de intervenciones y tareas asignadas con fecha de entrega]`
  },
  {
    id: 'PPT-CGAO-CTEI',
    codigo: 'PPT-CGAO-CTeI',
    titulo: 'Estructura de presentación y ponencias CGAO (referencia interna)',
    categoria: 'divulgacion',
    categoriaLabel: 'Divulgación & Apropiación Social',
    color: 'purple',
    extension: 'pptx',
    version: '2025',
    descripcion: 'Estructura interna de referencia para presentaciones de proyectos; no incluye una plantilla institucional controlada.',
    aplicaA: 'Ponentes, Investigadores y Semilleristas en eventos CTeI',
    requisitos: ['Confirmar lineamientos de identidad visual vigentes', 'Estructura I+D+i de referencia'],
    isSmartTemplate: false,
    templateContent: `MODELO INTERNO DE ESTRUCTURA PARA PRESENTACIÓN - SENNOVA CGAO VÉLEZ

Estructura de Diapositivas Recomendada:
1. Portada Institucional (Logo SENA, SENNOVA, CGAO Vélez, Título, Autores, Semillero/Grupo).
2. Introducción y Contexto Regional (Provincia de Vélez / Santander).
3. Planteamiento del Problema y Justificación.
4. Objetivos del Proyecto.
5. Metodología y Desarrollo Experimental.
6. Resultados Clave y Productos Obtenidos (Gráficas, Prototipos, Tablas).
7. Impacto en el Sector Productivo y Transferencia Tecnológica.
8. Conclusiones y Trabajo Futuro.
9. Agradecimientos y Contacto Institucional.`
  },
  {
    id: 'GTH-F-088-CGAO',
    codigo: 'GTH-F-088-CGAO',
    titulo: 'Formato de Solicitud de Salidas de Campo / Viáticos y Misiones Técnicas',
    categoria: 'logistica',
    categoriaLabel: 'Logística & Salidas de Campo',
    color: 'amber',
    extension: 'xlsx',
    version: '3.0',
    descripcion: 'Solicitud formal y justificación técnica para misiones de campo agropecuarias, visitas a fincas demostrativas y muestreos en municipios de la provincia de Vélez.',
    aplicaA: 'Investigadores e Instructores ejecutores de trabajo de campo',
    requisitos: ['Plan de salida de campo', 'Itinerario detallado', 'Visto bueno del Líder SENNOVA'],
    isSmartTemplate: false,
    templateContent: `SERVICIO NACIONAL DE APRENDIZAJE SENA - CGAO VÉLEZ
SOLICITUD Y LEGALIZACIÓN DE SALIDAS DE CAMPO SENNOVA

1. INFORMACIÓN DE LA MISIÓN
- Proyecto Asociado: [NOMBRE_PROYECTO]
- Investigador Responsable: [INVESTIGADOR]
- Municipio(s) Destino: (Vélez, Barbosa, Puente Nacional, Guavatá, Chipatá, La Paz, San Benito, Sucre, Bolívar)
- Fecha Salida: [FECHA_SALIDA] | Fecha Retorno: [FECHA_RETORNO]

2. JUSTIFICACIÓN TÉCNICA
[Objetivo del muestreo, recolección de datos agronómicos/ambientales o pruebas en campo]

3. CRONOGRAMA DE ACTIVIDADES EN CAMPO
- Día 1:
- Día 2:

4. ITINERARIO Y PRESUPUESTO ESTIMADO DE VIÁTICOS Y TRANSPORTE`
  },
  {
    id: 'INF-FINAL-CGAO',
    codigo: 'INF-FINAL-CGAO',
    titulo: 'Plantilla de Informe Técnico Final / Cierre de Proyecto SENNOVA',
    categoria: 'proyectos',
    categoriaLabel: 'Cierre & Entregables',
    color: 'rose',
    extension: 'docx',
    version: '4.0',
    descripcion: 'Documento maestro de liquidación y cierre técnico de proyectos SENNOVA, compilación de productos generados, impacto alcanzado y lecciones aprendidas.',
    aplicaA: 'Investigadores Principales',
    requisitos: ['100% de entregables cargados', 'Soportes de productos Minciencias'],
    isSmartTemplate: true,
    smartType: 'informe_final',
    templateContent: `SISTEMA DE INVESTIGACIÓN SENNOVA - CENTRO CGAO VÉLEZ
INFORME FINAL DE LIQUIDACIÓN Y CIERRE TÉCNICO DE PROYECTO

1. RESUMEN DEL PROYECTO
- Código SGPS: [CODIGO_SGPS]
- Título: [TITULO_PROYECTO]
- Investigador Principal: [INVESTIGADOR_PRINCIPAL]
- Vigencia de Ejecución: [VIGENCIA] meses

2. CUMPLIMIENTO DE OBJETIVOS ESPECÍFICOS Y ENTREGABLES
[Tabla comparativa de objetivos formulados vs resultados técnicos alcanzados]

3. BALANCE DE PRODUCTOS DE CIENCIA, TECNOLOGÍA E INNOVACIÓN (MINCIENCIAS)
- Artículos / Ponencias:
- Desarrollos de Software / Prototipos Tecnológicos:
- Manuales, Guías y Cartillas Técnicas:
- Aprendices Certificados en Semilleros:

4. IMPACTO SOCIOECONÓMICO EN LA REGIÓN DE VÉLEZ
[Beneficiarios directos, productores capacitados, asociaciones campesinas o empresas impactadas]

5. FIRMAS DE APROBACIÓN Y CIERRE
_____________________________                  _____________________________
Investigador Principal                         Subdirector CGAO / Líder SENNOVA`
  },
  {
    id: 'GUIA-MINCIENCIAS-2025',
    codigo: 'GUIA-MINCIENCIAS-2025',
    titulo: 'Guía de Tipologías de Productos y Evidencias Válidas Minciencias',
    categoria: 'minciencias',
    categoriaLabel: 'Minciencias & Normatividad CTeI',
    color: 'teal',
    extension: 'pdf',
    version: '2024-2025',
    descripcion: 'Manual de referencia rápida con requisitos mínimos y soportes requeridos para validar productos en CvLAC y GrupLAC según el modelo Minciencias.',
    aplicaA: 'Todos los Investigadores e Integrantes de Grupos CTeI',
    requisitos: ['Consulta previa al registro en plataformas'],
    isSmartTemplate: false,
    templateContent: `MINISTERIO DE CIENCIA, TECNOLOGÍA E INNOVACIÓN - MINCIENCIAS
GUÍA RÁPIDA DE TIPOLOGÍAS Y EVIDENCIAS VÁLIDAS PARA SENNOVA CGAO

1. GENERACIÓN DE NUEVO CONOCIMIENTO (GNC)
- Artículos en Revistas Indexadas (Publindex / Scopus / WoS): DOI, PDF de publicación, afiliación institucional SENA.
- Libros resultado de investigación: ISBN, evaluación por pares ciegos, constancia editorial.
- Capítulos de libro: ISBN, tabla de contenido, certificado editorial.

2. DESARROLLO TECNOLÓGICO E INNOVACIÓN (DTI)
- Software Registrado: Registro de soporte lógico ante la DNDA, manual de usuario, manual técnico, código fuente depositado.
- Prototipos Industriales: Ficha técnica de validación en entorno operativo (TRL 5-7), planos, acta de validación con usuario final.
- Diseños Industriales / Modelos de Utilidad: Solicitud o concesión de patente ante la SIC.

3. APROPIACIÓN SOCIAL DEL CONOCIMIENTO (ASC)
- Eventos Científicos: Certificado de ponente, memorias del evento con ISBN/ISSN, presentación.
- Informes Técnicos Finales: Documento aprobado por la subdirección del centro y cargado al repositorio.
- Estrategias de Comunicación y Divulgación: Cartillas, boletines, material audiovisual registrado.

4. FORMACIÓN DE RECURSO HUMANO (FRH)
- Tutoría de Semilleristas: Certificado de vinculación al semillero CGAO con intensidad horaria y proyecto asignado.`
  }
];

export const SENNOVA_FORMATS = FORMATOS_REFERENCIA.map((formato) => ({
  ...formato,
  extensionReferencia: formato.extension,
  extension: 'html',
  versionReferencia: formato.version,
  version: null,
  validacionInstitucional: 'Pendiente de validación institucional',
  descripcion: 'Modelo de referencia generado por la plataforma. No se ha contrastado con la versión vigente del repositorio documental institucional.',
  aplicaA: 'Aplicabilidad por confirmar con la Coordinación SENNOVA.',
  requisitos: [],
}));

/**
 * Construye un archivo HTML de referencia. El catálogo no contiene plantillas
 * institucionales controladas en formato DOCX, XLSX, PPTX o PDF.
 */
export const buildFormatDownloadArtifact = (formato) => {
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
  const identifier = [formato.id, formato.codigo]
    .filter(Boolean)
    .join('_')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'modelo_referencia';
  const version = formato.versionReferencia ?? formato.version;
  const versionLine = version
    ? `<p>Versión declarada en el modelo, pendiente de validar: ${escapeHtml(version)}</p>`
    : '';
  const legalNotice = formato.categoria === 'legal'
    ? '<p class="notice"><strong>Borrador sin revisión jurídica.</strong> No lo firme ni lo use para ceder derechos hasta que lo revise el área jurídica y confirme que corresponde al proyecto y al formato institucional vigente.</p>'
    : '';
  const content = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(formato.titulo)}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; margin: 2rem; color: #17212b; }
  .notice { border: 1px solid #b7791f; padding: 1rem; background: #fffaf0; }
  pre { white-space: pre-wrap; font: inherit; }
</style>
</head>
<body>
  <p class="notice"><strong>Modelo de referencia sin validación institucional.</strong> Su vigencia está pendiente de confirmación. Confirme el código y la versión con la Coordinación SENNOVA antes de usar este contenido para radicar o reportar.</p>
  ${legalNotice}
  <h1>${escapeHtml(formato.titulo)}</h1>
  <p>Identificador de referencia sin validar: ${escapeHtml(formato.codigo)}</p>
  ${versionLine}
  <pre>${escapeHtml(formato.templateContent)}</pre>
</body>
</html>`;

  return {
    fileName: `${identifier}.html`,
    mimeType: 'text/html;charset=utf-8',
    content,
  };
};

export const downloadFormatTemplate = (formato) => {
  const artifact = buildFormatDownloadArtifact(formato);
  const blob = new Blob([artifact.content], { type: artifact.mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', artifact.fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
