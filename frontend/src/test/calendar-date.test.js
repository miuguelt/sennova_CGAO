import { describe, expect, it } from 'vitest';
import { calendarDaysUntil, formatCalendarDate } from '../utils/calendarDate';

describe('Fechas de calendario sin desplazamiento por zona horaria', () => {
  it('conserva el día registrado al mostrarlo desde Colombia', () => {
    expect(formatCalendarDate('2026-05-29', { timeZone: 'America/Bogota' })).toBe('29/5/2026');
    expect(formatCalendarDate('2026-06-28', { day: 'numeric' })).toBe('28');
    expect(formatCalendarDate('2026-07-01', { month: 'long' })).toBe('julio');
    expect(formatCalendarDate('2024-02-29')).toBe('29/2/2024');
  });

  it('distingue fechas incompletas, inexistentes y marcas de tiempo válidas', () => {
    expect(formatCalendarDate(null)).toBe('Sin fecha');
    expect(formatCalendarDate('')).toBe('Sin fecha');
    expect(formatCalendarDate('2026-02-29')).toBe('Fecha por revisar');
    expect(formatCalendarDate('2026-13-01')).toBe('Fecha por revisar');
    expect(formatCalendarDate('fecha desconocida', {}, 'Dato original')).toBe('Dato original');
    expect(formatCalendarDate('2026-05-29T02:00:00Z', { timeZone: 'America/Bogota' })).toBe('28/5/2026');
  });

  it('calcula días restantes por día calendario, incluso en el vencimiento y el cambio de año', () => {
    const today = new Date(2026, 9, 6, 23, 30);
    expect(calendarDaysUntil('2026-10-06', today)).toBe(0);
    expect(calendarDaysUntil('2026-10-07', today)).toBe(1);
    expect(calendarDaysUntil('2026-10-05', today)).toBe(-1);
    expect(calendarDaysUntil('2027-01-01', new Date(2026, 11, 31, 21))).toBe(1);
    expect(calendarDaysUntil(null, today)).toBeNull();
    expect(calendarDaysUntil('2026-02-30', today)).toBeNull();
  });
});
