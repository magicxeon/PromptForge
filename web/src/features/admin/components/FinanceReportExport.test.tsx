import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinanceReportExport } from './FinanceReportExport';
import type { FinanceReport } from '../schemas/financeSchemas';

const mocks = vi.hoisted(() => ({ create: vi.fn(), download: vi.fn() }));
vi.mock('./financeReportExcel', () => ({
  createFinanceReportExcel: mocks.create,
  downloadFinanceReportExcel: mocks.download,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
const report = { asOf: 'snapshot' } as FinanceReport;
const scope = { providerId: 'meta-muse', modelId: 'muse' };
const file = { filename: 'test.xlsx', blob: new Blob() };
beforeEach(() => vi.resetAllMocks());

describe('Finance export control', () => {
  it('passes the loaded snapshot and scope, prevents duplicate clicks while exporting', async () => {
    let finish!: (value: typeof file) => void;
    mocks.create.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    render(
      <FinanceReportExport report={report} scope={scope} disabled={false} />,
    );
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button'));
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.create).toHaveBeenCalledWith(
      report,
      scope,
      expect.any(Function),
    );
    expect(screen.getByRole('button')).toBeDisabled();
    await act(async () => finish(file));
    expect(mocks.download).toHaveBeenCalledWith(file);
    expect(screen.getByRole('button')).toBeEnabled();
  });
  it('disables export for pending/failed reads and missing data', () => {
    const { rerender } = render(
      <FinanceReportExport report={report} scope={scope} disabled />,
    );
    expect(screen.getByRole('button')).toBeDisabled();
    rerender(<FinanceReportExport scope={scope} disabled={false} />);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('reports export errors and allows retry without refetching the report', async () => {
    mocks.create
      .mockRejectedValueOnce(new Error('do not expose this error'))
      .mockResolvedValueOnce(file);
    render(
      <FinanceReportExport report={report} scope={scope} disabled={false} />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'finance.excel.failed',
    );
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(mocks.download).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('does not download after unmount or a keyed scope replacement', async () => {
    let finish!: (value: typeof file) => void;
    mocks.create.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { rerender } = render(
      <FinanceReportExport
        key="old-actor"
        report={report}
        scope={scope}
        disabled={false}
      />,
    );
    fireEvent.click(screen.getByRole('button'));
    rerender(
      <FinanceReportExport
        key="new-actor"
        report={report}
        scope={scope}
        disabled={false}
      />,
    );
    await act(async () => finish(file));
    expect(mocks.download).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toBeEnabled();
  });
});
