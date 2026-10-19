// tests/frontend/backupView.test.js
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderBackup } from '../../public/js/backupView.js';
import { api } from '../../public/js/api.js';

const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

beforeEach(() => {
  document.body.innerHTML = '<main id="view"></main><div id="toast" hidden></div>';
});

describe('backupView', () => {
  it('desenha os controles de backup e export', async () => {
    await renderBackup(document.getElementById('view'));
    await flush();
    expect(document.getElementById('btn-backup-export')).not.toBeNull();
    expect(document.getElementById('backup-file')).not.toBeNull();
    expect(document.getElementById('btn-download-xlsx')).not.toBeNull();
  });

  it('importa um backup a partir do JSON do arquivo', async () => {
    const imp = vi.spyOn(api, 'importBackup').mockResolvedValue({ ok: true });
    await renderBackup(document.getElementById('view'));
    await flush();
    // simula a leitura de arquivo chamando o handler exposto
    const payload = { analysts: [{ name: 'X', availability: 'any' }], schedules: [] };
    await document.getElementById('backup-file')._onFileText(JSON.stringify(payload));
    await flush();
    expect(imp).toHaveBeenCalledWith(payload);
  });
});
