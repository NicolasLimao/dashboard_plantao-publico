import { renderAnalysts } from './analystsView.js';
import { renderCalendar } from './calendarView.js';
import { renderBackup, exportPng } from './backupView.js';
import { openSubstitute } from './substituteView.js';
import { renderSchedulesList } from './schedulesListView.js';
import { renderClosing } from './closingView.js';

function toast(msg, isError = false) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' toast--error' : '');
  t.hidden = false;
  setTimeout(() => { t.hidden = true; }, 2500);
}

async function showCalendar(view, opts = {}) {
  await renderCalendar(view, opts);
  const bar = view.querySelector('.row');
  if (bar && !view.querySelector('#btn-substitute')) {
    // botão de substituição por desistência
    const btn = document.createElement('button');
    btn.id = 'btn-substitute';
    btn.className = 'btn';
    btn.textContent = 'Substituir';
    bar.appendChild(btn);

    // botão de exportar a escala como imagem (.png)
    const pngBtn = document.createElement('button');
    pngBtn.id = 'btn-png';
    pngBtn.className = 'btn';
    pngBtn.textContent = 'Baixar PNG';
    bar.appendChild(pngBtn);
    pngBtn.addEventListener('click', () => {
      const cal = view.querySelector('.calendar');
      if (cal) exportPng(cal, 'plantao.png');
      else toast('Gere a escala antes de exportar a imagem.', true);
    });

    const monthSel = view.querySelector('#cal-month');
    const yearSel = view.querySelector('#cal-year');
    btn.addEventListener('click', () => {
      openSubstitute(view, {
        year: Number(yearSel.value),
        month: Number(monthSel.value),
        onApplied: (days) => {
          // aplica o resultado na grade visível e sincroniza o estado interno do
          // calendário (o listener 'change' de calendarView atualiza state.days),
          // para que o botão "Salvar" persista a escala já substituída.
          days.forEach((d) => {
            const sel = view.querySelector(`.cal-select[data-date="${d.date}"]`);
            if (sel) {
              sel.value = d.analystId == null ? '' : String(d.analystId);
              sel.dispatchEvent(new Event('change'));
            }
          });
        },
      });
    });
  }
}

export function bootstrap() {
  const view = document.getElementById('view');

  document.getElementById('nav-calendar').onclick = () => showCalendar(view);
  document.getElementById('nav-analysts').onclick = () => renderAnalysts(view);
  document.getElementById('nav-schedules').onclick = () => renderSchedulesList(view, {
    onOpen: (year, month) => showCalendar(view, { year, month }),
  });
  document.getElementById('nav-backup').onclick = () => renderBackup(view);
  document.getElementById('nav-closing').onclick = () => renderClosing(view);

  showCalendar(view);
}

// Scripts type="module" executam antes do DOMContentLoaded, então o listener
// dispara em seguida no navegador. Nos testes (jsdom) o documento já está
// carregado no import, então o listener não dispara e o teste chama bootstrap().
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', bootstrap);
}
