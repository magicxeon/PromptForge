import { Eye, Search, Sparkles, WandSparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { routePaths } from '../../../app/routeRegistry/routes';
import { DiscoveryLoadMore } from '../../../components/discovery/DiscoveryLoadMore';
import { DiscoveryPageHero } from '../../../components/discovery/DiscoveryPageHero';
import { DiscoverySteps } from '../../../components/discovery/DiscoverySteps';
import {
  DiscoverySegmentedControl,
  DiscoverySelect,
  DiscoveryToolbar
} from '../../../components/discovery/DiscoveryToolbar';
import { EditorialTutorialRail } from '../../../components/discovery/EditorialTutorialRail';
import { MediaStage } from '../../../components/media/MediaStage';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { TemplateUseButton } from '../../../components/templates/TemplateUseButton';
import { TemplateDiscoveryCard } from '../components/templates/TemplateDiscoveryCard';
import { discoveryTutorialAssets } from '../config/discoveryEditorialConfig';
import {
  formatDiscoveryCategory,
  useCommunityDiscoveryPosts
} from '../hooks/useCommunityDiscoveryPosts';
import { useCommunityTemplateHandoff } from '../hooks/useCommunityTemplateHandoff';

const periodIds = ['latest', 'week', 'month', 'year'] as const;

export function TemplateGalleryRoute() {
  const { t } = useTranslation('community');
  const discovery = useCommunityDiscoveryPosts('template');
  const handoff = useCommunityTemplateHandoff();
  const featured = discovery.posts.find(post => post.imageUrl || post.thumbnailUrl) || null;
  const tutorialItems = discoveryTutorialAssets.templates.map(item => ({
    ...item,
    title: t(`community.templates.tutorial.${item.id}.title`),
    description: t(`community.templates.tutorial.${item.id}.description`)
  }));

  return (
    <main className="discovery-page template-gallery-page">
      <DiscoveryPageHero
        eyebrow={t('community.templates.eyebrow')}
        title={t('community.templates.title')}
        description={t('community.templates.description')}
        media={featured ? <MediaStage post={featured} eager fit="cover" source="original" /> : undefined}
        mediaLabel={featured?.title}
        actions={[
          { label: t('community.templates.create'), to: routePaths.createStudioScene, icon: <Sparkles />, variant: 'primary' },
          { label: t('community.templates.browse'), to: `${routePaths.exploreTemplates}#template-catalog`, icon: <Search /> }
        ]}
      />

      {featured ? (
        <section className="template-feature" aria-labelledby="template-feature-title">
          <div className="template-feature__media"><MediaStage post={featured} eager fit="cover" source="original" /></div>
          <div className="template-feature__copy">
            <span>{t('community.templates.featuredEyebrow')}</span>
            <h2 id="template-feature-title">{featured.title || t('community.creator.untitled')}</h2>
            {featured.description ? <p>{featured.description}</p> : null}
            <TemplateUseButton
              disabled={!featured.templateAvailability || (handoff.isPending && handoff.variables === featured.id)}
              onUse={() => handoff.mutate(featured.id)}
            />
          </div>
        </section>
      ) : null}

      <DiscoverySteps
        title={t('community.templates.stepsLabel')}
        steps={[
          { id: 'discover', icon: <Search />, title: t('community.templates.steps.discover.title'), description: t('community.templates.steps.discover.description') },
          { id: 'inspect', icon: <Eye />, title: t('community.templates.steps.inspect.title'), description: t('community.templates.steps.inspect.description') },
          { id: 'use', icon: <WandSparkles />, title: t('community.templates.steps.use.title'), description: t('community.templates.steps.use.description') }
        ]}
      />

      <section id="template-catalog" className="discovery-catalog" aria-labelledby="template-catalog-title">
        <header className="discovery-section-heading">
          <div>
            <span>{t('community.templates.catalogEyebrow')}</span>
            <h2 id="template-catalog-title">{t('community.templates.catalogTitle')}</h2>
            {discovery.filters.search ? <p>{t('community.templates.searchResult', { query: discovery.filters.search })}</p> : null}
          </div>
        </header>
        <DiscoveryToolbar
          searchValue={discovery.searchDraft}
          searchLabel={t('community.templates.searchLabel')}
          searchPlaceholder={t('community.templates.searchPlaceholder')}
          clearLabel={t('community.templates.clearSearch')}
          onSearchChange={discovery.setSearchDraft}
          onSearchClear={discovery.clearSearch}
          onSearchSubmit={discovery.submitSearch}
        >
          <DiscoverySelect
            label={t('community.feed.categoryLabel')}
            value={discovery.filters.officialTag}
            options={[
              { label: t('community.feed.categoryAll'), value: '' },
              ...discovery.categories.map(category => ({ label: formatDiscoveryCategory(category.id), value: category.id }))
            ]}
            onChange={value => discovery.setParam('category', value)}
          />
          <DiscoverySegmentedControl
            label={t('community.templates.periodLabel')}
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
          <EmptyState title={t('community.templates.empty')} description={t('community.templates.emptyDescription')} />
        ) : null}
        <div className="template-discovery-grid" aria-live="polite">
          {discovery.posts.map(post => (
            <TemplateDiscoveryCard
              key={post.id}
              post={post}
              using={handoff.isPending && handoff.variables === post.id}
              onUse={() => handoff.mutate(post.id)}
            />
          ))}
        </div>
        {handoff.isError ? <p className="discovery-inline-error">{handoff.error.message}</p> : null}
        <DiscoveryLoadMore
          hasMore={Boolean(discovery.query.hasNextPage)}
          loading={discovery.query.isFetchingNextPage}
          loadLabel={t('community.feed.loadMore')}
          loadingLabel={t('community.feed.loadingMore')}
          onLoadMore={() => void discovery.query.fetchNextPage()}
        />
      </section>

      <EditorialTutorialRail
        eyebrow={t('community.templates.tutorialEyebrow')}
        title={t('community.templates.tutorialTitle')}
        sampleLabel={t('community.discovery.sample')}
        items={tutorialItems}
      />
    </main>
  );
}
