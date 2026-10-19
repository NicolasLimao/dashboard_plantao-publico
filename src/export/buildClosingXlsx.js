import ExcelJS from 'exceljs';
import { RATE_LABELS } from '../closing/rates.js';

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const HEADER_BG = 'FF00305C'; // mesmo azul do export da escala
const HEADER_FG = 'FFFFFFFF';
const MONEY = 'R$ #,##0.00';
const NO_ANALYST = '— sem responsável —';

function formatBr(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Dinheiro sai como NÚMERO em reais + formato de moeda: quem recebe a
// planilha precisa conseguir somar e conferir dentro do próprio Excel.
const reais = (cents) => cents / 100;

function styleHeader(row) {
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
    cell.font = { bold: true, color: { argb: HEADER_FG } };
    cell.alignment = { horizontal: 'center' };
  });
}

export async function buildClosingXlsx(closing) {
  const wb = new ExcelJS.Workbook();

  const resumo = wb.addWorksheet('Resumo');
  styleHeader(resumo.addRow([
    'Analista', 'Seg–Qui', 'Sexta', 'Sábado', 'Domingo', 'Feriado', 'Plantões', 'Total (R$)',
  ]));
  for (const t of closing.totals) {
    const row = resumo.addRow([
      t.name, t.counts.weekday, t.counts.friday, t.counts.saturday,
      t.counts.sunday, t.counts.holiday, t.shifts, reais(t.amount),
    ]);
    row.getCell(8).numFmt = MONEY;
  }
  const totalRow = resumo.addRow(['Total geral', '', '', '', '', '', '', reais(closing.grandTotal)]);
  totalRow.getCell(1).font = { bold: true };
  totalRow.getCell(8).font = { bold: true };
  totalRow.getCell(8).numFmt = MONEY;
  resumo.columns.forEach((c, i) => { c.width = i === 0 ? 28 : 12; });

  const detalhe = wb.addWorksheet('Detalhamento');
  styleHeader(detalhe.addRow(['Data', 'Dia da semana', 'Analista', 'Turno', 'Valor (R$)']));
  for (const l of closing.lines) {
    const row = detalhe.addRow([
      formatBr(l.date),
      WEEKDAYS[l.weekday],
      l.analystName ?? NO_ANALYST,
      RATE_LABELS[l.kind],
      reais(l.amount),
    ]);
    row.getCell(5).numFmt = MONEY;
  }
  detalhe.columns.forEach((c, i) => { c.width = i === 2 ? 28 : 16; });

  return wb.xlsx.writeBuffer();
}
