import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  SENNOVA_FORMATS,
  buildFormatDownloadArtifact,
  downloadFormatTemplate,
} from '../data/sennovaFormats';

describe('modelos de referencia SENNOVA', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('publica los modelos como HTML y marca la vigencia institucional por validar', () => {
    expect(SENNOVA_FORMATS.length).toBeGreaterThan(0);
    expect(SENNOVA_FORMATS.every((format) => format.extension === 'html')).toBe(true);
    expect(SENNOVA_FORMATS.every((format) => format.validacionInstitucional === 'Pendiente de validación institucional')).toBe(true);
    expect(SENNOVA_FORMATS.every((format) => !/oficial|formato único/i.test(`${format.titulo}\n${format.templateContent}`))).toBe(true);
  });

  it('construye un HTML con texto escapado y un nombre de archivo seguro', () => {
    const artifact = buildFormatDownloadArtifact({
      id: '../modelo',
      codigo: 'Código <referencial>',
      titulo: '<script>alert("x")</script>',
      version: 'V&1',
      templateContent: 'Campo & <dato> "texto" \'valor\'',
    });

    expect(artifact.fileName).toBe('modelo_codigo_referencial.html');
    expect(artifact.mimeType).toBe('text/html;charset=utf-8');
    expect(artifact.content).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(artifact.content).toContain('Campo &amp; &lt;dato&gt; &quot;texto&quot; &#39;valor&#39;');
    expect(artifact.content).toContain('Identificador de referencia sin validar');
    expect(artifact.content).not.toContain('CÓDIGO OFICIAL');

    const emptyArtifact = buildFormatDownloadArtifact({});
    expect(emptyArtifact.fileName).toBe('modelo_referencia.html');
    expect(emptyArtifact.content).not.toContain('Versión declarada en el modelo');
    expect(emptyArtifact.content).toContain('<h1></h1>');
  });

  it('advierte que los modelos de propiedad intelectual requieren revisión jurídica antes de firmarse', () => {
    const legalModel = SENNOVA_FORMATS.find((format) => format.categoria === 'legal');
    const artifact = buildFormatDownloadArtifact(legalModel);

    expect(artifact.content).toContain('Borrador sin revisión jurídica');
    expect(artifact.content).toContain('No lo firme ni lo use para ceder derechos');
  });

  it('descarga el HTML con su extensión y libera el enlace temporal', async () => {
    const createObjectURL = vi.fn(() => 'blob:formato');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadFormatTemplate(SENNOVA_FORMATS[0]);

    expect(createObjectURL).toHaveBeenCalledOnce();
    const blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe('text/html;charset=utf-8');
    expect(await blob.text()).toContain('sin validación institucional');
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:formato');
    expect(document.querySelector('a[download]')).toBeNull();
  });
});
