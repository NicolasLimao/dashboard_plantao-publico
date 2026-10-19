import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createDb } from '../../src/db/db.js';
import { createApp } from '../../src/app.js';

describe('GET / (index com <base href> conforme BASE_PATH)', () => {
  it('injeta o subcaminho no <base href>', async () => {
    const app = createApp({ db: createDb(':memory:'), basePath: '/plantao' });
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('<base href="/plantao/" />');
  });

  it('usa "/" por padrão (raiz)', async () => {
    const app = createApp({ db: createDb(':memory:') });
    const res = await request(app).get('/');
    expect(res.text).toContain('<base href="/" />');
  });
});
