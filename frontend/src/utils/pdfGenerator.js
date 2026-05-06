import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Utilidad para generar documentos PDF oficiales de SENNOVA
 */
export const PDFGenerator = {
  
  /**
   * Genera un certificado de participación para un aprendiz
   */
  generateCertificate: (data) => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const { datos_aprendiz, datos_semillero, fecha_emision, centro } = data;

    // Colores corporativos
    const senaGreen = [16, 185, 129];
    const senaOrange = [255, 107, 0];

    // Fondo y Bordes
    doc.setDrawColor(...senaGreen);
    doc.setLineWidth(1);
    doc.rect(5, 5, 287, 200);
    doc.setLineWidth(0.2);
    doc.rect(7, 7, 283, 196);

    // Encabezado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text('CERTIFICADO DE PARTICIPACIÓN', 148.5, 40, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(100, 116, 139);
    doc.text(centro, 148.5, 50, { align: 'center' });

    // Cuerpo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(16);
    doc.setTextColor(51, 65, 85);
    doc.text('Se otorga el presente reconocimiento a:', 148.5, 75, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(...senaGreen);
    doc.text(datos_aprendiz.nombre, 148.5, 95, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(51, 65, 85);
    doc.text(`Identificado(a) con documento No. ${datos_aprendiz.documento}`, 148.5, 105, { align: 'center' });

    doc.setFontSize(16);
    const textoParticipacion = `Por su destacada participación en el semillero de investigación:`;
    doc.text(textoParticipacion, 148.5, 125, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text(datos_semillero.nombre, 148.5, 140, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(`Vinculado(a) desde: ${datos_semillero.fecha_ingreso} | Intensidad: ${datos_semillero.horas} horas`, 148.5, 150, { align: 'center' });

    // Fecha
    doc.setFontSize(10);
    doc.text(`Expedido en Vélez, Santander el día ${fecha_emision}`, 148.5, 170, { align: 'center' });

    // Firmas (Simuladas)
    doc.setDrawColor(200, 200, 200);
    doc.line(60, 185, 120, 185);
    doc.line(170, 185, 230, 185);

    doc.setFontSize(10);
    doc.text(data.firmas[0].nombre, 90, 190, { align: 'center' });
    doc.text(data.firmas[0].rol, 90, 194, { align: 'center' });

    doc.text(data.firmas[1].nombre, 200, 190, { align: 'center' });
    doc.text(data.firmas[1].rol, 200, 194, { align: 'center' });

    doc.save(`Certificado_${datos_aprendiz.nombre.replace(' ', '_')}.pdf`);
  },

  /**
   * Genera un reporte mensual de actividad
   */
  generateMonthlyReport: (data) => {
    const doc = new jsPDF();
    const { investigador, periodo, resumen, detalle_actividades } = data;

    // Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(16, 185, 129);
    doc.text('REPORTE MENSUAL DE ACTIVIDADES', 105, 20, { align: 'center' });

    // Info General
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text(`Periodo: ${periodo}`, 20, 35);
    doc.text(`Investigador: ${investigador.nombre}`, 20, 42);
    doc.text(`Documento: ${investigador.documento}`, 20, 49);

    // Resumen Ejecutivo (Cuadro)
    doc.setFillColor(248, 250, 252);
    doc.rect(20, 60, 170, 30, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('RESUMEN EJECUTIVO', 25, 70);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Proyectos Activos: ${resumen.proyectos_activos}`, 25, 78);
    doc.text(`Productos Generados: ${resumen.productos_generados}`, 80, 78);
    doc.text(`Cumplimiento Total: ${resumen.cumplimiento}%`, 140, 78);

    // Tabla de Actividades
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('DETALLE DE ACTIVIDADES', 20, 105);

    doc.autoTable({
      startY: 110,
      head: [['Fecha', 'Acción', 'Descripción']],
      body: detalle_actividades.map(a => [a.fecha, a.accion, a.desc]),
      headStyles: { fillColor: [16, 185, 129] },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      styles: { fontSize: 9 }
    });

    // Metas
    const finalY = doc.lastAutoTable.finalY || 150;
    doc.setFont('helvetica', 'bold');
    doc.text('PRÓXIMAS METAS Y COMPROMISOS', 20, finalY + 15);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    data.metas_proximo_mes.forEach((meta, index) => {
      doc.text(`• ${meta}`, 25, finalY + 25 + (index * 7));
    });

    doc.save(`Reporte_${periodo.replace(' ', '_')}_${investigador.nombre.replace(' ', '_')}.pdf`);
  },

  /**
   * Genera un certificado de participación para un integrante de proyecto
   */
  generateProjectCertificate: (data) => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const { datos_usuario, datos_proyecto, fecha_emision, centro } = data;

    // Colores corporativos
    const senaGreen = [16, 185, 129];
    const senaBlue = [30, 41, 59];

    // Fondo y Bordes
    doc.setDrawColor(...senaGreen);
    doc.setLineWidth(1);
    doc.rect(5, 5, 287, 200);
    doc.setLineWidth(0.2);
    doc.rect(7, 7, 283, 196);

    // Encabezado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...senaBlue);
    doc.text('CERTIFICADO DE PARTICIPACIÓN EN PROYECTO', 148.5, 40, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(100, 116, 139);
    doc.text(centro, 148.5, 50, { align: 'center' });

    // Cuerpo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(16);
    doc.setTextColor(51, 65, 85);
    doc.text('El Sistema de Investigación, Innovación y Desarrollo Tecnológico - SENNOVA, otorga el presente reconocimiento a:', 148.5, 75, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(...senaGreen);
    doc.text(datos_usuario.nombre, 148.5, 95, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(51, 65, 85);
    doc.text(`Identificado(a) con documento No. ${datos_usuario.documento}`, 148.5, 105, { align: 'center' });

    doc.setFontSize(16);
    doc.text(`Por su valiosa contribución como ${datos_usuario.rol.toUpperCase()} en el proyecto de investigación:`, 148.5, 125, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...senaBlue);
    const splitTitle = doc.splitTextToSize(datos_proyecto.nombre, 240);
    doc.text(splitTitle, 148.5, 138, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(`Código: ${datos_proyecto.codigo} | Vigencia: ${datos_proyecto.vigencia} | Línea: ${datos_proyecto.linea}`, 148.5, 155, { align: 'center' });

    // Fecha
    doc.setFontSize(10);
    doc.text(`Expedido en la Regional Santander el día ${fecha_emision}`, 148.5, 172, { align: 'center' });

    // Firmas
    doc.setDrawColor(200, 200, 200);
    doc.line(60, 185, 120, 185);
    doc.line(170, 185, 230, 185);

    doc.setFontSize(10);
    doc.text(data.firmas[0].nombre, 90, 190, { align: 'center' });
    doc.text(data.firmas[0].rol, 90, 194, { align: 'center' });

    doc.text(data.firmas[1].nombre, 200, 190, { align: 'center' });
    doc.text(data.firmas[1].rol, 200, 194, { align: 'center' });

    doc.save(`Certificado_Proyecto_${datos_usuario.nombre.replace(/\s/g, '_')}.pdf`);
  },

  /**
   * Genera un reporte detallado de presupuesto
   */
  generateBudgetReport: (data) => {
    const doc = new jsPDF();
    const { proyecto, resumen_financiero, distribucion_rubros, indicadores, fecha_corte } = data;

    // Encabezado institucional
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('INFORME FINANCIERO DE PROYECTO', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text('SISTEMA DE INVESTIGACIÓN, INNOVACIÓN Y DESARROLLO TECNOLÓGICO - SENNOVA', 105, 28, { align: 'center' });

    // Info del Proyecto
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.text('DETALLES DEL PROYECTO', 20, 55);
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 57, 190, 57);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Proyecto: ${proyecto.nombre}`, 20, 65);
    doc.text(`Código SGPS: ${proyecto.codigo || 'N/A'}`, 20, 72);
    doc.text(`Investigador Principal: ${proyecto.investigador}`, 20, 79);
    doc.text(`Vigencia: ${proyecto.vigencia}`, 20, 86);

    // Resumen Financiero
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN DE ASIGNACIÓN', 140, 65);
    doc.setFontSize(16);
    doc.setTextColor(16, 185, 129);
    doc.text(`$${resumen_financiero.total_asignado.toLocaleString('es-CO')}`, 140, 75);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Fuente: ${resumen_financiero.fuente}`, 140, 82);

    // Tabla de Rubros
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('DISTRIBUCIÓN POR RUBROS', 20, 105);

    doc.autoTable({
      startY: 110,
      head: [['Rubro Presupuestal', 'Valor Asignado (COP)', '% Participación']],
      body: distribucion_rubros.map(r => [
        r.label, 
        `$${r.valor.toLocaleString('es-CO')}`, 
        `${r.porcentaje}%`
      ]),
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'center' }
      },
      styles: { fontSize: 9 }
    });

    // Indicadores Estratégicos
    const finalY = doc.lastAutoTable.finalY || 180;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('INDICADORES DE GESTIÓN', 20, finalY + 15);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`• Eficiencia Operativa Estimada: ${indicadores.eficiencia_operativa}%`, 25, finalY + 25);
    doc.text(`• Nivel de Ejecución Actual: ${indicadores.nivel_ejecucion}%`, 25, finalY + 32);
    doc.text(`• Talento Humano: ${indicadores.gasto_talento_humano}`, 25, finalY + 39);

    // Pie de página
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Reporte generado automáticamente el ${fecha_corte} - Plataforma de Gestión SENNOVA CGAO`, 105, 285, { align: 'center' });

    doc.save(`Presupuesto_${proyecto.codigo || 'Proyecto'}_${fecha_corte}.pdf`);
  },

  /**
   * Genera el reporte oficial de bitácora técnica
   */
  generateBitacoraReport: (data) => {
    const doc = new jsPDF();
    const { entidad, centro, proyecto, periodo, entradas, resumen_ejecucion, glosario_seguridad } = data;

    // Encabezado
    doc.setFillColor(79, 70, 229); // Indigo 600
    doc.rect(0, 0, 210, 45, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('BITÁCORA TÉCNICA DE INVESTIGACIÓN', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(entidad, 105, 30, { align: 'center' });
    doc.text(centro, 105, 35, { align: 'center' });

    // Info del Proyecto
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.text('DETALLES DEL PROYECTO', 20, 60);
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 62, 190, 62);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${proyecto.nombre}`, 20, 70);
    doc.text(`Código: ${proyecto.codigo || 'N/A'}`, 20, 77);
    doc.text(`Línea Programática: ${proyecto.linea}`, 20, 84);
    doc.text(`Reporte: ${periodo}`, 20, 91);

    // Resumen de Ejecución
    doc.setFillColor(248, 250, 252);
    doc.rect(130, 65, 65, 30, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('ESTADO DE BITÁCORA', 135, 72);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Entradas: ${resumen_ejecucion.total_entradas}`, 135, 78);
    doc.text(`Firmas Completas: ${resumen_ejecucion.firmas_completas}`, 135, 84);
    doc.text(`Pendientes: ${resumen_ejecucion.pendientes}`, 135, 90);

    // Tabla de Entradas
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('HISTORIAL DE ACTIVIDADES Y HALLAZGOS', 20, 110);

    doc.autoTable({
      startY: 115,
      head: [['Fecha', 'Título / Categoría', 'Autor', 'Firma']],
      body: entradas.map(e => [
        e.fecha, 
        `${e.titulo.toUpperCase()}\n(${e.categoria})`, 
        e.autor,
        e.estado_firma
      ]),
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 8 },
      columnStyles: {
        1: { cellWidth: 80 }
      }
    });

    // Detalle de cada entrada (en nuevas páginas si es necesario)
    let currentY = doc.lastAutoTable.finalY + 20;

    entradas.forEach((e, index) => {
      // Verificar si hay espacio, si no, nueva página
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFillColor(241, 245, 249);
      doc.rect(20, currentY, 170, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`ENTRADA #${index + 1}: ${e.titulo}`, 25, currentY + 5);
      
      currentY += 15;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const splitText = doc.splitTextToSize(e.contenido, 160);
      doc.text(splitText, 25, currentY);
      
      currentY += (splitText.length * 5) + 5;
      
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`Hash de Integridad: ${e.hash_verificacion}`, 25, currentY);
      currentY += 15;
    });

    // Pie de página con glosario
    doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('GLOSARIO Y SEGURIDAD', 20, 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(doc.splitTextToSize(glosario_seguridad, 170), 20, 40);

    doc.save(`Bitacora_Oficial_${proyecto.codigo || 'Proyecto'}.pdf`);
  }
};
