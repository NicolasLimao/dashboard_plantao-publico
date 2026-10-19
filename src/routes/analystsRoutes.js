import { Router } from 'express';
import { analystsRepo } from '../db/analystsRepo.js';

const AVAILABILITY = ['any', 'weekend', 'weekday'];

function validate(body) {
  const fields = [];
  if (!body || typeof body.name !== 'string' || body.name.trim() === '') fields.push('name');
  if (!AVAILABILITY.includes(body?.availability)) fields.push('availability');
  return fields;
}

function normalize(body) {
  return {
    name: body.name.trim(),
    availability: body.availability,
    city: (body.city ?? '').trim(),
    active: body.active !== false,
  };
}

export function analystsRoutes({ db }) {
  const router = Router();
  const repo = analystsRepo(db);

  router.get('/', (req, res) => res.json(repo.list()));

  router.post('/', (req, res) => {
    const fields = validate(req.body);
    if (fields.length) return res.status(400).json({ error: 'invalid', fields });
    res.status(201).json(repo.create(normalize(req.body)));
  });

  router.put('/:id', (req, res) => {
    const existing = repo.get(Number(req.params.id));
    if (!existing) return res.status(404).json({ error: 'not found' });
    const fields = validate(req.body);
    if (fields.length) return res.status(400).json({ error: 'invalid', fields });
    res.json(repo.update(existing.id, normalize(req.body)));
  });

  router.delete('/:id', (req, res) => {
    repo.remove(Number(req.params.id));
    res.status(204).end();
  });

  return router;
}
