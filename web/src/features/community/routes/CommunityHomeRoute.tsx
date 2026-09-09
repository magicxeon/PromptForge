import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { routePaths } from '../../../app/routeRegistry/routes';
import { DiscoveryLoadMore } from '../../../components/discovery/DiscoveryLoadMore';
import {
  DiscoverySegmentedControl,
  DiscoverySelect,
  DiscoveryToolbar
} from '../../../components/discovery/DiscoveryToolbar';
import { EditorialTutorialRail } from '../../../components/discovery/EditorialTutorialRail';
import { HorizontalMediaCarousel } from '../../../components/media/HorizontalMediaCarousel';
import { MediaCard } from '../../../components/media/MediaCard';
import { Button } from '../../../components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { useFeaturePolicy } from '../../../lib/permissions/FeaturePolicyProvider';
import { CommunityHero } from '../components/CommunityHero';
import { CommunityStartPaths } from '../components/CommunityStartPaths';
import { CommunityProviderDirectory } from '../components/CommunityProviderDirectory';
import { getProviderCatalog } from '../../generation/api/generationApi';
import { isEligibleCommunityHeroPost } from '../components/communityHeroSelector';
import { discoveryTutorialAssets } from '../config/discoveryEditorialConfig';
import {
  formatDiscoveryCategory,
  useCommunityDiscoveryPosts
} from '../hooks/useCommunityDiscoveryPosts';

const postTypeIds = ['all', 'image', 'video', 'template', 'comparison', 'collection'] as const;
const periodIds = ['latest', 'week', 'month', 'year'] as const;

