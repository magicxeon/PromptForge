import { useEffect, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import { ProcessingSpinner } from '../ui/ProcessingSpinner';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { useActor } from '../../lib/auth/ActorProvider';
import { getActiveActorId } from '../../lib/auth/actorStore';
import { requestMediaExport, type MediaExportRequest } from '../../lib/api/mediaExportApi';
import { ComparisonExportDialog, type ComparisonExportItem } from './ComparisonExportDialog';

export function MediaExportButton({ request, count, items = [] }: { request: MediaExportRequest; count?: number; items?: ComparisonExportItem[] }) {
  const { actor } = useActor();
  return request.kind === 'comparison'
    ? <ComparisonExportDialog key={`${actor?.userId}:${request.setId}:${request.runId}`} request={request} items={items} />
    : <LookSheetExportButton request={request} count={count} />;
}

function LookSheetExportButton({ request, count }: { request: MediaExportRequest; count?: number }) {
  const { t } = useTranslation('playground');
  const { actor } = useActor();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const active = useRef<AbortController | null>(null);
  const requestKey = JSON.stringify(request);
  useEffect(() => { setPending(false); setFailed(false); return () => { active.current?.abort(); active.current = null; }; }, [actor?.userId, requestKey]);
  async function download() {
    if (active.current) return;
    const actorId = actor?.userId;
    const controller = new AbortController();
    active.current = controller;
    setPending(true); setFailed(false);
    try {
      const blob = await requestMediaExport(request, controller.signal);
      if (controller.signal.aborted || getActiveActorId() !== actorId) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `momelo-${request.kind}.png`;
      document.body.append(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { if (!controller.signal.aborted) setFailed(true); }
    finally { if (active.current === controller) { active.current = null; setPending(false); } }
  }
  return <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
    <Button size="sm" disabled={pending} icon={pending ? <ProcessingSpinner className="size-4 animate-spin" /> : <Download className="size-4" />} onClick={() => void download()}>
      {t(pending ? 'mediaExport.preparing' : count ? 'mediaExport.comparison' : 'mediaExport.download', { count })}
    </Button>
    {pending ? <Button size="icon" variant="ghost" icon={<X className="size-4" />} title={t('mediaExport.cancel')} onClick={() => { active.current?.abort(); active.current = null; setPending(false); }} /> : null}
    {failed ? <small role="alert">{t('mediaExport.failed')}</small> : null}
  </span>;
}
