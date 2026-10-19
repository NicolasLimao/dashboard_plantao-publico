import { Router } from 'express';
import { analystsRepo } from '../db/analystsRepo.js';
import { schedulesRepo } from '../db/schedulesRepo.js';
import { generateSchedule } from '../scheduling/generateSchedule.js';
import { substituteAnalyst } from '../scheduling/substitute.js';

export function schedulesRoutes({ db }) {
  const router = Router();
  const analysts = analystsRepo(db);
  const schedules = schedulesRepo(db);

  router.post('/generate', (req, res) => {
    const year = Number(req.body?.year);
    const month = Number(req.body?.month);
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ error: 'year/month inválidos' });
    }
    const result = generateSchedule({ year, month, analysts: analysts.list() });
    res.json(result);
  });

  router.get('/', (req, res) => {
    res.json(schedules.listPeriods());
  });

  router.put('/:year/:month', (req, res) => {
    const year = Number(req.params.year);
    const month = Number(req.params.month);
    const days = req.body?.days;
    if (!Array.isArray(days)) return res.status(400).json({ error: 'days inválido' });
    res.json(schedules.save({ year, month, days }));
  });

  router.get('/:year/:month', (req, res) => {
    const found = schedules.get(Number(req.params.year), Number(req.params.month));
    if (!found) return res.status(404).json({ error: 'not found' });
    res.json(found);
  });

  router.post('/:year/:month/substitute', (req, res) => {
    const found = schedules.get(Number(req.params.year), Number(req.params.month));
    if (!found) return res.status(404).json({ error: 'not found' });
    const { fromId, toId, from = null, to = null } = req.body ?? {};
    const result = substituteAnalyst({
      days: found.days,
      analysts: analysts.list(),
      fromId,
      toId,
      from,
      to,
    });
    res.json(result);
  });

  return router;
}
