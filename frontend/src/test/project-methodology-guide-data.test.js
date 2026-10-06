import { describe, it, expect } from 'vitest';
import {
  PROJECT_METHODOLOGY_GUIDE,
  getMethodologyGuideForStep,
  getMethodologyTipsForField,
} from '../data/projectMethodologyGuideData';

describe('projectMethodologyGuideData', () => {
  it('contiene orientaciones para las diez secciones del asistente', () => {
    const requiredSteps = [
      'identificacion',
      'institucional',
      'problema',
      'objetivos',
      'marco',
      'metodologia',
      'resultados',
      'recursos',
      'referencias',
      'generar',
    ];

    requiredSteps.forEach((stepId) => {
      const stepGuide = PROJECT_METHODOLOGY_GUIDE[stepId];
      expect(stepGuide).toBeDefined();
      expect(stepGuide.titulo).toBeTruthy();
      expect(stepGuide.queInformacionAgregar.length).toBeGreaterThan(0);
      expect(stepGuide.checklist.length).toBeGreaterThan(0);
      expect(stepGuide.ejemploModelo).toBeDefined();
      expect(stepGuide.documentosEnConstruccion).toBeUndefined();
    });
  });

  it('relaciona los pasos con las secciones observadas en la formulación de ejemplo CAP-14', () => {
    expect(PROJECT_METHODOLOGY_GUIDE.problema.referenciaEjemplo.secciones).toEqual([
      '2. Introducción',
      '3. Planteamiento del problema',
      '4. Justificación',
    ]);
    expect(PROJECT_METHODOLOGY_GUIDE.objetivos.referenciaEjemplo.secciones).toEqual(['5. Objetivos']);
    expect(PROJECT_METHODOLOGY_GUIDE.referencias.referenciaEjemplo.secciones).toEqual(['10. Referencias']);
    expect(PROJECT_METHODOLOGY_GUIDE.institucional.referenciaEjemplo.nota)
      .toContain('nivel de formación, programa, competencia y resultados de aprendizaje');
    const trainingTip = PROJECT_METHODOLOGY_GUIDE.institucional.queInformacionAgregar
      .find(tip => tip.campo === 'Datos de formación y convocatoria (cuando apliquen)');
    expect(trainingTip.instruccion).toContain('solo si el proyecto o la convocatoria los solicita');

    Object.values(PROJECT_METHODOLOGY_GUIDE).forEach(stepGuide => {
      expect(stepGuide.referenciaEjemplo.fuente).toBe('Formato Proyecto Capacidad Instalada · CAP-14-2026');
    });
  });

  it('getMethodologyGuideForStep retorna la guía correcta o el fallback por defecto', () => {
    const problemaGuide = getMethodologyGuideForStep('problema');
    expect(problemaGuide.titulo).toBe('Introducción, problema y justificación');

    const unknownGuide = getMethodologyGuideForStep('paso_inexistente');
    expect(unknownGuide).toBeDefined();
    expect(unknownGuide.titulo).toBe('Formulación Técnica del Proyecto');
    expect(unknownGuide.ejemploModelo.texto).toBe('Diligencia los campos solicitados.');
  });

  it('getMethodologyTipsForField encuentra el tip correspondiente a un campo específico', () => {
    const tipObjetivo = getMethodologyTipsForField('objetivos', 'objetivo_general');
    expect(tipObjetivo).toBeDefined();
    expect(tipObjetivo.campo).toBe('Objetivo general');
    expect(tipObjetivo.instruccion).toContain('resultado principal');

    const tipJustificacion = getMethodologyTipsForField('problema', 'justificacion');
    expect(tipJustificacion).toBeDefined();
    expect(tipJustificacion.campo).toContain('Justificación');

    const tipInexistente = getMethodologyTipsForField('problema', 'campo_que_no_existe');
    expect(tipInexistente).toBeNull();

    const tipPasoInexistente = getMethodologyTipsForField('otro_paso', 'cualquiera');
    expect(tipPasoInexistente).toBeNull();
  });

  it('mantiene la guía independiente de descargas PDF con datos predeterminados', () => {
    Object.values(PROJECT_METHODOLOGY_GUIDE).forEach(stepGuide => {
      expect(stepGuide.documentosEnConstruccion).toBeUndefined();
    });

    expect(getMethodologyGuideForStep('identificacion').queInformacionAgregar[0].instruccion)
      .toContain('Describe con claridad');
  });

  it('usa estructuras neutrales y no presenta los datos sintéticos del ejemplo cafetero como guía del proyecto', () => {
    const guideText = JSON.stringify(PROJECT_METHODOLOGY_GUIDE);
    expect(guideText).not.toMatch(/caf[eé]|biorreactor|fermentación|45\.000\.000|30021|TRl 3/i);
    expect(guideText).not.toMatch(/todo proyecto SENNOVA debe|habitualmente entre 10 y 20 horas|10 a 12 meses/i);
    expect(PROJECT_METHODOLOGY_GUIDE.identificacion.ejemploModelo.texto).toContain('Título: [nombre respaldado');
    expect(PROJECT_METHODOLOGY_GUIDE.recursos.queInformacionAgregar[0].instruccion)
      .toContain('no determina la elegibilidad');
  });
});
