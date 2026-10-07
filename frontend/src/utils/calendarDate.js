function parseDate(value) {
  const calendar = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(calendar ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime()) || (calendar && date.toISOString().slice(0, 10) !== value)) return null;
  return { date, calendar };
}

export function formatCalendarDate(value, options = {}, invalidLabel = 'Fecha por revisar') {
  if (!value) return 'Sin fecha';
  const parsed = parseDate(value);
  if (!parsed) return invalidLabel;
  return parsed.date.toLocaleDateString('es-CO', parsed.calendar ? { ...options, timeZone: 'UTC' } : options);
}

export function calendarDaysUntil(value, today = new Date()) {
  if (!value) return null;
  const parsed = parseDate(value);
  if (!parsed || Number.isNaN(today.getTime())) return null;
  const end = parsed.calendar ? parsed.date.getTime() : Date.UTC(parsed.date.getFullYear(), parsed.date.getMonth(), parsed.date.getDate());
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((end - start) / 86400000);
}
