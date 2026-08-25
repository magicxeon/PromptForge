import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MediaCard } from '../../../components/media/MediaCard';
import { CharacterCard } from '../../../components/profiles/CharacterCard';
import { CreatorProfileHero } from '../../../components/profiles/CreatorProfileHero';
import { ProfileOverviewSection } from '../../../components/profiles/ProfileOverviewSection';
import { ProfileTemplateMosaic } from '../../../components/profiles/ProfileTemplateMosaic';
import {
  CreatorHighlights,
  ProfileCollectionMosaic,
  ProfileComparisonCard,
  ProfileFeaturedWork
} from '../../../components/profiles/ProfileShowcaseCards';
import { SharedTemplateEditDialog } from '../../../components/templates/SharedTemplateEditDialog';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { Button } from '../../../components/ui/Button';
import { Surface } from '../../../components/ui/Surface';
import { showToast } from '../../../components/ui/toastStore';
import { routeBuilders, routePaths } from '../../../app/routeRegistry/routes';
import { apiMediaUrl } from '../../../lib/api/apiClient';
import { useActor } from '../../../lib/auth/ActorProvider';
import {
  getCreatorPage,
  getMyCreatorProfile,
  setCreatorFollow,
  updateMyCreatorProfile
} from '../api/profileApi';
import { characterSummarySchema, type CreatorPage } from '../schemas/profileSchemas';
import { communityPostSchema } from '../../community/schemas/communitySchemas';

const tabs = ['overview', 'works', 'videos', 'characters', 'templates', 'comparisons', 'collections'] as const;
type ProfileTab = typeof tabs[number];
type ProfileTheme = CreatorPage['profile']['profileTheme'];

