// tests/frontend/api.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from '../../public/js/api.js';

function mockFetch(status, body, { ok } = {}) {
  return vi.fn().mockResolvedValue({
    ok: ok ?? (status >= 200 && status < 300),
    status,
    json: async () => body,
  });
}

describe('api', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('createAnalyst faz POST relativo, com credentials, e propaga fields em 400', async () => {
    global.fetch = mockFetch(400, { error: 'invalid', fields: ['availability'] });
    await expect(api.createAnalyst({ name: 'A', availability: 'x' }))
      .rejects.toMatchObject({ status: 400, fields: ['availability'] });
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe('api/analysts');
    expect(opts.method).toBe('POST');
    expect(opts.credentials).toBe('same-origin');
  });

  it('listAnalysts faz GET relativo e retorna array', async () => {
    global.fetch = mockFetch(200, [{ id: 1, name: 'A' }]);
    const r = await api.listAnalysts();
    expect(r).toHaveLength(1);
    expect(global.fetch.mock.calls[0][0]).toBe('api/analysts');
  });

  it('deleteAnalyst trata 204 sem corpo', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204, json: async () => { throw new Error('no body'); } });
    await expect(api.deleteAnalyst(5)).resolves.toBeUndefined();
  });

  it('getSchedule lança com status 404 quando não existe', async () => {
    global.fetch = mockFetch(404, { error: 'not found' });
    await expect(api.getSchedule(2030, 1)).rejects.toMatchObject({ status: 404 });
  });

  it('xlsxUrl monta a URL relativa de download', () => {
    expect(api.xlsxUrl(2026, 7)).toBe('api/export/xlsx?year=2026&month=7');
  });

  it('listSchedules faz GET relativo em api/schedules', async () => {
    global.fetch = mockFetch(200, [{ year: 2026, month: 7 }]);
    const r = await api.listSchedules();
    expect(r).toEqual([{ year: 2026, month: 7 }]);
    expect(global.fetch.mock.calls[0][0]).toBe('api/schedules');
  });

});
