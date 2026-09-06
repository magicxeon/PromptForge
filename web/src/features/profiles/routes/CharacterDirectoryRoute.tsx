import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { BadgeCheck, Clapperboard, Search, Sparkles } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { routePaths } from '../../../app/routeRegistry/routes';
import { DiscoveryLoadMore } from '../../../components/discovery/DiscoveryLoadMore';
import { DiscoveryPageHero } from '../../../components/discovery/DiscoveryPageHero';
import { DiscoverySteps } from '../../../components/discovery/DiscoverySteps';
import { DiscoverySelect, DiscoveryToolbar } from '../../../components/discovery/DiscoveryToolbar';
import { EditorialTutorialRail } from '../../../components/discovery/EditorialTutorialRail';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { apiMediaUrl } from '../../../lib/api/apiClient';
import { useActor } from '../../../lib/auth/ActorProvider';
import { discoveryTutorialAssets } from '../../community/config/discoveryEditorialConfig';
import { listCharacters } from '../api/profileApi';
import { CharacterDiscoveryCard } from '../components/CharacterDiscoveryCard';

export function CharacterDirectoryRoute() {
  const { t } = useTranslation(['character-profiles', 'community']);
  const { actor } = useActor();
  const actorId = actor?.userId || 'loading';
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => ({
    ...(params.get('creator') ? { creator: params.get('creator') || '' } : {}),
    ...(params.get('intendedUse') ? { intendedUse: params.get('intendedUse') || '' } : {}),
    ...(params.get('reusePolicy') ? { reusePolicy: params.get('reusePolicy') || '' } : {})
  }), [params]);
  const [creatorDraft, setCreatorDraft] = useState(params.get('creator') || '');

  useEffect(() => setCreatorDraft(params.get('creator') || ''), [params]);

  const characters = useInfiniteQuery({
    queryKey: ['characters', actorId, filters],
    queryFn: ({ pageParam }) => listCharacters(filters, pageParam),
    enabled: Boolean(actor),
    initialPageParam: null as string | null,
    getNextPageParam: page => page.nextCursor || undefined
  });
  const items = characters.data?.pages.flatMap(page => page.items) || [];
  const featured = items.find(character => (
    character.displayImageUrl || character.thumbnailUrl || character.imageUrl
  )) || null;
  const featuredImage = featured
    ? featured.displayImageUrl || featured.thumbnailUrl || featured.imageUrl || null
    : null;
  const tutorials = discoveryTutorialAssets.characters.map(item => ({
    ...item,
    title: t(`character-profiles.gallery.tutorial.${item.id}.title`),
    description: t(`character-profiles.gallery.tutorial.${item.id}.description`)
  }));

  function setFilter(name: 'intendedUse' | 'reusePolicy' | 'creator', value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    setParams(next, { replace: true });
  }

  function submitCreatorSearch() {
    setFilter('creator', creatorDraft.trim());
  }

  function clearCreatorSearch() {
    setCreatorDraft('');
    setFilter('creator', '');
  }

  return (
    <main className="discovery-page character-gallery-page">
      <DiscoveryPageHero
        eyebrow={t('character-profiles.gallery.eyebrow')}
        title={t('character-profiles.gallery.title')}
        description={t('character-profiles.gallery.description')}
        media={featuredImage ? <img src={apiMediaUrl(featuredImage) || ''} alt={featured?.displayName || ''} /> : undefined}
        mediaLabel={featured?.displayName}
        actions={[
          { label: t('character-profiles.gallery.create'), to: routePaths.createStudioCharacter, icon: <Sparkles />, variant: 'primary' },
          { label: t('character-profiles.gallery.browse'), to: `${routePaths.exploreCharacters}#character-catalog`, icon: <Search /> }
        ]}
      />

      {featured && featuredImage ? (
        <section className="character-feature" aria-labelledby="character-feature-title">
          <img src={apiMediaUrl(featuredImage) || ''} alt={featured.displayName} />
          <div>
            <span>{t('character-profiles.gallery.featuredEyebrow')}</span>
            <h2 id="character-feature-title">{featured.displayName}</h2>
            <p>{featured.personalitySummary || t('character-profiles.page.noPersonality')}</p>
            <Link to={`/characters/${encodeURIComponent(featured.id)}`}>
              {t('character-profiles.gallery.viewCharacter')}
            </Link>
          </div>
        </section>
      ) : null}

      <DiscoverySteps
        title={t('character-profiles.gallery.stepsLabel')}
        steps={[
          { id: 'discover', icon: <Search />, title: t('character-profiles.gallery.steps.discover.title'), description: t('character-profiles.gallery.steps.discover.description') },
          { id: 'review', icon: <BadgeCheck />, title: t('character-profiles.gallery.steps.review.title'), description: t('character-profiles.gallery.steps.review.description') },
          { id: 'use', icon: <Clapperboard />, title: t('character-profiles.gallery.steps.use.title'), description: t('character-profiles.gallery.steps.use.description') }
        ]}
      />

      <section id="character-catalog" className="discovery-catalog" aria-labelledby="character-catalog-title">
        <header className="discovery-section-heading">
          <div>
            <span>{t('character-profiles.gallery.catalogEyebrow')}</span>
            <h2 id="character-catalog-title">{t('character-profiles.gallery.catalogTitle')}</h2>
          </div>
        </header>
        <DiscoveryToolbar
          searchValue={creatorDraft}
          searchLabel={t('character-profiles.community.creatorFilter')}
          searchPlaceholder={t('character-profiles.community.creatorPlaceholder')}
          clearLabel={t('character-profiles.gallery.clearSearch')}
          onSearchChange={setCreatorDraft}
          onSearchClear={clearCreatorSearch}
          onSearchSubmit={submitCreatorSearch}
        >
          <DiscoverySelect
            label={t('character-profiles.community.useFilter')}
            value={params.get('intendedUse') || ''}
            options={[
              { label: t('character-profiles.community.allUses'), value: '' },
              { label: t('character-profiles.uses.fashion'), value: 'fashion' },
              { label: t('character-profiles.uses.scene'), value: 'scene_story' },
              { label: t('character-profiles.uses.general'), value: 'general' }
            ]}
            onChange={value => setFilter('intendedUse', value)}
          />
          <DiscoverySelect
            label={t('character-profiles.community.availabilityFilter')}
            value={params.get('reusePolicy') || ''}
            options={[
              { label: t('character-profiles.community.allAvailability'), value: '' },
              { label: t('character-profiles.status.available'), value: 'public_reusable' },
              { label: t('character-profiles.status.viewOnly'), value: 'view_only' }
            ]}
            onChange={value => setFilter('reusePolicy', value)}
          />
        </DiscoveryToolbar>

      {characters.isLoading ? <LoadingState label={t('character-profiles.states.loading')} /> : null}
        {characters.isError ? (
          <ErrorState
            title={t('character-profiles.states.unavailable')}
            description={characters.error.message}
            retryLabel={t('community:community.feed.retry')}
            onRetry={() => void characters.refetch()}
          />
        ) : null}
        {!characters.isLoading && !characters.isError && !items.length ? (
          <EmptyState title={t('character-profiles.community.empty')} description={t('character-profiles.gallery.emptyDescription')} />
        ) : null}
        <div className="character-discovery-grid" aria-live="polite">
          {items.map(character => <CharacterDiscoveryCard key={character.id} character={character} />)}
        </div>
        <DiscoveryLoadMore
          hasMore={Boolean(characters.hasNextPage)}
          loading={characters.isFetchingNextPage}
          loadLabel={t('community:community.feed.loadMore')}
          loadingLabel={t('community:community.feed.loadingMore')}
          onLoadMore={() => void characters.fetchNextPage()}
        />
      </section>

      <EditorialTutorialRail
        eyebrow={t('character-profiles.gallery.tutorialEyebrow')}
        title={t('character-profiles.gallery.tutorialTitle')}
        sampleLabel={t('community:community.discovery.sample')}
        items={tutorials}
      />
    </main>
  );
}
