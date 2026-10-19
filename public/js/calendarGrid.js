export function buildWeeks(days) {
  const weeks = [];
  let week = new Array(7).fill(null);
  let col = days.length > 0 ? days[0].weekday : 0;
  for (const d of days) {
    week[col] = { ...d };
    col += 1;
    if (col > 6) {
      weeks.push(week);
      week = new Array(7).fill(null);
      col = 0;
    }
  }
  if (week.some((c) => c !== null)) weeks.push(week);
  return weeks;
}
