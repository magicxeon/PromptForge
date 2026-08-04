import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { MediaCard } from '../../../components/media/MediaCard';
import { Button } from '../../../components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { ContextBackLink } from '../../../components/layout/ContextBackLink';
import { routePaths } from '../../../app/routeRegistry/routes';
import { CharacterFeaturedImagePicker } from '../../../components/profiles/CharacterFeaturedImagePicker';
import { CharacterProfileHero } from '../../../components/profiles/CharacterProfileHero';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { writeHandoff } from '../../../lib/persistence/handoffStorage';
import { showToast } from '../../../components/ui/toastStore';
import {
  getCharacter,
  getCharacterWorks,
  getCharacterFeaturedImageCandidates,
  getOwnedCharacter,
  approveCharacterProfile,
  requestCharacterHandoff,
  updateCharacterMetadata,
  updateCharacterSharing,
  updateCharacterFeaturedImage
} from '../api/profileApi';
import { useActor } from '../../../lib/auth/ActorProvider';

export function CharacterProfileRoute() {
  return <CharacterProfilePage access="public" />;
}

export function CharacterOwnerProfileRoute() {
  return <CharacterProfilePage access="owner" />;
}

function CharacterProfilePage({ access }: { access: 'owner' | 'public' }) {
  const { characterId = '' } = useParams();
  const { actor } = useActor();
  const actorId = actor?.userId || 'loading';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation('character-profiles');
  const [activeTab, setActiveTab] = useState<'overview' | 'creations' | 'details'>('overview');
  const ownerDetail = useQuery({
    queryKey: ['owned-character', actorId, characterId],
    queryFn: () => getOwnedCharacter(characterId),
    enabled: Boolean(characterId && actor && access === 'owner')
  });
  const detail = useQuery({
    queryKey: ['character', actorId, characterId],
    queryFn: () => getCharacter(characterId),
    enabled: Boolean(characterId && actor && access === 'public')
  });
  const character = access === 'owner' ? ownerDetail.data : detail.data;
  const works = useQuery({
    queryKey: ['character-works', actorId, characterId],
    queryFn: () => getCharacterWorks(characterId),
    enabled: Boolean(characterId && actor && character)
  });
  const featuredCandidates = useQuery({
    queryKey: ['character-featured-image-candidates', actorId, characterId],
    queryFn: () => getCharacterFeaturedImageCandidates(characterId),
    enabled: Boolean(characterId && actor && character && access === 'owner' && character.isOwner)
  });
  const updateMetadata = useMutation({
    mutationFn: (input: { displayName: string; personalitySummary: string }) => updateCharacterMetadata(characterId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['character', actorId, characterId] });
      void queryClient.invalidateQueries({ queryKey: ['owned-character', actorId, characterId] });
    }
  });
  const updateSharing = useMutation({
    mutationFn: (input: { visibility: string; reusePolicy: string }) => updateCharacterSharing(characterId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['character', actorId, characterId] });
      void queryClient.invalidateQueries({ queryKey: ['owned-character', actorId, characterId] });
    }
  });
  const approve = useMutation({
    mutationFn: () => approveCharacterProfile(characterId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['character', actorId, characterId] });
      void queryClient.invalidateQueries({ queryKey: ['owned-character', actorId, characterId] });
      void queryClient.invalidateQueries({ queryKey: ['characters'] });
    }
  });
  const updateFeaturedImage = useMutation({
    mutationFn: (input: {
      mode: 'auto' | 'manual';
      sourceType?: 'generation_result' | 'community_post' | null;
      sourceId?: string | null;
    }) =>
      updateCharacterFeaturedImage(characterId, {
        ...input,
        recordVersion: ownerDetail.data?.recordVersion || character?.recordVersion || 1
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['character', actorId, characterId] });
      void queryClient.invalidateQueries({ queryKey: ['owned-character', actorId, characterId] });
      void queryClient.invalidateQueries({ queryKey: ['characters'] });
      void queryClient.invalidateQueries({ queryKey: ['creator-page'] });
      void queryClient.invalidateQueries({ queryKey: ['character-featured-image-candidates', actorId, characterId] });
    }
  });
  const handoff = useMutation({
    mutationFn: (destination: 'fashion_blueprint' | 'scene_builder') =>
      requestCharacterHandoff(characterId, destination),
    onSuccess: payload => {
      writeHandoff({
        actorId: getActiveActorId(),
        kind: 'character',
        payload
      });
      const destination = payload.destination === 'fashion_blueprint'
        ? '/create/fashion'
        : '/create/scenes';
      navigate(destination);
    }
  });

  const loading = access === 'owner' ? ownerDetail.isLoading : detail.isLoading;
  if (loading) return <LoadingState label={t('character-profiles.states.loading')} />;
  if (!character) {
    const error = access === 'owner' ? ownerDetail.error : detail.error;
    return <ErrorState title={t('character-profiles.states.unavailable')} description={error?.message} onRetry={() => {
      if (access === 'owner') void ownerDetail.refetch();
      else void detail.refetch();
    }} />;
  }
  const publicWorks = works.data?.items || [];
  const fashionAvailable = character.handoffAvailable
    && character.destinationCapabilities.includes('fashion_blueprint');
  const sceneAvailable = character.handoffAvailable
    && character.destinationCapabilities.includes('scene_builder');
  const characterName = character.displayName;
  async function shareCharacter() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: characterName, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      showToast({ tone: 'success', title: t('character-profiles.actions.linkCopied') });
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      showToast({ tone: 'error', title: t('character-profiles.actions.shareFailed') });
    }
  }
  return (
    <main className="character-profile-page">
      <ContextBackLink fallbackTo={access === 'owner' ? '/me/characters' : routePaths.exploreCharacters}>
        {access === 'owner'
          ? t('character-profiles.community.myCharacters')
          : t('character-profiles.community.back')}
      </ContextBackLink>
      <CharacterProfileHero
        character={character}
        ownerAccess={access === 'owner'}
        handoffPending={handoff.isPending}
        onFashion={fashionAvailable ? () => handoff.mutate('fashion_blueprint') : undefined}
        onScene={sceneAvailable ? () => handoff.mutate('scene_builder') : undefined}
        onShare={() => void shareCharacter()}
      />
      {handoff.isError ? <p className="text-sm text-red-300">{handoff.error.message}</p> : null}

      <div className="character-profile-tabs" role="tablist" aria-label={t('character-profiles.tabs.label')}>
        {(['overview', 'creations', 'details'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`character-tab-${tab}`}
            aria-selected={activeTab === tab}
            aria-controls={`character-panel-${tab}`}
            onClick={() => setActiveTab(tab)}
          >
            {t(`character-profiles.tabs.${tab}`)}
          </button>
        ))}
      </div>

      <section
        className="character-profile-panel"
        role="tabpanel"
        id={`character-panel-${activeTab}`}
        aria-labelledby={`character-tab-${activeTab}`}
      >
        {activeTab === 'overview' ? (
          <CharacterWorks
            title={t('character-profiles.works.title')}
            description={t('character-profiles.works.description')}
            items={publicWorks.slice(0, 6)}
            emptyLabel={t('character-profiles.works.empty')}
          />
        ) : null}

        {activeTab === 'creations' ? (
          <CharacterWorks
            title={t('character-profiles.works.allTitle')}
            description={t('character-profiles.works.description')}
            items={publicWorks}
            emptyLabel={t('character-profiles.works.empty')}
          />
        ) : null}

        {activeTab === 'details' ? (
          <>
            <header className="character-profile-panel__header">
              <h2>{t('character-profiles.details.title')}</h2>
              <p>{t('character-profiles.details.description')}</p>
            </header>
            <div className="character-profile-detail-grid">
              <DetailCard label={t('character-profiles.metadata.type')} value={character.characterType === 'reusable_model' ? t('character-profiles.type.reusable') : t('character-profiles.type.styled')} />
              <DetailCard label={t('character-profiles.fields.intendedUses')} value={character.intendedUses.map(use => use.replaceAll('_', ' ')).join(', ') || t('character-profiles.uses.general')} />
              <DetailCard label={t('character-profiles.metadata.availability')} value={character.handoffAvailable ? t('character-profiles.status.available') : t('character-profiles.status.viewOnly')} />
            </div>
            {access === 'owner' && character.isOwner ? (
              <OwnerCharacterControls
                character={ownerDetail.data || character}
                pending={updateMetadata.isPending || updateSharing.isPending || approve.isPending}
                onMetadata={input => updateMetadata.mutate(input)}
                onSharing={input => updateSharing.mutate(input)}
                onApprove={() => approve.mutate()}
              />
            ) : null}
            {access === 'owner' && character.isOwner ? (
              <CharacterFeaturedImagePicker
                candidates={featuredCandidates.data?.items || []}
                mode={character.featuredImageMode}
                selectedSourceType={character.featuredImageSourceType}
                selectedSourceId={character.featuredImageSourceType === 'generation_result'
                  ? character.featuredGenerationResultId
                  : character.featuredWorkPostId}
                displaySource={character.displayImageSource}
                pending={updateFeaturedImage.isPending || featuredCandidates.isLoading}
                onSelect={candidate => updateFeaturedImage.mutate({
                  mode: 'manual',
                  sourceType: candidate.sourceType,
                  sourceId: candidate.sourceId
                })}
                onUseAutomatic={() => updateFeaturedImage.mutate({ mode: 'auto' })}
              />
            ) : null}
            {updateFeaturedImage.isError ? (
              <p className="text-sm text-red-300">{updateFeaturedImage.error.message}</p>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  );
}

function CharacterWorks({ title, description, items, emptyLabel }: {
  title: string;
  description: string;
  items: NonNullable<Awaited<ReturnType<typeof getCharacterWorks>>>['items'];
  emptyLabel: string;
}) {
  return (
    <>
      <header className="character-profile-panel__header">
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      {items.length ? (
        <div className="character-profile-work-grid">
          {items.map(post => <MediaCard key={post.id} post={post} previewFit="cover" />)}
        </div>
      ) : <EmptyState title={emptyLabel} />}
    </>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return <div className="character-profile-detail-card"><small>{label}</small><strong>{value}</strong></div>;
}

function OwnerCharacterControls({
  character,
  pending,
  onMetadata,
  onSharing,
  onApprove
}: {
  character: {
    displayName: string;
    personalitySummary: string;
    visibility?: string;
    reusePolicy?: string;
    status?: string;
  };
  pending: boolean;
  onMetadata: (input: { displayName: string; personalitySummary: string }) => void;
  onSharing: (input: { visibility: string; reusePolicy: string }) => void;
  onApprove: () => void;
}) {
  const { t } = useTranslation('react-ui');
  const [open, setOpen] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onMetadata({
      displayName: String(form.get('displayName') || '').trim(),
      personalitySummary: String(form.get('personalitySummary') || '').trim()
    });
    onSharing({
      visibility: String(form.get('visibility') || 'private'),
      reusePolicy: String(form.get('reusePolicy') || 'view_only')
    });
    setOpen(false);
  }
  return (
    <div className="mt-6 border-t border-[var(--mpf-border)] pt-5">
      {['review', 'draft'].includes(character.status || '') ? (
        <div className="mb-4 border border-amber-300/35 bg-amber-300/5 p-3">
          <strong className="block text-sm text-amber-200">{t('ui.character.approvalRequired')}</strong>
          <p className="mb-3 mt-1 text-xs text-[var(--mpf-text-muted)]">
            {t('ui.character.approvalHelp')}
          </p>
          <Button variant="primary" disabled={pending} onClick={onApprove}>{t('ui.action.approve')}</Button>
        </div>
      ) : null}
      <Button onClick={() => setOpen(value => !value)}>{t('ui.action.manageCharacter')}</Button>
      {open ? (
        <form className="mt-4 grid gap-3" onSubmit={submit}>
          <label className="grid gap-1 text-xs text-[var(--mpf-text-muted)]">{t('ui.character.name')}<input name="displayName" required defaultValue={character.displayName} className="h-11 border border-[var(--mpf-border)] bg-black/35 px-3 text-white" /></label>
          <label className="grid gap-1 text-xs text-[var(--mpf-text-muted)]">{t('ui.character.personality')}<textarea name="personalitySummary" defaultValue={character.personalitySummary} className="h-28 resize-y border border-[var(--mpf-border)] bg-black/35 p-3 text-white" /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs text-[var(--mpf-text-muted)]">{t('ui.character.visibility')}<select name="visibility" defaultValue={character.visibility || 'private'} className="h-11 border border-[var(--mpf-border)] bg-black/35 px-3 text-white"><option value="private">{t('ui.character.private')}</option><option value="public">{t('ui.character.public')}</option></select></label>
            <label className="grid gap-1 text-xs text-[var(--mpf-text-muted)]">{t('ui.character.reuseQuestion')}<select name="reusePolicy" defaultValue={character.reusePolicy || 'view_only'} className="h-11 border border-[var(--mpf-border)] bg-black/35 px-3 text-white"><option value="view_only">{t('ui.character.viewOnly')}</option><option value="public_reuse">{t('ui.character.anyone')}</option><option value="owner_only">{t('ui.character.ownerOnly')}</option></select></label>
          </div>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t('ui.action.cancel')}</Button><Button type="submit" variant="primary" disabled={pending}>{t('ui.action.saveCharacter')}</Button></div>
        </form>
      ) : null}
    </div>
  );
}
