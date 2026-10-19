import { describe, it, expect } from 'vitest';
import { substituteAnalyst } from '../../src/scheduling/substitute.js';

const analysts = [
  { id: 1, name: 'A', availability: 'any', city: 'Cidade Exemplo A', active: true },
  { id: 2, name: 'B', availability: 'any', city: 'Cidade Exemplo A', active: true },
  { id: 3, name: 'C', availability: 'weekday', city: 'Cidade Exemplo A', active: true },
];

function day(date, weekend, analystId) {
  return { date, weekday: weekend ? 6 : 3, weekend, analystId };
}

describe('substituteAnalyst', () => {
  it('troca o analista em todos os seus dias', () => {
    // dia do meio pertence a um 3º analista (id 3), então não há conflito de adjacência
    const days = [day('2026-07-01', false, 1), day('2026-07-02', false, 3), day('2026-07-03', false, 1)];
    const r = substituteAnalyst({ days, analysts, fromId: 1, toId: 2 });
    expect(r.days.some((d) => d.analystId === 1)).toBe(false);
    expect(r.conflicts).toEqual([]);
  });

  it('respeita o intervalo [from, to]', () => {
    const days = [day('2026-07-01', false, 1), day('2026-07-10', false, 1), day('2026-07-20', false, 1)];
    const r = substituteAnalyst({ days, analysts, fromId: 1, toId: 2, from: '2026-07-05', to: '2026-07-15' });
    expect(r.days.find((d) => d.date === '2026-07-01').analystId).toBe(1); // fora do intervalo
    expect(r.days.find((d) => d.date === '2026-07-10').analystId).toBe(2); // dentro
    expect(r.days.find((d) => d.date === '2026-07-20').analystId).toBe(1); // fora
  });

  it('marca conflito quando o substituto não pode cobrir o dia (disponibilidade)', () => {
    const days = [day('2026-07-04', true, 1)]; // sábado
    const r = substituteAnalyst({ days, analysts, fromId: 1, toId: 3 }); // C é weekday
    expect(r.days[0].analystId).toBeNull();
    expect(r.conflicts).toEqual(['2026-07-04']);
  });

  it('marca conflito quando geraria dias consecutivos do substituto', () => {
    const days = [day('2026-07-01', false, 2), day('2026-07-02', false, 1)];
    const r = substituteAnalyst({ days, analysts, fromId: 1, toId: 2 });
    // dia 02 viraria do 2, mas dia 01 já é do 2 -> consecutivo -> conflito
    expect(r.days[1].analystId).toBeNull();
    expect(r.conflicts).toEqual(['2026-07-02']);
  });

  it('não cria dias consecutivos ao substituir dois dias seguidos do mesmo analista', () => {
    // analista 1 tem dois dias seguidos; ao trocar por 2, o 2º dia viraria consecutivo -> conflito
    const days = [day('2026-07-01', false, 1), day('2026-07-02', false, 1)];
    const r = substituteAnalyst({ days, analysts, fromId: 1, toId: 2 });
    expect(r.days[0].analystId).toBe(2);
    expect(r.days[1].analystId).toBeNull();
    expect(r.conflicts).toEqual(['2026-07-02']);
  });

  it('não muta a lista original', () => {
    const days = [day('2026-07-01', false, 1)];
    const copy = JSON.parse(JSON.stringify(days));
    substituteAnalyst({ days, analysts, fromId: 1, toId: 2 });
    expect(days).toEqual(copy);
  });
});
