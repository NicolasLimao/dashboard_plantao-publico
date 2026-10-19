import { describe, it, expect } from 'vitest';
import { DEFAULT_RATES, RATE_KEYS, RATE_LABELS, kindForDay, invalidRateKeys } from '../../src/closing/rates.js';

describe('kindForDay', () => {
  it('mapeia o dia da semana para o tipo de turno', () => {
    expect(kindForDay({ weekday: 1 })).toBe('weekday'); // segunda
    expect(kindForDay({ weekday: 2 })).toBe('weekday'); // terça
    expect(kindForDay({ weekday: 3 })).toBe('weekday'); // quarta
    expect(kindForDay({ weekday: 4 })).toBe('weekday'); // quinta
    expect(kindForDay({ weekday: 5 })).toBe('friday');
    expect(kindForDay({ weekday: 6 })).toBe('saturday');
    expect(kindForDay({ weekday: 0 })).toBe('sunday');
  });

  it('feriado sobrepõe o dia da semana', () => {
    expect(kindForDay({ weekday: 5, holiday: true })).toBe('holiday');
    expect(kindForDay({ weekday: 0, holiday: true })).toBe('holiday');
    expect(kindForDay({ weekday: 6, holiday: true })).toBe('holiday');
    expect(kindForDay({ weekday: 2, holiday: true })).toBe('holiday');
  });
});

describe('tabela de valores', () => {
  it('traz os valores fictícios da demonstração em centavos', () => {
    expect(DEFAULT_RATES).toEqual({
      weekday: 2500, friday: 5000, saturday: 7500, sunday: 10000, holiday: 12500,
    });
  });

  it('RATE_KEYS e RATE_LABELS cobrem exatamente as mesmas chaves', () => {
    expect(RATE_KEYS).toEqual(['weekday', 'friday', 'saturday', 'sunday', 'holiday']);
    expect(Object.keys(RATE_LABELS).sort()).toEqual([...RATE_KEYS].sort());
  });
});

describe('invalidRateKeys', () => {
  it('aceita a tabela padrão', () => {
    expect(invalidRateKeys(DEFAULT_RATES)).toEqual([]);
  });

  it('acusa chave ausente, valor negativo e valor não inteiro', () => {
    const { friday, ...semSexta } = DEFAULT_RATES;
    expect(invalidRateKeys(semSexta)).toEqual(['friday']);
    expect(invalidRateKeys({ ...DEFAULT_RATES, weekday: -1 })).toEqual(['weekday']);
    expect(invalidRateKeys({ ...DEFAULT_RATES, sunday: 80.5 })).toEqual(['sunday']);
  });

  it('acusa todas as chaves quando rates não é objeto', () => {
    expect(invalidRateKeys(undefined)).toHaveLength(5);
  });
});
