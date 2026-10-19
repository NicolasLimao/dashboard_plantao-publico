import { describe, it, expect } from 'vitest';
import { createDb } from '../../src/db/db.js';
import { analystsRepo } from '../../src/db/analystsRepo.js';
import { schedulesRepo } from '../../src/db/schedulesRepo.js';
import { closingsRepo } from '../../src/db/closingsRepo.js';
import { buildClosing, resolveRates } from '../../src/closing/closingService.js';
import { DEFAULT_RATES } from '../../src/closing/rates.js';

function setup() {
  const db = createDb(':memory:');
  const ana = analystsRepo(db).create({ name: 'Ana', availability: 'any', city: '' });
  schedulesRepo(db).save({
    year: 2026, month: 8,
    days: [
      { date: '2026-08-01', weekday: 6, weekend: true, analystId: ana.id },
      { date: '2026-08-03', weekday: 1, weekend: false, analystId: ana.id },
    ],
  });
  return { db, ana };
}

describe('resolveRates', () => {
  it('usa os valores padrão quando não há nenhum fechamento salvo', () => {
    const db = createDb(':memory:');
    const r = resolveRates(closingsRepo(db), 2026, 8);
    expect(r.rates).toEqual(DEFAULT_RATES);
    expect(r.holidays).toEqual([]);
    expect(r.saved).toBe(false);
    expect(r.ratesSource).toBe('default');
  });

  it('usa os valores salvos do próprio mês quando existem', () => {
    const db = createDb(':memory:');
    const rates = { ...DEFAULT_RATES, weekday: 7000 };
    closingsRepo(db).save({ year: 2026, month: 8, holidays: ['2026-08-07'], rates });

    const r = resolveRates(closingsRepo(db), 2026, 8);
    expect(r.rates.weekday).toBe(7000);
    expect(r.holidays).toEqual(['2026-08-07']);
    expect(r.saved).toBe(true);
    expect(r.ratesSource).toBe('saved');
  });

  it('herda os valores do mês fechado anterior, sem herdar os feriados dele', () => {
    const db = createDb(':memory:');
    closingsRepo(db).save({
      year: 2026, month: 7, holidays: ['2026-07-09'], rates: { ...DEFAULT_RATES, weekday: 6000 },
    });

    const r = resolveRates(closingsRepo(db), 2026, 8);
    expect(r.rates.weekday).toBe(6000);
    expect(r.holidays).toEqual([]); // feriado é de cada mês
    expect(r.saved).toBe(false);
    expect(r.ratesSource).toBe('inherited');
  });
});

describe('buildClosing', () => {
  it('devolve null quando não há escala salva para o mês', () => {
    const { db } = setup();
    expect(buildClosing(db, 2030, 1)).toBeNull();
  });

  it('monta o payload completo do mês', () => {
    const { db, ana } = setup();
    const payload = buildClosing(db, 2026, 8);

    expect(payload.year).toBe(2026);
    expect(payload.month).toBe(8);
    expect(payload.saved).toBe(false);
    expect(payload.ratesSource).toBe('default');
    expect(payload.rates).toEqual(DEFAULT_RATES);
    expect(payload.lines).toHaveLength(2);
    expect(payload.totals).toHaveLength(1);
    expect(payload.totals[0].analystId).toBe(ana.id);
    expect(payload.unassigned).toEqual([]);
    expect(payload.grandTotal).toBe(10000);
  });

  it('aplica os feriados e valores salvos do mês', () => {
    const { db } = setup();
    closingsRepo(db).save({
      year: 2026, month: 8,
      holidays: ['2026-08-03'],
      rates: { ...DEFAULT_RATES, holiday: 13000 },
    });

    const payload = buildClosing(db, 2026, 8);
    expect(payload.saved).toBe(true);
    expect(payload.holidays).toEqual(['2026-08-03']);
    expect(payload.grandTotal).toBe(20500);
  });
});
