import { kindForDay } from './rates.js';

const emptyCounts = () => ({ weekday: 0, friday: 0, saturday: 0, sunday: 0, holiday: 0 });

// Puro: não toca no banco. Recebe a escala salva do mês, o cadastro de
// analistas, os valores (centavos) e as datas marcadas como feriado.
export function computeClosing({ schedule, analysts, rates, holidays = [] }) {
  const holidaySet = new Set(holidays);
  const byId = new Map(analysts.map((a) => [a.id, a]));

  const lines = [];
  const totalsById = new Map();
  const unassigned = [];
  let grandTotal = 0;

  for (const day of schedule.days) {
    const holiday = holidaySet.has(day.date);
    const kind = kindForDay({ weekday: day.weekday, holiday });
    const analystId = day.analystId ?? null;

    if (analystId == null) {
      lines.push({ date: day.date, weekday: day.weekday, kind, holiday, analystId: null, analystName: null, amount: 0 });
      unassigned.push(day.date);
      continue;
    }

    // Analista removido do cadastro ainda trabalhou: esconder a linha
    // esconderia dinheiro devido.
    const analystName = byId.get(analystId)?.name ?? `(analista removido #${analystId})`;
    const amount = rates[kind] ?? 0;

    lines.push({ date: day.date, weekday: day.weekday, kind, holiday, analystId, analystName, amount });

    if (!totalsById.has(analystId)) {
      totalsById.set(analystId, { analystId, name: analystName, counts: emptyCounts(), shifts: 0, amount: 0 });
    }
    const total = totalsById.get(analystId);
    total.counts[kind] += 1;
    total.shifts += 1;
    total.amount += amount;
    grandTotal += amount;
  }

  const totals = [...totalsById.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return { lines, totals, unassigned, grandTotal };
}
