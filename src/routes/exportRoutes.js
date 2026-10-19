import { Router } from 'express';
import { analystsRepo } from '../db/analystsRepo.js';
import { schedulesRepo } from '../db/schedulesRepo.js';
import { buildXlsx } from '../export/buildXlsx.js';
import { closingsRepo } from '../db/closingsRepo.js';
import { buildClosing } from '../closing/closingService.js';
import { buildClosingXlsx } from '../export/buildClosingXlsx.js';
import { pad2 } from '../scheduling/dates.js';
import { invalidRateKeys } from '../closing/rates.js';

export function exportRoutes({ db }) {
  const router = Router();
  const analysts = analystsRepo(db);
  const schedules = schedulesRepo(db);
  const closings = closingsRepo(db);

  router.get('/xlsx', async (req, res) => {
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    const schedule = schedules.get(year, month);
    if (!schedule) return res.status(404).json({ error: 'not found' });

    const buffer = await buildXlsx(schedule, analysts.list());
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="plantao-${year}-${month}.xlsx"`);
    res.send(Buffer.from(buffer));
  });

  router.get('/closing.xlsx', async (req, res) => {
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    // Usa os valores/feriados resolvidos: baixar sem ter salvo funciona e
    // usa os valores herdados.
    const closing = buildClosing(db, year, month);
    if (!closing) return res.status(404).json({ error: 'not found' });

    const buffer = await buildClosingXlsx(closing);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="fechamento-${year}-${pad2(month)}.xlsx"`);
    res.send(Buffer.from(buffer));
  });

  router.get('/backup', (req, res) => {
    res.json({ analysts: analysts.list(), schedules: schedules.all(), closings: closings.all() });
  });

  router.post('/backup/import', (req, res) => {
    const incomingAnalysts = Array.isArray(req.body?.analysts) ? req.body.analysts : [];
    const incomingSchedules = Array.isArray(req.body?.schedules) ? req.body.schedules : [];
    const incomingClosings = Array.isArray(req.body?.closings) ? req.body.closings : [];

    // Um fechamento com valores inválidos pagaria R$ 0,00 em silêncio: recusa
    // o import inteiro antes de apagar qualquer coisa.
    const closingFields = [];
    incomingClosings.forEach((c, i) => {
      for (const key of invalidRateKeys(c?.rates)) closingFields.push(`closings[${i}].rates.${key}`);
    });
    if (closingFields.length) return res.status(400).json({ error: 'invalid', fields: closingFields });

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM analysts').run();
      db.prepare('DELETE FROM schedules').run();
      db.prepare('DELETE FROM closings').run();

      const idMap = new Map();
      for (const a of incomingAnalysts) {
        const created = analysts.create({
          name: a.name,
          availability: a.availability,
          city: a.city ?? '',
          active: a.active !== false,
        });
        if (a.id != null) idMap.set(a.id, created.id);
      }

      for (const s of incomingSchedules) {
        const days = (s.days ?? []).map((d) => ({
          ...d,
          analystId: d.analystId == null ? null : (idMap.get(d.analystId) ?? null),
        }));
        schedules.save({ year: s.year, month: s.month, days });
      }

      // Fechamentos não referenciam analystId, então não usam o idMap.
      for (const c of incomingClosings) {
        closings.save({
          year: c.year,
          month: c.month,
          holidays: c.holidays ?? [],
          rates: c.rates,
        });
      }
    });
    tx();

    res.json({ ok: true });
  });

  return router;
}
