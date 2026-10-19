import { api } from './api.js';
import { MONTHS } from './format.js';

export async function renderSchedulesList(container, { onOpen } = {}) {
  let periods = [];
  try {
    periods = await api.listSchedules();
  } catch {
    container.innerHTML = '<h2>Planilhas</h2><p class="muted">Não foi possível carregar as planilhas.</p>';
    return;
  }

  if (!periods.length) {
    container.innerHTML = `
      <h2>Planilhas</h2>
      <p class="muted">Nenhuma planilha salva ainda. Vá em <strong>Escala</strong>, gere e clique em <strong>Salvar</strong>.</p>`;
    return;
  }

  const rows = periods.map((p) => `
    <tr data-year="${p.year}" data-month="${p.month}">
      <td>${MONTHS[p.month - 1]} / ${p.year}</td>
      <td class="row">
        <button class="btn btn--primary btn-open">Abrir</button>
        <button class="btn btn-xlsx">Baixar .xlsx</button>
      </td>
    </tr>`).join('');

  container.innerHTML = `
    <h2>Planilhas salvas</h2>
    <div class="card">
      <table>
        <thead><tr><th>Mês</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  container.querySelectorAll('tr[data-year]').forEach((tr) => {
    const year = Number(tr.dataset.year);
    const month = Number(tr.dataset.month);
    tr.querySelector('.btn-open').addEventListener('click', () => {
      if (onOpen) onOpen(year, month);
    });
    tr.querySelector('.btn-xlsx').addEventListener('click', () => {
      window.location.href = new URL(api.xlsxUrl(year, month), document.baseURI).href;
    });
  });
}
