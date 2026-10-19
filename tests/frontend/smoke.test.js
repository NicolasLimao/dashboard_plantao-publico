// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';

describe('jsdom disponível', () => {
  it('tem document e cria elementos', () => {
    const div = document.createElement('div');
    div.textContent = 'ok';
    document.body.appendChild(div);
    expect(document.body.querySelector('div').textContent).toBe('ok');
  });
});
