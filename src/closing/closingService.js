import { analystsRepo } from '../db/analystsRepo.js';
import { schedulesRepo } from '../db/schedulesRepo.js';
import { closingsRepo } from '../db/closingsRepo.js';
import { DEFAULT_RATES } from './rates.js';
import { computeClosing } from './computeClosing.js';

// Ordem de resolução dos valores de um mês:
//   1) os salvos naquele mês
//   2) os do fechamento mais recente que não seja posterior a ele
//   3) os valores padrão do sistema
// Feriados NÃO são herdados: são de cada mês.
export function resolveRates(closings, year, month) {
  const saved = closings.get(year, month);
  if (saved) {
    return { rates: saved.rates, holidays: saved.holidays, saved: true, ratesSource: 'saved' };
  }
  const inherited = closings.latestUpTo(year, month);
  if (inherited) {
    return { rates: inherited.rates, holidays: [], saved: false, ratesSource: 'inherited' };
  }
  return { rates: DEFAULT_RATES, holidays: [], saved: false, ratesSource: 'default' };
}

// null quando não há escala salva para o mês — sem escala não há o que fechar.
export function buildClosing(db, year, month) {
  const schedule = schedulesRepo(db).get(year, month);
  if (!schedule) return null;

  const { rates, holidays, saved, ratesSource } = resolveRates(closingsRepo(db), year, month);
  const result = computeClosing({
    schedule,
    analysts: analystsRepo(db).list(), // list() traz também os inativos
    rates,
    holidays,
  });

  return { year, month, saved, ratesSource, rates, holidays, ...result };
}
