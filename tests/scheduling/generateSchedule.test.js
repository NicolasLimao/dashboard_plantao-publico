import { describe, it, expect } from 'vitest';
import { generateSchedule, sameCity } from '../../src/scheduling/generateSchedule.js';

describe('sameCity — proximidade tolerante a formatação', () => {
  it('ignora maiúsculas/minúsculas e espaços', () => {
    expect(sameCity('Bela Vista', 'bela vista')).toBe(true);
    expect(sameCity('CENTRO ', ' Centro')).toBe(true);
    expect(sameCity('Bela  Vista', 'Bela Vista')).toBe(true);
  });
  it('bairros diferentes não agrupam', () => {
    expect(sameCity('Bela Vista', 'Centro')).toBe(false);
  });
  it('vazio/nulo nunca agrupa', () => {
    expect(sameCity('', '')).toBe(false);
    expect(sameCity('Centro', '')).toBe(false);
    expect(sameCity(null, undefined)).toBe(false);
  });
});

function people(n, availability = 'any', city = 'Cidade Exemplo A') {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1, name: `P${i + 1}`, availability, city, active: true,
  }));
}

describe('generateSchedule — básico', () => {
  it('preenche todos os dias quando há analistas suficientes', () => {
    const r = generateSchedule({ year: 2026, month: 7, analysts: people(5) });
    expect(r.days).toHaveLength(31);
    expect(r.unfilled).toEqual([]);
    expect(r.days.every((d) => d.analystId !== null)).toBe(true);
  });

  it('respeita disponibilidade: weekday nunca no fim de semana', () => {
    const analysts = [
      ...people(3, 'weekday'),
      { id: 99, name: 'W', availability: 'weekend', city: 'Cidade Exemplo A', active: true },
    ];
    const r = generateSchedule({ year: 2026, month: 7, analysts });
    for (const d of r.days) {
      if (d.weekend && d.analystId !== null) {
        const a = analysts.find((x) => x.id === d.analystId);
        expect(a.availability).not.toBe('weekday');
      }
    }
  });

  it('respeita disponibilidade: weekend nunca em dia útil', () => {
    const analysts = [
      ...people(3, 'weekday'),
      { id: 99, name: 'W', availability: 'weekend', city: 'Cidade Exemplo A', active: true },
    ];
    const r = generateSchedule({ year: 2026, month: 7, analysts });
    const weekdayAssignedToW = r.days.some((d) => !d.weekend && d.analystId === 99);
    expect(weekdayAssignedToW).toBe(false);
  });

  it('ignora analistas inativos', () => {
    const analysts = [
      ...people(3),
      { id: 50, name: 'Off', availability: 'any', city: 'Cidade Exemplo A', active: false },
    ];
    const r = generateSchedule({ year: 2026, month: 7, analysts });
    expect(r.days.some((d) => d.analystId === 50)).toBe(false);
  });

  it('nunca escala o mesmo analista em dias consecutivos', () => {
    const r = generateSchedule({ year: 2026, month: 7, analysts: people(4) });
    for (let i = 1; i < r.days.length; i++) {
      const prev = r.days[i - 1].analystId;
      const cur = r.days[i].analystId;
      if (prev !== null && cur !== null) expect(cur).not.toBe(prev);
    }
  });
});

describe('generateSchedule — justiça, proximidade e vazios', () => {
  it('distribui os fins de semana de forma equilibrada', () => {
    const analysts = people(6, 'any');
    const r = generateSchedule({ year: 2026, month: 7, analysts });
    const weekendCount = new Map(analysts.map((a) => [a.id, 0]));
    for (const d of r.days) {
      if (d.weekend && d.analystId !== null) {
        weekendCount.set(d.analystId, weekendCount.get(d.analystId) + 1);
      }
    }
    const counts = [...weekendCount.values()];
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it('equilibra o total de plantões', () => {
    const analysts = people(6, 'any');
    const r = generateSchedule({ year: 2026, month: 7, analysts });
    const total = new Map(analysts.map((a) => [a.id, 0]));
    for (const d of r.days) {
      if (d.analystId !== null) total.set(d.analystId, total.get(d.analystId) + 1);
    }
    const counts = [...total.values()];
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it('em empate de justiça, prefere a mesma cidade do dia anterior', () => {
    // 2 analistas de cada cidade, todos "any"; começa igual para todos.
    const analysts = [
      { id: 1, name: 'A', availability: 'any', city: 'Cidade Exemplo A', active: true },
      { id: 2, name: 'B', availability: 'any', city: 'Cidade Exemplo A', active: true },
      { id: 3, name: 'C', availability: 'any', city: 'Cidade Exemplo B', active: true },
      { id: 4, name: 'D', availability: 'any', city: 'Cidade Exemplo B', active: true },
    ];
    const r = generateSchedule({ year: 2026, month: 7, analysts });
    // do 2º dia em diante, sempre que o anterior teve cidade X e havia candidato
    // da cidade X com mesma pontuação, o escolhido deve ser da mesma cidade.
    // Verificação prática: a maioria das transições mantém a cidade.
    let sameCity = 0;
    let transitions = 0;
    for (let i = 1; i < r.days.length; i++) {
      const prev = analysts.find((a) => a.id === r.days[i - 1].analystId);
      const cur = analysts.find((a) => a.id === r.days[i].analystId);
      if (prev && cur) {
        transitions++;
        if (prev.city === cur.city) sameCity++;
      }
    }
    expect(sameCity / transitions).toBeGreaterThan(0.5);
  });

  it('marca dias sem candidato em unfilled (nenhum analista de fim de semana)', () => {
    const analysts = people(3, 'weekday');
    const r = generateSchedule({ year: 2026, month: 7, analysts });
    const weekendDays = r.days.filter((d) => d.weekend);
    expect(weekendDays.every((d) => d.analystId === null)).toBe(true);
    expect(r.unfilled.length).toBe(weekendDays.length);
    expect(r.unfilled).toContain('2026-07-04'); // sábado
  });
});
