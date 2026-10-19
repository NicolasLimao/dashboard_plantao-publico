import { monthDates } from './dates.js';

function canWork(availability, weekend) {
  if (availability === 'any') return true;
  if (availability === 'weekend') return weekend;
  if (availability === 'weekday') return !weekend;
  return false;
}

// Compara bairros/regiões de forma tolerante: ignora maiúsculas/minúsculas e
// espaços extras (ex.: "Bela vista" == "Bela Vista" == "BELA  VISTA"). Bairro
// vazio nunca agrupa com ninguém.
export function sameCity(a, b) {
  const norm = (c) => (c || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const na = norm(a);
  return na !== '' && na === norm(b);
}

export function generateSchedule({ year, month, analysts }) {
  const active = analysts.filter((a) => a.active);
  const stats = new Map();
  for (const a of active) {
    stats.set(a.id, { total: 0, weekend: 0, weekday: 0, lastIndex: -Infinity });
  }

  const dates = monthDates(year, month);
  const days = [];
  const unfilled = [];
  let previous = null; // { analystId, city }

  dates.forEach((day, index) => {
    const candidates = active.filter((a) => {
      if (!canWork(a.availability, day.weekend)) return false;
      if (previous && previous.analystId === a.id) return false; // não-consecutivo
      return true;
    });

    if (candidates.length === 0) {
      unfilled.push(day.iso);
      days.push({ date: day.iso, weekday: day.weekday, weekend: day.weekend, analystId: null });
      previous = null;
      return;
    }

    candidates.sort((a, b) => compareCandidates(a, b, stats, day, previous));

    const chosen = candidates[0];
    const s = stats.get(chosen.id);
    s.total += 1;
    if (day.weekend) s.weekend += 1; else s.weekday += 1;
    s.lastIndex = index;

    days.push({ date: day.iso, weekday: day.weekday, weekend: day.weekend, analystId: chosen.id });
    previous = { analystId: chosen.id, city: chosen.city };
  });

  return { year, month, days, unfilled };
}

// menor = escolhido primeiro
function compareCandidates(a, b, stats, day, previous) {
  const sa = stats.get(a.id);
  const sb = stats.get(b.id);
  // 1) justiça no "balde" do dia (fim de semana x dia útil)
  const bucketA = day.weekend ? sa.weekend : sa.weekday;
  const bucketB = day.weekend ? sb.weekend : sb.weekday;
  if (bucketA !== bucketB) return bucketA - bucketB;
  // 2) justiça no total
  if (sa.total !== sb.total) return sa.total - sb.total;
  // 3) proximidade: preferir mesmo bairro do dia anterior (tolerante a grafia)
  if (previous) {
    const aSame = sameCity(a.city, previous.city);
    const bSame = sameCity(b.city, previous.city);
    if (aSame !== bSame) return aSame ? -1 : 1;
  }
  // 4) menos usado recentemente
  if (sa.lastIndex !== sb.lastIndex) return sa.lastIndex - sb.lastIndex;
  // 5) estável por id
  return String(a.id).localeCompare(String(b.id));
}
