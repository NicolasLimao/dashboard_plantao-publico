import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createDb } from '../../src/db/db.js';
import { createApp } from '../../src/app.js';

function setup() {
  return createApp({ db: createDb(':memory:') });
}

describe('/api/analysts', () => {
  let app;
  beforeEach(() => { app = setup(); });

  it('cria e lista analistas', async () => {
    const create = await request(app).post('/api/analysts')      .send({ name: 'Nicolas', availability: 'any', city: 'Cidade Exemplo A' });
    expect(create.status).toBe(201);
    expect(create.body.active).toBe(true);

    const list = await request(app).get('/api/analysts');
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
  });

  it('valida availability inválida', async () => {
    const res = await request(app).post('/api/analysts')      .send({ name: 'X', availability: 'sempre' });
    expect(res.status).toBe(400);
    expect(res.body.fields).toContain('availability');
  });

  it('atualiza e remove', async () => {
    const a = (await request(app).post('/api/analysts')      .send({ name: 'A', availability: 'any' })).body;

    const upd = await request(app).put(`/api/analysts/${a.id}`)      .send({ name: 'A2', availability: 'weekday', city: 'Cidade Exemplo B', active: false });
    expect(upd.body.name).toBe('A2');
    expect(upd.body.active).toBe(false);

    const del = await request(app).delete(`/api/analysts/${a.id}`);
    expect(del.status).toBe(204);

    const list = await request(app).get('/api/analysts');
    expect(list.body).toHaveLength(0);
  });

  it('404 ao atualizar id inexistente', async () => {
    const res = await request(app).put('/api/analysts/999')      .send({ name: 'A', availability: 'any' });
    expect(res.status).toBe(404);
  });
});
