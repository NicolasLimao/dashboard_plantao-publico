import { api } from './api.js';
import { MONTHS, WEEKDAYS, formatBr } from './format.js';

const RATE_FIELDS = [
  ['weekday', 'Seg–Qui (22:01→07:59)'],
  ['friday', 'Sexta→Sábado (22:01→18:00)'],
  ['saturday', 'Sábado→Domingo (18:01→18:00)'],
  ['sunday', 'Domingo→Segunda (18:01→07:59)'],
  ['holiday', 'Feriado (24h)'],
];

const KIND_LABELS = {
  weekday: 'Seg–Qui', friday: 'Sexta', saturday: 'Sábado', sunday: 'Domingo', holiday: 'Feriado',
};

const SOURCE_NOTE = {
  saved: 'Valores salvos neste fechamento.',
  inherited: 'Valores herdados do último mês fechado — ajuste se houve reajuste.',
  default: 'Valores padrão do sistema — ajuste se houve reajuste.',
};

function toast(msg, isError = false) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' toast--error' : '');
  t.hidden = false;
  setTimeout(() => { t.hidden = true; }, 2500);
}

export function brl(cents) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// "120,00" ou "120.5" -> centavos; qualquer outra coisa -> null
export function toCents(text) {
  const normalized = String(text).trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

function forInput(cents) {
  return (cents / 100).toFixed(2).replace('.', ',');
}

export async function renderClosing(container, opts = {}) {
  const now = new Date();
  const state = {
    year: opts.year || now.getUTCFullYear(),
    month: opts.month || now.getUTCMonth() + 1,
    data: null,
    loadedFor: null,
    holidays: new Set(),
    reqId: 0,
  };

  const monthOptions = MONTHS
    .map((m, i) => `<option value="${i + 1}" ${i + 1 === state.month ? 'selected' : ''}>${m}</option>`).join('');
  const years = [];
  for (let y = state.year - 1; y <= state.year + 2; y++) years.push(y);
  const yearOptions = years
    .map((y) => `<option value="${y}" ${y === state.year ? 'selected' : ''}>${y}</option>`).join('');

  container.innerHTML = `
    <h2>Fechamento do mês</h2>
    <div class="row" style="margin-bottom:16px">
      <select id="cl-month">${monthOptions}</select>
      <select id="cl-year">${yearOptions}</select>
      <button id="btn-close-save" class="btn btn--primary">Salvar e calcular</button>
      <button id="btn-close-xlsx" class="btn">Baixar Excel</button>
    </div>
    <div id="closing-host"></div>`;

  const host = container.querySelector('#closing-host');

  container.querySelector('#cl-month').addEventListener('change', (e) => {
    state.month = Number(e.target.value); load();
  });
  container.querySelector('#cl-year').addEventListener('change', (e) => {
    state.year = Number(e.target.value); load();
  });
  container.querySelector('#btn-close-save').addEventListener('click', save);
  container.querySelector('#btn-close-xlsx').addEventListener('click', () => {
    if (!state.data) { toast('Não há escala salva para este mês.', true); return; }
    window.location.href = new URL(api.closingXlsxUrl(state.year, state.month), document.baseURI).href;
  });

  async function load() {
    const token = ++state.reqId;
    const year = state.year;
    const month = state.month;
    try {
      const data = await api.getClosing(year, month);
      if (token !== state.reqId) return; // resposta obsoleta: o mês já mudou
      state.data = data;
      state.loadedFor = `${year}-${month}`;
      state.holidays = new Set(state.data.holidays);
      draw();
    } catch (err) {
      if (token !== state.reqId) return;
      state.data = null;
      state.loadedFor = null;
      if (err.status === 404) {
        host.innerHTML = '<p class="muted">Nenhuma escala salva para este mês. Vá em <strong>Escala</strong>, gere e clique em <strong>Salvar</strong>.</p>';
      } else {
        host.innerHTML = '<p class="muted">Não foi possível carregar o fechamento.</p>';
        toast('Erro ao carregar o fechamento', true);
      }
    }
  }

  // O recálculo acontece no servidor: a regra de valor mora num lugar só.
  async function save() {
    if (!state.data || state.loadedFor !== `${state.year}-${state.month}`) {
      toast('Aguarde o carregamento do mês selecionado.', true);
      return;
    }
    const rates = {};
    let invalid = false;
    host.querySelectorAll('.rate-input').forEach((input) => {
      const cents = toCents(input.value);
      if (cents == null) invalid = true;
      else rates[input.dataset.rate] = cents;
    });
    if (invalid) { toast('Valor inválido. Use apenas números, ex.: 120,00', true); return; }

    const year = state.year;
    const month = state.month;
    const token = ++state.reqId;
    try {
      const data = await api.saveClosing(year, month, {
        rates, holidays: [...state.holidays].sort(),
      });
      if (token !== state.reqId) return;
      state.data = data;
      state.loadedFor = `${year}-${month}`;
      state.holidays = new Set(state.data.holidays);
      draw();
      toast('Fechamento salvo.');
    } catch {
      if (token !== state.reqId) return;
      toast('Erro ao salvar o fechamento', true);
    }
  }

  function draw() {
    const d = state.data;

    const rateInputs = RATE_FIELDS.map(([key, label]) => `
      <label class="rate-field">${label}
        <input class="rate-input" data-rate="${key}" value="${forInput(d.rates[key])}" />
      </label>`).join('');

    const warning = d.unassigned.length ? `
      <p class="error" id="closing-warning">
        Atenção: ${d.unassigned.length} dia(s) sem responsável não entram no total —
        ${d.unassigned.map(formatBr).join(', ')}.
      </p>` : '';

    const totalRows = d.totals.map((t) => `
      <tr>
        <td>${t.name}</td>
        <td>${t.counts.weekday}</td><td>${t.counts.friday}</td><td>${t.counts.saturday}</td>
        <td>${t.counts.sunday}</td><td>${t.counts.holiday}</td>
        <td>${t.shifts}</td><td>${brl(t.amount)}</td>
      </tr>`).join('');

    const dayRows = d.lines.map((l) => `
      <tr>
        <td>${formatBr(l.date)}</td>
        <td>${WEEKDAYS[l.weekday]}</td>
        <td>${l.analystName ?? '<span class="error">sem responsável</span>'}</td>
        <td>${KIND_LABELS[l.kind]}</td>
        <td>${brl(l.amount)}</td>
        <td><input type="checkbox" class="holiday-check" data-date="${l.date}"
                   ${state.holidays.has(l.date) ? 'checked' : ''} /></td>
      </tr>`).join('');

    host.innerHTML = `
      <div class="card" style="margin-bottom:16px">
        <strong>Valores do plantão</strong>
        <p class="muted" style="margin:6px 0 12px">${SOURCE_NOTE[d.ratesSource]}</p>
        <div class="row">${rateInputs}</div>
      </div>
      ${warning}
      <h3>Resumo por analista</h3>
      <div class="card" style="margin-bottom:16px">
        <table>
          <thead><tr>
            <th>Analista</th><th>Seg–Qui</th><th>Sexta</th><th>Sábado</th>
            <th>Domingo</th><th>Feriado</th><th>Plantões</th><th>Total</th>
          </tr></thead>
          <tbody>${totalRows}</tbody>
          <tfoot><tr>
            <th>Total geral</th><th></th><th></th><th></th><th></th><th></th>
            <th>${d.lines.length - d.unassigned.length}</th>
            <th id="grand-total">${brl(d.grandTotal)}</th>
          </tr></tfoot>
        </table>
      </div>
      <h3>Dias do mês</h3>
      <div class="card">
        <table>
          <thead><tr>
            <th>Data</th><th>Dia</th><th>Analista</th><th>Turno</th><th>Valor</th><th>Feriado</th>
          </tr></thead>
          <tbody>${dayRows}</tbody>
        </table>
      </div>`;

    host.querySelectorAll('.holiday-check').forEach((chk) => {
      chk.addEventListener('change', () => {
        if (chk.checked) state.holidays.add(chk.dataset.date);
        else state.holidays.delete(chk.dataset.date);
      });
    });
  }

  await load();
}
