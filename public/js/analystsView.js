import { api } from './api.js';
import { availabilityLabel } from './format.js';

const OPTIONS = [
  ['any', 'Qualquer dia'],
  ['weekend', 'Só fim de semana'],
  ['weekday', 'Só dia de semana'],
];

function toast(msg, isError = false) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' toast--error' : '');
  t.hidden = false;
  setTimeout(() => { t.hidden = true; }, 2500);
}

export async function renderAnalysts(container) {
  const analysts = await api.listAnalysts();
  const optionsHtml = OPTIONS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  container.innerHTML = `
    <h2>Analistas</h2>
    <form id="analyst-form" class="card row" style="margin-bottom:16px">
      <input name="name" placeholder="Nome" required />
      <select name="availability">${optionsHtml}</select>
      <input name="city" placeholder="Bairro/Região (ex.: Zona Sul)" />
      <label class="row" style="gap:6px"><input name="active" type="checkbox" checked /> Ativo</label>
      <button type="submit" class="btn btn--primary">Adicionar</button>
    </form>
    <div class="card">
      <table>
        <thead><tr><th>Nome</th><th>Disponibilidade</th><th>Bairro/Região</th><th>Status</th><th></th></tr></thead>
        <tbody id="analyst-rows"></tbody>
      </table>
    </div>`;

  const tbody = container.querySelector('#analyst-rows');
  for (const a of analysts) {
    const tr = document.createElement('tr');
    tr.dataset.id = a.id;
    tr.innerHTML = `
      <td>${a.name}</td>
      <td>${availabilityLabel(a.availability)}</td>
      <td>${a.city || '—'}</td>
      <td><span class="tag ${a.active ? '' : 'tag--off'}">${a.active ? 'Ativo' : 'Inativo'}</span></td>
      <td class="row">
        <button class="btn btn-edit">Editar</button>
        <button class="btn btn--danger btn-del">Excluir</button>
      </td>`;
    tr.querySelector('.btn-del').addEventListener('click', async () => {
      await api.deleteAnalyst(a.id);
      renderAnalysts(container);
    });
    tr.querySelector('.btn-edit').addEventListener('click', () => fillForm(container, a));
    tbody.appendChild(tr);
  }

  const form = container.querySelector('#analyst-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      name: form.querySelector('[name="name"]').value.trim(),
      availability: form.querySelector('[name="availability"]').value,
      city: form.querySelector('[name="city"]').value.trim(),
      active: form.querySelector('[name="active"]').checked,
    };
    const editingId = form.dataset.editing;
    try {
      if (editingId) await api.updateAnalyst(Number(editingId), data);
      else await api.createAnalyst(data);
      renderAnalysts(container);
    } catch (err) {
      toast(err.fields ? `Campos inválidos: ${err.fields.join(', ')}` : 'Erro ao salvar', true);
    }
  });
}

function fillForm(container, a) {
  const form = container.querySelector('#analyst-form');
  form.querySelector('[name="name"]').value = a.name;
  form.querySelector('[name="availability"]').value = a.availability;
  form.querySelector('[name="city"]').value = a.city || '';
  form.querySelector('[name="active"]').checked = a.active;
  form.dataset.editing = a.id;
  form.querySelector('button[type=submit]').textContent = 'Salvar';
}
