import { describe, it, expect } from 'vitest';
import { buildWeeks } from '../../public/js/calendarGrid.js';

function day(date, weekday, weekend = false, analystId = null) {
  return { date, weekday, weekend, analystId };
}

describe('buildWeeks', () => {
  it('posiciona o primeiro dia na coluna do seu weekday', () => {
    // 2026-07-01 é quarta (weekday 3)
    const weeks = buildWeeks([day('2026-07-01', 3), day('2026-07-02', 4)]);
    expect(weeks[0][0]).toBeNull(); // Domingo vazio
    expect(weeks[0][2]).toBeNull(); // Terça vazio
    expect(weeks[0][3].date).toBe('2026-07-01'); // Quarta
    expect(weeks[0][4].date).toBe('2026-07-02'); // Quinta
  });

  it('quebra para nova semana após o sábado', () => {
    // Sábado (weekday 6) preenche a última coluna e o próximo dia inicia nova linha
    const weeks = buildWeeks([day('2026-07-04', 6), day('2026-07-05', 0)]);
    expect(weeks).toHaveLength(2);
    expect(weeks[0][6].date).toBe('2026-07-04');
    expect(weeks[1][0].date).toBe('2026-07-05');
  });

  it('não muta a entrada', () => {
    const input = [day('2026-07-01', 3)];
    const copy = JSON.parse(JSON.stringify(input));
    buildWeeks(input);
    expect(input).toEqual(copy);
  });
});
