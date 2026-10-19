import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createDb } from '../../src/db/db.js';
import { analystsRepo } from '../../src/db/analystsRepo.js';
import { createApp } from '../../src/app.js';

function setup() {
  const db = createDb(':memory:');
  const repo = analystsRepo(db);
  repo.create({ name: 'A', availability: 'any', city: 'Cidade Exemplo A' });
  repo.create({ name: 'B', availability: 'any', city: 'Cidade Exemplo A' });
  repo.create({ name: 'C', availability: 'any', city: 'Cidade Exemplo B' });
  return createApp({ db });
}

describe('/api/schedules', () => {
  let app;
  beforeEach(() => { app = setup(); });

  it('lista os meses com escala salva (GET /)', async () => {
    // sem nada salvo
    const vazio = await request(app).get('/api/schedules');
    expect(vazio.status).toBe(200);
    expect(vazio.body).toEqual([]);

    await request(app).put('/api/schedules/2026/7').send({ days: [] });
    await request(app).put('/api/schedules/2026/8').send({ days: [] });
    const lista = await request(app).get('/api/schedules');
    expect(lista.body).toEqual([{ year: 2026, month: 8 }, { year: 2026, month: 7 }]);
  });

  it('gera escala para o mês sem persistir', async () => {
    const gen = await request(app).post('/api/schedules/generate')      .send({ year: 2026, month: 7 });
    expect(gen.status).toBe(200);
    expect(gen.body.days).toHaveLength(31);
    // não foi salvo ainda
    const get = await request(app).get('/api/schedules/2026/7');
    expect(get.status).toBe(404);
  });

  it('salva e obtém a escala', async () => {
    const gen = await request(app).post('/api/schedules/generate')      .send({ year: 2026, month: 7 });
    const save = await request(app).put('/api/schedules/2026/7')      .send({ days: gen.body.days });
    expect(save.status).toBe(200);

    const get = await request(app).get('/api/schedules/2026/7');
    expect(get.status).toBe(200);
    expect(get.body.days).toHaveLength(31);
  });

  it('substitui um analista na escala salva', async () => {
    const gen = await request(app).post('/api/schedules/generate')      .send({ year: 2026, month: 7 });
    await request(app).put('/api/schedules/2026/7').send({ days: gen.body.days });

    const firstId = gen.body.days.find((d) => d.analystId !== null).analystId;
    const sub = await request(app).post('/api/schedules/2026/7/substitute')      .send({ fromId: firstId, toId: firstId === 1 ? 2 : 1 });
    expect(sub.status).toBe(200);
    expect(sub.body).toHaveProperty('days');
    expect(sub.body).toHaveProperty('conflicts');
  });

  it('substitute em mês sem escala salva retorna 404', async () => {
    const res = await request(app).post('/api/schedules/2026/8/substitute')      .send({ fromId: 1, toId: 2 });
    expect(res.status).toBe(404);
  });
});
