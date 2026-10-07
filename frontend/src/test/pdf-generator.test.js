import { describe, it, expect, vi, beforeEach } from 'vitest';
import jsPDF from 'jspdf';
import { PDFGenerator } from '../utils/pdfGenerator';

describe('PDFGenerator Suite Completa', () => {
  it.each([undefined, 0, 12])('no inventa horas en certificados cuando el valor es %s', (hours) => {
    let pdf;
    vi.spyOn(jsPDF.API, 'save').mockImplementation(function () { pdf = this; });
    PDFGenerator.generateCertificate({ datos_semillero: { horas: hours } });
    const text = pdf.output();
    expect(text).toContain('BORRADOR DE CERTIFICADO');
    expect(text).not.toContain('SENNOVA, certifica que:');
    expect(text).toContain(hours === undefined ? 'Intensidad: No registrada' : `Intensidad: ${hours} horas`);
    expect(text).toContain('Requiere soportes, revisión y firmas autorizadas');
  });

  it.each(['generateProjectPDF', 'generateActaInicio'])('conserva horas cero y señala las desconocidas en %s', (method) => {
    let pdf;
    vi.spyOn(jsPDF.API, 'save').mockImplementation(function () { pdf = this; });
    PDFGenerator[method]({ equipo: [{ nombre: 'Integrante sin dedicación', horas_dedicadas: 0 }, { nombre: 'Integrante por completar' }] });
    expect(pdf.output()).toContain('0 hrs/sem');
    expect(pdf.output()).toContain('No registrada');
    expect(pdf.output()).not.toContain('20 hrs/sem');
    PDFGenerator[method]({});
    expect(pdf.output()).toContain('No registrada');
    expect(pdf.output()).not.toContain('20 hrs/sem');
    expect(pdf.output()).not.toContain('12 meses');
  });

  beforeEach(() => {
    if (jsPDF.API && jsPDF.API.save) {
      vi.spyOn(jsPDF.API, 'save').mockImplementation(() => {});
    } else {
      jsPDF.API.save = vi.fn();
    }
  });

  it.each(['generateCertificate', 'generateMonthlyReport', 'generateProjectCertificate', 'generateBudgetReport', 'generateActaInicio', 'generateProjectPDF'])('conserva los nombres oficiales en %s', (method) => {
    let generatedPdf;
    vi.spyOn(jsPDF.API, 'save').mockImplementation(function () { generatedPdf = this; });
    PDFGenerator[method]({});
    const text = generatedPdf.output();
    expect(text).not.toMatch(/AGROEMPRESARIAL Y (DEL )?ORIENTE|Agroempresarial y (del )?Oriente/);
    expect(text).not.toContain('Sistema de Investigación, Innovación y Desarrollo Tecnológico');
    expect(text).toMatch(/AGROEMPRESARIAL DEL ORIENTE|Agroempresarial del Oriente/);
    if (['generateCertificate', 'generateProjectCertificate'].includes(method)) {
      expect(text).toContain('Sistema de Investigación, Desarrollo Tecnológico e Innovación');
    }
  });

  describe('1. generateCertificate (Certificado Aprendiz)', () => {
    it('genera certificado con datos completos de PlantillasAPI', () => {
      const data = {
        entidad: 'SERVICIO NACIONAL DE APRENDIZAJE - SENA',
        centro: 'CENTRO DE GESTIÓN AGROEMPRESARIAL Y ORIENTE',
        programa_sennova: 'SENNOVA',
        tipo_documento: 'CERTIFICADO DE PARTICIPACIÓN EN SEMILLERO',
        datos_aprendiz: {
          nombre: 'MARÍA FERNANDA LÓPEZ',
          documento: '1098765432',
          ficha: '2694581',
          programa: 'Tecnología en ADSO'
        },
        datos_semillero: {
          nombre: 'Semillero Biotic CGAO',
          grupo: 'Grupo CGAO I+D',
          horas: 80,
          fecha_ingreso: '2026-01-15'
        },
        fecha_emision: '20 de febrero de 2026',
        firmas: [
          { nombre: 'Ing. Carlos Ruiz', rol: 'Líder de Semillero' },
          { nombre: 'Dra. Patricia Silva', rol: 'Subdirectora de Centro' }
        ]
      };

      expect(() => PDFGenerator.generateCertificate(data)).not.toThrow();
      expect(jsPDF.API.save).toHaveBeenCalled();
    });

    it('genera certificado con datos mínimos y fallbacks defensivos', () => {
      expect(() => PDFGenerator.generateCertificate({})).not.toThrow();
      expect(jsPDF.API.save).toHaveBeenCalled();
    });
  });

  describe('2. generateMonthlyReport (Reporte Mensual)', () => {
    it('genera reporte mensual con actividades y resumen de impacto', () => {
      const mockReportData = {
        investigador: { nombre: 'Carlos Ruiz', documento: '12345678', rol_sennova: 'Investigador Principal' },
        periodo: 'Febrero 2026',
        resumen: { proyectos_activos: 3, productos_generados: 5, cumplimiento: 98 },
        detalle_actividades: [
          { fecha: '2026-02-01', accion: 'Revisión técnica', desc: 'Validación de entregables del proyecto' },
          { fecha: '2026-02-15', accion: 'Taller', desc: 'Capacitación en prototipado IoT con aprendices' }
        ],
        metas_proximo_mes: ['Publicar artículo de investigación', 'Cierre de fase II']
      };

      expect(() => PDFGenerator.generateMonthlyReport(mockReportData)).not.toThrow();
      expect(jsPDF.API.save).toHaveBeenCalled();
    });

    it('genera reporte mensual con datos vacíos', () => {
      expect(() => PDFGenerator.generateMonthlyReport({})).not.toThrow();
      expect(jsPDF.API.save).toHaveBeenCalled();
    });

    it('incluye metas de seguimiento basadas en entregables cuando no hay metas registradas', () => {
      let generatedPdf;
      const saveSpy = vi.spyOn(jsPDF.API, 'save').mockImplementation(function () {
        generatedPdf = this;
      });
      saveSpy.mockClear();

      try {
        PDFGenerator.generateMonthlyReport({});

        const generatedText = generatedPdf.output();
        expect(generatedText).toContain('Actualizar entregables y actividades conforme al cronograma');
      } finally {
        saveSpy.mockRestore();
      }
    });
  });

  describe('3. generateProjectCertificate (Certificado Integrante Proyecto)', () => {
    it('genera certificado de proyecto con datos completos', () => {
      const mockData = {
        datos_usuario: {
          nombre: 'LAURA JIMÉNEZ',
          documento: '1098123456',
          rol: 'Co-Investigadora',
          horas: 20
        },
        datos_proyecto: {
          nombre: 'Sistema IoT para Monitoreo de Cultivos Agroecológicos en la Provincia de Vélez',
          codigo: 'SGPS-2026-8841',
          vigencia: 12,
          linea: 'I+D e Innovación'
        },
        fecha_emision: '20 de febrero de 2026',
        centro: 'Centro de Gestión Agroempresarial y Oriente',
        firmas: [
          { nombre: 'Ing. Carlos Ruiz', rol: 'Investigador Principal' },
          { nombre: 'SUBDIRECTOR DE CENTRO', rol: 'Subdirector CGAO' }
        ]
      };

      expect(() => PDFGenerator.generateProjectCertificate(mockData)).not.toThrow();
      expect(jsPDF.API.save).toHaveBeenCalled();
    });

    it('genera certificado de proyecto con datos parciales', () => {
      expect(() => PDFGenerator.generateProjectCertificate({})).not.toThrow();
      expect(jsPDF.API.save).toHaveBeenCalled();
    });

    it('usa el nombre institucional oficial cuando el certificado no recibe centro', () => {
      let generatedPdf;
      const saveSpy = vi.spyOn(jsPDF.API, 'save').mockImplementation(function () {
        generatedPdf = this;
      });
      saveSpy.mockClear();

      try {
        PDFGenerator.generateProjectCertificate({});

        const generatedText = generatedPdf.output();
        expect(generatedText).toContain('Centro de Gestión Agroempresarial del Oriente');
        expect(generatedText).not.toContain('Centro de Gestión Agroempresarial y Oriente');
      } finally {
        saveSpy.mockRestore();
      }
    });
  });

  describe('4. generateBudgetReport (Informe Financiero)', () => {
    it('genera informe financiero con rubros detallados e indicadores', () => {
      const mockBudgetData = {
        proyecto: {
          nombre: 'Plataforma Inteligente CGAO',
          codigo: 'SGPS-2026-001',
          investigador: 'Ing. Carlos Ruiz',
          vigencia: 12,
          presupuesto_total: 45000000
        },
        resumen_financiero: {
          total_asignado: 45000000,
          fuente: 'SGPS - SENNOVA',
          moneda: 'COP'
        },
        distribucion_rubros: [
          { label: 'Servicios Tecnológicos', valor: 15000000, porcentaje: 33.3 },
          { label: 'Equipos de Laboratorio', valor: 20000000, porcentaje: 44.4 },
          { label: 'Materiales y Suministros', valor: 10000000, porcentaje: 22.3 }
        ],
        indicadores: {
          eficiencia_operativa: 95,
          nivel_ejecucion: 80,
          gasto_talento_humano: 'Cargado a nómina SENA'
        },
        fecha_corte: '2026-02-20'
      };

      expect(() => PDFGenerator.generateBudgetReport(mockBudgetData)).not.toThrow();
      expect(jsPDF.API.save).toHaveBeenCalled();
    });

    it('genera informe financiero a partir de un proyecto con presupuesto_detallado en BD', () => {
      const mockProject = {
        nombre: 'Proyecto Test BD',
        codigo_sgps: 'SGPS-99',
        presupuesto_total: 10000000,
        presupuesto_detallado: {
          servicios: 3000000,
          materiales: 2000000,
          equipos: 5000000
        }
      };

      expect(() => PDFGenerator.generateBudgetReport({ proyecto: mockProject })).not.toThrow();
      expect(jsPDF.API.save).toHaveBeenCalled();
    });
  });

  describe('4b. generateActaInicio (Acta de Inicio I+D+i SENNOVA)', () => {
    it('genera acta de inicio con equipo de investigación y compromisos', () => {
      const mockProyecto = {
        nombre: 'Biotecnología Aplicada a Cafés Especiales',
        codigo_sgps: 'SGPS-2026-301',
        linea_programatica: 'Línea 66 - Investigación Aplicada',
        vigencia: 12,
        presupuesto_total: 45000000,
        objetivo_general: 'Desarrollar bioprocesos de fermentación controlada',
        equipo: [
          { nombre: 'Dra. Elena Gómez', rol: 'Investigadora Principal', horas_dedicadas: 20 },
          { nombre: 'Juan Aprendiz', rol: 'Semillerista', horas_dedicadas: 15 }
        ]
      };

      expect(() => PDFGenerator.generateActaInicio(mockProyecto)).not.toThrow();
      expect(jsPDF.API.save).toHaveBeenCalled();
    });

    it('genera acta de inicio con datos vacíos sin fallar', () => {
      expect(() => PDFGenerator.generateActaInicio({})).not.toThrow();
      expect(jsPDF.API.save).toHaveBeenCalled();
    });
  });

  describe('8. generateProjectPDF (Ficha Técnica)', () => {
    it('genera ficha técnica con semillero, presupuesto y equipo', () => {
      const mockProject = {
        nombre: 'Plataforma Integrada SENNOVA CGAO para Gestión de I+D',
        codigo_sgps: 'SGPS-2026-8801',
        estado: 'Aprobado',
        linea_investigacion: 'Desarrollo de Software e Inteligencia Artificial',
        semillero: { nombre: 'Semillero Biotic' },
        presupuesto_total: 25000000,
        vigencia: 12,
        objetivo_general: 'Diseñar e implementar un sistema integral para gestionar proyectos, productos MinCiencias y asignación presupuestal para el CGAO.',
        equipo: [
          { nombre: 'Ing. Carlos Ruiz', email: 'cruiz@sena.edu.co', rol: 'Investigador Principal', horas_dedicadas: 20 },
          { nombre: 'Laura Jiménez', email: 'ljimenez@sena.edu.co', rol: 'Co-Investigadora', horas_dedicadas: 10 }
        ]
      };

      expect(() => PDFGenerator.generateProjectPDF(mockProject, mockProject.equipo)).not.toThrow();
      expect(jsPDF.API.save).toHaveBeenCalled();
    });

    it('genera ficha técnica sin integrantes y sin objetivo sin fallar', () => {
      let generatedPdf;
      const saveSpy = vi.spyOn(jsPDF.API, 'save').mockImplementation(function () {
        generatedPdf = this;
      });
      saveSpy.mockClear();

      try {
        expect(() => PDFGenerator.generateProjectPDF({})).not.toThrow();
        const generatedText = generatedPdf.output();
        expect(generatedText).toContain('FICHA TÉCNICA DE REFERENCIA');
        expect(generatedText).toContain('SIN ESTADO REGISTRADO');
        expect(generatedText).toContain('No reemplaza el formato institucional vigente');
      } finally {
        saveSpy.mockRestore();
      }
    });

  });
});
