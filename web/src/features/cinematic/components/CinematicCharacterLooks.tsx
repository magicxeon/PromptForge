import { Check, ChevronDown, Images, RefreshCw, Sparkles, Upload, Unlink } from 'lucide-react';
import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { AuthenticatedMediaImage } from '../../../components/media/AuthenticatedMediaImage';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { listCharacterLooks } from '../../profiles/api/profileApi';
import { CharacterLookDialog, type CharacterLookDialogMode } from '../../profiles/components/CharacterLookDialog';
import type { CharacterLook } from '../../profiles/schemas/profileSchemas';
import { getCinematicProject, getCinematicLookRemovalImpact, removeCinematicWardrobeLook, suggestCinematicWardrobe, upsertCinematicWardrobeLook } from '../api/cinematicApi';
import type { CinematicCastAssignment, CinematicProject } from '../schemas/cinematicSchemas';
import { readCharacterLookBindings } from './storyboardGenerationAdapter';
import { CinematicMomeloLookImport } from './CinematicMomeloLookImport';

type Props = {
  actorId: string; project: CinematicProject; storyProject: CinematicProject;
  character: CinematicCastAssignment; disabled: boolean;
  onChooseCharacter: () => void; onProjectChanged: (project: CinematicProject) => void;
};

export function CinematicCharacterLooks({ actorId, project, storyProject, character, disabled, onChooseCharacter, onProjectChanged }: Props) {
  const { t } = useTranslation('cinematic');
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [dialog, setDialog] = useState<{ mode: CharacterLookDialogMode; look?: CharacterLook } | null>(null);
  const [bindingId, setBindingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const removeTrigger = useRef<HTMLElement | null>(null);
  const [importMode, setImportMode] = useState<'library' | 'upload' | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const impact = useQuery({ queryKey: ['cinematic-look-removal', actorId, storyProject.id, storyProject.version, character.id, removing],
    queryFn: () => getCinematicLookRemovalImpact(storyProject.id, character.id, removing!), enabled: Boolean(removing), staleTime: 0, retry: false });
  const profileReady = Boolean(character.characterProfileId && character.characterProfileVersionId);
  const queryKey = ['character-looks', actorId, character.characterProfileId, character.characterProfileVersionId];
  const looks = useQuery({
    queryKey,
    queryFn: () => listCharacterLooks(character.characterProfileId!, character.characterProfileVersionId!),
    enabled: expanded && profileReady && !disabled, staleTime: 30_000, retry: false
  });
  const bindings = readCharacterLookBindings(character);
  const preview = bindings.find(look => look.ready);

  async function bind(look: CharacterLook) {
    if (!look.approvedVersionId || pending.current || disabled) return;
    if (look.sourceCharacterProfileVersionId !== character.characterProfileVersionId) {
      setError(t('cinematic.lookReferences.identityMismatch')); return;
    }
    pending.current = true; setBindingId(look.id); setError('');
    try {
      const root = await upsertCinematicWardrobeLook(storyProject.id, character.id,
        `cinelook_${look.id}_${look.approvedVersionId}`, {
          expectedVersion: storyProject.version, name: look.name, mode: 'character_look',
          characterLookId: look.id, characterLookVersionId: look.approvedVersionId,
          coverage: 'multi_view', locked: true
        });
      if (getActiveActorId() !== actorId) return;
      queryClient.setQueryData(['cinematic-project', actorId, root.id], root);
      const current = project.id === root.id ? root : await getCinematicProject(project.id);
      if (getActiveActorId() !== actorId) return;
      queryClient.setQueryData(['cinematic-project', actorId, project.id], current);
      onProjectChanged(current);
    } catch (cause) { setError(cause instanceof Error ? cause.message : t('cinematic.characters.operationFailed')); }
    finally { pending.current = false; setBindingId(null); }
  }

  function saved(look: CharacterLook) {
    queryClient.setQueryData(queryKey, { items: [look, ...(looks.data?.items || []).filter(item => item.id !== look.id)] });
    void looks.refetch();
    if (look.approvedVersionId) void bind(look);
  }

  async function unlink() {
    if (!removing || !impact.data || impact.isFetching || pending.current || disabled || getActiveActorId() !== actorId) return;
    pending.current = true; setBindingId(removing); setError('');
    try {
      const root = await removeCinematicWardrobeLook(storyProject.id, character.id, removing,
        { expectedVersion: impact.data.projectVersion, impactFingerprint: impact.data.fingerprint });
      if (getActiveActorId() !== actorId) return;
      queryClient.setQueryData(['cinematic-project', actorId, root.id], root);
      await queryClient.invalidateQueries({ queryKey: ['cinematic-project', actorId] });
      const current = project.id === root.id ? root : await getCinematicProject(project.id);
      if (getActiveActorId() === actorId) { onProjectChanged(current); setRemoving(null); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : t('cinematic.characters.operationFailed')); }
    finally { pending.current = false; setBindingId(null); }
  }

  return <details className="cinematic-character-looks" onToggle={event => setExpanded(event.currentTarget.open)}>
    <summary><Images aria-hidden="true" /><span className="cinematic-character-looks__summary-label"><strong>{t('cinematic.lookReferences.title')}</strong><small>{t(preview ? 'cinematic.lookReferences.bound' : 'cinematic.lookReferences.empty')}</small></span>
      {preview?.previewUrl ? <AuthenticatedMediaImage src={preview.previewUrl} alt={preview.name} /> : null}
      <span>{bindings.filter(look => look.ready).length}</span><ChevronDown className="cinematic-character-looks__chevron" aria-hidden="true" /></summary>
    {expanded ? <div className="cinematic-character-looks__body">
      {bindings.length ? <ul className="cinematic-look-reference-list">{bindings.map(look => <li key={look.id}>
        <AuthenticatedMediaImage src={look.previewUrl || undefined} alt="" />
        <div><strong>{look.name}</strong><small>{t(`cinematic.lookReferences.source.${look.source}`)} / {t(look.ready ? 'cinematic.lookReferences.bound' : 'cinematic.lookReferences.unavailable')}</small></div>
        {character.looks.some(item => item && typeof item === 'object' && 'id' in item && item.id === look.id) ? <Button size="icon" variant="ghost" icon={<Unlink />} disabled={disabled || Boolean(bindingId)}
          aria-label={t('cinematic.momeloLook.removeFor', { name: look.name })} title={t('cinematic.momeloLook.removeFor', { name: look.name })} onClick={event => { removeTrigger.current = event.currentTarget; setRemoving(look.id); setError(''); }} /> : null}
      </li>)}</ul> : null}
      {!profileReady ? <Button size="sm" icon={<Images />} disabled={disabled} onClick={onChooseCharacter}>{t('cinematic.characters.chooseFromLibrary')}</Button> : <>
        <div className="cinematic-character-looks__tools" role="group" aria-label={t('cinematic.lookReferences.title')}>
          <Button size="sm" icon={<Images />} disabled={disabled || Boolean(bindingId)} onClick={() => setImportMode('library')}>{t('cinematic.momeloLook.select')}</Button>
          <Button size="sm" icon={<Upload />} disabled={disabled || Boolean(bindingId)} onClick={() => setImportMode('upload')}>{t('cinematic.lookReferences.upload')}</Button>
          <Button size="sm" icon={<Sparkles />} disabled={disabled || Boolean(bindingId)} onClick={() => setDialog({ mode: 'ai' })}>{t('cinematic.lookReferences.generate')}</Button>
          <Button size="icon" icon={<RefreshCw />} aria-label={t('cinematic.lookReferences.refresh')} title={t('cinematic.lookReferences.refresh')} disabled={disabled || looks.isFetching} onClick={() => void looks.refetch()} />
        </div>
        {looks.isFetching ? <p role="status"><ProcessingSpinner />{t('cinematic.characters.loading')}</p> : null}
        {looks.isError ? <p role="alert">{t('cinematic.lookReferences.loadFailed')}</p> : null}
        {looks.data?.items.filter(look => look.lifecycleStatus !== 'retired').map(look => {
          const alreadyBound = Boolean(look.approvedVersionId && bindings.some(bound => bound.versionId === look.approvedVersionId));
          const compatible = look.sourceCharacterProfileVersionId === character.characterProfileVersionId;
          return <div className="cinematic-character-looks__choice" key={look.id}>
            <div><strong>{look.name}</strong><small>{t(!compatible ? 'cinematic.lookReferences.identityMismatch' : alreadyBound ? 'cinematic.lookReferences.bound' : look.approvedVersionId ? 'cinematic.lookReferences.approved' : 'cinematic.lookReferences.needsReview')}</small></div>
            <Button size="sm" icon={look.approvedVersionId ? <Check /> : <Images />} loading={bindingId === look.id} disabled={disabled || Boolean(bindingId) || alreadyBound || !compatible} onClick={() => look.approvedVersionId ? void bind(look) : setDialog({ mode: 'upload', look })}>{t(look.approvedVersionId ? 'cinematic.lookReferences.reuse' : 'cinematic.lookReferences.review')}</Button>
          </div>;
        })}
      </>}
      {error ? <p role="alert">{error}</p> : null}
    </div> : null}
    {importMode && profileReady ? <CinematicMomeloLookImport actorId={actorId} characterId={character.characterProfileId!} versionId={character.characterProfileVersionId!}
      name={character.displayName} upload={importMode === 'upload'} onClose={() => setImportMode(null)} onImported={look => { setImportMode(null); saved(look); setDialog({ mode: 'upload', look }); }} /> : null}
    {removing ? <ConfirmDialog open onOpenChange={open => { if (!open && !pending.current) setRemoving(null); }} trigger={<span />}
      onCloseAutoFocus={event => { event.preventDefault(); if (removeTrigger.current?.isConnected) removeTrigger.current.focus(); }}
      title={t('cinematic.momeloLook.removeTitle')} description={t('cinematic.momeloLook.removeDescription', { name: character.displayName, look: bindings.find(item => item.id === removing)?.name })}
      confirmLabel={t('cinematic.momeloLook.removeTitle')} destructive pending={disabled || Boolean(bindingId) || !impact.data || impact.isFetching || impact.isError} cancelDisabled={Boolean(bindingId)}
      onConfirm={() => void unlink()}>
      {impact.isFetching ? <p role="status"><ProcessingSpinner />{t('cinematic.characters.loading')}</p> : null}
      {bindingId ? <p role="status"><ProcessingSpinner />{t('cinematic.characters.loading')}</p> : null}
      {impact.isError ? <p role="alert">{t('cinematic.lookReferences.loadFailed')}<Button size="sm" onClick={() => void impact.refetch()}>{t('cinematic.lookReferences.refresh')}</Button></p> : null}
      {impact.data ? <><AuthenticatedMediaImage src={bindings.find(item => item.id === removing)?.previewUrl || undefined} alt="" className="cinematic-look-unlink-preview" /><p>{t('cinematic.momeloLook.impact', { scenes: impact.data.items.reduce((sum, item) => sum + item.sceneIds.length, 0), shots: impact.data.items.reduce((sum, item) => sum + item.shotIds.length, 0) })}</p>
        <ul>{impact.data.items.map(item => <li key={item.projectId}>{item.title}: {item.sceneIds.length} / {item.shotIds.length}</li>)}</ul></> : null}
      {error ? <p role="alert">{error}</p> : null}
    </ConfirmDialog> : null}
    {dialog && profileReady ? <CharacterLookDialog open onOpenChange={open => { if (!open) setDialog(null); }} initialMode={dialog.mode} initialUploadKind="sheet" lookToPrepare={dialog.look}
      characterProfileId={character.characterProfileId!} characterProfileVersionId={character.characterProfileVersionId!}
      characterDisplayName={character.displayName} requestAiSuggestion={() => suggestCinematicWardrobe(storyProject.id, character.id)} onSaved={saved} /> : null}
  </details>;
}
