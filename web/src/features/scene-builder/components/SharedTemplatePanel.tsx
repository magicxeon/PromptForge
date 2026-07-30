import { useQuery } from '@tanstack/react-query';
import { LayoutTemplate } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { HorizontalMediaCarousel } from '../../../components/media/HorizontalMediaCarousel';
import { TemplatePricingBadge } from '../../../components/templates/TemplatePricingBadge';
import { TemplateUseButton } from '../../../components/templates/TemplateUseButton';
import { apiMediaUrl } from '../../../lib/api/apiClient';
import { listSharedSceneTemplates } from '../api/sceneTemplateApi';
import type { SharedTemplate } from '../schemas/sceneTemplateSchemas';
import { useActor } from '../../../lib/auth/ActorProvider';

const TEMPLATE_PREVIEW_LIMIT = 4;

export function SharedTemplatePanel({
  onSelect,
  viewAllHref
}: {
  onSelect: (template: SharedTemplate) => void;
  viewAllHref?: string | null;
}) {
  const { t } = useTranslation('react-ui');
  const { actor } = useActor();
  const templates = useQuery({
    queryKey: ['scene-templates', 'shared', actor?.userId || 'loading'],
    queryFn: listSharedSceneTemplates,
    enabled: Boolean(actor)
  });
  if (templates.isLoading) return <LoadingState label={t('ui.scene.templatesLoading')} />;
  if (templates.isError) return <ErrorState title={t('ui.scene.templatesUnavailable')} description={templates.error.message} />;
  return (
    <section className="studio-shared-templates border border-[var(--mpf-border)] bg-[var(--mpf-surface)] p-4">
      <HorizontalMediaCarousel
        heading={<><LayoutTemplate className="size-5 text-cyan-300" /><h2 className="m-0 text-lg">{t('ui.scene.sharedTemplates')}</h2></>}
        ariaLabel={t('ui.scene.sharedTemplates')}
        previousLabel={t('ui.carousel.previous')}
        nextLabel={t('ui.carousel.next')}
        itemClassName="w-52"
        viewAll={viewAllHref ? { href: viewAllHref, label: t('ui.carousel.viewProfileTemplates') } : null}
      >
        {templates.data?.slice(0, TEMPLATE_PREVIEW_LIMIT).map(template => {
          const fallbackUrl = apiMediaUrl(template.thumbnailUrl || template.imageUrl) || '';
          const presentationUrl = apiMediaUrl(template.presentationUrls.templateCard) || fallbackUrl;
          return (
            <article key={template.id} className="h-full overflow-hidden border border-[var(--mpf-border)] bg-black/25">
              <div className="aspect-[16/10] overflow-hidden bg-black">
                {presentationUrl ? (
                  <img
                    src={presentationUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    data-fallback-src={fallbackUrl}
                    onError={event => {
                      const fallback = event.currentTarget.dataset.fallbackSrc;
                      if (fallback && event.currentTarget.dataset.fallbackApplied !== 'true') {
                        event.currentTarget.dataset.fallbackApplied = 'true';
                        event.currentTarget.src = fallback;
                      }
                    }}
                  />
                ) : null}
              </div>
              <div className="p-3">
                <strong className="line-clamp-1 text-sm">{template.title}</strong>
                <small className="mt-1 block text-[var(--mpf-text-muted)]">
                  @{template.ownerUsername || 'creator'}
                </small>
                {template.templatePricing
                  ? <TemplatePricingBadge accessCredits={template.templatePricing.accessCredits} className="mt-2" />
                  : null}
                <TemplateUseButton className="mt-3 w-full" onUse={() => onSelect(template)} />
              </div>
            </article>
          );
        })}
      </HorizontalMediaCarousel>
    </section>
  );
}
