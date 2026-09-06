import { ArrowRight } from 'lucide-react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { routeBuilders, routePaths } from '../../../app/routeRegistry/routes';
import { ContextBackLink } from '../../../components/layout/ContextBackLink';
import { CreatorIdentity } from '../../../components/community/CreatorIdentity';
import { MediaStage } from '../../../components/media/MediaStage';
import { MediaCard } from '../../../components/media/MediaCard';
import { TemplateUseButton } from '../../../components/templates/TemplateUseButton';
import { TemplatePricingBadge } from '../../../components/templates/TemplatePricingBadge';
import { LoadingState, ErrorState } from '../../../components/ui/AsyncState';
import { DiscoverySegmentedControl } from '../../../components/discovery/DiscoveryToolbar';
import { DiscoveryLoadMore } from '../../../components/discovery/DiscoveryLoadMore';
import { createReturnNavigationState } from '../../../lib/navigation/returnNavigation';
import { useTemplateDetail } from '../hooks/useTemplateDetail';
import { useCommunityTemplateHandoff } from '../hooks/useCommunityTemplateHandoff';

export function TemplateDetailRoute() {
  const { postId = '' } = useParams();
  const [search, setSearch] = useSearchParams();
  const location = useLocation();
  const { t } = useTranslation('community');
  const sort = search.get('sort') === 'latest' ? 'latest' : 'likes';
  const query = useTemplateDetail(postId, sort);
  const handoff = useCommunityTemplateHandoff();
  const template = query.data?.pages[0]?.template;
  const items = [...new Map(query.data?.pages.flatMap(page => page.items).map(item => [item.id, item]) || []).values()];
  const navigation = createReturnNavigationState(location);
  return (
    <main className="template-detail-page">
      <ContextBackLink fallbackTo={routePaths.exploreTemplates}>{t('community.templateDetail.back')}</ContextBackLink>
      {query.isLoading ? <LoadingState label={t('community.templateDetail.loading')} /> : null}
      {query.isError && !template ? <ErrorState title={t('community.templateDetail.error')} retryLabel={t('community.feed.retry')} onRetry={() => void query.refetch()} /> : null}
      {!query.isLoading && !query.isError && !template ? <p role="status">{t('community.templateDetail.unavailable')}</p> : null}
      {template ? <>
        <section className="template-detail-source" aria-labelledby="template-detail-title">
          <div className="template-detail-source__media">
            <MediaStage post={template} eager fit="contain" source="original" />
          </div>
          <div className="template-detail-source__copy">
            <span className="template-detail-source__eyebrow">{t('community.templateDetail.original')}</span>
            <h1 id="template-detail-title">{template.title || t('community.creator.untitled')}</h1>
            <CreatorIdentity creator={template.creator} createdAt={template.createdAt} linked />
            {template.description ? <p>{template.description}</p> : null}
            {template.officialTags.length ? <div className="template-detail-source__tags">{template.officialTags.slice(0, 5).map(tag => <span key={tag}>{tag}</span>)}</div> : null}
            <dl>
              {template.providerModelDisplay ? <div><dt>{t('community.detail.model')}</dt><dd>{template.providerModelDisplay}</dd></div> : null}
              {template.generationMetadata.aspectRatio ? <div><dt>{t('community.detail.aspectRatio')}</dt><dd>{template.generationMetadata.aspectRatio}</dd></div> : null}
            </dl>
            <div className="template-detail-source__actions">
              {template.templatePricing ? <TemplatePricingBadge accessCredits={template.templatePricing.accessCredits} /> : null}
              {template.templateAvailability ? <TemplateUseButton className="template-detail-source__use" disabled={handoff.isPending} onUse={() => handoff.mutate(template.id)} /> : <p>{t('community.templates.unavailable')}</p>}
              <Link to={routeBuilders.post(template.id)} state={navigation}>{t('community.templateDetail.viewOriginal')}<ArrowRight aria-hidden="true" /></Link>
            </div>
            {handoff.isError ? <p role="alert">{handoff.error.message}</p> : null}
          </div>
        </section>
        <section className="template-detail-creations" aria-labelledby="template-creations-title">
          <header>
            <h2 id="template-creations-title">{t('community.templateDetail.creations')}</h2>
            <DiscoverySegmentedControl label={t('community.templateDetail.sort')} value={sort}
              options={['likes', 'latest'].map(value => ({ value, label: t(`community.templateDetail.${value === 'likes' ? 'mostLiked' : 'latest'}`) }))}
              onChange={value => { const next = new URLSearchParams(search); next.set('sort', value); setSearch(next, { replace: true }); }} />
          </header>
          {query.isError ? <ErrorState title={t('community.templateDetail.error')} retryLabel={t('community.feed.retry')}
            onRetry={() => void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())} /> : null}
          {!items.length ? <p className="template-detail-creations__empty">{t('community.templateDetail.empty')}</p> : <div className="template-detail-creations__grid">
            {items.map(item => <MediaCard key={item.id} post={item} previewFit="cover" />)}
          </div>}
          <DiscoveryLoadMore hasMore={Boolean(query.hasNextPage)} loading={query.isFetchingNextPage}
            loadLabel={t('community.feed.loadMore')} loadingLabel={t('community.feed.loadingMore')} onLoadMore={() => void query.fetchNextPage()} />
        </section>
      </> : null}
    </main>
  );
}
