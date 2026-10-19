export function pad2(n) {
  return String(n).padStart(2, '0');
}

// month: 1-12
export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthDates(year, month) {
  const count = daysInMonth(year, month);
  const dates = [];
  for (let d = 1; d <= count; d++) {
    const weekday = new Date(Date.UTC(year, month - 1, d)).getUTCDay();
    dates.push({
      iso: `${year}-${pad2(month)}-${pad2(d)}`,
      weekday,
      weekend: weekday === 0 || weekday === 6,
    });
  }
  return dates;
}
