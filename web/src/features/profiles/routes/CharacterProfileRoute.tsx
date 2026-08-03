import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, LockKeyhole, Shirt, Sparkles } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { MediaCard } from '../../../components/media/MediaCard';
import { Button } from '../../../components/ui/Button';
import { ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { Surface } from '../../../components/ui/Surface';
import { ContextBackLink } from '../../../components/layout/ContextBackLink';
import { routePaths } from '../../../app/routeRegistry/routes';
import { apiMediaUrl } from '../../../lib/api/apiClient';
import { AuthenticatedMediaImage } from '../../../components/media/AuthenticatedMediaImage';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { writeHandoff } from '../../../lib/persistence/handoffStorage';
import {
  getCharacter,
  getCharacterWorks,
  getOwnedCharacter,
  approveCharacterProfile,
  requestCharacterHandoff,
  updateCharacterMetadata,
  updateCharacterSharing
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
    enabled: Boolean(characterId && actor && character && access === 'public')
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
  return (
    <main>
      <ContextBackLink fallbackTo={access === 'owner' ? '/me/characters' : routePaths.exploreCharacters}>
        {access === 'owner'
          ? t('character-profiles.community.myCharacters')
          : t('character-profiles.community.back')}
      </ContextBackLink>
      <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)]">
        <Surface className="overflow-hidden bg-black p-0">
          <div className="grid min-h-[560px] place-items-center">
            {character.displayImageUrl && access === 'owner' ? (
              <AuthenticatedMediaImage
                src={character.displayImageUrl}
                alt={t('character-profiles.media.alt')}
                className="max-h-[78vh] w-full object-contain"
                fallback={<LockKeyhole className="size-10 text-[var(--mpf-text-muted)]" />}
              />
            ) : character.displayImageUrl ? (
              <img src={apiMediaUrl(character.displayImageUrl) || ''} alt={t('character-profiles.media.alt')} className="max-h-[78vh] w-full object-contain" />
            ) : <LockKeyhole className="size-10 text-[var(--mpf-text-muted)]" />}
          </div>
        </Surface>
        <Surface className="p-6">
          <span className="text-xs font-bold uppercase text-cyan-300">{t('character-profiles.page.kicker')}</span>
          <h1 className="mb-1 mt-2 text-3xl">{character.displayName}</h1>
          <p className="text-sm text-[var(--mpf-text-muted)]">{t('character-profiles.page.by')} <strong className="text-white">@{character.ownerUsername}</strong></p>
          <p className="my-6 leading-7 text-[var(--mpf-text-muted)]">{character.personalitySummary || character.shortDescription}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Info icon={character.characterType === 'reusable_model' ? Sparkles : Shirt} label={t('character-profiles.metadata.type')} value={character.characterType === 'reusable_model' ? t('character-profiles.type.reusable') : t('character-profiles.type.styled')} />
            <Info icon={character.handoffAvailable ? CheckCircle2 : LockKeyhole} label={t('character-profiles.metadata.availability')} value={character.handoffAvailable ? t('character-profiles.status.available') : t('character-profiles.status.viewOnly')} />
          </div>
          <div className="my-6 grid grid-cols-3 gap-2">
            <Stat value={character.stats.totalOutputs} label={t('character-profiles.stats.total')} />
            <Stat value={character.stats.byUseCase.fashion} label={t('character-profiles.stats.fashion')} />
            <Stat value={character.stats.byUseCase.sceneStory} label={t('character-profiles.stats.scene')} />
          </div>
          {character.handoffAvailable ? (
            <div className="flex flex-wrap gap-2">
              {character.destinationCapabilities.includes('fashion_blueprint') ? (
                <Button variant="primary" disabled={handoff.isPending} onClick={() => handoff.mutate('fashion_blueprint')}>
                  {t('character-profiles.actions.useFashion')}
                </Button>
              ) : null}
              {character.destinationCapabilities.includes('scene_builder') ? (
                <Button disabled={handoff.isPending} onClick={() => handoff.mutate('scene_builder')}>
                  {t('character-profiles.actions.useScene')}
                </Button>
              ) : null}
            </div>
          ) : null}
          {handoff.isError ? <p className="text-sm text-red-300">{handoff.error.message}</p> : null}
          {access === 'owner' && character.isOwner ? (
            <OwnerCharacterControls
              character={ownerDetail.data || character}
              pending={updateMetadata.isPending || updateSharing.isPending || approve.isPending}
              onMetadata={input => updateMetadata.mutate(input)}
              onSharing={input => updateSharing.mutate(input)}
              onApprove={() => approve.mutate()}
            />
          ) : null}
        </Surface>
      </div>
      {works.data?.items.length ? (
        <section className="mt-8">
          <h2>{t('character-profiles.works.title')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {works.data.items.map(post => <MediaCard key={post.id} post={post} />)}
          </div>
        </section>
      ) : null}
    </main>
  );
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

function Info({ icon: Icon, label, value }: { icon: typeof Sparkles; label: string; value: string }) {
  return <div className="flex items-center gap-3 border border-[var(--mpf-border)] p-3"><Icon className="size-5 text-cyan-300" /><span><small className="block text-[var(--mpf-text-muted)]">{label}</small><strong>{value}</strong></span></div>;
}

function Stat({ value, label }: { value: number; label: string }) {
  return <div className="border border-[var(--mpf-border)] p-3 text-center"><strong className="block text-xl">{value}</strong><small className="text-[var(--mpf-text-muted)]">{label}</small></div>;
}
