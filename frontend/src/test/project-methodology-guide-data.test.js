import { describe, it, expect } from 'vitest';
import {
  PROJECT_METHODOLOGY_GUIDE,
  getMethodologyGuideForStep,
  getMethodologyTipsForField,
} from '../data/projectMethodologyGuideData';

describe('projectMethodologyGuideData', () => {
  it('contiene la guía completa para todos los 9 pasos de formulación SENNOVA', () => {
    const requiredSteps = [
      'identificacion',
      'institucional',
      'problema',
      'marco',
      'metodologia',
      'equipo',
      'recursos',
      'resultados',
      'generar',
    ];

    requiredSteps.forEach((stepId) => {
      const stepGuide = PROJECT_METHODOLOGY_GUIDE[stepId];
      expect(stepGuide).toBeDefined();
      expect(stepGuide.titulo).toBeTruthy();
      expect(stepGuide.queInformacionAgregar.length).toBeGreaterThan(0);
      expect(stepGuide.checklist.length).toBeGreaterThan(0);
      expect(stepGuide.ejemploModelo).toBeDefined();
      expect(Array.isArray(stepGuide.documentosEnConstruccion)).toBe(true);
    });
  });

  it('getMethodologyGuideForStep retorna la guía correcta o el fallback por defecto', () => {
    const problemaGuide = getMethodologyGuideForStep('problema');
    expect(problemaGuide.titulo).toBe('Planteamiento del Problema, Causas y Justificación');

    const unknownGuide = getMethodologyGuideForStep('paso_inexistente');
    expect(unknownGuide).toBeDefined();
    expect(unknownGuide.titulo).toBe('Formulación Técnica del Proyecto');
  });

  it('getMethodologyTipsForField encuentra el tip correspondiente a un campo específico', () => {
    const tipObjetivo = getMethodologyTipsForField('identificacion', 'objetivo_general');
    expect(tipObjetivo).toBeDefined();
    expect(tipObjetivo.campo).toBe('Objetivo general');
    expect(tipObjetivo.instruccion).toContain('infinitivo');

    const tipJustificacion = getMethodologyTipsForField('problema', 'justificacion');
    expect(tipJustificacion).toBeDefined();
    expect(tipJustificacion.campo).toContain('Justificación');

    const tipInexistente = getMethodologyTipsForField('problema', 'campo_que_no_existe');
    expect(tipInexistente).toBeNull();

    const tipPasoInexistente = getMethodologyTipsForField('otro_paso', 'cualquiera');
    expect(tipPasoInexistente).toBeNull();
  });

  it('valida que los documentos en construcción incluyan formatos de investigación I+D+i SENNOVA', () => {
    const identificacionGuide = getMethodologyGuideForStep('identificacion');
    const docs = identificacionGuide.documentosEnConstruccion;

    const ids = docs.map((d) => d.id);
    expect(ids).toContain('ficha_tecnica');

    docs.forEach((doc) => {
      expect(doc.nombre).toBeTruthy();
      expect(doc.tipo).toBe('pdf');
    });

    const generarGuide = getMethodologyGuideForStep('generar');
    const generarDocIds = generarGuide.documentosEnConstruccion.map((d) => d.id);
    expect(generarDocIds).toContain('ficha_tecnica');
    expect(generarDocIds).toContain('acta_inicio');
  });
});
