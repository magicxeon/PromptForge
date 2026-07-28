import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ComparisonWorkspace } from '../../../components/comparisons/ComparisonWorkspace';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { deleteComparison, getComparison, setComparisonWinner } from '../api/comparisonApi';
import { ContextBackLink } from '../../../components/layout/ContextBackLink';
import { useActor } from '../../../lib/auth/ActorProvider';
import { ShareComparisonDialog } from '../../../components/community/ShareComparisonDialog';

export function ComparisonDetailRoute() {
  const { t } = useTranslation('react-ui');
  const { actor } = useActor();
  const actorId = actor?.userId || 'loading';
  const { setId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const comparison = useQuery({
    queryKey: ['comparison', actorId, setId],
    queryFn: () => getComparison(setId),
    enabled: Boolean(setId && actor),
    refetchInterval: query => {
      const status = query.state.data?.runs.at(-1)?.status;
      return status && ['queued', 'processing', 'streaming'].includes(status) ? 1500 : false;
    }
  });
  const winner = useMutation({
    mutationFn: (jobId: string | null) => setComparisonWinner(setId, jobId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['comparison', actorId, setId] })
  });
  const remove = useMutation({
    mutationFn: () => deleteComparison(setId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comparisons', actorId] });
      navigate('/comparisons');
    }
  });
  if (comparison.isLoading) return <LoadingState label={t('ui.comparisons.loadingOne')} />;
  if (comparison.isError || !comparison.data) return <ErrorState title={t('ui.comparisons.unavailableOne')} description={comparison.error?.message} onRetry={() => void comparison.refetch()} />;
  const run = comparison.data.runs.at(-1);
  const canShare = Boolean(
    run
    && ['completed', 'partially_completed'].includes(run.status)
    && run.slots.filter(slot => slot.status === 'completed' && slot.result?.imageUrl).length >= 2
  );
  return (
    <main>
      <div className="mb-4 flex items-center justify-between gap-3">
        <ContextBackLink fallbackTo="/comparisons">{t('ui.comparisons.title')}</ContextBackLink>
        <div className="flex flex-wrap gap-2">
          {canShare ? <ShareComparisonDialog setId={setId} /> : null}
          <ConfirmDialog
            trigger={<Button variant="ghost" icon={<Trash2 className="size-4" />}>{t('ui.action.delete')}</Button>}
            title={t('ui.comparisons.deleteTitle')}
            description={t('ui.comparisons.deleteDescription')}
            confirmLabel={t('ui.action.delete')}
            destructive
            pending={remove.isPending}
            onConfirm={() => remove.mutate()}
          />
        </div>
      </div>
      <header className="mb-5 border-b border-[var(--mpf-border)] pb-4">
        <h1 className="m-0 text-3xl">{comparison.data.name}</h1>
        <p className="mb-0 text-sm text-[var(--mpf-text-muted)]">{comparison.data.description}</p>
      </header>
      {run ? <ComparisonWorkspace mode="private" run={run} winnerJobId={comparison.data.winnerJobId} onWinnerChange={jobId => winner.mutate(jobId)} /> : <ErrorState title={t('ui.comparisons.noRuns')} />}
    </main>
  );
}
