import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { MediaCard } from '../../../components/media/MediaCard';
import { Button } from '../../../components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { ContextBackLink } from '../../../components/layout/ContextBackLink';
import { routeBuilders, routePaths } from '../../../app/routeRegistry/routes';
import { CharacterFeaturedImagePicker } from '../../../components/profiles/CharacterFeaturedImagePicker';
import { CharacterProfileHero } from '../../../components/profiles/CharacterProfileHero';
import { CharacterLookDialog } from '../components/CharacterLookDialog';
import { DeleteCharacterDialog } from '../components/DeleteCharacterDialog';
import { showToast } from '../../../components/ui/toastStore';
import {
  getCharacter,
  getCharacterWorks,
  getCharacterFeaturedImageCandidates,
  listCharacterLooks,
  getOwnedCharacter,
  approveCharacterProfile,
  updateCharacterMetadata,
  updateCharacterSharing,
  updateCharacterFeaturedImage
} from '../api/profileApi';
import type { CharacterLook } from '../schemas/profileSchemas';
import { useActor } from '../../../lib/auth/ActorProvider';
import { useCharacterHandoff } from '../useCharacterHandoff';

export function CharacterProfileRoute() {
  const { actor } = useActor();
  const { characterId } = useParams();
  return <CharacterProfilePage key={`${actor?.userId}:${characterId}`} access="public" />;
}

export function CharacterOwnerProfileRoute() {
  const { actor } = useActor();
  const { characterId } = useParams();
  return <CharacterProfilePage key={`${actor?.userId}:${characterId}`} access="owner" />;
}

