import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
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

export function HistoryDetailRoute() {
  const { t } = useTranslation('react-ui');
  const { actor } = useActor();
  const { jobId = '' } = useParams();
  const navigate = useNavigate();
  const item = useQuery({ queryKey: ['history-item', actor?.userId || 'loading', jobId], queryFn: () => getHistoryItem(jobId), enabled: Boolean(jobId && actor) });
  const remove = useMutation({
    mutationFn: () => deleteHistoryItem(jobId),
    onSuccess: () => navigate('/history', { replace: true })
  });
  if (item.isLoading) return <LoadingState label={t('ui.history.loading')} />;
  if (item.isError || !item.data) return <ErrorState title={t('ui.history.unavailable')} description={item.error?.message} onRetry={() => void item.refetch()} />;
  return (
    <main>
      <ContextBackLink fallbackTo="/history">{t('ui.history.back')}</ContextBackLink>
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
          <div className="mt-5 flex gap-2">
            <a href={apiMediaUrl(item.data.imageUrl) || ''} download className="inline-flex min-h-10 items-center gap-2 rounded-[var(--mpf-radius-sm)] border border-[var(--mpf-border)] px-4 text-sm text-white no-underline"><Download className="size-4" />{t('ui.action.download')}</a>
            <CollectionPickerDialog jobId={item.data.id} />
            <ShareGeneratedDialog jobId={item.data.id} />
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
