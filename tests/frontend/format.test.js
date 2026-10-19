import { describe, it, expect } from 'vitest';
import { formatBr, WEEKDAYS, availabilityLabel, MONTHS } from '../../public/js/format.js';

describe('format', () => {
  it('formatBr converte ISO para DD/MM/AAAA', () => {
    expect(formatBr('2026-07-01')).toBe('01/07/2026');
  });
  it('WEEKDAYS começa em Domingo e termina em Sábado', () => {
    expect(WEEKDAYS[0]).toBe('Domingo');
    expect(WEEKDAYS[6]).toBe('Sábado');
    expect(WEEKDAYS).toHaveLength(7);
  });
  it('availabilityLabel traduz os enums', () => {
    expect(availabilityLabel('any')).toBe('Qualquer dia');
    expect(availabilityLabel('weekend')).toBe('Só fim de semana');
    expect(availabilityLabel('weekday')).toBe('Só dia de semana');
    expect(availabilityLabel('zzz')).toBe('');
  });
  it('MONTHS tem 12 meses começando em Janeiro', () => {
    expect(MONTHS).toHaveLength(12);
    expect(MONTHS[0]).toBe('Janeiro');
    expect(MONTHS[6]).toBe('Julho');
  });
});
