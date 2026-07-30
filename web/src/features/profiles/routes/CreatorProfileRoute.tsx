import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, MapPin, Pencil, UserPlus, UserRoundCheck } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { MediaCard } from '../../../components/media/MediaCard';
import { CharacterCard } from '../../../components/profiles/CharacterCard';
import { Button } from '../../../components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { Surface } from '../../../components/ui/Surface';
import { apiMediaUrl } from '../../../lib/api/apiClient';
import {
  getCreatorPage,
  getMyCreatorProfile,
  setCreatorFollow,
  updateMyCreatorProfile
} from '../api/profileApi';
import { characterSummarySchema, type CreatorPage } from '../schemas/profileSchemas';
import { communityPostSchema, type CommunityPost } from '../../community/schemas/communitySchemas';
import { useTranslation } from 'react-i18next';
import { useActor } from '../../../lib/auth/ActorProvider';
import { SharedTemplateEditDialog } from '../../../components/templates/SharedTemplateEditDialog';

const tabs = ['overview', 'gallery', 'characters', 'templates', 'comparisons', 'collections'] as const;

export function CreatorProfileRoute() {
  const { t } = useTranslation('react-ui');
  const { actor } = useActor();
  const actorId = actor?.userId || 'loading';
  const { handle = '', profileTab = 'overview' } = useParams();
  const tab = tabs.includes(profileTab as typeof tabs[number]) ? profileTab : 'overview';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const previousActorIdRef = useRef(actorId);
  const ownerActorIdRef = useRef<string | null>(null);
  const actorChanged = previousActorIdRef.current !== actorId;
  const followActorToOwnProfile = actorChanged
    && ownerActorIdRef.current === previousActorIdRef.current;
  const page = useQuery({
    queryKey: ['creator-page', actorId, handle, tab],
    queryFn: () => getCreatorPage(handle, tab),
    enabled: Boolean(handle && actor)
  });
  const follow = useMutation({
    mutationFn: (active: boolean) => {
      if (!page.data) throw new Error(t('ui.creator.unavailable'));
      return setCreatorFollow(page.data.profile.id, active);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['creator-page', actorId, handle] })
  });
  const updateProfile = useMutation({
    mutationFn: updateMyCreatorProfile,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['creator-page', actorId, handle] })
  });

  useEffect(() => {
    const previousActorId = previousActorIdRef.current;
    if (previousActorId === actorId) return;
    previousActorIdRef.current = actorId;
    const shouldFollowOwnProfile = ownerActorIdRef.current === previousActorId;
    ownerActorIdRef.current = null;
    if (!shouldFollowOwnProfile || !actor || actorId === 'loading') return;

    let cancelled = false;
    void getMyCreatorProfile()
      .then(profile => {
        if (cancelled) return;
        const suffix = tab === 'overview' ? '' : `/${tab}`;
        navigate(`/creators/${encodeURIComponent(profile.handle)}${suffix}`, {
          replace: true
        });
      })
      .catch(() => {
        if (!cancelled) navigate('/community', { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [actor, actorId, navigate, tab]);

  useEffect(() => {
    if (page.data?.viewer.isOwner) ownerActorIdRef.current = actorId;
  }, [actorId, page.data?.viewer.isOwner]);

  if (followActorToOwnProfile) {
    return <LoadingState label={t('ui.creator.loading')} />;
  }
  if (page.isLoading) return <LoadingState label={t('ui.creator.loading')} />;
  if (page.isError || !page.data) {
    return <ErrorState title={t('ui.creator.unavailable')} description={page.error?.message} onRetry={() => void page.refetch()} />;
  }

  const data = page.data;
  return (
    <main>
      <ProfileHero
        page={data}
        onFollow={() => follow.mutate(!data.viewer.isFollowing)}
        pending={follow.isPending}
        onUpdate={input => updateProfile.mutate(input)}
        updatePending={updateProfile.isPending}
      />
      <nav className="mt-3 flex gap-1 overflow-x-auto border-b border-[var(--mpf-border)]" aria-label={t('ui.creator.navigation')}>
        {data.capabilities.availableTabs.map(item => (
          <NavLink
            key={item}
            end={item === 'overview'}
            to={item === 'overview' ? `/creators/${handle}` : `/creators/${handle}/${item}`}
            className={({ isActive }) => `shrink-0 border-b-2 px-4 py-3 text-sm no-underline ${isActive ? 'border-cyan-400 text-white' : 'border-transparent text-[var(--mpf-text-muted)]'}`}
          >
            {item}
          </NavLink>
        ))}
      </nav>
      <ProfileContent page={data} />
    </main>
  );
}

function ProfileHero({
  page,
  onFollow,
  pending
  ,
  onUpdate,
  updatePending
}: {
  page: CreatorPage;
  onFollow: () => void;
  pending: boolean;
  onUpdate: (input: { displayName: string; headline: string; bio: string; locationText: string; websiteUrl: string }) => void;
  updatePending: boolean;
}) {
  const { t } = useTranslation('react-ui');
  const profile = page.profile;
  const [editing, setEditing] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onUpdate({
      displayName: String(form.get('displayName') || '').trim(),
      headline: String(form.get('headline') || '').trim(),
      bio: String(form.get('bio') || '').trim(),
      locationText: String(form.get('locationText') || '').trim(),
      websiteUrl: String(form.get('websiteUrl') || '').trim()
    });
    setEditing(false);
  }
  return (
    <Surface className="relative overflow-hidden p-5 sm:p-7">
      {profile.coverImageUrl ? (
        <img src={apiMediaUrl(profile.coverImageUrl) || ''} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
      ) : null}
      <div className="relative grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
        <div className="grid size-28 place-items-center overflow-hidden rounded-full border-2 border-cyan-400 bg-black shadow-[0_0_22px_rgb(240_45_145_/_0.35)]">
          {profile.avatarUrl
            ? <img src={apiMediaUrl(profile.avatarUrl) || ''} alt="" className="h-full w-full object-cover" />
            : <span className="text-3xl font-bold">{profile.displayName.slice(0, 1)}</span>}
        </div>
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h1 className="m-0 text-3xl">{profile.displayName}</h1>
            {profile.badgeCodes.map(badge => <span key={badge} className="text-xs text-cyan-300">{badge}</span>)}
          </div>
          <p className="m-0 text-sm text-cyan-300">@{profile.handle}</p>
          <p className="max-w-3xl text-sm leading-6 text-[var(--mpf-text-muted)]">{profile.headline || profile.bio}</p>
          <div className="flex flex-wrap gap-4 text-xs text-[var(--mpf-text-muted)]">
            {profile.locationText ? <span className="flex items-center gap-1"><MapPin className="size-3" />{profile.locationText}</span> : null}
            {profile.websiteUrl ? <a className="flex items-center gap-1 text-cyan-300" href={profile.websiteUrl}><ExternalLink className="size-3" />{profile.websiteUrl}</a> : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-6 text-sm">
            <strong>{t('ui.creator.followers', { count: page.counts.followers || 0 })}</strong>
            <strong>{t('ui.creator.posts', { count: page.counts.publicPosts || 0 })}</strong>
            <strong>{t('ui.creator.characters', { count: page.counts.publicCharacters || 0 })}</strong>
          </div>
        </div>
        <div>
          {page.viewer.canEditProfile ? (
            <Button icon={<Pencil className="size-4" />} disabled={updatePending} onClick={() => setEditing(value => !value)}>
              {t('ui.creator.edit')}
            </Button>
          ) : page.viewer.canFollow ? (
            <Button
              variant="primary"
              icon={page.viewer.isFollowing ? <UserRoundCheck className="size-4" /> : <UserPlus className="size-4" />}
              disabled={pending}
              onClick={onFollow}
            >
              {page.viewer.isFollowing ? t('ui.creator.following') : t('ui.creator.follow')}
            </Button>
          ) : (
            null
          )}
        </div>
      </div>
      {editing ? (
        <form className="relative mt-6 grid gap-3 border-t border-[var(--mpf-border)] pt-5 md:grid-cols-2" onSubmit={submit}>
          <input name="displayName" required defaultValue={profile.displayName} placeholder={t('ui.creator.displayName')} className="h-11 border border-[var(--mpf-border)] bg-black/35 px-3" />
          <input name="headline" defaultValue={profile.headline || ''} placeholder={t('ui.creator.headline')} className="h-11 border border-[var(--mpf-border)] bg-black/35 px-3" />
          <textarea name="bio" defaultValue={profile.bio} placeholder={t('ui.creator.bio')} className="h-28 resize-y border border-[var(--mpf-border)] bg-black/35 p-3 md:col-span-2" />
          <input name="locationText" defaultValue={profile.locationText || ''} placeholder={t('ui.creator.location')} className="h-11 border border-[var(--mpf-border)] bg-black/35 px-3" />
          <input name="websiteUrl" type="url" defaultValue={profile.websiteUrl || ''} placeholder={t('ui.creator.website')} className="h-11 border border-[var(--mpf-border)] bg-black/35 px-3" />
          <div className="flex justify-end gap-2 md:col-span-2"><Button type="button" variant="ghost" onClick={() => setEditing(false)}>{t('ui.action.cancel')}</Button><Button type="submit" variant="primary" disabled={updatePending}>{t('ui.action.saveProfile')}</Button></div>
        </form>
      ) : null}
    </Surface>
  );
}

function ProfileContent({ page }: { page: CreatorPage }) {
  const { t } = useTranslation('react-ui');
  if (page.selectedTab === 'overview' && page.overview) {
    return (
      <div className="mt-5 space-y-7">
        <PostSection
          title={t('ui.creator.featured')}
          items={page.overview.featured.items}
          canManage={page.viewer.canManageContent}
        />
        {page.overview.characters.items.length ? (
          <section>
            <h2 className="text-xl">{t('ui.creator.popularCharacters')}</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {page.overview.characters.items.map(item => <CharacterCard key={item.id} character={item} />)}
            </div>
          </section>
        ) : null}
        <PostSection
          title={t('ui.creator.popularTemplates')}
          items={page.overview.templates.items}
          canManage={page.viewer.canManageContent}
        />
        <PostSection
          title={t('ui.creator.recentComparisons')}
          items={page.overview.comparisons.items}
          canManage={page.viewer.canManageContent}
        />
      </div>
    );
  }
  const items = page.tabData.page?.items || [];
  if (!items.length) return <div className="mt-5"><EmptyState title={t('ui.creator.empty')} /></div>;
  const characters = items.flatMap(item => {
    const result = characterSummarySchema.safeParse(item);
    return result.success ? [result.data] : [];
  });
  const posts = items.flatMap(item => {
    const result = communityPostSchema.safeParse(item);
    return result.success ? [result.data] : [];
  });
  const mediaItems = items.flatMap(item => {
    if (!('id' in item) || !('imageUrl' in item || 'thumbnailUrl' in item)) return [];
    const parsed = characterSummarySchema.safeParse(item);
    const post = communityPostSchema.safeParse(item);
    return parsed.success || post.success ? [] : [item];
  });
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {characters.map(item => <CharacterCard key={item.id} character={item} />)}
      {posts.map(item => (
        <MediaCard
          key={item.id}
          post={item}
          ownerAction={page.viewer.canManageContent && item.postType === 'template'
            ? <SharedTemplateEditDialog post={item} />
            : undefined}
        />
      ))}
      {mediaItems.map(item => (
        <Surface key={String(item.id)} className="overflow-hidden p-0">
          <img src={apiMediaUrl(String(item.thumbnailUrl || item.imageUrl || '')) || ''} alt="" className="aspect-[4/5] w-full object-cover object-top" />
          <div className="p-3"><strong className="text-sm">{String(item.title || t('ui.creator.galleryImage'))}</strong></div>
        </Surface>
      ))}
    </div>
  );
}

function PostSection({
  title,
  items,
  canManage = false
}: {
  title: string;
  items: CommunityPost[];
  canManage?: boolean;
}) {
  if (!items.length) return null;
  return (
    <section>
      <h2 className="text-xl">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map(item => (
          <MediaCard
            key={item.id}
            post={item}
            ownerAction={canManage && item.postType === 'template'
              ? <SharedTemplateEditDialog post={item} />
              : undefined}
          />
        ))}
      </div>
    </section>
  );
}
