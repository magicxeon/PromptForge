import type { FinanceReport } from '../schemas/financeSchemas';

export interface FinanceExportScope {
  providerId: string;
  modelId: string;
}

export async function createFinanceReportExcel(
  report: FinanceReport,
  scope: FinanceExportScope,
  label: (key: string) => string,
) {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Momelo';
  workbook.created = new Date(report.asOf);
  const summary = workbook.addWorksheet(label('finance.excel.summary'));
  const metadata = workbook.addWorksheet(label('finance.excel.metadata'));
  const amount = (value: number | null) =>
    value ?? label('finance.unavailable');
  const period = `${report.year}${report.month ? `-${String(report.month).padStart(2, '0')}` : ''}`;
  const status = (value: string) => {
    if (value === 'available') return label('finance.excel.available');
    if (value === 'future') return label('finance.future');
    if (value === 'incomplete') return label('finance.incomplete');
    return label('finance.unavailable');
  };

  summary.addRow([
    label('finance.period'),
    `${label('finance.captured')} (${label('finance.creditUnit')})`,
    `${label('finance.returned')} (${label('finance.creditUnit')})`,
    label('finance.usageCost'),
    label('finance.cashReceived'),
    label('finance.supplierPaid'),
    label('finance.events'),
    label('finance.excel.status'),
  ]);
  report.periods
    .filter(
      (row) => !report.month || Number(row.period.slice(-2)) === report.month,
    )
    .forEach((row) =>
      summary.addRow([
        row.period,
        amount(row.capturedCredits),
        amount(row.returnedCredits),
        amount(row.usageCost),
        amount(row.cashReceived),
        amount(row.supplierPayments),
        row.eventCount,
        status(row.status),
      ]),
    );
  // Totals are the server projection, never a new client-side financial calculation.
  const total = summary.addRow([
    label('finance.excel.total'),
    amount(report.totals.capturedCredits),
    amount(report.totals.returnedCredits),
    amount(null),
    amount(null),
    amount(null),
    report.totals.eventCount,
    status(report.sourceStatus),
  ]);
  total.font = { bold: true };
  summary.columns = [18, 32, 36, 28, 28, 28, 16, 28].map((width) => ({
    width,
  }));
  summary.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: total.number - 1, column: 8 },
  };
  for (const index of [2, 3, 7]) summary.getColumn(index).numFmt = '#,##0';

  // Only scalar strings/numbers enter cells: user-like labels cannot become formulas.
  metadata.addRows([
    [label('finance.excel.field'), label('finance.excel.value')],
    [label('finance.period'), period],
    [
      label('finance.provider'),
      scope.providerId || label('finance.allProviders'),
    ],
    [label('finance.model'), scope.modelId || label('finance.allModels')],
    [label('finance.excel.asOfUtc'), report.asOf],
    [label('finance.excel.timezone'), report.timezone],
    [label('finance.excel.revision'), report.revision],
    [label('finance.creditUnit'), label('finance.creditUnit')],
    [label('finance.excel.status'), status(report.sourceStatus)],
    [label('finance.excel.invalidCount'), report.invalidCount],
    [label('finance.excel.unallocatedCount'), report.unallocatedCount],
    [label('finance.excel.scope'), label('finance.excel.scopeNote')],
    [label('finance.evidenceNotice'), label('finance.creditNotCash')],
    [label('finance.excel.basis'), label('finance.excel.basisNote')],
    ...Object.entries(report.sources).map(([source, state]) => [
      `${label('finance.excel.source')}: ${source}`,
      status(state),
    ]),
  ]);
  metadata.columns = [{ width: 38 }, { width: 100 }];
  for (const sheet of [summary, metadata]) {
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.eachRow((row) => {
      row.height = sheet === metadata ? 48 : 36;
      row.alignment = { vertical: 'middle', wrapText: true };
    });
    sheet.getRow(1).height = 54;
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF164E63' },
    };
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return {
    filename: `momelo-finance-${period}-${report.asOf.replace(/[^0-9TZ]/g, '')}.xlsx`,
    blob: new Blob([new Uint8Array(buffer)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  };
}

export function downloadFinanceReportExcel(file: {
  blob: Blob;
  filename: string;
}) {
  const url = URL.createObjectURL(file.blob);
  const anchor = document.createElement('a');
  try {
    anchor.href = url;
    anchor.download = file.filename;
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}
