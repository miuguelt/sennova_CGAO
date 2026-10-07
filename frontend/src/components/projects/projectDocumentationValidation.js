function fieldError(field, value) {
  if (value == null || value === '') return '';
  if (field.type === 'rows') {
    if (!Array.isArray(value) || value.length > 80) return 'Ingresa una lista de hasta 80 registros.';
    for (let index = 0; index < value.length; index += 1) {
      const row = value[index];
      if (!row || typeof row !== 'object' || Array.isArray(row)) return `Fila ${index + 1}: completa un registro con los campos del formulario.`;
      const errors = getDocumentationErrors(field.columns, row);
      if (Object.keys(errors).length) return `Fila ${index + 1}: ${Object.values(errors)[0]}`;
    }
    return '';
  }
  if (field.type === 'number') {
    const number = Number(value);
    if (typeof value === 'boolean' || !['number', 'string'].includes(typeof value) || !Number.isFinite(number)) return 'Ingresa un número válido.';
    if (number < (field.min ?? 0)) return `Ingresa un valor igual o mayor que ${field.min ?? 0}.`;
    if (field.max != null && number > field.max) return `Ingresa un valor igual o menor que ${field.max}.`;
    return '';
  }
  const maxLength = field.maxLength ?? (field.type === 'textarea' ? 20000 : 2000);
  if (typeof value !== 'string' || value.length > maxLength) return `Ingresa un texto de hasta ${maxLength} caracteres.`;
  if (field.type === 'date') {
    const date = new Date(`${value}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return 'Ingresa una fecha válida en formato AAAA-MM-DD.';
  }
  if ((field.type === 'time' || ['hora_inicio', 'hora_fin'].includes(field.key)) && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return 'Ingresa una hora válida en formato HH:MM de 24 horas.';
  if (field.type === 'select' && !field.options.some(option => option.value === value)) return 'Selecciona una de las opciones disponibles.';
  return '';
}

export function getDocumentationErrors(fields = [], values = {}) {
  const errors = {};
  const keys = new Set(fields.map(field => field.key));
  for (const field of fields) {
    const error = fieldError(field, values[field.key]);
    if (error) errors[field.key] = error;
  }
  for (const [start, end] of [['fecha_inicio', 'fecha_fin'], ['periodo_desde', 'periodo_hasta']]) {
    if (keys.has(end) && values[start] && values[end] && !errors[start] && !errors[end] && values[start] > values[end]) errors[end] = 'La fecha final debe ser igual o posterior a la inicial.';
  }
  if (keys.has('hora_inicio') && keys.has('hora_fin') && values.hora_inicio && values.hora_fin
      && !errors.hora_inicio && !errors.hora_fin && values.hora_inicio >= values.hora_fin) {
    errors.hora_fin = 'La hora final debe ser posterior a la inicial.';
  }
  return errors;
}
