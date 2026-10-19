// tests/frontend/shell.test.js
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('index.html shell', () => {
  it('define os contêineres e botões de navegação esperados', () => {
    document.documentElement.innerHTML = readFileSync('public/index.html', 'utf8');
    for (const id of ['app', 'nav', 'view', 'toast',
                       'nav-calendar', 'nav-analysts', 'nav-schedules', 'nav-backup', 'nav-closing']) {
      expect(document.getElementById(id), `#${id}`).not.toBeNull();
    }
  });
});
