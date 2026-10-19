// Caminhos RELATIVOS (sem barra inicial) para funcionar sob subcaminho: no
// navegador eles resolvem contra o <base href> injetado no index.html
// (ex.: /plantao/). Fora do navegador (testes em node) usa-se a string como está.
function resolveUrl(url) {
  if (typeof document !== 'undefined' && document.baseURI) {
    return new URL(url, document.baseURI).href;
  }
  return url;
}

async function request(url, { method = 'GET', body } = {}) {
  const opts = { method, credentials: 'same-origin' };
  if (body !== undefined) {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(resolveUrl(url), opts);
  if (!res.ok) {
    let data = {};
    try { data = await res.json(); } catch { /* sem corpo */ }
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    if (data.fields) err.fields = data.fields;
    throw err;
  }
  if (res.status === 204) return undefined;
  try { return await res.json(); } catch { return undefined; }
}

export const api = {
  listAnalysts: () => request('api/analysts'),
  createAnalyst: (data) => request('api/analysts', { method: 'POST', body: data }),
  updateAnalyst: (id, data) => request(`api/analysts/${id}`, { method: 'PUT', body: data }),
  deleteAnalyst: (id) => request(`api/analysts/${id}`, { method: 'DELETE' }),

  listSchedules: () => request('api/schedules'),
  generateSchedule: (year, month) => request('api/schedules/generate', { method: 'POST', body: { year, month } }),
  saveSchedule: (year, month, days) => request(`api/schedules/${year}/${month}`, { method: 'PUT', body: { days } }),
  getSchedule: (year, month) => request(`api/schedules/${year}/${month}`),
  substitute: (year, month, body) => request(`api/schedules/${year}/${month}/substitute`, { method: 'POST', body }),

  // string relativa; o chamador resolve contra document.baseURI ao navegar
  xlsxUrl: (year, month) => `api/export/xlsx?year=${year}&month=${month}`,
  getBackup: () => request('api/export/backup'),
  importBackup: (payload) => request('api/export/backup/import', { method: 'POST', body: payload }),

  getClosing: (year, month) => request(`api/closing/${year}/${month}`),
  saveClosing: (year, month, body) => request(`api/closing/${year}/${month}`, { method: 'PUT', body }),
  // string relativa; o chamador resolve contra document.baseURI ao navegar
  closingXlsxUrl: (year, month) => `api/export/closing.xlsx?year=${year}&month=${month}`,
};
