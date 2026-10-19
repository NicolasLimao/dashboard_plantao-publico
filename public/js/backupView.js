import { api } from './api.js';
import { MONTHS } from './format.js';

function toast(msg, isError = false) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' toast--error' : '');
  t.hidden = false;
  setTimeout(() => { t.hidden = true; }, 2500);
}

export function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export async function exportPng(node, filename) {
  if (!window.html2canvas) { toast('Exportação PNG indisponível', true); return; }
  const canvas = await window.html2canvas(node, { backgroundColor: '#050505' });
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}

export async function renderBackup(container) {
  const now = new Date();
  const y = now.getUTCFullYear();
  const monthOptions = MONTHS.map((m, i) => `<option value="${i + 1}" ${i + 1 === now.getUTCMonth() + 1 ? 'selected' : ''}>${m}</option>`).join('');
  const yearOptions = [y - 1, y, y + 1, y + 2].map((yy) => `<option value="${yy}" ${yy === y ? 'selected' : ''}>${yy}</option>`).join('');

  container.innerHTML = `
    <h2>Backup e Exportação</h2>
    <div class="card" style="margin-bottom:16px">
      <h3>Exportar planilha da escala</h3>
      <div class="row">
        <select id="exp-month">${monthOptions}</select>
        <select id="exp-year">${yearOptions}</select>
        <button id="btn-download-xlsx" class="btn btn--primary">Baixar .xlsx</button>
      </div>
    </div>
    <div class="card">
      <h3>Backup completo (dados)</h3>
      <div class="row">
        <button id="btn-backup-export" class="btn">Exportar backup (.json)</button>
        <button id="btn-backup-import" class="btn">Importar backup</button>
        <input id="backup-file" type="file" accept="application/json" hidden />
      </div>
      <p class="muted">O import substitui todos os dados atuais pelo conteúdo do arquivo.</p>
    </div>`;

  container.querySelector('#btn-download-xlsx').addEventListener('click', () => {
    const yr = container.querySelector('#exp-year').value;
    const mo = container.querySelector('#exp-month').value;
    window.location.href = new URL(api.xlsxUrl(yr, mo), document.baseURI).href;
  });

  container.querySelector('#btn-backup-export').addEventListener('click', async () => {
    try { downloadJson('plantao-backup.json', await api.getBackup()); }
    catch { toast('Erro ao exportar backup', true); }
  });

  const fileInput = container.querySelector('#backup-file');
  container.querySelector('#btn-backup-import').addEventListener('click', () => fileInput.click());

  // handler exposto para teste e usado pelo change real
  fileInput._onFileText = async (text) => {
    try {
      const payload = JSON.parse(text);
      await api.importBackup(payload);
      toast('Backup importado.');
    } catch {
      toast('Arquivo inválido ou erro ao importar', true);
    }
  };
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    fileInput._onFileText(await file.text());
  });
}
