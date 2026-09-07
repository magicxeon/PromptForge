import { FileSpreadsheet, LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import type { FinanceReport } from '../schemas/financeSchemas';
import {
  createFinanceReportExcel,
  downloadFinanceReportExcel,
  type FinanceExportScope,
} from './financeReportExcel';

export function FinanceReportExport({
  report,
  scope,
  disabled,
}: {
  report?: FinanceReport;
  scope: FinanceExportScope;
  disabled: boolean;
}) {
  const { t } = useTranslation('admin');
  const [exporting, setExporting] = useState(false);
  const [failed, setFailed] = useState(false);
  const pending = useRef(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  async function exportReport() {
    if (!report || disabled || pending.current) return;
    pending.current = true;
    setExporting(true);
    setFailed(false);
    try {
      const file = await createFinanceReportExcel(report, scope, (key) =>
        t(key),
      );
      if (active.current) downloadFinanceReportExcel(file);
    } catch {
      if (active.current) setFailed(true);
    } finally {
      pending.current = false;
      if (active.current) setExporting(false);
    }
  }

  return (
    <div className="finance-export">
      <Button
        onClick={() => void exportReport()}
        disabled={disabled || !report || exporting}
        aria-busy={exporting}
      >
        {exporting ? (
          <LoaderCircle size={16} aria-hidden="true" />
        ) : (
          <FileSpreadsheet size={16} aria-hidden="true" />
        )}
        {t(exporting ? 'finance.excel.exporting' : 'finance.excel.export')}
      </Button>
      {failed ? <small role="alert">{t('finance.excel.failed')}</small> : null}
    </div>
  );
}
