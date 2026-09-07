import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import en from '../../../../../client/i18n/locales/en/admin.json';
import th from '../../../../../client/i18n/locales/th/admin.json';
import type { FinanceReport } from '../schemas/financeSchemas';
import { createFinanceReportExcel } from './financeReportExcel';

const label = (key: string) => (en as Record<string, string>)[key] || key;
function fixture(month = 0): FinanceReport {
  return {
    year: 2026,
    month,
    asOf: '2026-09-07T12:00:00.000Z',
    revision: 'original-revision',
    timezone: 'Asia/Bangkok',
    sourceStatus: 'available',
    invalidCount: 0,
    unallocatedCount: 2,
    page: 2,
    pageSize: 50,
    hasMore: true,
    totals: { capturedCredits: 90, returnedCredits: 0, eventCount: 10 },
    sources: {
      credits: 'available',
      usageCosts: 'unavailable',
      payments: 'unavailable',
    },
    periods: Array.from({ length: 12 }, (_, i) => ({
      period: `2026-${String(i + 1).padStart(2, '0')}`,
      status: i < 9 ? 'available' : 'future',
      capturedCredits: i < 9 ? 10 : null,
      returnedCredits: i < 9 ? 0 : null,
      eventCount: i < 9 ? 1 : 0,
      cashReceived: null,
      supplierPayments: null,
      usageCost: null,
      profit: null,
      closingBalance: null,
    })),
    events: [
      {
        ledgerEntryId: 'must-not-export-page-two',
        operationType: 'capture',
        amountCredits: 10,
        createdAt: '2026-09-01',
        period: '2026-09',
        providerId: 'meta-muse',
        modelId: 'muse',
      },
    ],
  };
}
async function readFile(
  file: Awaited<ReturnType<typeof createFinanceReportExcel>>,
) {
  const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file.blob);
  });
  return new ExcelJS.Workbook().xlsx.load(bytes);
}

describe('Finance Excel summary', () => {
  it('round trips a genuine XLSX with 12 months and unchanged server totals, not paginated events', async () => {
    const report = fixture();
    const before = structuredClone(report);
    const file = await createFinanceReportExcel(
      report,
      { providerId: 'meta-muse', modelId: 'muse' },
      label,
    );
    expect(file.filename).toMatch(/^momelo-finance-2026-.*\.xlsx$/);
    const workbook = await readFile(file);
    expect(workbook.worksheets).toHaveLength(2);
    const sheet = workbook.worksheets[0]!;
    expect(sheet.rowCount).toBe(14);
    expect(sheet.getCell('B14').value).toBe(90);
    expect(sheet.getCell('G14').value).toBe(10);
    expect(sheet.getCell('C2').value).toBe(0);
    expect(sheet.getCell('C2').type).toBe(ExcelJS.ValueType.Number);
    expect(sheet.getCell('D2').value).toBe('Unavailable');
    expect(sheet.getCell('B11').value).toBe('Unavailable');
    expect(sheet.getCell('H11').value).toBe(label('finance.future'));
    const metadata = workbook.worksheets[1]!;
    expect(metadata.getCell('B3').value).toBe('meta-muse');
    expect(metadata.getCell('B4').value).toBe('muse');
    expect(metadata.getCell('B5').value).toBe(report.asOf);
    expect(metadata.getCell('B6').value).toBe(report.timezone);
    expect(metadata.getCell('B7').value).toBe(report.revision);
    expect(JSON.stringify(workbook.model)).not.toContain(
      'must-not-export-page-two',
    );
    expect(report).toEqual(before);
  });
  it('exports only the selected month, with its own supplied total', async () => {
    const report = fixture(2);
    report.totals = { capturedCredits: 10, returnedCredits: 0, eventCount: 1 };
    const file = await createFinanceReportExcel(
      report,
      { providerId: '', modelId: '' },
      label,
    );
    const workbook = await readFile(file);
    const sheet = workbook.worksheets[0]!;
    expect(sheet.rowCount).toBe(3);
    expect(sheet.getCell('A2').value).toBe('2026-02');
    expect(sheet.getCell('B3').value).toBe(10);
    expect(file.filename).toContain('2026-02-');
    expect(workbook.worksheets[1]!.getCell('B3').value).toBe(
      label('finance.allProviders'),
    );
  });
  it('preserves missing totals and literal formula-like filters without formulas or hyperlinks', async () => {
    const report = fixture(1);
    report.sourceStatus = 'incomplete';
    report.invalidCount = 1;
    report.totals.capturedCredits = null;
    report.periods[0]!.capturedCredits = null;
    const formula = '=HYPERLINK("https://example.invalid", "open")';
    const workbook = await readFile(
      await createFinanceReportExcel(
        report,
        { providerId: formula, modelId: '+1+1' },
        label,
      ),
    );
    expect(workbook.worksheets[0]!.getCell('B3').value).toBe('Unavailable');
    expect(workbook.worksheets[1]!.getCell('B3').value).toBe(formula);
    for (const sheet of workbook.worksheets)
      sheet.eachRow((row) =>
        row.eachCell((cell) => {
          expect(cell.type).not.toBe(ExcelJS.ValueType.Formula);
          expect(cell.type).not.toBe(ExcelJS.ValueType.Hyperlink);
        }),
      );
  });
  it('uses Thai sheet names and keeps Thai text readable after serialization', async () => {
    const thai = (key: string) => (th as Record<string, string>)[key] || key;
    const workbook = await readFile(
      await createFinanceReportExcel(
        fixture(9),
        { providerId: 'ผู้ให้บริการ', modelId: '' },
        thai,
      ),
    );
    expect(workbook.worksheets[0]!.name).toBe('สรุปยอด');
    expect(workbook.worksheets[1]!.getCell('B3').value).toBe('ผู้ให้บริการ');
    expect(workbook.worksheets[0]!.getCell('D2').value).toBe(
      thai('finance.unavailable'),
    );
  });
});
