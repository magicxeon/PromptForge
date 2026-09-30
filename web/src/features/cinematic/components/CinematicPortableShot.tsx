import { Copy, Download, PackageOpen } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { AuthenticatedMediaImage } from '../../../components/media/AuthenticatedMediaImage';
import { apiMediaBlob } from '../../../lib/api/apiClient';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { exportCinematicShotWriter } from '../api/cinematicSeriesApi';

type Props = { actorId: string; projectId: string; sceneId: string; shotId: string; version: number; disabled: boolean };

export function CinematicPortableShot({ actorId, projectId, sceneId, shotId, version, disabled }: Props) {
  const { t } = useTranslation('cinematic');
  const [packet, setPacket] = useState<Awaited<ReturnType<typeof exportCinematicShotWriter>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const active = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const pending = useRef(false);
  const scope = `${actorId}:${projectId}:${sceneId}:${shotId}:${version}`;
  const latestScope = useRef(scope);
  latestScope.current = scope;
  useEffect(() => { active.current = true; return () => { active.current = false; controller.current?.abort(); }; }, []);
  useEffect(() => { setPacket(null); setStatus(''); controller.current?.abort(); }, [scope]);
  const current = () => active.current && getActiveActorId() === actorId && latestScope.current === scope;

  async function run(operation: () => Promise<void>) {
    if (pending.current || disabled) return;
    pending.current = true; setBusy(true); setStatus('');
    try { await operation(); }
    catch (error) { if (current()) setStatus(error instanceof Error ? error.message : t('cinematic.portable.failed')); }
    finally { pending.current = false; if (active.current) setBusy(false); }
  }

  async function imageAction(url: string, number: number, copy: boolean) {
    controller.current = new AbortController();
    const blob = await apiMediaBlob(url, controller.current.signal);
    if (!current()) return;
    if (!/^image\/(png|jpeg|webp)$/.test(blob.type) || blob.size > 32 * 1024 * 1024) throw new Error(t('cinematic.portable.failed'));
    if (copy) {
      try {
        if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') throw new Error();
        const bitmap = await createImageBitmap(blob);
        let png: Blob;
        try {
          if (bitmap.width * bitmap.height > 32_000_000) throw new Error();
          const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
          const context = canvas.getContext('2d'); if (!context) throw new Error();
          context.drawImage(bitmap, 0, 0);
          png = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error()), 'image/png'));
          canvas.width = 0; canvas.height = 0;
        } finally { bitmap.close(); }
        if (!current()) return;
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
        if (current()) setStatus(t('cinematic.shotWorkspace.copied'));
      } catch { throw new Error(t('cinematic.portable.failed')); }
    } else {
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = objectUrl;
      link.download = `shot-reference-${number}.${blob.type === 'image/jpeg' ? 'jpg' : blob.type.split('/')[1]}`;
      document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }
  }

  return <details className="cinematic-portable-shot">
    <summary>{t('cinematic.portable.title')}</summary>
    <Button size="sm" icon={<PackageOpen />} disabled={disabled || busy} loading={busy} onClick={() => void run(async () => {
      const result = await exportCinematicShotWriter(projectId, sceneId, shotId, version);
      if (current()) setPacket(result);
    })}>{t('cinematic.portable.prepare')}</Button>
    {packet ? <>
      {packet.warnings?.map(warning => <p role="status" key={warning}>{t(`cinematic.portable.${warning}`)}</p>)}
      {packet.issues?.length ? <div role="status"><strong>{t('cinematic.portable.partial')}</strong><ul>{packet.issues.map(issue => <li key={issue.slot}>
        {t('cinematic.portable.unavailable', { slot: issue.slot, name: issue.name, reason: t(`cinematic.portable.${issue.code}`) })}
      </li>)}</ul></div> : null}
      {packet.copyReady !== false ? <textarea readOnly rows={10} value={packet.prompt} aria-label={t('cinematic.portable.title')} /> : null}
      <Button size="sm" icon={<Copy />} disabled={disabled || busy || packet.copyReady === false} onClick={() => void run(async () => {
        await navigator.clipboard.writeText(packet.prompt);
        if (current()) setStatus(t('cinematic.shotWorkspace.copied'));
      })}>{t('cinematic.shotWorkspace.copy')}</Button>
      <ol>{packet.references.map(item => <li key={item.number}>
        <AuthenticatedMediaImage src={item.imageUrl} alt={item.name} />
        <div><strong>{t('cinematic.portable.reference', { number: item.number, name: item.name })}</strong>
          <small>{t('cinematic.portable.source', { source: t(`cinematic.lookReferences.source.${item.source}`) })}</small>
          <div className="cinematic-shot-workspace__actions">
            <Button size="sm" icon={<Copy />} disabled={disabled || busy} onClick={() => void run(() => imageAction(item.imageUrl, item.number, true))}>{t('cinematic.portable.copyImage')}</Button>
            <Button size="sm" icon={<Download />} disabled={disabled || busy} onClick={() => void run(() => imageAction(item.imageUrl, item.number, false))}>{t('cinematic.portable.download')}</Button>
          </div>
        </div>
      </li>)}</ol>
    </> : null}
    {status ? <p role="status">{status}</p> : null}
  </details>;
}
