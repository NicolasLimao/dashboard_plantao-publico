// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderAnalysts } from '../../public/js/analystsView.js';
import { api } from '../../public/js/api.js';

const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

beforeEach(() => {
  document.body.innerHTML = '<main id="view"></main><div id="toast" hidden></div>';
});

describe('analystsView', () => {
  it('lista analistas em linhas da tabela', async () => {
    vi.spyOn(api, 'listAnalysts').mockResolvedValue([
      { id: 1, name: 'Nicolas', availability: 'any', city: 'Cidade Exemplo A', active: true },
      { id: 2, name: 'Moyses', availability: 'weekend', city: 'Cidade Exemplo A', active: false },
    ]);
    await renderAnalysts(document.getElementById('view'));
    await flush();
    const rows = document.querySelectorAll('tr[data-id]');
    expect(rows).toHaveLength(2);
    expect(document.body.textContent).toContain('Nicolas');
    expect(document.body.textContent).toContain('Só fim de semana');
  });

  it('cria um analista pelo formulário', async () => {
    vi.spyOn(api, 'listAnalysts').mockResolvedValue([]);
    const create = vi.spyOn(api, 'createAnalyst').mockResolvedValue({ id: 9, name: 'Sara', availability: 'any', city: '', active: true });
    await renderAnalysts(document.getElementById('view'));
    await flush();
    document.querySelector('#analyst-form [name=name]').value = 'Sara';
    document.querySelector('#analyst-form [name=availability]').value = 'any';
    document.getElementById('analyst-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await flush();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Sara', availability: 'any' }));
  });

  it('exclui um analista', async () => {
    vi.spyOn(api, 'listAnalysts').mockResolvedValue([{ id: 1, name: 'A', availability: 'any', city: '', active: true }]);
    const del = vi.spyOn(api, 'deleteAnalyst').mockResolvedValue(undefined);
    await renderAnalysts(document.getElementById('view'));
    await flush();
    document.querySelector('tr[data-id="1"] .btn-del').click();
    await flush();
    expect(del).toHaveBeenCalledWith(1);
  });

  it('editar preenche o formulário e salva via updateAnalyst', async () => {
    vi.spyOn(api, 'listAnalysts').mockResolvedValue([
      { id: 7, name: 'Nicolas', availability: 'any', city: 'Cidade Exemplo A', active: true },
    ]);
    const update = vi.spyOn(api, 'updateAnalyst').mockResolvedValue({ id: 7, name: 'Nicolas L', availability: 'weekday', city: 'Cidade Exemplo B', active: false });
    await renderAnalysts(document.getElementById('view'));
    await flush();

    // clicar em Editar preenche o formulário (não deve lançar)
    document.querySelector('tr[data-id="7"] .btn-edit').click();
    const form = document.getElementById('analyst-form');
    expect(form.querySelector('[name="name"]').value).toBe('Nicolas');
    expect(form.querySelector('[name="availability"]').value).toBe('any');
    expect(form.querySelector('[name="city"]').value).toBe('Cidade Exemplo A');
    expect(form.dataset.editing).toBe('7');

    // alterar e submeter chama updateAnalyst com o id da linha
    form.querySelector('[name="name"]').value = 'Nicolas L';
    form.querySelector('[name="availability"]').value = 'weekday';
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await flush();
    expect(update).toHaveBeenCalledWith(7, expect.objectContaining({ name: 'Nicolas L', availability: 'weekday' }));
  });
});
