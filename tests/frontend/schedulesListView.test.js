// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderSchedulesList } from '../../public/js/schedulesListView.js';
import { api } from '../../public/js/api.js';

const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

beforeEach(() => {
  document.body.innerHTML = '<main id="view"></main>';
});

describe('schedulesListView', () => {
  it('lista os meses salvos com nome do mês/ano', async () => {
    vi.spyOn(api, 'listSchedules').mockResolvedValue([
      { year: 2026, month: 8 },
      { year: 2026, month: 7 },
    ]);
    await renderSchedulesList(document.getElementById('view'), {});
    await flush();
    const rows = document.querySelectorAll('tr[data-year]');
    expect(rows).toHaveLength(2);
    expect(document.body.textContent).toContain('Agosto / 2026');
    expect(document.body.textContent).toContain('Julho / 2026');
  });

  it('estado vazio quando não há planilhas', async () => {
    vi.spyOn(api, 'listSchedules').mockResolvedValue([]);
    await renderSchedulesList(document.getElementById('view'), {});
    await flush();
    expect(document.querySelectorAll('tr[data-year]')).toHaveLength(0);
    expect(document.body.textContent).toMatch(/Nenhuma planilha/i);
  });

  it('Abrir chama onOpen com o ano e mês da linha', async () => {
    vi.spyOn(api, 'listSchedules').mockResolvedValue([{ year: 2026, month: 7 }]);
    const onOpen = vi.fn();
    await renderSchedulesList(document.getElementById('view'), { onOpen });
    await flush();
    document.querySelector('tr[data-year="2026"][data-month="7"] .btn-open').click();
    expect(onOpen).toHaveBeenCalledWith(2026, 7);
  });
});
