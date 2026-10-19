import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createDb } from '../../src/db/db.js';
import { analystsRepo } from '../../src/db/analystsRepo.js';
import { schedulesRepo } from '../../src/db/schedulesRepo.js';
import { closingsRepo } from '../../src/db/closingsRepo.js';
import { createApp } from '../../src/app.js';
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
  return { db, app: createApp({ db }), ana };
}

describe('/api/closing', () => {
  let ctx;
  beforeEach(() => { ctx = setup(); });

  it('GET devolve o fechamento calculado do mês', async () => {
    const res = await request(ctx.app).get('/api/closing/2026/8');
    expect(res.status).toBe(200);
    expect(res.body.saved).toBe(false);
    expect(res.body.ratesSource).toBe('default');
    expect(res.body.rates).toEqual(DEFAULT_RATES);
    expect(res.body.grandTotal).toBe(10000);
    expect(res.body.totals[0].name).toBe('Ana');
  });

  it('GET 404 quando o mês não tem escala salva', async () => {
    const res = await request(ctx.app).get('/api/closing/2030/1');
    expect(res.status).toBe(404);
  });

  it('PUT salva feriados e valores e devolve o recálculo', async () => {
    const res = await request(ctx.app).put('/api/closing/2026/8').send({
      holidays: ['2026-08-03'],
      rates: { ...DEFAULT_RATES, holiday: 13000 },
    });
    expect(res.status).toBe(200);
    expect(res.body.saved).toBe(true);
    expect(res.body.ratesSource).toBe('saved');
    expect(res.body.grandTotal).toBe(20500);

    const persisted = closingsRepo(ctx.db).get(2026, 8);
    expect(persisted.holidays).toEqual(['2026-08-03']);
    expect(persisted.rates.holiday).toBe(13000);
  });

  it('PUT descarta feriado com data fora do mês', async () => {
    const res = await request(ctx.app).put('/api/closing/2026/8').send({
      holidays: ['2026-09-07', '2026-08-03', 'lixo'],
      rates: DEFAULT_RATES,
    });
    expect(res.status).toBe(200);
    expect(res.body.holidays).toEqual(['2026-08-03']);
  });

  it('PUT rejeita valor negativo ou não inteiro', async () => {
    const res = await request(ctx.app).put('/api/closing/2026/8').send({
      holidays: [],
      rates: { ...DEFAULT_RATES, weekday: -1, friday: 100.5 },
    });
    expect(res.status).toBe(400);
    expect(res.body.fields).toContain('rates.weekday');
    expect(res.body.fields).toContain('rates.friday');
  });

  it('PUT rejeita corpo sem rates', async () => {
    const res = await request(ctx.app).put('/api/closing/2026/8').send({ holidays: [] });
    expect(res.status).toBe(400);
    expect(res.body.fields).toHaveLength(5);
  });

  it('PUT 404 quando o mês não tem escala salva', async () => {
    const res = await request(ctx.app).put('/api/closing/2030/1')
      .send({ holidays: [], rates: DEFAULT_RATES });
    expect(res.status).toBe(404);
  });

  it('PUT prioriza o 404 sobre a validação dos valores', async () => {
    const res = await request(ctx.app).put('/api/closing/2030/1')
      .send({ holidays: [], rates: { ...DEFAULT_RATES, weekday: -1 } });
    expect(res.status).toBe(404);
  });

  it('mês seguinte herda os valores do mês já fechado', async () => {
    await request(ctx.app).put('/api/closing/2026/8')
      .send({ holidays: [], rates: { ...DEFAULT_RATES, weekday: 7000 } });

    schedulesRepo(ctx.db).save({
      year: 2026, month: 9,
      days: [{ date: '2026-09-01', weekday: 2, weekend: false, analystId: ctx.ana.id }],
    });

    const res = await request(ctx.app).get('/api/closing/2026/9');
    expect(res.status).toBe(200);
    expect(res.body.ratesSource).toBe('inherited');
    expect(res.body.rates.weekday).toBe(7000);
    expect(res.body.grandTotal).toBe(7000);
  });
});
