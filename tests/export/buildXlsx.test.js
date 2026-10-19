import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { buildXlsx } from '../../src/export/buildXlsx.js';

const analysts = [
  { id: 1, name: 'Sara Silva' },
  { id: 2, name: 'Nicolas Limão' },
];

const schedule = {
  year: 2026,
  month: 7,
  days: [
    { date: '2026-07-01', weekday: 3, weekend: false, analystId: 1 }, // quarta -> coluna 4
    { date: '2026-07-02', weekday: 4, weekend: false, analystId: 2 }, // quinta -> coluna 5
  ],
};

describe('buildXlsx', () => {
  it('gera workbook com cabeçalho e células no lugar certo', async () => {
    const buffer = await buildXlsx(schedule, analysts);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const ws = wb.worksheets[0];

    // cabeçalho
    expect(ws.getCell('A1').value).toBe('Domingo');
    expect(ws.getCell('G1').value).toBe('Sábado');

    // 01/07 é quarta -> coluna D (4); data na linha 2, nome na linha 3
    expect(ws.getCell('D2').value).toBe('01/07/2026');
    expect(ws.getCell('D3').value).toBe('Sara Silva');
    // 02/07 é quinta -> coluna E (5)
    expect(ws.getCell('E2').value).toBe('02/07/2026');
    expect(ws.getCell('E3').value).toBe('Nicolas Limão');
  });
});
