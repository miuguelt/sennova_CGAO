/**
 * Catálogo y Definición de Formatos Oficiales SENNOVA CGAO
 * Centro de Gestión Agroempresarial y del Oriente - SENA Regional Santander
 */

export const SENNOVA_FORMATS = [
  {
    id: 'GTH-F-074',
    codigo: 'GTH-F-074 (V04)',
    titulo: 'Informe Mensual de Actividades e Informe Técnico SENNOVA',
    categoria: 'contractual',
    categoriaLabel: 'Gestión Contractual & Técnica',
    color: 'emerald',
    extension: 'docx',
    version: '4.0',
    descripcion: 'Formato institucional único para reportar el avance mensual de actividades, horas dedicadas, compromisos contractuales e hitos técnicos en proyectos I+D+i.',
    aplicaA: 'Investigadores, Instructores y Contratistas SENNOVA',
    requisitos: ['Bitácora de actividades', 'Soportes de entregables', 'Firma digital o manuscrita'],
    isSmartTemplate: true,
    smartType: 'monthly_report',
    templateContent: `SERVICIO NACIONAL DE APRENDIZAJE SENA
SISTEMA INTEGRADO DE GESTIÓN Y AUTOCONTROL
PROCESO: GESTIÓN DE TALENTO HUMANO / SENNOVA
FORMATO ÚNICO DE INFORME MENSUAL DE ACTIVIDADES E INFORME TÉCNICO
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
    descripcion: 'Formato obligatorio para concertación de plan de trabajo, seguimiento de bitácoras y evaluación de competencias de aprendices en semilleros de investigación.',
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
    descripcion: 'Estructura oficial para la formulación de proyectos I+D+i: Marco lógico, árbol de problemas, objetivos, metodología, cadena de valor y presupuesto desagregado.',
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
    titulo: 'Plantilla Oficial de Diapositivas y Ponencias CGAO',
    categoria: 'divulgacion',
    categoriaLabel: 'Divulgación & Apropiación Social',
    color: 'purple',
    extension: 'pptx',
    version: '2025',
    descripcion: 'Estructura visual estandarizada con paleta de colores institucional SENA / SENNOVA, logos oficiales del CGAO Vélez y secciones de sustentación de proyectos.',
    aplicaA: 'Ponentes, Investigadores y Semilleristas en eventos CTeI',
    requisitos: ['Uso obligatorio de logos oficiales', 'Estructura I+D+i'],
    isSmartTemplate: false,
    templateContent: `PLANTILLA OFICIAL DE PRESENTACIÓN - SENNOVA CGAO VÉLEZ

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

/**
 * Función para descargar cualquier plantilla oficial como archivo de texto / Word (.doc/.docx compatible)
 */
export const downloadFormatTemplate = (formato) => {
  const isDoc = formato.extension === 'docx' || formato.extension === 'doc';
  const isXls = formato.extension === 'xlsx' || formato.extension === 'xls';
  
  let mimeType = 'text/plain;charset=utf-8';
  let fileContent = formato.templateContent;

  if (isDoc) {
    mimeType = 'application/msword';
    fileContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${formato.titulo}</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5; margin: 40px; }
  h1 { font-size: 16pt; color: #047857; text-align: center; margin-bottom: 5px; }
  h2 { font-size: 13pt; color: #1e293b; border-bottom: 2px solid #047857; padding-bottom: 4px; margin-top: 20px; }
  .header-box { border: 2px solid #047857; padding: 15px; background-color: #f8fafc; margin-bottom: 25px; text-align: center; }
  .meta-tag { font-size: 9pt; color: #64748b; font-weight: bold; }
  pre { background: #f1f5f9; padding: 15px; border-radius: 8px; white-space: pre-wrap; font-family: Calibri, Arial, sans-serif; }
</style>
</head>
<body>
  <div class="header-box">
    <h1>SERVICIO NACIONAL DE APRENDIZAJE - SENA</h1>
    <p style="margin: 2px; font-weight: bold;">CENTRO DE GESTIÓN AGROEMPRESARIAL Y DEL ORIENTE - CGAO VÉLEZ</p>
    <p style="margin: 2px; color: #047857; font-weight: bold;">SISTEMA DE INVESTIGACIÓN, INNOVACIÓN Y DESARROLLO TECNOLÓGICO - SENNOVA</p>
    <p class="meta-tag">CÓDIGO OFICIAL: ${formato.codigo} | VERSIÓN: ${formato.version || '1.0'}</p>
  </div>
  <h2>${formato.titulo.toUpperCase()}</h2>
  <pre>${formato.templateContent}</pre>
</body>
</html>`;
  } else if (isXls) {
    mimeType = 'application/vnd.ms-excel';
    fileContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
  <table>
    <tr><th colspan="4" style="background:#047857;color:white;font-size:14pt;">SENA CGAO VÉLEZ - SENNOVA</th></tr>
    <tr><th colspan="4" style="background:#f1f5f9;color:#334155;">FORMATO OFICIAL: ${formato.titulo} (${formato.codigo})</th></tr>
    <tr><td></td></tr>
    ${formato.templateContent.split('\n').map(line => `<tr><td colspan="4">${line}</td></tr>`).join('')}
  </table>
</body>
</html>`;
  }

  const blob = new Blob([fileContent], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${formato.id}_${formato.codigo.replace(/[^a-zA-Z0-9]/g, '_')}.${formato.extension}`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
