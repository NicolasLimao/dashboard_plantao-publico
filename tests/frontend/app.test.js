// tests/frontend/app.test.js
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { api } from '../../public/js/api.js';
import { bootstrap } from '../../public/js/app.js';

const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
const noSchedule = () => vi.spyOn(api, 'getSchedule').mockRejectedValue(Object.assign(new Error('x'), { status: 404 }));

beforeEach(() => {
  document.documentElement.innerHTML = readFileSync('public/index.html', 'utf8');
  vi.restoreAllMocks();
  vi.spyOn(api, 'listAnalysts').mockResolvedValue([]);
});

describe('bootstrap (sem autenticação)', () => {
  it('renderiza a tela de escala direto ao iniciar', async () => {
    noSchedule();
    bootstrap();
    await flush();
    expect(document.getElementById('nav').hidden).toBe(false);
    expect(document.getElementById('view').textContent).toMatch(/Escala/i);
  });

  it('a escala oferece botões de substituir e baixar PNG', async () => {
    noSchedule();
    bootstrap();
    await flush();
    expect(document.getElementById('btn-substitute')).not.toBeNull();
    expect(document.getElementById('btn-png')).not.toBeNull();
  });

  it('navega para Analistas ao clicar no botão', async () => {
    noSchedule();
    bootstrap();
    await flush();
    document.getElementById('nav-analysts').click();
    await flush();
    expect(document.getElementById('view').textContent).toMatch(/Analistas/i);
  });

  it('a aba Planilhas lista os meses salvos e abre no calendário', async () => {
    noSchedule();
    vi.spyOn(api, 'listSchedules').mockResolvedValue([{ year: 2026, month: 7 }]);
    bootstrap();
    await flush();

    document.getElementById('nav-schedules').click();
    await flush();
    expect(document.body.textContent).toMatch(/Julho \/ 2026/);

    document.querySelector('tr[data-year="2026"][data-month="7"] .btn-open').click();
    await flush();
    expect(document.getElementById('cal-month').value).toBe('7');
    expect(document.getElementById('cal-year').value).toBe('2026');
  });

  it('a aba Backup mostra a exportação (e não tem mais troca de senha)', async () => {
    noSchedule();
    bootstrap();
    await flush();
    document.getElementById('nav-backup').click();
    await flush();
    expect(document.getElementById('btn-backup-export')).not.toBeNull();
    expect(document.getElementById('password-form')).toBeNull();
  });

  it('aplicar substituição reflete na grade e é persistido ao salvar', async () => {
    vi.spyOn(api, 'listAnalysts').mockResolvedValue([
      { id: 1, name: 'Nicolas', availability: 'any', city: 'Cidade Exemplo A', active: true },
      { id: 2, name: 'Sara', availability: 'any', city: 'Cidade Exemplo A', active: true },
    ]);
    vi.spyOn(api, 'getSchedule').mockResolvedValue({
      year: 2026, month: 7,
      days: [{ date: '2026-07-01', weekday: 3, weekend: false, analystId: 1 }],
    });
    // a substituição retorna o dia agora com o analista 2 (não persiste no backend)
    vi.spyOn(api, 'substitute').mockResolvedValue({
      days: [{ date: '2026-07-01', weekday: 3, weekend: false, analystId: 2 }],
      conflicts: [],
    });
    const save = vi.spyOn(api, 'saveSchedule').mockResolvedValue({ year: 2026, month: 7, days: [] });

    bootstrap();
    await flush();

    document.getElementById('btn-substitute').click();
    await flush();
    document.getElementById('sub-from').value = '1';
    document.getElementById('sub-to').value = '2';
    document.getElementById('sub-apply').click();
    await flush();

    const sel = document.querySelector('.cal-select[data-date="2026-07-01"]');
    expect(sel.value).toBe('2');

    document.getElementById('btn-save').click();
    await flush();
    const [, , days] = save.mock.calls[0];
    expect(days.find((d) => d.date === '2026-07-01').analystId).toBe(2);
  });
});
