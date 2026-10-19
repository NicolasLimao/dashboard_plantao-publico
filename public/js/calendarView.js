import { api } from './api.js';
import { buildWeeks } from './calendarGrid.js';
import { WEEKDAYS, MONTHS, formatBr } from './format.js';

function toast(msg, isError = false) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' toast--error' : '');
  t.hidden = false;
  setTimeout(() => { t.hidden = true; }, 2500);
}

export async function renderCalendar(container, opts = {}) {
  const now = new Date();
  const state = {
    year: opts.year || now.getUTCFullYear(),
    month: opts.month || now.getUTCMonth() + 1,
    days: [], analysts: [],
  };
  state.analysts = (await api.listAnalysts()).filter((a) => a.active);

  const monthOptions = MONTHS.map((m, i) => `<option value="${i + 1}" ${i + 1 === state.month ? 'selected' : ''}>${m}</option>`).join('');
  const years = [];
  for (let y = state.year - 1; y <= state.year + 2; y++) years.push(y);
  const yearOptions = years.map((y) => `<option value="${y}" ${y === state.year ? 'selected' : ''}>${y}</option>`).join('');

  container.innerHTML = `
    <h2>Escala de Plantão</h2>
    <div class="row" style="margin-bottom:16px">
      <select id="cal-month">${monthOptions}</select>
      <select id="cal-year">${yearOptions}</select>
      <button id="btn-generate" class="btn btn--primary">Gerar escala</button>
      <button id="btn-save" class="btn">Salvar</button>
      <span class="spacer"></span>
    </div>
    <div id="calendar-host" class="calendar-wrap"></div>`;

  const host = container.querySelector('#calendar-host');

  container.querySelector('#cal-month').addEventListener('change', (e) => { state.month = Number(e.target.value); load(); });
  container.querySelector('#cal-year').addEventListener('change', (e) => { state.year = Number(e.target.value); load(); });
  container.querySelector('#btn-generate').addEventListener('click', async () => {
    const r = await api.generateSchedule(state.year, state.month);
    state.days = r.days;
    state.unfilled = new Set(r.unfilled);
    draw();
    toast('Escala gerada. Revise e clique em Salvar.');
  });
  container.querySelector('#btn-save').addEventListener('click', async () => {
    await api.saveSchedule(state.year, state.month, state.days);
    toast('Escala salva.');
  });

  async function load() {
    try {
      const r = await api.getSchedule(state.year, state.month);
      state.days = r.days;
      state.unfilled = new Set();
      draw();
    } catch (err) {
      state.days = [];
      state.unfilled = new Set();
      if (err.status === 404) {
        host.innerHTML = '<p class="muted">Nenhuma escala salva para este mês. Clique em “Gerar escala”.</p>';
      } else {
        host.innerHTML = '<p class="muted">Não foi possível carregar a escala.</p>';
        toast('Erro ao carregar a escala', true);
      }
    }
  }

  function optionsFor(analystId) {
    const empty = `<option value="">—</option>`;
    return empty + state.analysts.map((a) => `<option value="${a.id}" ${a.id === analystId ? 'selected' : ''}>${a.name}</option>`).join('');
  }

  function draw() {
    if (!state.days.length) { host.innerHTML = '<p class="muted">Nenhum dia na escala.</p>'; return; }
    const weeks = buildWeeks(state.days);
    const head = `<tr>${WEEKDAYS.map((w) => `<th>${w}</th>`).join('')}</tr>`;
    const body = weeks.map((week) => `<tr>${week.map((d) => cell(d)).join('')}</tr>`).join('');
    host.innerHTML = `<table class="calendar"><thead>${head}</thead><tbody>${body}</tbody></table>`;
    host.querySelectorAll('.cal-select').forEach((sel) => {
      sel.addEventListener('change', () => {
        const date = sel.dataset.date;
        const day = state.days.find((d) => d.date === date);
        if (day) day.analystId = sel.value ? Number(sel.value) : null;
      });
    });
  }

  function cell(d) {
    if (!d) return '<td></td>';
    const unfilled = state.unfilled && state.unfilled.has(d.date);
    const cls = 'calendar-cell' + (d.weekend ? ' cal-weekend' : '') + (unfilled ? ' cal-conflict' : '');
    const empty = unfilled ? '<div class="cal-empty">sem responsável</div>' : '';
    return `<td class="${cls}">
      <div class="cal-date">${formatBr(d.date)}</div>
      <select class="cal-select" data-date="${d.date}">${optionsFor(d.analystId)}</select>
      ${empty}
    </td>`;
  }

  await load();
}
