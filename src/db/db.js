import Database from 'better-sqlite3';

export function createDb(filename = ':memory:') {
  const db = new Database(filename);
  db.pragma('journal_mode = WAL');
  migrate(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS analysts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      availability TEXT NOT NULL CHECK (availability IN ('any','weekend','weekday')),
      city TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      data TEXT NOT NULL,
      UNIQUE(year, month)
    );
    CREATE TABLE IF NOT EXISTS closings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      holidays TEXT NOT NULL DEFAULT '[]',
      rates TEXT NOT NULL,
      UNIQUE(year, month)
    );
  `);
}
