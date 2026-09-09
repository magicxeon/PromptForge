import * as Dialog from '@radix-ui/react-dialog';
import { Download, Maximize2, Minus, Plus, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { GenerationStageState } from '../generation/GenerationStageState';
import { useActor } from '../../lib/auth/ActorProvider';
import { getActiveActorId } from '../../lib/auth/actorStore';
import { requestComparisonExport, type ComparisonExportRequest, type ComparisonExportMetadata } from '../../lib/api/mediaExportApi';
import { ApiError } from '../../lib/api/apiError';

export type ComparisonExportItem = { id: string; provider: string; model: string };
type Ready = ComparisonExportMetadata & { url: string; actorId: string; key: string };

export function ComparisonExportDialog({ request, items }: { request: ComparisonExportRequest; items: ComparisonExportItem[] }) {
  const { t, i18n } = useTranslation('comparisons');
  const { actor } = useActor();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(items.length <= 4 ? items.map(item => item.id) : []);
  const [layout, setLayout] = useState<ComparisonExportRequest['layout']>('auto');
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [size, setSize] = useState<'standard' | 'high'>('standard');
  const [ready, setReady] = useState<Ready | null>(null);
  const [decoded, setDecoded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [started, setStarted] = useState(false);
  const ids = items.filter(item => selected.includes(item.id)).map(item => item.id);
  const valid = ids.length >= 2 && ids.length <= 4;
  const locale = i18n.language?.startsWith('th') ? 'th' : 'en';
  const key = JSON.stringify({ setId: request.setId, runId: request.runId, ids, layout, format, size, locale, actorId: actor?.userId });
  const current = ready?.key === key && ready.actorId === actor?.userId ? ready : null;
  useEffect(() => {
    setReady(null); setDecoded(false); setError(null); setStarted(false); setZoom(1);
    if (!open || !valid || !actor?.userId) return;
    const controller = new AbortController(); let url: string | null = null;
    const actorId = actor.userId;
    const timer = window.setTimeout(() => {
      void requestComparisonExport({ kind: 'comparison', setId: request.setId, runId: request.runId,
        outputIds: ids, layout, format, size, locale }, controller.signal).then(result => {
        if (controller.signal.aborted || getActiveActorId() !== actorId) return;
        url = URL.createObjectURL(result.blob);
        setReady({ ...result, url, actorId, key });
      }).catch(error => {
        if (!controller.signal.aborted) setError(error instanceof ApiError ? error.code : 'export_failed');
      });
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [key, open, retry]);
  const errorKey = error && ['export_size_limit', 'export_metadata_too_long', 'export_font_unavailable', 'export_logo_invalid', 'export_selection_invalid', 'export_busy'].includes(error) ? error : 'export_failed';
  function download() {
    if (!current || !decoded || error || getActiveActorId() !== current.actorId) return;
    const anchor = document.createElement('a'); anchor.href = current.url; anchor.download = current.filename;
    document.body.append(anchor); anchor.click(); anchor.remove(); setStarted(true);
  }
  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger asChild><Button className="comparison-export-action" size="sm" icon={<Download className="size-4" />}>{t('comparisons.export.open')}</Button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="comparison-export-overlay" />
      <Dialog.Content className="comparison-export-dialog" aria-describedby={undefined}>
        <header><Dialog.Title>{t('comparisons.export.title')}</Dialog.Title><Dialog.Close asChild>
          <Button size="icon" variant="ghost" icon={<X />} title={t('comparisons.export.close')} />
        </Dialog.Close></header>
        <div className="comparison-export-dialog__body">
          <fieldset className="comparison-export-selection"><legend>{t('comparisons.export.selection', { count: ids.length })}</legend>
            {items.map(item => <label key={item.id}><input type="checkbox" checked={selected.includes(item.id)}
              disabled={!selected.includes(item.id) && ids.length >= 4} onChange={event => setSelected(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))} />
              <span><small>{item.provider}</small><strong>{item.model}</strong></span></label>)}
          </fieldset>
          <div className="comparison-export-options">
            <label>{t('comparisons.export.frames')}<select value={layout} onChange={event => setLayout(event.target.value as typeof layout)}>
              <option value="auto">{t('comparisons.export.auto')}</option><option value="side_by_side">{t('comparisons.export.portrait')}</option><option value="stacked">{t('comparisons.export.landscape')}</option>
            </select></label>
            <label>{t('comparisons.export.format')}<select value={format} onChange={event => setFormat(event.target.value as typeof format)}><option value="png">PNG</option><option value="jpeg">JPEG</option></select></label>
            <label>{t('comparisons.export.size')}<select value={size} onChange={event => setSize(event.target.value as typeof size)}><option value="standard">{t('comparisons.export.standard')}</option><option value="high">{t('comparisons.export.high')}</option></select></label>
          </div>
          <div className="comparison-export-preview" aria-busy={valid && !error && !decoded}>
            {!valid ? <p>{t('comparisons.export.choose')}</p> : error ? <div role="alert"><p>{t(`comparisons.export.error.${errorKey}`)}</p>
              <Button icon={<RefreshCw className="size-4" />} onClick={() => setRetry(value => value + 1)}>{t('comparisons.export.retry')}</Button></div>
              : <>{!decoded ? <GenerationStageState loading title={t('comparisons.export.preparing')} /> : null}
                {current ? <img src={current.url} alt={t('comparisons.export.preview')} style={decoded ? zoom > 1 ? { width: `${zoom * 100}%`, maxWidth: 'none', maxHeight: 'none' } : {} : { visibility: 'hidden', position: 'absolute' }}
                  onLoad={event => { if (event.currentTarget.naturalWidth !== current.width || event.currentTarget.naturalHeight !== current.height) setError('export_encoding_failed'); else setDecoded(true); }}
                  onError={() => setError('export_encoding_failed')} /> : null}</>}
          </div>
          {current && decoded && !error ? <>
            <div className="comparison-export-zoom"><output>{current.width} x {current.height} px</output>
              <Button size="icon" variant="ghost" icon={<Minus />} title={t('comparisons.viewer.zoomOut')} disabled={zoom === 1} onClick={() => setZoom(value => Math.max(1, value - .5))} />
              <Button size="icon" variant="ghost" icon={<Maximize2 />} title={t('comparisons.viewer.fit')} onClick={() => setZoom(1)} />
              <Button size="icon" variant="ghost" icon={<Plus />} title={t('comparisons.viewer.zoomIn')} disabled={zoom >= 3} onClick={() => setZoom(value => Math.min(3, value + .5))} />
            </div>
            {current.warnings.length ? <ul className="comparison-export-warnings">{[...new Set(current.warnings.map(warning => warning.code))].map(code => <li key={code}>{t(`comparisons.export.warning.${code}`)}</li>)}</ul> : null}
          </> : null}
        </div>
        <footer><span role="status">{started ? t('comparisons.export.started') : ''}</span><Dialog.Close asChild><Button variant="ghost">{t('comparisons.export.cancel')}</Button></Dialog.Close>
          <Button className="comparison-export-action" icon={<Download className="size-4" />} disabled={!current || !decoded || Boolean(error)} onClick={download}>{t('comparisons.export.download')}</Button></footer>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
