function canWork(availability, weekend) {
  if (availability === 'any') return true;
  if (availability === 'weekend') return weekend;
  if (availability === 'weekday') return !weekend;
  return false;
}

export function substituteAnalyst({ days, analysts, fromId, toId, from = null, to = null }) {
  const to_ = analysts.find((a) => a.id === toId);
  const out = days.map((d) => ({ ...d }));
  const conflicts = [];

  const inRange = (iso) => (from === null || iso >= from) && (to === null || iso <= to);

  for (let i = 0; i < out.length; i++) {
    const d = out[i];
    if (d.analystId !== fromId || !inRange(d.date)) continue;

    const prev = i > 0 ? out[i - 1].analystId : null;
    const next = i < out.length - 1 ? out[i + 1].analystId : null;
    const wouldBeConsecutive = prev === toId || next === toId;

    if (!to_ || !canWork(to_.availability, d.weekend) || wouldBeConsecutive) {
      d.analystId = null;
      conflicts.push(d.date);
    } else {
      d.analystId = toId;
    }
  }

  return { days: out, conflicts };
}
