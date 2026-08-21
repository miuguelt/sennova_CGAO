import { describe, it, expect, vi, beforeEach } from 'vitest';
import jsPDF from 'jspdf';
import { PDFGenerator } from '../utils/pdfGenerator';

describe('PDFGenerator Suite Completa', () => {
  beforeEach(() => {
    if (jsPDF.API && jsPDF.API.save) {
      vi.spyOn(jsPDF.API, 'save').mockImplementation(() => {});
    } else {
      jsPDF.API.save = vi.fn();
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

  describe('5. generateBitacoraReport (Bitácora Oficial)', () => {
    it('genera bitácora técnica oficial con múltiples entradas y hashes criptográficos', () => {
      const mockBitacoraData = {
        entidad: 'SENA',
        centro: 'Centro de Gestión Agroempresarial y Oriente',
        proyecto: {
          nombre: 'Desarrollo de Biosensores para Monitoreo de Aguas',
          codigo: 'SGPS-2026-771',
          linea: 'Biotecnología'
        },
        periodo: 'Generado el 2026-02-20',
        resumen_ejecucion: { total_entradas: 2, firmas_completas: 2, pendientes: 0 },
        entradas: [
          {
            fecha: '2026-02-10 09:30',
            titulo: 'Calibración de Sensores Electroquímicos',
            categoria: 'Técnica',
            contenido: 'Se realizó el procedimiento de calibración en laboratorio obteniendo curvas R2 > 0.99.',
            autor: 'Carlos Ruiz',
            estado_firma: 'COMPLETA',
            hash_verificacion: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            adjuntos_count: 2
          },
          {
            fecha: '2026-02-15 14:00',
            titulo: 'Pruebas de Campo en Finca Experimental',
            categoria: 'Hallazgo',
            contenido: 'Medición de pH y conductividad con respuesta rápida en menos de 30 segundos.',
            autor: 'Laura Jiménez',
            estado_firma: 'COMPLETA',
            hash_verificacion: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
            adjuntos_count: 1
          }
        ],
        glosario_seguridad: 'Los hashes de verificación garantizan la inmutabilidad y autenticidad del contenido.'
      };

      expect(() => PDFGenerator.generateBitacoraReport(mockBitacoraData)).not.toThrow();
      expect(jsPDF.API.save).toHaveBeenCalled();
    });

    it('genera bitácora vacía sin fallar', () => {
      expect(() => PDFGenerator.generateBitacoraReport({ proyecto: { nombre: 'P1' }, entradas: [] })).not.toThrow();
      expect(jsPDF.API.save).toHaveBeenCalled();
    });
  });

  describe('6. generateEtapaProductiva (Formato Etapa Productiva)', () => {
    it('genera formato de etapa productiva con equipo de trabajo', () => {
      const mockProyecto = {
        nombre: 'Innovación en Postcosecha de Guayaba',
        codigo_sgps: 'SGPS-2026-102',
        tipologia: 'I+D Aplicada',
        vigencia: 12,
        presupuesto_total: 18000000,
        equipo: [
          { nombre: 'Carlos Ruiz', pivot: { rol_en_proyecto: 'Investigador Principal', horas_dedicadas: 20 } },
          { nombre: 'María López', pivot: { rol_en_proyecto: 'Aprendiz Investigador', horas_dedicadas: 15 } }
        ]
      };

      expect(() => PDFGenerator.generateEtapaProductiva(mockProyecto)).not.toThrow();
      expect(jsPDF.API.save).toHaveBeenCalled();
    });

    it('genera formato de etapa productiva sin equipo sin fallar', () => {
      expect(() => PDFGenerator.generateEtapaProductiva({})).not.toThrow();
      expect(jsPDF.API.save).toHaveBeenCalled();
    });
  });

  describe('7. generateSeguimiento (Formato Seguimiento)', () => {
    it('genera formato de seguimiento con cronograma de entregables', () => {
      const mockProyecto = {
        nombre: 'Automatización de Invernaderos',
        codigo_sgps: 'SGPS-2026-554',
        entregables: [
          { fase: 'Fase I: Planeación', titulo: 'Documento de Arquitectura', fecha_entrega: '2026-03-15', estado: 'aprobado' },
          { fase: 'Fase II: Ejecución', titulo: 'Prototipo Electrónico', fecha_entrega: '2026-06-30', estado: 'en_progreso' }
        ]
      };

      expect(() => PDFGenerator.generateSeguimiento(mockProyecto)).not.toThrow();
      expect(jsPDF.API.save).toHaveBeenCalled();
    });

    it('genera formato de seguimiento vacío sin fallar', () => {
      expect(() => PDFGenerator.generateSeguimiento({})).not.toThrow();
      expect(jsPDF.API.save).toHaveBeenCalled();
    });
  });

  describe('8. generateInformeFinal (Informe Final)', () => {
    it('genera informe final con resultados de cierre y entregables', () => {
      const mockProyecto = {
        nombre: 'Cierre Proyecto Robótica Agrícola',
        codigo_sgps: 'SGPS-2025-998',
        linea_programatica: 'Innovación y Desarrollo Tecnológico',
        estado: 'finalizado',
        total_productos: 4,
        presupuesto_total: 35000000,
        entregables: [
          { fase: 'Fase I', titulo: 'E1', estado: 'aprobado' },
          { fase: 'Fase II', titulo: 'E2', estado: 'aprobado' },
          { fase: 'Fase III', titulo: 'E3', estado: 'aprobado' }
        ]
      };

      expect(() => PDFGenerator.generateInformeFinal(mockProyecto)).not.toThrow();
      expect(jsPDF.API.save).toHaveBeenCalled();
    });

    it('genera informe final con datos vacíos sin fallar', () => {
      expect(() => PDFGenerator.generateInformeFinal({})).not.toThrow();
      expect(jsPDF.API.save).toHaveBeenCalled();
    });
  });

  describe('9. generateProjectPDF (Ficha Técnica)', () => {
    it('genera ficha técnica con semillero, presupuesto y equipo', () => {
      const mockProject = {
        nombre: 'Plataforma Integrada SENNOVA CGAO para Gestión de I+D',
        codigo_sgps: 'SGPS-2026-8801',
        estado: 'Aprobado',
        linea_investigacion: 'Desarrollo de Software e Inteligencia Artificial',
        semillero: { nombre: 'Semillero Biotic' },
        presupuesto_total: 25000000,
        vigencia: 12,
        objetivo_general: 'Diseñar e implementar un sistema integral de trazabilidad, gestión de productos MinCiencias, bitácoras técnicas y asignación presupuestal para el CGAO.',
        equipo: [
          { nombre: 'Ing. Carlos Ruiz', email: 'cruiz@sena.edu.co', rol: 'Investigador Principal', horas_dedicadas: 20 },
          { nombre: 'Laura Jiménez', email: 'ljimenez@sena.edu.co', rol: 'Co-Investigadora', horas_dedicadas: 10 }
        ]
      };

      expect(() => PDFGenerator.generateProjectPDF(mockProject, mockProject.equipo)).not.toThrow();
      expect(jsPDF.API.save).toHaveBeenCalled();
    });

    it('genera ficha técnica sin integrantes y sin objetivo sin fallar', () => {
      expect(() => PDFGenerator.generateProjectPDF({})).not.toThrow();
      expect(jsPDF.API.save).toHaveBeenCalled();
    });
  });
});
