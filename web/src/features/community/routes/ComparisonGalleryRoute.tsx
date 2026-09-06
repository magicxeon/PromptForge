import { Columns3, FlaskConical, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { routePaths } from '../../../app/routeRegistry/routes';
import { DiscoveryLoadMore } from '../../../components/discovery/DiscoveryLoadMore';
import { DiscoveryPageHero } from '../../../components/discovery/DiscoveryPageHero';
import { DiscoverySegmentedControl, DiscoveryToolbar } from '../../../components/discovery/DiscoveryToolbar';
import { EditorialTutorialRail } from '../../../components/discovery/EditorialTutorialRail';
import { MediaStage } from '../../../components/media/MediaStage';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { PublicComparisonCard } from '../components/comparisons/PublicComparisonCard';
import { discoveryTutorialAssets } from '../config/discoveryEditorialConfig';
import { useCommunityDiscoveryPosts } from '../hooks/useCommunityDiscoveryPosts';

const periodIds = ['latest', 'week', 'month', 'year'] as const;

export function ComparisonGalleryRoute() {
  const { t } = useTranslation('community');
  const discovery = useCommunityDiscoveryPosts('comparison');
  const featured = discovery.posts.find(post => (post.comparisonSnapshot?.slots.length || 0) >= 2) || null;
  const tutorials = discoveryTutorialAssets.comparisons.map(item => ({
    ...item,
    title: t(`community.comparisons.tutorial.${item.id}.title`),
    description: t(`community.comparisons.tutorial.${item.id}.description`)
  }));

  return (
    <main className="discovery-page comparison-gallery-page">
      <DiscoveryPageHero
        eyebrow={t('community.comparisons.eyebrow')}
        title={t('community.comparisons.title')}
        description={t('community.comparisons.description')}
        media={featured ? <MediaStage post={featured} eager fit="cover" /> : undefined}
        mediaLabel={featured?.title}
        actions={[
          { label: t('community.comparisons.create'), to: `${routePaths.createPlayground}?compare=1`, icon: <FlaskConical />, variant: 'primary' },
          { label: t('community.comparisons.browse'), to: `${routePaths.exploreComparisons}#comparison-catalog`, icon: <Search /> }
        ]}
      />

      {featured ? (
        <section className="comparison-feature" aria-labelledby="comparison-feature-title">
          <header className="discovery-section-heading">
            <div>
              <span>{t('community.comparisons.featuredEyebrow')}</span>
              <h2 id="comparison-feature-title">{t('community.comparisons.featuredTitle')}</h2>
            </div>
          </header>
          <PublicComparisonCard post={featured} />
        </section>
      ) : null}

      <section id="comparison-catalog" className="discovery-catalog" aria-labelledby="comparison-catalog-title">
        <header className="discovery-section-heading">
          <div>
            <span>{t('community.comparisons.catalogEyebrow')}</span>
            <h2 id="comparison-catalog-title">{t('community.comparisons.catalogTitle')}</h2>
          </div>
          <Columns3 aria-hidden="true" />
        </header>
        <DiscoveryToolbar
          searchValue={discovery.searchDraft}
          searchLabel={t('community.comparisons.searchLabel')}
          searchPlaceholder={t('community.comparisons.searchPlaceholder')}
          clearLabel={t('community.comparisons.clearSearch')}
          onSearchChange={discovery.setSearchDraft}
          onSearchClear={discovery.clearSearch}
          onSearchSubmit={discovery.submitSearch}
        >
          <DiscoverySegmentedControl
            label={t('community.comparisons.periodLabel')}
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
          <EmptyState title={t('community.comparisons.empty')} description={t('community.comparisons.emptyDescription')} />
        ) : null}
        <div className="public-comparison-grid" aria-live="polite">
          {discovery.posts.map(post => <PublicComparisonCard key={post.id} post={post} />)}
        </div>
        <DiscoveryLoadMore
          hasMore={Boolean(discovery.query.hasNextPage)}
          loading={discovery.query.isFetchingNextPage}
          loadLabel={t('community.feed.loadMore')}
          loadingLabel={t('community.feed.loadingMore')}
          onLoadMore={() => void discovery.query.fetchNextPage()}
        />
      </section>

      <EditorialTutorialRail
        eyebrow={t('community.comparisons.tutorialEyebrow')}
        title={t('community.comparisons.tutorialTitle')}
        sampleLabel={t('community.discovery.sample')}
        items={tutorials}
      />
    </main>
  );
}
