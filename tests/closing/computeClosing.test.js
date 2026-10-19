import { describe, it, expect } from 'vitest';
import { computeClosing } from '../../src/closing/computeClosing.js';
import { DEFAULT_RATES } from '../../src/closing/rates.js';

// Agosto/2026: dia 1 é sábado.
const analysts = [
  { id: 1, name: 'Ana', availability: 'any', city: '', active: true },
  { id: 2, name: 'Bruno', availability: 'any', city: '', active: false }, // inativo
];

const schedule = {
  year: 2026,
  month: 8,
  days: [
    { date: '2026-08-01', weekday: 6, weekend: true, analystId: 1 },
    { date: '2026-08-02', weekday: 0, weekend: true, analystId: 2 },
    { date: '2026-08-03', weekday: 1, weekend: false, analystId: 1 },
    { date: '2026-08-04', weekday: 2, weekend: false, analystId: null }, // sem responsável
    { date: '2026-08-07', weekday: 5, weekend: false, analystId: 2 },   // sexta   100,00
  ],
};

describe('computeClosing', () => {
  it('soma por analista, contando cada tipo de turno', () => {
    const r = computeClosing({ schedule, analysts, rates: DEFAULT_RATES, holidays: [] });

    expect(r.totals.map((t) => t.name)).toEqual(['Ana', 'Bruno']); // ordenado por nome

    const ana = r.totals[0];
    expect(ana.counts).toEqual({ weekday: 1, friday: 0, saturday: 1, sunday: 0, holiday: 0 });
    expect(ana.shifts).toBe(2);
    expect(ana.amount).toBe(10000);

    expect(r.grandTotal).toBe(25000);
  });

  it('mantém no fechamento o analista inativo que trabalhou', () => {
    const r = computeClosing({ schedule, analysts, rates: DEFAULT_RATES, holidays: [] });
    const bruno = r.totals.find((t) => t.name === 'Bruno');
    expect(bruno).toBeDefined();
    expect(bruno.amount).toBe(15000);
  });

  it('dia sem responsável fica fora dos totais e é listado em unassigned', () => {
    const r = computeClosing({ schedule, analysts, rates: DEFAULT_RATES, holidays: [] });
    expect(r.unassigned).toEqual(['2026-08-04']);

    const semDono = r.lines.find((l) => l.date === '2026-08-04');
    expect(semDono.analystId).toBeNull();
    expect(semDono.analystName).toBeNull();
    expect(semDono.amount).toBe(0);
    expect(r.totals.reduce((s, t) => s + t.shifts, 0)).toBe(4); // 5 dias, 1 sem dono
  });

  it('feriado sobrepõe o valor do dia da semana', () => {
    const r = computeClosing({
      schedule, analysts, rates: DEFAULT_RATES, holidays: ['2026-08-07'],
    });
    const sexta = r.lines.find((l) => l.date === '2026-08-07');
    expect(sexta.kind).toBe('holiday');
    expect(sexta.holiday).toBe(true);
    expect(sexta.amount).toBe(12500);

    const bruno = r.totals.find((t) => t.name === 'Bruno');
    expect(bruno.counts.friday).toBe(0);
    expect(bruno.counts.holiday).toBe(1);
    expect(r.grandTotal).toBe(32500);
  });

  it('feriado num dia sem responsável continua não pagando nada', () => {
    const r = computeClosing({
      schedule, analysts, rates: DEFAULT_RATES, holidays: ['2026-08-04'],
    });
    expect(r.lines.find((l) => l.date === '2026-08-04').amount).toBe(0);
    expect(r.grandTotal).toBe(25000);
  });

  it('ignora feriado com data fora do mês', () => {
    const r = computeClosing({
      schedule, analysts, rates: DEFAULT_RATES, holidays: ['2026-09-07'],
    });
    expect(r.grandTotal).toBe(25000);
  });

  it('analista excluído do cadastro aparece identificado pelo id', () => {
    const orfao = {
      year: 2026, month: 8,
      days: [{ date: '2026-08-03', weekday: 1, weekend: false, analystId: 99 }],
    };
    const r = computeClosing({ schedule: orfao, analysts, rates: DEFAULT_RATES, holidays: [] });
    expect(r.totals).toHaveLength(1);
    expect(r.totals[0].name).toBe('(analista removido #99)');
    expect(r.totals[0].amount).toBe(2500);
  });

  it('usa os valores recebidos, não os padrão', () => {
    const rates = { weekday: 6000, friday: 11000, saturday: 13000, sunday: 9000, holiday: 13000 };
    const r = computeClosing({ schedule, analysts, rates, holidays: [] });
    expect(r.grandTotal).toBe(39000); // 130 + 90 + 60 + 0 + 110
  });
});
