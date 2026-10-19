import { describe, it, expect } from 'vitest';
import { pad2, daysInMonth, monthDates } from '../../src/scheduling/dates.js';

describe('dates', () => {
  it('pad2 preenche com zero', () => {
    expect(pad2(3)).toBe('03');
    expect(pad2(12)).toBe('12');
  });

  it('daysInMonth conhece julho/2026 (31 dias)', () => {
    expect(daysInMonth(2026, 7)).toBe(31);
    expect(daysInMonth(2024, 2)).toBe(29); // bissexto
    expect(daysInMonth(2026, 2)).toBe(28);
  });

  it('monthDates gera todos os dias com weekday/weekend corretos', () => {
    const days = monthDates(2026, 7);
    expect(days).toHaveLength(31);
    expect(days[0]).toEqual({ iso: '2026-07-01', weekday: 3, weekend: false }); // quarta
    expect(days[3]).toEqual({ iso: '2026-07-04', weekday: 6, weekend: true });  // sábado
    expect(days[4]).toEqual({ iso: '2026-07-05', weekday: 0, weekend: true });  // domingo
  });
});
