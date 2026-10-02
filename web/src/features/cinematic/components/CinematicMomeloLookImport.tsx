import * as Dialog from '@radix-ui/react-dialog';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ExternalLink, RefreshCw, Upload, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { AuthenticatedMediaImage } from '../../../components/media/AuthenticatedMediaImage';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { useFeaturePolicy } from '../../../lib/permissions/FeaturePolicyProvider';
import { listTrustedVideoSources } from '../../generation/api/trustedVideoSources';
import { uploadGenerationReference } from '../../generation/api/generationApi';
import { importMomeloCharacterLook } from '../../profiles/api/profileApi';
import type { CharacterLook } from '../../profiles/schemas/profileSchemas';

type Props = { actorId: string; characterId: string; versionId: string; name: string;
  upload: boolean; onClose: () => void; onImported: (look: CharacterLook) => void };

export function CinematicMomeloLookImport({ actorId, characterId, versionId, name, upload, onClose, onImported }: Props) {
  const { t } = useTranslation('cinematic');
  const policy = useFeaturePolicy();
  const [selected, setSelected] = useState('');
  const [lookName, setLookName] = useState(name);
  const [file, setFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const sources = useInfiniteQuery({ queryKey: ['trusted-momelo-looks', actorId],
    queryFn: ({ pageParam }) => listTrustedVideoSources(pageParam, 'look-sheet'),
    initialPageParam: null as string | null,
    getNextPageParam: page => page.hasMore ? page.nextCursor : undefined,
    maxPages: 5, staleTime: 0, retry: false });
  const items = sources.data?.pages.flatMap(page => page.items) || [];
  async function submit() {
    if (pending.current || !navigator.onLine || getActiveActorId() !== actorId || !confirmed
      || !lookName.trim() || !items.some(item => item.id === selected && item.eligible) || (upload && !file)) return;
    pending.current = true; setBusy(true); setError('');
    try {
      let uploadedAssetId: string | undefined;
      if (upload && file) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error(t('cinematic.momeloLook.fileError'))); reader.readAsDataURL(file);
        });
        const asset = await uploadGenerationReference(dataUrl, 'outfit_front', 'character-look-sheet');
        uploadedAssetId = asset.referenceId;
      }
      if (getActiveActorId() !== actorId) return;
      const look = await importMomeloCharacterLook(characterId, { characterProfileVersionId: versionId,
        generationResultId: selected, name: lookName.trim(), identityAndViewsConfirmed: true, uploadedAssetId });
      if (getActiveActorId() === actorId) onImported(look);
    } catch (cause) { setError(cause instanceof Error ? cause.message : t('cinematic.characters.operationFailed')); }
    finally { pending.current = false; setBusy(false); }
  }
  return <Dialog.Root open onOpenChange={open => { if (!open && !pending.current) onClose(); }}>
    <Dialog.Portal><Dialog.Overlay className="app-confirm-dialog__overlay fixed inset-0 bg-[var(--theme-overlay)]" />
      <Dialog.Content className="app-confirm-dialog__content cinematic-momelo-look-dialog" onEscapeKeyDown={event => { if (pending.current) event.preventDefault(); }}>
        <header><Dialog.Title>{t(upload ? 'cinematic.momeloLook.uploadTitle' : 'cinematic.momeloLook.title')}</Dialog.Title>
          <Dialog.Close asChild><Button size="icon" variant="ghost" icon={<X />} disabled={busy} aria-label={t('cinematic.projectTabs.close')} /></Dialog.Close></header>
        <Dialog.Description>{t(upload ? 'cinematic.momeloLook.uploadDescription' : 'cinematic.momeloLook.description')}</Dialog.Description>
        {policy.policy?.generation.lookSheetDocumentEnabled !== false && policy.policy ? <Link className="cinematic-momelo-look-link" to="/create/playground?media=image&imageMode=look-sheet"><ExternalLink size={16} />{t('cinematic.momeloLook.playground')}</Link> : <p>{t('cinematic.momeloLook.playgroundUnavailable')}</p>}
        <label>{t('cinematic.momeloLook.name')}<input value={lookName} maxLength={100} disabled={busy} onChange={event => setLookName(event.target.value)} /></label>
        {upload ? <label>{t('cinematic.momeloLook.originalFile')}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={event => {
          const next = event.target.files?.[0] || null;
          if (next && (!['image/png', 'image/jpeg', 'image/webp'].includes(next.type) || next.size > 30 * 1024 * 1024)) { setFile(null); setError(t('cinematic.momeloLook.fileError')); event.target.value = ''; }
          else { setFile(next); setError(''); }
        }} /></label> : null}
        <div className="cinematic-momelo-look-library"><strong>{t('cinematic.momeloLook.originalSource')}</strong>
          <Button size="icon" variant="ghost" icon={<RefreshCw />} disabled={busy || sources.isFetching} onClick={() => void sources.refetch()} aria-label={t('cinematic.lookReferences.refresh')} />
        </div>
        {sources.isFetching ? <p role="status"><ProcessingSpinner />{t('cinematic.characters.loading')}</p> : null}
        {sources.isError ? <p role="alert">{t('cinematic.lookReferences.loadFailed')}</p> : null}
        {!sources.isLoading && !items.length ? <p>{t('cinematic.momeloLook.empty')}</p> : null}
        <div className="cinematic-momelo-look-grid">{items.map(item => <button type="button" key={item.id}
          aria-pressed={selected === item.id} disabled={busy || !item.eligible} onClick={() => { setSelected(item.id); setConfirmed(false); }}>
          <AuthenticatedMediaImage src={item.previewUrl} alt={item.id} /><span>{item.modelId}</span>
        </button>)}</div>
        {sources.hasNextPage ? <Button disabled={busy || sources.isFetching} onClick={() => void sources.fetchNextPage()}>{t('cinematic.momeloLook.more')}</Button> : null}
        <label className="cinematic-momelo-look-check"><input type="checkbox" checked={confirmed} disabled={busy || !selected} onChange={event => setConfirmed(event.target.checked)} />{t('cinematic.momeloLook.confirmIdentity')}</label>
        {error ? <p role="alert">{error}</p> : null}
        <footer><Button variant="ghost" disabled={busy} onClick={onClose}>{t('cinematic.projectTabs.cancel')}</Button>
          <Button icon={upload ? <Upload /> : <Check />} variant="primary" loading={busy} disabled={busy || !navigator.onLine || !confirmed || !selected || !lookName.trim() || (upload && !file)} onClick={() => void submit()}>{t('cinematic.momeloLook.review')}</Button></footer>
      </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
