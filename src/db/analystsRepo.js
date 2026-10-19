function toAnalyst(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    availability: row.availability,
    city: row.city,
    active: !!row.active,
  };
}

export function analystsRepo(db) {
  const api = {
    list() {
      return db.prepare('SELECT * FROM analysts ORDER BY name').all().map(toAnalyst);
    },
    get(id) {
      return toAnalyst(db.prepare('SELECT * FROM analysts WHERE id = ?').get(id));
    },
    create({ name, availability, city = '', active = true }) {
      const info = db.prepare(
        'INSERT INTO analysts (name, availability, city, active) VALUES (?, ?, ?, ?)'
      ).run(name, availability, city, active ? 1 : 0);
      return api.get(info.lastInsertRowid);
    },
    update(id, { name, availability, city = '', active = true }) {
      db.prepare(
        'UPDATE analysts SET name = ?, availability = ?, city = ?, active = ? WHERE id = ?'
      ).run(name, availability, city, active ? 1 : 0, id);
      return api.get(id);
    },
    remove(id) {
      db.prepare('DELETE FROM analysts WHERE id = ?').run(id);
    },
  };
  return api;
}
