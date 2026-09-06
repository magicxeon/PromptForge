import { ArrowRight, Eye, Heart, RefreshCw } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { routeBuilders } from '../../../../app/routeRegistry/routes';
import { MediaStage } from '../../../../components/media/MediaStage';
import { Button } from '../../../../components/ui/Button';
import { TemplateUseButton } from '../../../../components/templates/TemplateUseButton';
import { createReturnNavigationState } from '../../../../lib/navigation/returnNavigation';
import { useCommunityTemplateHandoff } from '../../hooks/useCommunityTemplateHandoff';
import type { TemplateDetailQuery } from '../../hooks/useTemplateDetail';

export function TemplateCreationsPreview({ query, postId, isTemplate }: { query: TemplateDetailQuery; postId: string; isTemplate: boolean }) {
  const { t } = useTranslation('community');
  const location = useLocation();
  const handoff = useCommunityTemplateHandoff();
  const page = query.data?.pages[0];
  const template = page?.template;
  const navigation = createReturnNavigationState(location);
  if (!template && !query.isError && !(isTemplate && query.isLoading)) return null;
  return (
    <section className="template-creations-preview" aria-label={t('community.templateDetail.creations')}>
      {query.isLoading ? <p role="status">{t('community.templateDetail.loading')}</p> : null}
      {query.isError ? <div role="alert"><p>{t('community.templateDetail.error')}</p>
        <Button size="sm" icon={<RefreshCw className="size-4" />} onClick={() => void query.refetch()}>{t('community.feed.retry')}</Button></div> : null}
      {template ? <>
        <header>
          <h2>{t(postId === template.id ? 'community.templateDetail.creations' : 'community.templateDetail.madeWith')}</h2>
          <Link to={routeBuilders.templateDetail(template.id)} state={navigation}>{t('community.templateDetail.seeAll')}<ArrowRight aria-hidden="true" /></Link>
        </header>
        <Link className="template-creations-preview__origin" to={routeBuilders.templateDetail(template.id)} state={navigation}>{template.title || t('community.creator.untitled')}</Link>
        {page.items.length ? <div className="template-creations-preview__grid">
          {page.items.slice(0, 4).map(item => <Link key={item.id} to={routeBuilders.post(item.id)} state={navigation} aria-label={item.title || t('community.creator.untitled')}>
            <MediaStage post={item} fit="cover" className="template-creations-preview__media" />
            <strong>{item.title || t('community.creator.untitled')}</strong>
            <span className="template-creations-preview__metrics">
              <span title={t('community.templateDetail.likes')}><Heart aria-hidden="true" />{item.engagementSummary.likeCount}</span>
              <span title={t('community.templateDetail.views')}><Eye aria-hidden="true" />{item.engagementSummary.viewCount}</span>
            </span>
          </Link>)}
        </div> : <p className="template-creations-preview__empty">{t('community.templateDetail.empty')}</p>}
        {postId !== template.id && template.templateAvailability ? <TemplateUseButton disabled={handoff.isPending} onUse={() => handoff.mutate(template.id)} /> : null}
        {handoff.isError ? <p role="alert">{handoff.error.message}</p> : null}
      </> : null}
    </section>
  );
}
