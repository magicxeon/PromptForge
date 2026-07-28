import { useQuery } from '@tanstack/react-query';
import { LayoutTemplate } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { apiMediaUrl } from '../../../lib/api/apiClient';
import { listSharedSceneTemplates } from '../api/sceneTemplateApi';
import type { SharedTemplate } from '../schemas/sceneTemplateSchemas';
import { useActor } from '../../../lib/auth/ActorProvider';

export function SharedTemplatePanel({ onSelect }: { onSelect: (template: SharedTemplate) => void }) {
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
    <section className="border border-[var(--mpf-border)] bg-[var(--mpf-surface)] p-4">
      <div className="mb-3 flex items-center gap-2"><LayoutTemplate className="size-5 text-cyan-300" /><h2 className="m-0 text-lg">{t('ui.scene.sharedTemplates')}</h2></div>
      <div className="flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {templates.data?.map(template => (
          <article key={template.id} className="w-52 shrink-0 snap-start overflow-hidden border border-[var(--mpf-border)] bg-black/25">
            <div className="aspect-[16/10] bg-black">{template.thumbnailUrl || template.imageUrl ? <img src={apiMediaUrl(template.thumbnailUrl || template.imageUrl) || ''} alt="" className="h-full w-full object-cover" /> : null}</div>
            <div className="p-3"><strong className="line-clamp-1 text-sm">{template.title}</strong><small className="mt-1 block text-[var(--mpf-text-muted)]">@{template.ownerUsername || 'creator'}</small><Button className="mt-3 w-full" size="sm" onClick={() => onSelect(template)}>{t('ui.action.useTemplate')}</Button></div>
          </article>
        ))}
      </div>
    </section>
  );
}
