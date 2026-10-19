function toClosing(row) {
  if (!row) return null;
  return {
    year: row.year,
    month: row.month,
    holidays: JSON.parse(row.holidays),
    rates: JSON.parse(row.rates),
  };
}

export function closingsRepo(db) {
  return {
    get(year, month) {
      return toClosing(db.prepare('SELECT * FROM closings WHERE year = ? AND month = ?').get(year, month));
    },
    save({ year, month, holidays, rates }) {
      db.prepare(`
        INSERT INTO closings (year, month, holidays, rates) VALUES (?, ?, ?, ?)
        ON CONFLICT(year, month) DO UPDATE SET holidays = excluded.holidays, rates = excluded.rates
      `).run(year, month, JSON.stringify(holidays), JSON.stringify(rates));
      return { year, month, holidays, rates };
    },
    all() {
      return db.prepare('SELECT * FROM closings ORDER BY year, month').all().map(toClosing);
    },
    // O fechamento mais recente que NÃO seja posterior ao mês pedido. É isso
    // que impede que abrir um mês antigo puxe um reajuste feito depois dele.
    latestUpTo(year, month) {
      return toClosing(db.prepare(`
        SELECT * FROM closings
        WHERE (year * 12 + month) <= ?
        ORDER BY year DESC, month DESC
        LIMIT 1
      `).get(year * 12 + month));
    },
  };
}
