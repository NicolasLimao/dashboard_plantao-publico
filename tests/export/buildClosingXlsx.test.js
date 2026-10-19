import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { buildClosingXlsx } from '../../src/export/buildClosingXlsx.js';

const closing = {
  year: 2026, month: 8,
  rates: { weekday: 2500, friday: 5000, saturday: 7500, sunday: 10000, holiday: 12500 },
  holidays: [],
  lines: [
    { date: '2026-08-01', weekday: 6, kind: 'saturday', holiday: false, analystId: 1, analystName: 'Ana', amount: 7500 },
    { date: '2026-08-03', weekday: 1, kind: 'weekday', holiday: false, analystId: 1, analystName: 'Ana', amount: 2500 },
    { date: '2026-08-04', weekday: 2, kind: 'weekday', holiday: false, analystId: null, analystName: null, amount: 0 },
  ],
  totals: [
    { analystId: 1, name: 'Ana', counts: { weekday: 1, friday: 0, saturday: 1, sunday: 0, holiday: 0 }, shifts: 2, amount: 10000 },
  ],
  unassigned: ['2026-08-04'],
  grandTotal: 10000,
};

async function load() {
  const buffer = await buildClosingXlsx(closing);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  return wb;
}

describe('buildClosingXlsx', () => {
  it('gera as abas Resumo e Detalhamento', async () => {
    const wb = await load();
    expect(wb.worksheets.map((ws) => ws.name)).toEqual(['Resumo', 'Detalhamento']);
  });

  it('Resumo traz cabeçalho, a linha do analista e o total geral', async () => {
    const ws = (await load()).getWorksheet('Resumo');
    expect(ws.getCell('A1').value).toBe('Analista');
    expect(ws.getCell('H1').value).toBe('Total (R$)');

    expect(ws.getCell('A2').value).toBe('Ana');
    expect(ws.getCell('B2').value).toBe(1);  // Seg–Qui
    expect(ws.getCell('D2').value).toBe(1);  // Sábado
    expect(ws.getCell('G2').value).toBe(2);  // Plantões
    expect(ws.getCell('H2').value).toBe(100); // em REAIS, como número

    expect(ws.getCell('A3').value).toBe('Total geral');
    expect(ws.getCell('H3').value).toBe(100);
    expect(ws.getCell('H3').font.bold).toBe(true);
  });

  it('valores de dinheiro saem como número formatado em R$, não como texto', async () => {
    const ws = (await load()).getWorksheet('Resumo');
    expect(typeof ws.getCell('H2').value).toBe('number');
    expect(ws.getCell('H2').numFmt).toBe('R$ #,##0.00');
  });

  it('Detalhamento traz uma linha por dia e marca o dia sem responsável', async () => {
    const ws = (await load()).getWorksheet('Detalhamento');
    expect(ws.getCell('A1').value).toBe('Data');

    expect(ws.getCell('A2').value).toBe('01/08/2026');
    expect(ws.getCell('B2').value).toBe('Sábado');
    expect(ws.getCell('C2').value).toBe('Ana');
    expect(ws.getCell('D2').value).toBe('Sábado → Domingo');
    expect(ws.getCell('E2').value).toBe(75);

    expect(ws.getCell('C4').value).toMatch(/sem respons/i);
    expect(ws.getCell('E4').value).toBe(0);
    expect(ws.rowCount).toBe(4); // cabeçalho + 3 dias
  });
});
