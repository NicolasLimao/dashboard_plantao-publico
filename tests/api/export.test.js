import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import ExcelJS from 'exceljs';
import { createDb } from '../../src/db/db.js';
import { analystsRepo } from '../../src/db/analystsRepo.js';
import { schedulesRepo } from '../../src/db/schedulesRepo.js';
import { createApp } from '../../src/app.js';

function setup() {
  const db = createDb(':memory:');
  const a = analystsRepo(db);
  const nic = a.create({ name: 'Nicolas', availability: 'any', city: 'Cidade Exemplo A' });
  schedulesRepo(db).save({
    year: 2026, month: 7,
    days: [{ date: '2026-07-01', weekday: 3, weekend: false, analystId: nic.id }],
  });
  return createApp({ db });
}

describe('/api/export', () => {
  let app;
  beforeEach(() => { app = setup(); });

  it('exporta xlsx da escala salva', async () => {
    const res = await request(app).get('/api/export/xlsx?year=2026&month=7')
      .buffer(true).parse((r, cb) => {
        const chunks = [];
        r.on('data', (c) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(res.body);
    expect(wb.worksheets[0].getCell('A1').value).toBe('Domingo');
  });

  it('404 ao exportar mês sem escala', async () => {
    const res = await request(app).get('/api/export/xlsx?year=2030&month=1');
    expect(res.status).toBe(404);
  });

  it('backup exporta e reimporta os dados', async () => {
    const dump = await request(app).get('/api/export/backup');
    expect(dump.status).toBe(200);
    expect(dump.body.analysts).toHaveLength(1);
    expect(dump.body.schedules).toHaveLength(1);

    const imported = await request(app).post('/api/export/backup/import')      .send({
        analysts: [{ name: 'Novo', availability: 'weekend', city: 'Cidade Exemplo A', active: true }],
        schedules: [],
      });
    expect(imported.status).toBe(200);

    const list = await request(app).get('/api/analysts');
    expect(list.body).toHaveLength(1);
    expect(list.body[0].name).toBe('Novo');
  });

  it('preserva a referência analista↔escala ao reimportar backup', async () => {
    const dump = await request(app).get('/api/export/backup');
    expect(dump.body.analysts).toHaveLength(1);
    const originalDay = dump.body.schedules[0].days[0];
    expect(originalDay.analystId).toBe(dump.body.analysts[0].id);

    // reimporta o mesmo backup: wipe + recreate gera ids novos (AUTOINCREMENT não reusa)
    const imp = await request(app).post('/api/export/backup/import').send(dump.body);
    expect(imp.status).toBe(200);

    const analystsAfter = await request(app).get('/api/analysts');
    const nic = analystsAfter.body.find((a) => a.name === 'Nicolas');
    const sched = await request(app).get('/api/schedules/2026/7');
    expect(sched.body.days[0].analystId).toBe(nic.id);
  });

  it('exporta o xlsx do fechamento do mês', async () => {
    const res = await request(app).get('/api/export/closing.xlsx?year=2026&month=7')
      .buffer(true).parse((r, cb) => {
        const chunks = [];
        r.on('data', (c) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('fechamento-2026-07.xlsx');

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(res.body);
    expect(wb.worksheets.map((ws) => ws.name)).toEqual(['Resumo', 'Detalhamento']);
    expect(wb.getWorksheet('Resumo').getCell('A2').value).toBe('Nicolas');
  });

  it('404 ao exportar fechamento de mês sem escala', async () => {
    const res = await request(app).get('/api/export/closing.xlsx?year=2030&month=1');
    expect(res.status).toBe(404);
  });

  it('backup leva e traz de volta os fechamentos', async () => {
    await request(app).put('/api/closing/2026/7').send({
      holidays: ['2026-07-09'],
      rates: { weekday: 6000, friday: 5000, saturday: 7500, sunday: 10000, holiday: 12500 },
    });

    const dump = await request(app).get('/api/export/backup');
    expect(dump.body.closings).toHaveLength(1);
    expect(dump.body.closings[0].holidays).toEqual(['2026-07-09']);

    const imported = await request(app).post('/api/export/backup/import').send(dump.body);
    expect(imported.status).toBe(200);

    const again = await request(app).get('/api/export/backup');
    expect(again.body.closings).toHaveLength(1);
    expect(again.body.closings[0].rates.weekday).toBe(6000);
  });

  it('importa backup antigo, sem a chave closings', async () => {
    const res = await request(app).post('/api/export/backup/import').send({
      analysts: [{ name: 'Novo', availability: 'any', city: '', active: true }],
      schedules: [],
    });
    expect(res.status).toBe(200);
    const dump = await request(app).get('/api/export/backup');
    expect(dump.body.closings).toEqual([]);
  });

  it('recusa backup cujo fechamento tem valores incompletos, sem apagar nada', async () => {
    const res = await request(app).post('/api/export/backup/import').send({
      analysts: [{ name: 'Novo', availability: 'any', city: '', active: true }],
      schedules: [],
      closings: [{ year: 2026, month: 7, holidays: [], rates: { weekday: 2500 } }],
    });
    expect(res.status).toBe(400);
    expect(res.body.fields).toContain('closings[0].rates.friday');

    // nada foi apagado: o analista original continua lá
    const list = await request(app).get('/api/analysts');
    expect(list.body).toHaveLength(1);
    expect(list.body[0].name).toBe('Nicolas');
  });
});
