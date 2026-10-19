export const importFieldClass = 'min-h-[44px] w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:bg-slate-50';
export const importFolders = ['1ProyectoFomulado', '2ActadeInicio', '3Productos', '3Productos/1InformeFinal', '3Productos/2PosteryEventos', '3Productos/3.InnovacionGestionEmpresarial', '4InformesBimensuales', '5ActaCierre', '6EvidenciasFotograficas', '7Borradoresyvarios'];
export const importExtensions = ['pdf', 'docx', 'xlsx', 'pptx', 'doc', 'xls', 'ppt', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'heif', 'wav', 'ogg', 'oga', 'm4a', 'mp3', 'mp4', 'mov', 'webm', 'mkv', 'avi', 'txt', 'csv', 'md', 'json'];
export const importTypes = {
  formulacion_proyecto: 'Formulación del proyecto', acta_inicio: 'Acta de inicio', informe_bimensual: 'Informe bimensual',
  acta_cierre: 'Acta de cierre', informe_final: 'Informe final', presentacion_proyecto: 'Presentación del proyecto',
  poster_producto: 'Póster del producto', producto_resultado: 'Producto o resultado', evidencia_fotografica: 'Evidencia fotográfica',
  evidencia_video: 'Video de evidencia', documento_apoyo: 'Documento de apoyo',
  registro_evidencias: 'Registro de evidencias', soporte_minciencias: 'Soporte de Minciencias', borrador_varios: 'Borrador', nota_trabajo: 'Nota de trabajo',
};

export function validateImportFiles(files) {
  if (!files.length) return 'Seleccione un ZIP o los archivos que desea importar.';
  if (files.length > 500) return 'Seleccione como máximo 500 archivos por carga.';
  const zipFiles = files.filter(file => /\.zip$/i.test(file.name));
  if (zipFiles.length && files.length !== 1) return 'Seleccione un solo ZIP, separado de los archivos individuales.';
  if (zipFiles.length) return files[0].size > 50 * 1024 * 1024 ? 'El ZIP supera los 50 MB. Divida su contenido en paquetes más pequeños.' : '';
  if (files.some(file => !importExtensions.includes(file.name.split('.').pop().toLowerCase()))) return 'Hay un archivo con formato no admitido. Revise los formatos indicados.';
  if (files.some(file => file.size > 10 * 1024 * 1024)) return 'Un archivo supera los 10 MB. Reduzca su tamaño e intente de nuevo.';
  if (files.reduce((total, file) => total + file.size, 0) > 200 * 1024 * 1024) return 'La selección supera los 200 MB. Divida la carga en grupos más pequeños.';
  return '';
}

const fieldLabels = { descripcion: 'Descripción', objetivo_general: 'Objetivo general', objetivos_especificos: 'Objetivos específicos', codigo_sgps: 'Código SGPS', justificacion: 'Justificación', fecha_inicio: 'Fecha de inicio', fecha_fin: 'Fecha de finalización', duracion_meses: 'Duración en meses', metodologia: 'Metodología', titulo: 'Título', regional: 'Regional', nombre: 'Nombre', lineas_investigacion: 'Líneas de investigación' };
export function importFieldLabel(key) {
  const value = key.replaceAll('_', ' ');
  return fieldLabels[key] || value.charAt(0).toUpperCase() + value.slice(1);
}

export function importValueText(value) {
  if (value == null || value === '') return 'Sin dato';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (Array.isArray(value)) return value.map(importValueText).join('\n');
  if (typeof value === 'object') return Object.entries(value).map(([key, item]) => `${importFieldLabel(key)}: ${importValueText(item)}`).join('\n');
  return String(value);
}

export function formatFileSize(bytes) {
  if (bytes == null || isNaN(bytes) || bytes < 0) return '0 B';
  const formatNumber = (val, maxFraction = 1) =>
    new Intl.NumberFormat('es-CO', { maximumFractionDigits: maxFraction }).format(val);
  if (bytes < 1024) return `${formatNumber(bytes, 0)} B`;
  if (bytes < 1024 * 1024) return `${formatNumber(bytes / 1024, 1)} KB`;
  return `${formatNumber(bytes / (1024 * 1024), 1)} MB`;
}

export function getDeliverableCategory(tipo) {
  const map = {
    formulacion_proyecto: { label: 'Gestión formal', variant: 'primary' },
    acta_inicio: { label: 'Gestión formal', variant: 'primary' },
    acta_cierre: { label: 'Gestión formal', variant: 'primary' },
    informe_bimensual: { label: 'Informe de avance', variant: 'sena' },
    informe_final: { label: 'Informe de avance', variant: 'sena' },
    producto_resultado: { label: 'Producto o resultado', variant: 'purple' },
    poster_producto: { label: 'Producto o resultado', variant: 'purple' },
    soporte_minciencias: { label: 'Soporte Minciencias', variant: 'indigo' },
    presentacion_proyecto: { label: 'Divulgación', variant: 'blue' },
    evidencia_fotografica: { label: 'Evidencia de campo', variant: 'info' },
    evidencia_video: { label: 'Evidencia de campo', variant: 'info' },
    registro_evidencias: { label: 'Evidencia de campo', variant: 'info' },
    borrador_varios: { label: 'Borrador', variant: 'warning' },
    nota_trabajo: { label: 'Nota de trabajo', variant: 'warning' },
    documento_apoyo: { label: 'Documento de apoyo', variant: 'default' },
  };
  const category = map[tipo] || { label: 'Documento de apoyo', variant: 'default' };
  return {
    ...category,
    toString() {
      return this.label;
    },
  };
}

