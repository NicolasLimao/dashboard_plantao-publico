// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openSubstitute } from '../../public/js/substituteView.js';
import { api } from '../../public/js/api.js';

const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

beforeEach(() => {
  document.body.innerHTML = '<main id="view"></main><div id="toast" hidden></div>';
  vi.spyOn(api, 'listAnalysts').mockResolvedValue([
    { id: 1, name: 'Nicolas', availability: 'any', city: 'Cidade Exemplo A', active: true },
    { id: 2, name: 'Sara', availability: 'any', city: 'Cidade Exemplo A', active: true },
  ]);
});

describe('substituteView', () => {
  it('aplica substituição e informa onApplied + conflitos', async () => {
    const sub = vi.spyOn(api, 'substitute').mockResolvedValue({
      days: [{ date: '2026-07-01', weekday: 3, weekend: false, analystId: 2 }],
      conflicts: ['2026-07-04'],
    });
    const onApplied = vi.fn();
    await openSubstitute(document.getElementById('view'), { year: 2026, month: 7, onApplied });
    await flush();
    document.getElementById('sub-from').value = '1';
    document.getElementById('sub-to').value = '2';
    document.getElementById('sub-apply').click();
    await flush();
    expect(sub).toHaveBeenCalledWith(2026, 7, expect.objectContaining({ fromId: 1, toId: 2, from: null, to: null }));
    expect(onApplied).toHaveBeenCalledWith(expect.any(Array));
    expect(document.getElementById('sub-conflicts').textContent).toContain('04/07/2026');
  });
});