export function CreatorProfileRoute() {
  const { t } = useTranslation('react-ui');
  const { actor } = useActor();
  const actorId = actor?.userId || 'loading';
  const { handle = '', profileTab = 'overview' } = useParams();
  const normalizedProfileTab = profileTab === 'gallery' ? 'works' : profileTab;
  const tab = tabs.includes(normalizedProfileTab as ProfileTab)
    ? normalizedProfileTab as ProfileTab
    : 'overview';
  const apiTab = tab === 'works' ? 'gallery' : tab;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const previousActorIdRef = useRef(actorId);
  const ownerActorIdRef = useRef<string | null>(null);
  const actorChanged = previousActorIdRef.current !== actorId;
  const followActorToOwnProfile = actorChanged
    && ownerActorIdRef.current === previousActorIdRef.current;
  const page = useQuery({
    queryKey: ['creator-page', actorId, handle, apiTab],
    queryFn: () => getCreatorPage(handle, apiTab),
    enabled: Boolean(handle && actor)
  });
  const follow = useMutation({
    mutationFn: (active: boolean) => {
      if (!page.data) throw new Error(t('ui.creator.unavailable'));
      return setCreatorFollow(page.data.profile.id, active);
    },
    onSuccess: () => void queryClient.invalidateQueries({
      queryKey: ['creator-page', actorId, handle]
    })
  });
  const updateProfile = useMutation({
    mutationFn: updateMyCreatorProfile,
    onSuccess: async () => {
      setEditing(false);
      showToast({ tone: 'success', title: t('ui.creator.saved') });
      await queryClient.invalidateQueries({ queryKey: ['creator-page', actorId, handle] });
    },
    onError: error => showToast({
      tone: 'error',
      title: t('ui.creator.saveFailed'),
      description: error.message
    })
  });

  useEffect(() => {
    setEditing(false);
  }, [handle]);

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
        navigate(routeBuilders.profile(profile.id, tab), { replace: true });
      })
      .catch(() => {
        if (!cancelled) navigate(routePaths.explore, { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [actor, actorId, navigate, tab]);

  useEffect(() => {
    if (page.data?.viewer.isOwner) ownerActorIdRef.current = actorId;
  }, [actorId, page.data?.viewer.isOwner]);

  if (followActorToOwnProfile) return <LoadingState label={t('ui.creator.loading')} />;
  if (page.isLoading) return <LoadingState label={t('ui.creator.loading')} />;
  if (page.isError || !page.data) {
    return (
      <ErrorState
        title={t('ui.creator.unavailable')}
        description={page.error?.message}
        onRetry={() => void page.refetch()}
      />
    );
  }

  const data = page.data;
  const profileBase = routeBuilders.profile(data.profile.id);

  async function shareProfile() {
    const shareData = {
      title: data.profile.displayName,
      text: data.profile.headline || data.profile.bio,
      url: window.location.href
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(shareData.url);
      showToast({ tone: 'success', title: t('ui.creator.shareSuccess') });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      showToast({ tone: 'error', title: t('ui.creator.shareFailed') });
    }
  }

  return (
    <main
      className="creator-profile"
      data-profile-palette={data.profile.profileTheme}
    >
      <div className="creator-profile__blend" aria-hidden="true" />
      <div className="creator-profile__canvas" data-profile-theme={data.profile.profileTheme}>
        <CreatorProfileHero
          page={data}
          followLabel={t('ui.creator.follow')}
          followingLabel={t('ui.creator.following')}
          editLabel={t('ui.creator.edit')}
          shareLabel={t('ui.creator.share')}
          followerLabel={t('ui.creator.metricFollowers')}
          worksLabel={t('ui.creator.metricWorks')}
          charactersLabel={t('ui.creator.metricCharacters')}
          templatesLabel={t('ui.creator.metricTemplates')}
          followPending={follow.isPending}
          onFollow={() => follow.mutate(!data.viewer.isFollowing)}
          onEdit={() => setEditing(value => !value)}
          onShare={() => void shareProfile()}
        />

        {editing && data.management ? (
          <ProfileEditPanel
            page={data}
            pending={updateProfile.isPending}
            onCancel={() => setEditing(false)}
            onSave={input => updateProfile.mutate(input)}
          />
        ) : null}

        <nav className="creator-profile-tabs" aria-label={t('ui.creator.navigation')}>
          {data.capabilities.availableTabs.map(item => {
            const routeTab = item === 'gallery' ? 'works' : item as ProfileTab;
            return (
              <NavLink
                key={item}
                end={item === 'overview'}
                to={routeBuilders.profile(data.profile.id, routeTab)}
              >
                {t(`ui.creator.tabs.${routeTab}`)}
              </NavLink>
            );
          })}
        </nav>

        <ProfileContent page={data} profileBase={profileBase} />
      </div>
    </main>
  );
}

function ProfileEditPanel({
  page,
  pending,
  onCancel,
  onSave
}: {
  page: CreatorPage;
  pending: boolean;
  onCancel: () => void;
  onSave: (input: Parameters<typeof updateMyCreatorProfile>[0]) => void;
}) {
  const { t } = useTranslation('react-ui');
  const profile = page.profile;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!page.management) return;
    const form = new FormData(event.currentTarget);
    onSave({
      displayName: String(form.get('displayName') || '').trim(),
      bio: String(form.get('bio') || '').trim(),
      recordVersion: page.management.recordVersion,
      presentation: {
        profileTheme: String(form.get('profileTheme') || 'default') as ProfileTheme,
        headline: String(form.get('headline') || '').trim(),
        locationText: String(form.get('locationText') || '').trim(),
        websiteUrl: String(form.get('websiteUrl') || '').trim()
      }
    });
  }

  return (
    <Surface className="creator-profile-editor">
      <form onSubmit={submit}>
        <label>
          <span>{t('ui.creator.displayName')}</span>
          <input name="displayName" required defaultValue={profile.displayName} />
        </label>
        <label>
          <span>{t('ui.creator.headline')}</span>
          <input name="headline" defaultValue={profile.headline || ''} />
        </label>
        <label className="creator-profile-editor__wide">
          <span>{t('ui.creator.bio')}</span>
          <textarea name="bio" defaultValue={profile.bio} />
        </label>
        <label>
          <span>{t('ui.creator.location')}</span>
          <input name="locationText" defaultValue={profile.locationText || ''} />
        </label>
        <label>
          <span>{t('ui.creator.website')}</span>
          <input name="websiteUrl" type="url" defaultValue={profile.websiteUrl || ''} />
        </label>
        <label>
          <span>{t('ui.creator.profileTheme')}</span>
          <select name="profileTheme" defaultValue={profile.profileTheme}>
            <option value="default">{t('ui.creator.themes.default')}</option>
            <option value="fashion">{t('ui.creator.themes.fashion')}</option>
            <option value="creative">{t('ui.creator.themes.creative')}</option>
          </select>
        </label>
        <div className="creator-profile-editor__actions">
          <Button type="button" variant="ghost" onClick={onCancel}>{t('ui.action.cancel')}</Button>
          <Button type="submit" variant="primary" disabled={pending}>{t('ui.action.saveProfile')}</Button>
        </div>
      </form>
    </Surface>
  );
}

