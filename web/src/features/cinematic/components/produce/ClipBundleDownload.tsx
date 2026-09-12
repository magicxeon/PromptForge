import * as Dialog from '@radix-ui/react-dialog';
import { Download, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { apiRequest } from '../../../../lib/api/apiClient';
import { getActiveActorId } from '../../../../lib/auth/actorStore';
import { Button } from '../../../../components/ui/Button';
import { ProcessingSpinner } from '../../../../components/ui/ProcessingSpinner';

const bundleSchema = z.object({
  projectId: z.string(), projectVersion: z.number().int(), sizeBytes: z.number().nonnegative(),
  missing: z.array(z.object({ sceneNumber: z.number(), shotNumber: z.number(), shotId: z.string() })),
  clips: z.array(z.object({ name: z.string(), sizeBytes: z.number(), assetId: z.string(), shotId: z.string(), attemptId: z.string() }))
});

export function ClipBundleDownload({ projectId, version }: { projectId: string; version: number }) {
  const { t } = useTranslation('cinematic');
  const actorId = getActiveActorId();
  const [open, setOpen] = useState(false), [partial, setPartial] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const path = `/api/cinematic/projects/${encodeURIComponent(projectId)}/clip-bundle`;
  const manifest = useQuery({ queryKey: ['cinematic-clip-bundle', actorId, projectId, version],
    queryFn: ({ signal }) => apiRequest(path, { schema: bundleSchema, signal }), enabled: open, retry: false, staleTime: 0, gcTime: 60_000 });
  useEffect(() => () => controller.current?.abort(), [actorId, projectId]);
  function changeOpen(next: boolean) {
    if (!next) controller.current?.abort();
    setOpen(next); setPartial(false); setError('');
  }
  async function download() {
    if (!manifest.data || busy) return;
    const request = new AbortController(); controller.current = request; setBusy(true); setError('');
    try {
      const blob = await apiRequest(path, { method: 'POST', body: { expectedVersion: manifest.data.projectVersion, allowPartial: partial },
        responseType: 'blob', schema: z.instanceof(Blob), signal: request.signal });
      if (request.signal.aborted || getActiveActorId() !== actorId) return;
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = 'momelo-selected-clips.zip'; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setOpen(false);
    } catch (cause) {
      if (!request.signal.aborted) setError(cause instanceof Error ? cause.message : t('cinematic.bundle.failed'));
    } finally { setBusy(false); }
  }
  return <Dialog.Root open={open} onOpenChange={changeOpen}>
    <Dialog.Trigger asChild><Button icon={<Download />}>{t('cinematic.bundle.open')}</Button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="cinematic-dialog__overlay" /><Dialog.Content className="cinematic-dialog__content cinematic-dialog__content--compact">
      <header className="cinematic-dialog__header"><Dialog.Title>{t('cinematic.bundle.open')}</Dialog.Title><Dialog.Close asChild><Button size="icon" variant="ghost" icon={<X />} aria-label={t('cinematic.actions.close')} /></Dialog.Close></header>
      <Dialog.Description>{t('cinematic.bundle.description')}</Dialog.Description>
      {manifest.isFetching ? <p role="status"><ProcessingSpinner className="size-5" />{t('cinematic.bundle.preparing')}</p> : null}
      {manifest.data ? <div className="cinematic-bundle-summary">
        <strong>{t('cinematic.bundle.summary', { count: manifest.data.clips.length, size: (manifest.data.sizeBytes / 1024 / 1024).toFixed(1) })}</strong>
        {manifest.data.missing.length ? <><p>{t('cinematic.bundle.missing', { count: manifest.data.missing.length })}</p><ul>{manifest.data.missing.map(row => <li key={row.shotId}>{t('cinematic.bundle.shot', { scene: row.sceneNumber, shot: row.shotNumber })}</li>)}</ul>
          <label className="cinematic-opening-control"><input type="checkbox" checked={partial} disabled={busy} onChange={event => setPartial(event.target.checked)} /><span>{t('cinematic.bundle.allowPartial')}</span></label></> : null}
      </div> : null}
      {error || manifest.error ? <p role="alert">{error || manifest.error?.message}</p> : null}
      <footer className="cinematic-dialog__footer"><Dialog.Close asChild><Button>{t('cinematic.actions.cancel')}</Button></Dialog.Close>
        <Button variant="primary" icon={busy ? <ProcessingSpinner className="size-4" /> : <Download />} disabled={busy || manifest.isFetching || !manifest.data?.clips.length || Boolean(manifest.data.missing.length && !partial)} onClick={() => void download()}>{t(busy ? 'cinematic.bundle.preparing' : 'cinematic.bundle.download')}</Button>
      </footer>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
