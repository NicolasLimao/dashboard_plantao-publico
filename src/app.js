import { readFileSync } from 'node:fs';
import express from 'express';
import { analystsRoutes } from './routes/analystsRoutes.js';
import { schedulesRoutes } from './routes/schedulesRoutes.js';
import { exportRoutes } from './routes/exportRoutes.js';
import { closingRoutes } from './routes/closingRoutes.js';

// Sem autenticação: o controle de acesso é feito pela camada que hospeda o app
// (dashboard/reverse proxy/rede). A API fica aberta a quem alcança a porta.
export function createApp({ db, basePath = process.env.BASE_PATH || '/' } = {}) {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // API sempre na raiz do container (o reverse proxy remove o prefixo do subcaminho).
  app.use('/api/analysts', analystsRoutes({ db }));
  app.use('/api/schedules', schedulesRoutes({ db }));
  app.use('/api/closing', closingRoutes({ db }));
  app.use('/api/export', exportRoutes({ db }));

  // Serve o index com <base href> ajustado ao subcaminho público (BASE_PATH).
  // Ex.: BASE_PATH=/plantao/ faz os caminhos relativos do front virarem /plantao/...
  const base = basePath.endsWith('/') ? basePath : `${basePath}/`;
  const indexHtml = readFileSync('public/index.html', 'utf8')
    .replace('<base href="/" />', `<base href="${base}" />`);
  app.get('/', (req, res) => res.type('html').send(indexHtml));

  app.use(express.static('public'));
  return app;
}
