import { useMutation, useQuery } from '@tanstack/react-query';
import { Columns3, Download, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { ShareGeneratedDialog } from '../../../components/community/ShareGeneratedDialog';
import { CollectionPickerDialog } from '../../../components/collections/CollectionPickerDialog';
import { ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { Surface } from '../../../components/ui/Surface';
import { apiMediaUrl } from '../../../lib/api/apiClient';
import { deleteHistoryItem, getHistoryItem } from '../api/historyApi';
import { useActor } from '../../../lib/auth/ActorProvider';
import { ContextBackLink } from '../../../components/layout/ContextBackLink';
import { FaceReferenceDestinationDialog } from '../../../components/generation/FaceReferenceDestinationDialog';
import { TemplateLineageCard } from '../../../components/templates/TemplateLineageCard';
import { routeBuilders } from '../../../app/routeRegistry/routes';
import { MediaExportButton } from '../../../components/media/MediaExportButton';

export function HistoryDetailRoute() {
  const { t } = useTranslation('react-ui');
  const { actor } = useActor();
  const { jobId = '' } = useParams();
  const navigate = useNavigate();
  const item = useQuery({ queryKey: ['history-item', actor?.userId || 'loading', jobId], queryFn: () => getHistoryItem(jobId), enabled: Boolean(jobId && actor) });
  const remove = useMutation({
    mutationFn: () => deleteHistoryItem(jobId),
    onSuccess: () => navigate('/library/recent', { replace: true })
  });
  if (item.isLoading) return <LoadingState label={t('ui.history.loading')} />;
  if (item.isError || !item.data) return <ErrorState title={t('ui.history.unavailable')} description={item.error?.message} onRetry={() => void item.refetch()} />;
  return (
    <main>
      <ContextBackLink fallbackTo="/library/recent">{t('ui.history.back')}</ContextBackLink>
      <div className="mt-3 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <Surface className="grid min-h-[65vh] place-items-center overflow-hidden bg-black p-0">
          <img src={apiMediaUrl(item.data.imageUrl) || ''} alt="" className="max-h-[80vh] w-full object-contain" />
        </Surface>
        <Surface className="p-5">
          <h1 className="text-xl">{item.data.submodel || item.data.provider}</h1>
          {actor?.role === 'admin' ? (
            <p className="max-h-80 overflow-auto whitespace-pre-wrap text-sm leading-6 text-[var(--mpf-text-muted)]">{item.data.prompt}</p>
          ) : null}
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-[var(--mpf-text-muted)]">{t('ui.history.size')}</dt><dd className="m-0">{item.data.width || '-'} × {item.data.height || '-'}</dd></div>
            <div><dt className="text-[var(--mpf-text-muted)]">{t('ui.history.credits')}</dt><dd className="m-0">{item.data.creditCost || '-'}</dd></div>
          </dl>
          <TemplateLineageCard context={item.data.templateUseContext} />
          <div className="mt-5 grid grid-cols-1 gap-2 min-[390px]:grid-cols-2 sm:flex sm:flex-wrap [&>button]:w-full min-[390px]:[&>button]:min-w-0 sm:[&>button]:w-auto">
            {item.data.lookSheetSnapshot ? <MediaExportButton request={{ kind: 'look_sheet', jobId: item.data.id }} /> : <a href={apiMediaUrl(item.data.imageUrl) || ''} download className="inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-[var(--mpf-radius-sm)] border border-[var(--mpf-border)] px-3 text-center text-[0.75rem] text-white no-underline sm:w-auto"><Download className="size-4 shrink-0" />{t('ui.action.download')}</a>}
            <CollectionPickerDialog jobId={item.data.id} />
            {item.data.comparisonSetId ? (
              <Link
                to={routeBuilders.comparison(item.data.comparisonSetId)}
                className="generation-viewer__comparison-link"
              >
                <Columns3 aria-hidden="true" />
                {t('ui.history.openComparison')}
              </Link>
            ) : null}
            <ShareGeneratedDialog jobId={item.data.id} />
            {item.data.mode === 'headshot' ? (
              <FaceReferenceDestinationDialog
                source={{ sourceType: 'generation', sourceId: item.data.id }}
                imageUrl={item.data.imageUrl}
              />
            ) : null}
            <ConfirmDialog
              trigger={<Button variant="danger" icon={<Trash2 className="size-4" />}>{t('ui.action.delete')}</Button>}
              title={t('ui.history.deleteTitle')}
              description={t('ui.history.deleteDescription')}
              confirmLabel={t('ui.action.delete')}
              destructive
              pending={remove.isPending}
              onConfirm={() => remove.mutate()}
            />
          </div>
        </Surface>
      </div>
    </main>
  );
}
