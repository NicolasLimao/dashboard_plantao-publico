import { Router } from 'express';
import { closingsRepo } from '../db/closingsRepo.js';
import { RATE_KEYS, invalidRateKeys } from '../closing/rates.js';
import { buildClosing } from '../closing/closingService.js';
import { pad2 } from '../scheduling/dates.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Mantém só datas ISO do próprio mês, sem repetição e em ordem. Data fora do
// mês é descartada em silêncio, não rejeitada.
function normalizeHolidays(holidays, year, month) {
  const prefix = `${year}-${pad2(month)}-`;
  const list = Array.isArray(holidays) ? holidays : [];
  const valid = list.filter((d) => typeof d === 'string' && ISO_DATE.test(d) && d.startsWith(prefix));
  return [...new Set(valid)].sort();
}

export function closingRoutes({ db }) {
  const router = Router();

  router.get('/:year/:month', (req, res) => {
    const payload = buildClosing(db, Number(req.params.year), Number(req.params.month));
    if (!payload) return res.status(404).json({ error: 'not found' });
    res.json(payload);
  });

  router.put('/:year/:month', (req, res) => {
    const year = Number(req.params.year);
    const month = Number(req.params.month);
    if (!buildClosing(db, year, month)) return res.status(404).json({ error: 'not found' });

    const fields = invalidRateKeys(req.body?.rates).map((key) => `rates.${key}`);
    if (fields.length) return res.status(400).json({ error: 'invalid', fields });

    closingsRepo(db).save({
      year,
      month,
      holidays: normalizeHolidays(req.body?.holidays, year, month),
      rates: Object.fromEntries(RATE_KEYS.map((key) => [key, req.body.rates[key]])),
    });

    res.json(buildClosing(db, year, month));
  });

  return router;
}
