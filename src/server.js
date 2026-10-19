import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createApp } from './app.js';
import { createDb } from './db/db.js';

const PORT = Number(process.env.PORT) || 3000;
const DB_PATH = process.env.DB_PATH || './data/plantao.sqlite';

mkdirSync(dirname(DB_PATH), { recursive: true });
const db = createDb(DB_PATH);

const app = createApp({ db });
app.listen(PORT, () => console.log(`Plantão rodando em http://localhost:${PORT}`));