export function CommunityHomeRoute() {
  const { t } = useTranslation('community');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const policy = useFeaturePolicy();
  const discovery = useCommunityDiscoveryPosts();
  const editorialVisible = !discovery.filters.search;
  const providers = useQuery({
    queryKey: ['provider-catalog', 'playground', 'playground', null, discovery.actorId],
    queryFn: () => getProviderCatalog({ generationSurface: 'playground', generationMode: 'playground' }),
    enabled: Boolean(discovery.actor) && editorialVisible,
    staleTime: 0
  });
  const visualPosts = useMemo(
    () => discovery.posts.filter(isEligibleCommunityHeroPost),
    [discovery.posts]
  );
  const heroPost = editorialVisible && discovery.posts.length > 1
    ? visualPosts.find(post => post.postType !== 'video') || null
    : null;
  const featuredPosts = editorialVisible && discovery.posts.length >= 6
    ? visualPosts.filter(post => post.id !== heroPost?.id).slice(0, 4)
    : [];
  const feedPosts = discovery.posts;
  const tutorialItems = discoveryTutorialAssets.home.map(item => ({
    ...item,
    title: t(`community.home.tutorial.${item.id}.title`),
    description: t(`community.home.tutorial.${item.id}.description`)
  }));

  function setPostType(value: string) {
    const next = new URLSearchParams(searchParams);
    next.delete('type');
    if (value === 'template') {
      navigate(`${routePaths.exploreTemplates}${next.size ? `?${next}` : ''}`);
      return;
    }
    if (value === 'comparison') {
      navigate(`${routePaths.exploreComparisons}${next.size ? `?${next}` : ''}`);
      return;
    }
    discovery.setParam('type', value === 'all' ? '' : value);
  }

  return (
    <main className="discovery-page community-home">
      {editorialVisible ? (
        <>
          <CommunityHero post={heroPost} />
          <CommunityStartPaths
            communityEnabled={policy.isEnabled('community.exploreEnabled')}
            charactersEnabled={policy.isEnabled('community.characterProfilesEnabled')}
          />
          <CommunityProviderDirectory
            catalog={providers.data}
            loading={providers.isPending}
            error={providers.isError}
            onRetry={() => void providers.refetch()}
          />
          {featuredPosts.length ? (
            <section className="community-featured" aria-labelledby="community-featured-title">
              <HorizontalMediaCarousel
                heading={(
                  <div className="discovery-section-heading community-section-heading">
                    <div>
                      <span>{t('community.home.featuredEyebrow')}</span>
                      <h2 id="community-featured-title">{t('community.home.featuredTitle')}</h2>
                      <p>{t('community.home.featuredDescription')}</p>
                    </div>
                    <a className="community-section-action" href="#community-feed">
                      {t('community.home.featuredSeeAll')}
                      <ArrowRight aria-hidden="true" />
                    </a>
                  </div>
                )}
                previousLabel={t('community.home.featuredPrevious')}
                nextLabel={t('community.home.featuredNext')}
                ariaLabel={t('community.home.featuredTitle')}
                itemClassName="community-featured__item"
              >
                {featuredPosts.map(post => <MediaCard key={post.id} post={post} previewFit="cover" />)}
              </HorizontalMediaCarousel>
            </section>
          ) : null}
        </>
      ) : null}

      <section id="community-feed" className="community-feed" aria-labelledby="community-feed-title">
        <header className="discovery-section-heading">
          <div>
            <span>{t('community.home.discoveryEyebrow')}</span>
            <h2 id="community-feed-title">{t('community.feed.title')}</h2>
            {discovery.filters.search ? (
              <p>{t('community.home.searchResult', { query: discovery.filters.search })}</p>
            ) : <p>{t('community.home.feedDescription')}</p>}
          </div>
        </header>

        <DiscoveryToolbar
          searchValue={discovery.searchDraft}
          searchLabel={t('community.feed.searchLabel')}
          searchPlaceholder={t('community.feed.searchPlaceholder')}
          clearLabel={t('community.home.clearSearch')}
          onSearchChange={discovery.setSearchDraft}
          onSearchClear={discovery.clearSearch}
          onSearchSubmit={discovery.submitSearch}
        >
          <DiscoverySelect
            label={t('community.feed.typeLabel')}
            value={discovery.filters.postType}
            options={postTypeIds.map(type => ({ label: t(`community.feed.type.${type}`), value: type }))}
            onChange={setPostType}
          />
          <DiscoverySelect
            label={t('community.feed.categoryLabel')}
            value={discovery.filters.officialTag}
            options={[
              { label: t('community.feed.categoryAll'), value: '' },
              ...discovery.categories.map(category => ({
                label: formatDiscoveryCategory(category.id),
                value: category.id
              }))
            ]}
            onChange={value => discovery.setParam('category', value)}
          />
          <DiscoverySegmentedControl
            label={t('community.home.periodLabel')}
            value={discovery.periodValue}
            options={periodIds.map(period => ({ label: t(`community.feed.${period}`), value: period }))}
            onChange={discovery.setPeriod}
          />
        </DiscoveryToolbar>

        {discovery.query.isLoading ? <LoadingState label={t('community.feed.loading')} /> : null}
        {discovery.query.isError ? (
          <ErrorState
            title={t('community.feed.error')}
            description={discovery.query.error.message}
            retryLabel={t('community.feed.retry')}
            onRetry={() => void discovery.query.refetch()}
          />
        ) : null}
        {!discovery.query.isLoading && !discovery.query.isError && !discovery.posts.length ? (
          <EmptyState title={t('community.feed.empty')} />
        ) : null}
        <div className="community-feed-grid media-card-list" aria-live="polite">
          {feedPosts.map(post => <MediaCard key={post.id} post={post} />)}
        </div>

        {editorialVisible ? (
          <EditorialTutorialRail
            eyebrow={t('community.home.tutorialEyebrow')}
            title={t('community.home.tutorialTitle')}
            description={t('community.home.tutorialDescription')}
            sampleLabel={t('community.discovery.sample')}
            items={tutorialItems}
          />
        ) : null}

        {discovery.query.isFetchNextPageError ? (
          <div className="community-feed__pagination-error" role="alert">
            <p>{t('community.feed.loadMoreError')}</p>
            <Button type="button" variant="secondary" onClick={() => void discovery.query.fetchNextPage()}>
              {t('community.feed.retryMore')}
            </Button>
          </div>
        ) : null}
        <DiscoveryLoadMore
          hasMore={Boolean(discovery.query.hasNextPage)}
          loading={discovery.query.isFetchingNextPage}
          loadLabel={t('community.home.feedSeeMore')}
          loadingLabel={t('community.feed.loadingMore')}
          onLoadMore={() => void discovery.query.fetchNextPage()}
        />
      </section>
    </main>
  );
}
