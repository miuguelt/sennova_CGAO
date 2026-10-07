export const PROJECT_PHASES = [
  { key: 'Fase I', title: 'Fase I (Planeación)', name: 'Planeación' },
  { key: 'Fase II', title: 'Fase II (Ejecución Inicial)', name: 'Ejecución Inicial' },
  { key: 'Fase III', title: 'Fase III (Desarrollo Técnico)', name: 'Desarrollo Técnico' },
  { key: 'Fase Final', title: 'Fase Final (Cierre)', name: 'Cierre' },
];

const phaseKeys = PROJECT_PHASES.map(phase => phase.key);

export function formatProjectTimelineDate(value) {
  if (!value) return 'Sin fecha registrada';
  const normalizedDate = calendarDate(value);
  if (!normalizedDate) return 'Fecha por revisar';
  const localDate = new Date(`${normalizedDate}T12:00:00`);
  return Number.isNaN(localDate.getTime()) ? 'Fecha por revisar' : localDate.toLocaleDateString('es-CO', { day: 'numeric', month: '2-digit', year: 'numeric' });
}

function calendarDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  const input = String(value || '').trim();
  const iso = input.match(/^(\d{4}-\d{2}-\d{2})/);
  const dmy = input.match(/(?:^|\D)(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\D|$)/);
  let result = iso?.[1];
  if (!result && dmy) result = `${dmy[3]}-${String(dmy[2]).padStart(2, '0')}-${String(dmy[1]).padStart(2, '0')}`;
  if (!result) return '';
  const [year, month, day] = result.split('-').map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day ? result : '';
}

function calendarDay(value) {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86400000;
}

function calendarMonths(start, end) {
  const first = new Date(`${start}T12:00:00Z`);
  const last = new Date(`${end}T12:00:00Z`);
  const months = [];
  let cursor = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1));
  while (cursor <= last) {
    const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`;
    const offset = (Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1) / 86400000) - calendarDay(start);
    months.push({
      key,
      label: cursor.toLocaleDateString('es-CO', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
      left: Math.max(0, Math.min(100, (offset / (calendarDay(end) - calendarDay(start) + 1)) * 100)),
    });
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }
  return months;
}

export function getActivityDateRange(activity) {
  const start = calendarDate(activity?.fecha_inicio);
  const end = calendarDate(activity?.fecha_fin);
  if (start && end && start <= end) return { start, end };
  const dates = String(activity?.fecha_textual || '').match(/\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}-\d{2}-\d{2}/g) || [];
  const parsed = dates.map(calendarDate).filter(Boolean);
  if (parsed.length >= 2 && parsed[0] <= parsed[1]) return { start: parsed[0], end: parsed[1] };
  if (parsed.length === 1) return { start: parsed[0], end: parsed[0] };
  return null;
}

export function createGanttModel(activities = [], today = new Date()) {
  const dated = activities.map((activity, index) => {
    const range = getActivityDateRange(activity);
    return range ? { ...activity, index, range, phase: phaseKeys.includes(activity.fase) ? activity.fase : '' } : null;
  }).filter(Boolean);
  if (!dated.length) return { activities: [], months: [], currentPhases: [], hasCalendarActivities: false };
  const start = dated.reduce((earliest, activity) => activity.range.start < earliest ? activity.range.start : earliest, dated[0].range.start);
  const end = dated.reduce((latest, activity) => activity.range.end > latest ? activity.range.end : latest, dated[0].range.end);
  const duration = calendarDay(end) - calendarDay(start) + 1;
  const todayDate = calendarDate(today);
  const todayTime = today instanceof Date && !Number.isNaN(today.getTime())
    ? `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`
    : String(today || '').match(/T(\d{2}:\d{2})/)?.[1] || '';
  const rows = dated.map(activity => {
    const offset = calendarDay(activity.range.start) - calendarDay(start);
    const days = calendarDay(activity.range.end) - calendarDay(activity.range.start) + 1;
    const withinDates = todayDate >= activity.range.start && todayDate <= activity.range.end;
    const beforeStartTime = todayDate === activity.range.start && activity.hora_inicio && todayTime && todayTime < activity.hora_inicio;
    const afterEndTime = todayDate === activity.range.end && activity.hora_fin && todayTime && todayTime > activity.hora_fin;
    const activeNow = withinDates && !beforeStartTime && !afterEndTime;
    return { ...activity, left: (offset / duration) * 100, width: (days / duration) * 100, activeNow };
  });
  const currentActivities = rows.filter(activity => activity.activeNow);
  const currentPhases = phaseKeys.filter(phase => currentActivities.some(activity => activity.phase === phase));
  const todayPosition = todayDate >= start && todayDate <= end
    ? ((calendarDay(todayDate) - calendarDay(start) + 0.5) / duration) * 100 : null;
  return { activities: rows, months: calendarMonths(start, end), currentActivities, currentPhases, hasCalendarActivities: true, start, end, todayPosition };
}

export function formsForPhase(forms = [], phase) {
  return forms.filter(form => {
    const type = form.tipo || String(form.clave || '').split('__')[0];
    if (['formulacion_proyecto', 'presentacion_proyecto', 'acta_inicio'].includes(type)) return phase === 'Fase I';
    if (type === 'informe_bimensual') return Number(form.periodo_bimestre || String(form.clave || '').match(/__b(\d+)$/)?.[1] || 1) === 1
      ? phase === 'Fase II' : phase === 'Fase III';
    if (['producto_resultado', 'poster_producto', 'registro_evidencias'].includes(type)) return phase === 'Fase III';
    if (['informe_final', 'acta_cierre'].includes(type)) return phase === 'Fase Final';
    return false;
  });
}
