// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderClosing, brl, toCents } from '../../public/js/closingView.js';
import { api } from '../../public/js/api.js';

const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

const payload = {
  year: 2026, month: 8,
  saved: false,
  ratesSource: 'default',
  rates: { weekday: 2500, friday: 5000, saturday: 7500, sunday: 10000, holiday: 12500 },
  holidays: [],
  lines: [
    { date: '2026-08-01', weekday: 6, kind: 'saturday', holiday: false, analystId: 1, analystName: 'Ana', amount: 7500 },
    { date: '2026-08-03', weekday: 1, kind: 'weekday', holiday: false, analystId: 1, analystName: 'Ana', amount: 2500 },
    { date: '2026-08-04', weekday: 2, kind: 'weekday', holiday: false, analystId: null, analystName: null, amount: 0 },
  ],
  totals: [
    { analystId: 1, name: 'Ana', counts: { weekday: 1, friday: 0, saturday: 1, sunday: 0, holiday: 0 }, shifts: 2, amount: 10000 },
  ],
  unassigned: ['2026-08-04'],
  grandTotal: 10000,
};

beforeEach(() => {
  document.body.innerHTML = '<main id="view"></main><div id="toast" hidden></div>';
  vi.restoreAllMocks();
});

describe('helpers de dinheiro', () => {
  it('brl formata centavos em reais', () => {
    // \s no lugar do espaco: o Intl usa espaco nao-separavel depois do R$
    expect(brl(10000)).toMatch(/^R\$\s100,00$/);
    expect(brl(0)).toMatch(/^R\$\s0,00$/);
  });

  it('toCents aceita vírgula e ponto e recusa lixo', () => {
    expect(toCents('75,00')).toBe(7500);
    expect(toCents('120.5')).toBe(12050);
    expect(toCents('25')).toBe(2500);
    expect(toCents('')).toBeNull();
    expect(toCents('abc')).toBeNull();
    expect(toCents('-10')).toBeNull();
  });
});

describe('closingView', () => {
  it('mostra o resumo por analista e o total geral', async () => {
    vi.spyOn(api, 'getClosing').mockResolvedValue(payload);
    await renderClosing(document.getElementById('view'), { year: 2026, month: 8 });
    await flush();

    expect(document.body.textContent).toContain('Ana');
    expect(document.querySelector('#grand-total').textContent).toMatch(/^R\$\s100,00$/);
  });

  it('avisa sobre dias sem responsável', async () => {
    vi.spyOn(api, 'getClosing').mockResolvedValue(payload);
    await renderClosing(document.getElementById('view'), { year: 2026, month: 8 });
    await flush();

    const warning = document.querySelector('#closing-warning');
    expect(warning).not.toBeNull();
    expect(warning.textContent).toContain('04/08/2026');
  });

  it('preenche os campos de valor com a tabela recebida', async () => {
    vi.spyOn(api, 'getClosing').mockResolvedValue(payload);
    await renderClosing(document.getElementById('view'), { year: 2026, month: 8 });
    await flush();

    expect(document.querySelector('[data-rate="weekday"]').value).toBe('25,00');
    expect(document.querySelector('[data-rate="saturday"]').value).toBe('75,00');
  });

  it('marcar feriado e salvar envia a data e os valores', async () => {
    vi.spyOn(api, 'getClosing').mockResolvedValue(payload);
    const save = vi.spyOn(api, 'saveClosing').mockResolvedValue({
      ...payload, saved: true, ratesSource: 'saved', holidays: ['2026-08-03'],
    });

    await renderClosing(document.getElementById('view'), { year: 2026, month: 8 });
    await flush();

    document.querySelector('.holiday-check[data-date="2026-08-03"]').click();
    document.querySelector('#btn-close-save').click();
    await flush();

    expect(save).toHaveBeenCalledWith(2026, 8, {
      rates: { weekday: 2500, friday: 5000, saturday: 7500, sunday: 10000, holiday: 12500 },
      holidays: ['2026-08-03'],
    });
  });

  it('não salva quando um valor é inválido', async () => {
    vi.spyOn(api, 'getClosing').mockResolvedValue(payload);
    const save = vi.spyOn(api, 'saveClosing').mockResolvedValue(payload);

    await renderClosing(document.getElementById('view'), { year: 2026, month: 8 });
    await flush();

    document.querySelector('[data-rate="weekday"]').value = 'abc';
    document.querySelector('#btn-close-save').click();
    await flush();

    expect(save).not.toHaveBeenCalled();
    expect(document.getElementById('toast').textContent).toMatch(/inv[áa]lido/i);
  });

  it('estado vazio quando o mês não tem escala salva', async () => {
    const err = new Error('HTTP 404');
    err.status = 404;
    vi.spyOn(api, 'getClosing').mockRejectedValue(err);

    await renderClosing(document.getElementById('view'), { year: 2030, month: 1 });
    await flush();

    expect(document.body.textContent).toMatch(/Nenhuma escala salva/i);
    expect(document.querySelector('#grand-total')).toBeNull();
  });

  it('tem o botão de baixar Excel', async () => {
    vi.spyOn(api, 'getClosing').mockResolvedValue(payload);
    await renderClosing(document.getElementById('view'), { year: 2026, month: 8 });
    await flush();
    expect(document.querySelector('#btn-close-xlsx')).not.toBeNull();
  });

  it('ignora resposta obsoleta quando o mês muda durante o carregamento', async () => {
    let resolveFirst;
    const first = new Promise((r) => { resolveFirst = r; });
    vi.spyOn(api, 'getClosing')
      .mockImplementationOnce(() => first)
      .mockImplementationOnce(() => Promise.resolve({ ...payload, month: 9, grandTotal: 999 }));

    const view = document.getElementById('view');
    const render = renderClosing(view, { year: 2026, month: 8 });

    const monthSel = view.querySelector('#cl-month');
    monthSel.value = '9';
    monthSel.dispatchEvent(new Event('change'));
    await flush();

    resolveFirst(payload); // a resposta antiga chega atrasada
    await render;
    await flush();

    expect(document.querySelector('#grand-total').textContent).toMatch(/9,99/);
  });

  it('não salva quando o mês exibido não é o mês selecionado', async () => {
    let resolveSecond;
    const second = new Promise((r) => { resolveSecond = r; });
    vi.spyOn(api, 'getClosing')
      .mockImplementationOnce(() => Promise.resolve(payload))
      .mockImplementationOnce(() => second);
    const save = vi.spyOn(api, 'saveClosing').mockResolvedValue(payload);

    const view = document.getElementById('view');
    await renderClosing(view, { year: 2026, month: 8 });
    await flush();

    const monthSel = view.querySelector('#cl-month');
    monthSel.value = '9';
    monthSel.dispatchEvent(new Event('change'));
    await flush();

    // a tela ainda mostra agosto e o carregamento de setembro está em voo
    view.querySelector('#btn-close-save').click();
    await flush();

    expect(save).not.toHaveBeenCalled();
    resolveSecond(payload);
  });
});