function CharacterProfilePage({ access }: { access: 'owner' | 'public' }) {
  const { characterId = '' } = useParams();
  const { actor } = useActor();
  const actorId = actor?.userId || 'loading';
  const queryClient = useQueryClient();
  const { t } = useTranslation('character-profiles');
  const [activeTab, setActiveTab] = useState<'overview' | 'creations' | 'details'>('overview');
  const [lookDialogOpen, setLookDialogOpen] = useState(false);
  const [sharingOpen, setSharingOpen] = useState(false);
  const [coverScope, setCoverScope] = useState<'linked' | 'own'>('linked');
  const [coverCursors, setCoverCursors] = useState<(string | null)[]>([null]);
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
    queryKey: ['character-featured-image-candidates', actorId, characterId, coverScope, coverCursors.at(-1)],
    queryFn: () => getCharacterFeaturedImageCandidates(characterId, coverScope, coverCursors.at(-1)),
    enabled: Boolean(characterId && actor && character && access === 'owner' && character.isOwner)
  });
  const characterLooks = useQuery({
    queryKey: ['character-looks', actorId, characterId, character?.characterProfileVersionId],
    queryFn: () => listCharacterLooks(characterId, character?.characterProfileVersionId || ''),
    enabled: Boolean(
      characterId
      && actor
      && access === 'owner'
      && character?.isOwner
      && character.characterProfileVersionId
    )
  });
  const updateMetadata = useMutation({
    mutationFn: (input: { displayName: string; personalitySummary: string }) => updateCharacterMetadata(characterId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['character', actorId, characterId] });
      void queryClient.invalidateQueries({ queryKey: ['owned-character', actorId, characterId] });
    }
  });
  const updateSharing = useMutation({
    mutationFn: (input: {
      visibility: string;
      reusePolicy: string;
      rightsDeclarationAccepted?: boolean;
    }) => updateCharacterSharing(characterId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['character', actorId, characterId] });
      void queryClient.invalidateQueries({ queryKey: ['owned-character', actorId, characterId] });
      void queryClient.invalidateQueries({ queryKey: ['characters'] });
      void queryClient.invalidateQueries({ queryKey: ['creator-page'] });
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
      displayConsentAccepted?: boolean;
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
  const handoff = useCharacterHandoff(characterId);

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
  const videoWorks = publicWorks.filter(post => post.postType === 'video');
  const imageWorks = publicWorks.filter(post => post.postType !== 'video');
  const fashionAvailable = character.handoffAvailable
    && character.destinationCapabilities.includes('fashion_blueprint');
  const sceneAvailable = character.handoffAvailable
    && character.destinationCapabilities.includes('scene_builder');
  async function shareCharacter() {
    if (character?.visibility === 'private') return;
    const url = new URL(routeBuilders.character(characterId), window.location.origin).href;
    try {
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
        approvalPending={approve.isPending}
        onFashion={fashionAvailable ? () => handoff.mutate('fashion_blueprint') : undefined}
        onScene={sceneAvailable ? () => handoff.mutate('scene_builder') : undefined}
        onApprove={access === 'owner' && character.isOwner
          ? () => approve.mutate()
          : undefined}
        onShare={() => void shareCharacter()}
        onManageSharing={access === 'owner' && character.isOwner ? () => { setActiveTab('details'); setSharingOpen(true); } : undefined}
      />
      {approve.isError ? <p className="text-sm text-red-300">{approve.error.message}</p> : null}
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
          <div className="character-profile-overview-sections">
            {videoWorks.length ? (
              <CharacterWorks
                title={t('character-profiles.works.featuredVideos')}
                description={t('character-profiles.works.featuredVideosDescription')}
                items={videoWorks.slice(0, 4)}
                emptyLabel={t('character-profiles.works.emptyVideos')}
              />
            ) : null}
            <CharacterWorks
              title={t('character-profiles.works.title')}
              description={t('character-profiles.works.description')}
              items={imageWorks.slice(0, 6)}
              emptyLabel={t('character-profiles.works.empty')}
            />
          </div>
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
              <>
              {ownerDetail.data?.identityMetadata?.missingFields.length ? <p role="status">
                {t('character-profiles.identity.missing', { fields: ownerDetail.data.identityMetadata.missingFields.map(field => t(`character-profiles.identity.${field}`)).join(', ') })}
              </p> : null}
              <OwnerCharacterControls
                open={sharingOpen} onOpenChange={setSharingOpen}
                character={ownerDetail.data || character}
                pending={updateMetadata.isPending || updateSharing.isPending}
                onSave={async input => {
                  await Promise.all([
                    updateMetadata.mutateAsync({
                      displayName: input.displayName,
                      personalitySummary: input.personalitySummary
                    }),
                    updateSharing.mutateAsync({
                      visibility: input.visibility,
                      reusePolicy: input.reusePolicy,
                      rightsDeclarationAccepted: input.rightsDeclarationAccepted
                    })
                  ]);
                }}
              />
              <DeleteCharacterDialog key={`${actorId}:${characterId}`} characterId={characterId} displayName={character.displayName} />
              </>
            ) : null}
            {access === 'owner' && character.isOwner && character.characterProfileVersionId ? (
              <>
                <CharacterLooksPanel
                  looks={characterLooks.data?.items || []}
                  loading={characterLooks.isLoading}
                  error={characterLooks.error instanceof Error ? characterLooks.error.message : null}
                  onCreate={() => setLookDialogOpen(true)}
                />
                <CharacterLookDialog
                  open={lookDialogOpen}
                  onOpenChange={setLookDialogOpen}
                  characterProfileId={characterId}
                  characterProfileVersionId={character.characterProfileVersionId}
                  characterDisplayName={character.displayName}
                  onSaved={() => {
                    void queryClient.invalidateQueries({
                      queryKey: ['character-looks', actorId, characterId]
                    });
                  }}
                />
              </>
            ) : null}
            {access === 'owner' && character.isOwner ? (
              <CharacterFeaturedImagePicker
                key={`${actorId}:${characterId}`}
                scope={coverScope}
                onScopeChange={scope => { setCoverScope(scope); setCoverCursors([null]); }}
                pageNumber={coverCursors.length}
                hasMore={featuredCandidates.data?.hasMore}
                onPrevious={() => setCoverCursors(cursors => cursors.slice(0, -1))}
                onNext={() => { if (featuredCandidates.data?.nextCursor) setCoverCursors(cursors => [...cursors, featuredCandidates.data!.nextCursor!]); }}
                error={featuredCandidates.error?.message || updateFeaturedImage.error?.message}
                onRetry={() => { updateFeaturedImage.reset(); void featuredCandidates.refetch(); }}
                candidates={featuredCandidates.data?.items || []}
                mode={character.featuredImageMode}
                selectedSourceType={character.featuredImageSourceType}
                selectedSourceId={character.featuredImageSourceType === 'generation_result'
                  ? character.featuredGenerationResultId
                  : character.featuredWorkPostId}
                displaySource={character.displayImageSource}
                pending={updateFeaturedImage.isPending || featuredCandidates.isFetching}
                onSelect={(candidate, displayConsentAccepted) => displayConsentAccepted
                  ? updateFeaturedImage.mutateAsync({ mode: 'manual', sourceType: candidate.sourceType, sourceId: candidate.sourceId, displayConsentAccepted })
                  : updateFeaturedImage.mutate({
                  mode: 'manual',
                  sourceType: candidate.sourceType,
                  sourceId: candidate.sourceId
                })}
                onUseAutomatic={() => updateFeaturedImage.mutate({ mode: 'auto' })}
              />
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

export function CharacterLooksPanel({ looks, loading, error, onCreate }: {
  looks: CharacterLook[];
  loading: boolean;
  error: string | null;
  onCreate: () => void;
}) {
  const { t } = useTranslation('character-profiles');
  return (
    <section className="character-look-panel" aria-labelledby="character-look-panel-title">
      <header className="character-look-panel__header">
        <div>
          <h2 id="character-look-panel-title">{t('character-profiles.looks.title')}</h2>
          <p>{t('character-profiles.looks.description')}</p>
        </div>
        <Button type="button" variant="primary" onClick={onCreate}>
          {t('character-profiles.looks.create')}
        </Button>
      </header>
      {loading ? <LoadingState label={t('character-profiles.looks.loading')} /> : null}
      {error ? <p role="alert" className="character-look-panel__error">{error}</p> : null}
      {!loading && !error && looks.length === 0 ? (
        <EmptyState title={t('character-profiles.looks.empty')} />
      ) : null}
      {looks.length ? (
        <div className="character-look-panel__grid">
          {looks.map(look => (
            <article key={look.id} className="character-look-panel__card">
              <div>
                <small>{t('character-profiles.looks.version', {
                  version: look.versions.find(version => version.id === look.activeVersionId)?.versionNumber || 1
                })}</small>
                <h3>{look.name}</h3>
                {look.description ? <p>{look.description}</p> : null}
              </div>
              <span className={`character-look-panel__status is-${look.lifecycleStatus}`}>
                {t(`character-profiles.looks.status.${look.lifecycleStatus}`)}
              </span>
              <p className="character-look-panel__readiness">
                {look.approvedVersionId
                  ? t('character-profiles.looks.ready')
                  : t('character-profiles.looks.needsReview')}
              </p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

type CharacterVisibility = 'private' | 'unlisted' | 'public';
type CharacterReusePolicy = 'owner_only' | 'view_only' | 'public_reusable';

export function OwnerCharacterControls({
  character,
  pending,
  onSave,
  open: controlledOpen,
  onOpenChange
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  character: {
    displayName: string;
    personalitySummary: string;
    visibility?: string;
    reusePolicy?: string;
    status?: string;
    rightsDeclarationAcceptedAt?: string | null;
  };
  pending: boolean;
  onSave: (input: {
    displayName: string;
    personalitySummary: string;
    visibility: CharacterVisibility;
    reusePolicy: CharacterReusePolicy;
    rightsDeclarationAccepted: boolean;
  }) => Promise<void>;
}) {
  const { t } = useTranslation('character-profiles');
  const { t: tUi } = useTranslation('react-ui');
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const setOpen = (value: boolean) => { setLocalOpen(value); onOpenChange?.(value); };
  const [visibility, setVisibility] = useState<CharacterVisibility>(normalizeCharacterVisibility(character.visibility));
  const [reusePolicy, setReusePolicy] = useState<CharacterReusePolicy>(normalizeCharacterReusePolicy(character.reusePolicy));
  const [rightsAccepted, setRightsAccepted] = useState(Boolean(character.rightsDeclarationAcceptedAt));
  const [submitError, setSubmitError] = useState('');

  function toggleOpen() {
    if (!open) {
      setVisibility(normalizeCharacterVisibility(character.visibility));
      setReusePolicy(normalizeCharacterReusePolicy(character.reusePolicy));
      setRightsAccepted(Boolean(character.rightsDeclarationAcceptedAt));
      setSubmitError('');
    }
    setOpen(!open);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitError('');
    try {
      await onSave({
        displayName: String(form.get('displayName') || '').trim(),
        personalitySummary: String(form.get('personalitySummary') || '').trim(),
        visibility,
        reusePolicy,
        rightsDeclarationAccepted: reusePolicy === 'public_reusable' && rightsAccepted
      });
      showToast({ tone: 'success', title: t('character-profiles.sharing.saved') });
      setOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSubmitError(message);
      showToast({ tone: 'error', title: message });
    }
  }

  const effectiveResult = visibility === 'private'
    ? t('character-profiles.sharing.effective.private')
    : visibility === 'unlisted'
      ? t('character-profiles.sharing.effective.unlisted')
      : reusePolicy === 'public_reusable'
        ? t('character-profiles.sharing.effective.reusable')
        : reusePolicy === 'view_only'
          ? t('character-profiles.sharing.effective.viewOnly')
          : t('character-profiles.sharing.effective.ownerOnly');

  return (
    <div className="mt-6 border-t border-[var(--mpf-border)] pt-5">
      <Button onClick={toggleOpen}>{tUi('ui.action.manageCharacter')}</Button>
      {open ? (
        <form className="mt-4 grid gap-3" onSubmit={submit}>
          <label className="grid gap-1 text-xs text-[var(--mpf-text-muted)]">{tUi('ui.character.name')}<input name="displayName" required defaultValue={character.displayName} className="h-11 border border-[var(--mpf-border)] bg-[var(--theme-input)] px-3 text-[var(--mpf-text)]" /></label>
          <label className="grid gap-1 text-xs text-[var(--mpf-text-muted)]">{tUi('ui.character.personality')}<textarea name="personalitySummary" defaultValue={character.personalitySummary} className="h-28 resize-y border border-[var(--mpf-border)] bg-[var(--theme-input)] p-3 text-[var(--mpf-text)]" /></label>
          <div>
            <p className="m-0 text-sm font-semibold text-[var(--mpf-text)]">{t('character-profiles.sharing.title')}</p>
            <p className="m-0 mt-1 text-xs text-[var(--mpf-text-muted)]">{t('character-profiles.sharing.description')}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs text-[var(--mpf-text-muted)]">
              {t('character-profiles.sharing.visibility')}
              <select value={visibility} onChange={event => setVisibility(event.target.value as CharacterVisibility)} className="h-11 border border-[var(--mpf-border)] bg-[var(--theme-input)] px-3 text-[var(--mpf-text)]">
                <option value="private">{t('character-profiles.sharing.options.private')}</option>
                <option value="unlisted">{t('character-profiles.sharing.options.unlisted')}</option>
                <option value="public">{t('character-profiles.sharing.options.public')}</option>
              </select>
              <span>{t('character-profiles.sharing.visibilityHelp')}</span>
            </label>
            <label className="grid gap-1 text-xs text-[var(--mpf-text-muted)]">
              {t('character-profiles.sharing.reuse')}
              <select value={reusePolicy} onChange={event => setReusePolicy(event.target.value as CharacterReusePolicy)} className="h-11 border border-[var(--mpf-border)] bg-[var(--theme-input)] px-3 text-[var(--mpf-text)]">
                <option value="owner_only">{t('character-profiles.sharing.options.owner_only')}</option>
                <option value="view_only">{t('character-profiles.sharing.options.view_only')}</option>
                <option value="public_reusable">{t('character-profiles.sharing.options.public_reusable')}</option>
              </select>
              <span>{t('character-profiles.sharing.reuseHelp')}</span>
            </label>
          </div>
          {reusePolicy === 'public_reusable' ? (
            <label className="flex min-h-11 items-center gap-3 border border-[var(--mpf-border)] bg-[var(--theme-hover)] px-3 text-sm text-[var(--mpf-text)]">
              <input type="checkbox" checked={rightsAccepted} onChange={event => setRightsAccepted(event.target.checked)} />
              {t('character-profiles.sharing.rights')}
            </label>
          ) : null}
          <p className="m-0 text-xs font-semibold text-[var(--theme-primary)]">{effectiveResult}</p>
          {submitError ? <p role="alert" className="m-0 border border-[var(--theme-danger)] p-3 text-sm text-[var(--theme-danger)]">{submitError}</p> : null}
          <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>{tUi('ui.action.cancel')}</Button><Button type="submit" variant="primary" disabled={pending || (reusePolicy === 'public_reusable' && !rightsAccepted)}>{pending ? t('character-profiles.sharing.saving') : t('character-profiles.sharing.save')}</Button></div>
        </form>
      ) : null}
    </div>
  );
}

function normalizeCharacterVisibility(value: string | undefined): CharacterVisibility {
  return value === 'unlisted' || value === 'public' ? value : 'private';
}

function normalizeCharacterReusePolicy(value: string | undefined): CharacterReusePolicy {
  return value === 'view_only' || value === 'public_reusable' ? value : 'owner_only';
}
