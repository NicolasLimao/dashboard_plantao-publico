export function schedulesRepo(db) {
  return {
    get(year, month) {
      const row = db.prepare('SELECT * FROM schedules WHERE year = ? AND month = ?').get(year, month);
      if (!row) return null;
      return { year: row.year, month: row.month, days: JSON.parse(row.data) };
    },
    save({ year, month, days }) {
      db.prepare(`
        INSERT INTO schedules (year, month, data) VALUES (?, ?, ?)
        ON CONFLICT(year, month) DO UPDATE SET data = excluded.data
      `).run(year, month, JSON.stringify(days));
      return { year, month, days };
    },
    all() {
      return db.prepare('SELECT * FROM schedules ORDER BY year, month').all()
        .map((row) => ({ year: row.year, month: row.month, days: JSON.parse(row.data) }));
    },
    listPeriods() {
      return db.prepare('SELECT year, month FROM schedules ORDER BY year DESC, month DESC').all();
    },
  };
}