function ProfileContent({ page, profileBase }: { page: CreatorPage; profileBase: string }) {
  const { t } = useTranslation('react-ui');
  if (page.selectedTab === 'overview' && page.overview) {
    const featured = page.overview.featured.items[0] || null;
    const comparison = page.overview.comparisons.items[0] || null;
    const collection = page.overview.latestCollection;
    return (
      <div className="creator-profile-overview">
        <div className="creator-profile-overview__lead">
          {featured ? (
            <ProfileOverviewSection
              title={t('ui.creator.featured')}
              viewAllHref={`${profileBase}/works`}
              viewAllLabel={t('ui.creator.viewAll')}
            >
              <ProfileFeaturedWork post={featured} viewLabel={t('ui.creator.viewWork')} />
            </ProfileOverviewSection>
          ) : null}
          <ProfileOverviewSection
            title={t('ui.creator.highlights')}
            viewAllLabel={t('ui.creator.viewAll')}
          >
            <CreatorHighlights
              page={page}
              labels={{
                likes: t('ui.creator.highlightLikes'),
                uses: t('ui.creator.highlightUses'),
                votes: t('ui.creator.highlightVotes'),
                followers: t('ui.creator.highlightFollowers')
              }}
            />
          </ProfileOverviewSection>
        </div>

        {page.overview.characters.items.length ? (
          <ProfileOverviewSection
            title={t('ui.creator.popularCharacters')}
            viewAllHref={`${profileBase}/characters`}
            viewAllLabel={t('ui.creator.viewAll')}
          >
            <div className="creator-profile-card-grid creator-profile-card-grid--characters">
              {page.overview.characters.items.slice(0, 4).map(item => (
                <CharacterCard
                  key={item.id}
                  character={item}
                  detailHref={page.viewer.canManageContent
                    ? routeBuilders.ownedCharacter(item.id)
                    : undefined}
                  managementLabel={page.viewer.canManageContent
                    ? t('ui.action.manageCharacter')
                    : undefined}
                />
              ))}
            </div>
          </ProfileOverviewSection>
        ) : null}

        {page.overview.videos.items.length ? (
          <ProfileOverviewSection
            title={t('ui.creator.featuredVideos')}
            viewAllHref={`${profileBase}/videos`}
            viewAllLabel={t('ui.creator.viewAll')}
          >
            <div className="creator-profile-card-grid creator-profile-card-grid--videos">
              {page.overview.videos.items.slice(0, 4).map(item => (
                <MediaCard key={item.id} post={item} previewFit="cover" />
              ))}
            </div>
          </ProfileOverviewSection>
        ) : null}

        {page.overview.templates.items.length ? (
          <ProfileOverviewSection
            title={t('ui.creator.popularTemplates')}
            viewAllLabel={t('ui.creator.viewAll')}
          >
            <ProfileTemplateMosaic
              posts={page.overview.templates.items}
              viewAllHref={`${profileBase}/templates`}
              viewAllLabel={t('ui.creator.viewAll')}
            />
          </ProfileOverviewSection>
        ) : null}

        <div className="creator-profile-overview__lower">
          {comparison ? (
            <ProfileOverviewSection
              title={t('ui.creator.recentComparisons')}
              viewAllHref={`${profileBase}/comparisons`}
              viewAllLabel={t('ui.creator.viewAll')}
            >
              <ProfileComparisonCard post={comparison} viewLabel={t('ui.creator.viewComparison')} />
            </ProfileOverviewSection>
          ) : null}
          {collection ? (
            <ProfileOverviewSection
              title={t('ui.creator.curatedCollections')}
              viewAllHref={`${profileBase}/collections`}
              viewAllLabel={t('ui.creator.viewAll')}
            >
              <ProfileCollectionMosaic post={collection} itemLabel={t('ui.creator.collectionItems')} />
            </ProfileOverviewSection>
          ) : null}
        </div>
      </div>
    );
  }

  const items = page.tabData.page?.items || [];
  if (!items.length) return <div className="creator-profile-tab-empty"><EmptyState title={t('ui.creator.empty')} /></div>;
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
    <div className="creator-profile-tab-grid">
      {characters.map(item => (
        <CharacterCard
          key={item.id}
          character={item}
          detailHref={page.viewer.canManageContent
            ? routeBuilders.ownedCharacter(item.id)
            : undefined}
          managementLabel={page.viewer.canManageContent
            ? t('ui.action.manageCharacter')
            : undefined}
        />
      ))}
      {posts.map(item => (
        <MediaCard
          key={item.id}
          post={item}
          previewFit={item.postType === 'template' ? 'cover' : 'contain'}
          ownerAction={page.viewer.canManageContent && item.postType === 'template'
            ? <SharedTemplateEditDialog post={item} />
            : undefined}
        />
      ))}
      {mediaItems.map(item => (
        <Surface key={String(item.id)} className="creator-profile-media-item">
          <img src={apiMediaUrl(String(item.thumbnailUrl || item.imageUrl || '')) || ''} alt="" />
          <div><strong>{String(item.title || t('ui.creator.galleryImage'))}</strong></div>
        </Surface>
      ))}
    </div>
  );
}
