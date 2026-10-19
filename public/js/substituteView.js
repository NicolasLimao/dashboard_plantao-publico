import { api } from './api.js';
import { formatBr } from './format.js';

function toast(msg, isError = false) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' toast--error' : '');
  t.hidden = false;
  setTimeout(() => { t.hidden = true; }, 2500);
}

export async function openSubstitute(container, { year, month, onApplied }) {
  const analysts = await api.listAnalysts();
  const opts = analysts.map((a) => `<option value="${a.id}">${a.name}</option>`).join('');
  // evita empilhar painéis duplicados ao clicar em "Substituir" mais de uma vez
  const existing = container.querySelector('#sub-panel');
  if (existing) existing.remove();
  const panel = document.createElement('div');
  panel.id = 'sub-panel';
  panel.className = 'card';
  panel.style.marginTop = '16px';
  panel.innerHTML = `
    <h3>Substituir analista (desistência)</h3>
    <div class="row">
      <label>Sai <select id="sub-from">${opts}</select></label>
      <label>Entra <select id="sub-to">${opts}</select></label>
      <label>De <input id="sub-start" type="date" /></label>
      <label>Até <input id="sub-end" type="date" /></label>
      <button id="sub-apply" class="btn btn--primary">Aplicar</button>
    </div>
    <p id="sub-conflicts" class="error" hidden></p>`;
  container.appendChild(panel);

  panel.querySelector('#sub-apply').addEventListener('click', async () => {
    const fromId = Number(panel.querySelector('#sub-from').value);
    const toId = Number(panel.querySelector('#sub-to').value);
    const from = panel.querySelector('#sub-start').value || null;
    const to = panel.querySelector('#sub-end').value || null;
    try {
      const result = await api.substitute(year, month, { fromId, toId, from, to });
      onApplied(result.days);
      const conflictsEl = panel.querySelector('#sub-conflicts');
      if (result.conflicts && result.conflicts.length) {
        conflictsEl.textContent = `Dias sem responsável após a troca: ${result.conflicts.map(formatBr).join(', ')}. Ajuste manualmente e salve.`;
        conflictsEl.hidden = false;
      } else {
        conflictsEl.hidden = true;
        toast('Substituição aplicada. Revise e salve.');
      }
    } catch (err) {
      if (err.status === 404) toast('Salve a escala antes de substituir.', true);
      else toast('Erro ao substituir', true);
    }
  });
}
