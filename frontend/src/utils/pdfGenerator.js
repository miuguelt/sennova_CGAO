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
  }
};
