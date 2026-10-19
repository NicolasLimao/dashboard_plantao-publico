import ExcelJS from 'exceljs';

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const HEADER_BG = 'FF00305C'; // azul escuro (ARGB)
const HEADER_FG = 'FFFFFFFF';

function formatBr(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export async function buildXlsx(schedule, analysts) {
  const nameById = new Map(analysts.map((a) => [a.id, a.name]));
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Plantão');

  const header = ws.addRow(WEEKDAYS);
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
    cell.font = { bold: true, color: { argb: HEADER_FG } };
    cell.alignment = { horizontal: 'center' };
  });

  // monta a grade semanal alinhada pela coluna do dia da semana
  const grid = [];
  let week = new Array(7).fill(null);
  const first = schedule.days[0];
  let col = first ? first.weekday : 0;
  for (const d of schedule.days) {
    week[col] = d;
    col += 1;
    if (col > 6) {
      grid.push(week);
      week = new Array(7).fill(null);
      col = 0;
    }
  }
  if (week.some((c) => c)) grid.push(week);

  for (const w of grid) {
    ws.addRow(w.map((d) => (d ? formatBr(d.date) : '')));
    ws.addRow(w.map((d) => (d && d.analystId != null ? (nameById.get(d.analystId) ?? '') : '')));
  }

  ws.columns.forEach((c) => { c.width = 18; });
  return wb.xlsx.writeBuffer();
}
