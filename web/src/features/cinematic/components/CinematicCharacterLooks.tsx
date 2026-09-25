import { Check, ChevronDown, Images, RefreshCw, Sparkles, Upload } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { AuthenticatedMediaImage } from '../../../components/media/AuthenticatedMediaImage';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { listCharacterLooks } from '../../profiles/api/profileApi';
import { CharacterLookDialog, type CharacterLookDialogMode } from '../../profiles/components/CharacterLookDialog';
import type { CharacterLook } from '../../profiles/schemas/profileSchemas';
import { getCinematicProject, suggestCinematicWardrobe, upsertCinematicWardrobeLook } from '../api/cinematicApi';
import type { CinematicCastAssignment, CinematicProject } from '../schemas/cinematicSchemas';
import { readCharacterLookBindings } from './storyboardGenerationAdapter';

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
    if (!look.approvedVersionId || bindingId || disabled) return;
    if (look.sourceCharacterProfileVersionId !== character.characterProfileVersionId) {
      setError(t('cinematic.lookReferences.identityMismatch')); return;
    }
    setBindingId(look.id); setError('');
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
    finally { setBindingId(null); }
  }

  function saved(look: CharacterLook) {
    queryClient.setQueryData(queryKey, { items: [look, ...(looks.data?.items || []).filter(item => item.id !== look.id)] });
    void looks.refetch();
    if (look.approvedVersionId) void bind(look);
  }

  return <details className="cinematic-character-looks" onToggle={event => setExpanded(event.currentTarget.open)}>
    <summary><Images aria-hidden="true" /><span className="cinematic-character-looks__summary-label"><strong>{t('cinematic.lookReferences.title')}</strong><small>{t(preview ? 'cinematic.lookReferences.bound' : 'cinematic.lookReferences.empty')}</small></span>
      {preview?.previewUrl ? <AuthenticatedMediaImage src={preview.previewUrl} alt={preview.name} /> : null}
      <span>{bindings.filter(look => look.ready).length}</span><ChevronDown className="cinematic-character-looks__chevron" aria-hidden="true" /></summary>
    {expanded ? <div className="cinematic-character-looks__body">
      {bindings.length ? <ul className="cinematic-look-reference-list">{bindings.map(look => <li key={look.id}>
        <AuthenticatedMediaImage src={look.previewUrl || undefined} alt="" />
        <div><strong>{look.name}</strong><small>{t(`cinematic.lookReferences.source.${look.source}`)} / {t(look.ready ? 'cinematic.lookReferences.bound' : 'cinematic.lookReferences.unavailable')}</small></div>
      </li>)}</ul> : null}
      {!profileReady ? <Button size="sm" icon={<Images />} disabled={disabled} onClick={onChooseCharacter}>{t('cinematic.characters.chooseFromLibrary')}</Button> : <>
        <div className="cinematic-character-looks__tools" role="group" aria-label={t('cinematic.lookReferences.title')}>
          <Button size="sm" icon={<Upload />} disabled={disabled || Boolean(bindingId)} onClick={() => setDialog({ mode: 'upload' })}>{t('cinematic.lookReferences.upload')}</Button>
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
    {dialog && profileReady ? <CharacterLookDialog open onOpenChange={open => { if (!open) setDialog(null); }} initialMode={dialog.mode} initialUploadKind="sheet" lookToPrepare={dialog.look}
      characterProfileId={character.characterProfileId!} characterProfileVersionId={character.characterProfileVersionId!}
      characterDisplayName={character.displayName} requestAiSuggestion={() => suggestCinematicWardrobe(storyProject.id, character.id)} onSaved={saved} /> : null}
  </details>;
}
