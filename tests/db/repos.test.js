import { describe, it, expect } from 'vitest';
import { createDb } from '../../src/db/db.js';
import { analystsRepo } from '../../src/db/analystsRepo.js';
import { schedulesRepo } from '../../src/db/schedulesRepo.js';
import { closingsRepo } from '../../src/db/closingsRepo.js';

describe('analystsRepo', () => {
  it('cria, lista, atualiza e remove analistas', () => {
    const db = createDb(':memory:');
    const repo = analystsRepo(db);

    const a = repo.create({ name: 'Nicolas', availability: 'any', city: 'Cidade Exemplo A' });
    expect(a.id).toBeTypeOf('number');
    expect(a.active).toBe(true);

    repo.create({ name: 'Moyses', availability: 'weekend', city: 'Cidade Exemplo A', active: false });
    const all = repo.list();
    expect(all).toHaveLength(2);
    expect(all[0].name).toBe('Moyses'); // ordenado por nome

    const updated = repo.update(a.id, { name: 'Nicolas L', availability: 'weekday', city: 'Cidade Exemplo B', active: false });
    expect(updated.name).toBe('Nicolas L');
    expect(updated.availability).toBe('weekday');
    expect(updated.active).toBe(false);

    repo.remove(a.id);
    expect(repo.get(a.id)).toBeNull();
    expect(repo.list()).toHaveLength(1);
  });
});

describe('schedulesRepo', () => {
  it('salva (upsert) e carrega a escala do mês', () => {
    const db = createDb(':memory:');
    const repo = schedulesRepo(db);
    expect(repo.get(2026, 7)).toBeNull();

    const days = [{ date: '2026-07-01', weekday: 3, weekend: false, analystId: 1 }];
    repo.save({ year: 2026, month: 7, days });
    expect(repo.get(2026, 7).days).toEqual(days);

    // upsert substitui
    const days2 = [{ date: '2026-07-01', weekday: 3, weekend: false, analystId: 2 }];
    repo.save({ year: 2026, month: 7, days: days2 });
    expect(repo.get(2026, 7).days).toEqual(days2);
    expect(repo.all()).toHaveLength(1);
  });

  it('listPeriods retorna ano/mês salvos, mais recentes primeiro', () => {
    const db = createDb(':memory:');
    const repo = schedulesRepo(db);
    repo.save({ year: 2026, month: 7, days: [] });
    repo.save({ year: 2026, month: 8, days: [] });
    repo.save({ year: 2025, month: 12, days: [] });
    expect(repo.listPeriods()).toEqual([
      { year: 2026, month: 8 },
      { year: 2026, month: 7 },
      { year: 2025, month: 12 },
    ]);
  });
});

describe('closingsRepo', () => {
  const rates = { weekday: 2500, friday: 5000, saturday: 7500, sunday: 10000, holiday: 12500 };

  it('salva (upsert) e carrega o fechamento do mês', () => {
    const db = createDb(':memory:');
    const repo = closingsRepo(db);
    expect(repo.get(2026, 8)).toBeNull();

    repo.save({ year: 2026, month: 8, holidays: ['2026-08-07'], rates });
    expect(repo.get(2026, 8)).toEqual({ year: 2026, month: 8, holidays: ['2026-08-07'], rates });

    // upsert substitui
    repo.save({ year: 2026, month: 8, holidays: [], rates: { ...rates, weekday: 6000 } });
    expect(repo.get(2026, 8).holidays).toEqual([]);
    expect(repo.get(2026, 8).rates.weekday).toBe(6000);
    expect(repo.all()).toHaveLength(1);
  });

  it('latestUpTo devolve o fechamento mais recente que não é posterior ao mês pedido', () => {
    const db = createDb(':memory:');
    const repo = closingsRepo(db);
    repo.save({ year: 2026, month: 3, holidays: [], rates: { ...rates, weekday: 2500 } });
    repo.save({ year: 2026, month: 9, holidays: [], rates: { ...rates, weekday: 7000 } }); // reajuste posterior

    // agosto herda de março, não do reajuste de setembro
    expect(repo.latestUpTo(2026, 8).rates.weekday).toBe(2500);
    // outubro herda de setembro
    expect(repo.latestUpTo(2026, 10).rates.weekday).toBe(7000);
    // o próprio mês conta como "não posterior"
    expect(repo.latestUpTo(2026, 9).rates.weekday).toBe(7000);
    // antes de tudo: nada a herdar
    expect(repo.latestUpTo(2026, 1)).toBeNull();
  });

  it('compara ano e mês corretamente na virada do ano', () => {
    const db = createDb(':memory:');
    const repo = closingsRepo(db);
    repo.save({ year: 2025, month: 12, holidays: [], rates: { ...rates, weekday: 5000 } });
    repo.save({ year: 2026, month: 1, holidays: [], rates: { ...rates, weekday: 2500 } });
    expect(repo.latestUpTo(2026, 1).rates.weekday).toBe(2500);
    expect(repo.latestUpTo(2025, 12).rates.weekday).toBe(5000);
  });
});
