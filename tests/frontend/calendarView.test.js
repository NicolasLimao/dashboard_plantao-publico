// tests/frontend/calendarView.test.js
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderCalendar } from '../../public/js/calendarView.js';
import { api } from '../../public/js/api.js';

const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

beforeEach(() => {
  document.body.innerHTML = '<main id="view"></main><div id="toast" hidden></div>';
  vi.spyOn(api, 'listAnalysts').mockResolvedValue([
    { id: 1, name: 'Nicolas', availability: 'any', city: 'Cidade Exemplo A', active: true },
    { id: 2, name: 'Sara', availability: 'any', city: 'Cidade Exemplo A', active: true },
  ]);
});

describe('calendarView', () => {
  it('mostra estado vazio quando não há escala salva (404)', async () => {
    vi.spyOn(api, 'getSchedule').mockRejectedValue(Object.assign(new Error('x'), { status: 404 }));
    await renderCalendar(document.getElementById('view'));
    await flush();
    expect(document.getElementById('btn-generate')).not.toBeNull();
    expect(document.getElementById('calendar-host').textContent).toMatch(/gere|nenhuma|vazi/i);
  });

  it('gera a escala e desenha a grade com selects', async () => {
    vi.spyOn(api, 'getSchedule').mockRejectedValue(Object.assign(new Error('x'), { status: 404 }));
    vi.spyOn(api, 'generateSchedule').mockResolvedValue({
      year: 2026, month: 7,
      days: [
        { date: '2026-07-01', weekday: 3, weekend: false, analystId: 1 },
        { date: '2026-07-02', weekday: 4, weekend: false, analystId: 2 },
      ],
      unfilled: [],
    });
    await renderCalendar(document.getElementById('view'));
    await flush();
    document.getElementById('btn-generate').click();
    await flush();
    expect(document.querySelectorAll('.cal-select').length).toBeGreaterThanOrEqual(2);
    expect(document.querySelector('.calendar')).not.toBeNull();
  });

  it('salvar envia o estado atual da escala', async () => {
    vi.spyOn(api, 'getSchedule').mockResolvedValue({
      year: 2026, month: 7,
      days: [{ date: '2026-07-01', weekday: 3, weekend: false, analystId: 1 }],
    });
    const save = vi.spyOn(api, 'saveSchedule').mockResolvedValue({ year: 2026, month: 7, days: [] });
    await renderCalendar(document.getElementById('view'));
    await flush();
    document.getElementById('btn-save').click();
    await flush();
    expect(save).toHaveBeenCalled();
    const [, , days] = save.mock.calls[0];
    expect(Array.isArray(days)).toBe(true);
    expect(days[0].date).toBe('2026-07-01');
  });
});
