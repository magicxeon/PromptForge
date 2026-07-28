import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ComparisonWorkspace } from '../../../components/comparisons/ComparisonWorkspace';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import {
  deleteComparison,
  getComparison,
  setComparisonWinner,
  updateComparison
} from '../api/comparisonApi';
import { ContextBackLink } from '../../../components/layout/ContextBackLink';
import { useActor } from '../../../lib/auth/ActorProvider';
import { ShareComparisonDialog } from '../../../components/community/ShareComparisonDialog';
import { FaceReferenceDestinationDialog } from '../../../components/generation/FaceReferenceDestinationDialog';
import { CollectionPickerDialog } from '../../../components/collections/CollectionPickerDialog';

export function ComparisonDetailRoute() {
  const { t } = useTranslation('react-ui');
  const { actor } = useActor();
  const actorId = actor?.userId || 'loading';
  const { setId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
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
  const rename = useMutation({
    mutationFn: (nextName: string) => updateComparison(setId, { name: nextName }),
    onSuccess: updated => {
      queryClient.setQueryData(['comparison', actorId, setId], updated);
      void queryClient.invalidateQueries({ queryKey: ['comparisons', actorId] });
      setEditingName(false);
    }
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
  const faceReferenceEligible = run?.configurationSnapshot?.mode === 'headshot';
  const canShare = Boolean(
    run
    && ['completed', 'partially_completed'].includes(run.status)
    && run.slots.filter(slot => slot.status === 'completed' && slot.result?.imageUrl).length >= 2
  );
  return (
    <main className="comparison-detail-page">
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
        <div className="flex flex-wrap items-center gap-2">
          {editingName ? (
            <>
              <input
                className="h-10 min-w-0 flex-1 border border-cyan-400/55 bg-[var(--mpf-bg-raised)] px-3 text-lg text-white"
                value={name}
                maxLength={120}
                aria-label={t('ui.comparisons.renameTitle')}
                onChange={event => setName(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && name.trim()) rename.mutate(name.trim());
                  if (event.key === 'Escape') setEditingName(false);
                }}
                autoFocus
              />
              <Button
                size="icon"
                title={t('ui.action.save')}
                disabled={!name.trim() || rename.isPending}
                icon={<Check className="size-4" />}
                onClick={() => rename.mutate(name.trim())}
              />
              <Button
                size="icon"
                variant="ghost"
                title={t('ui.action.cancel')}
                icon={<X className="size-4" />}
                onClick={() => setEditingName(false)}
              />
            </>
          ) : (
            <>
              <h1 className="m-0 text-3xl">{comparison.data.name}</h1>
              <Button
                size="icon"
                variant="ghost"
                title={t('ui.comparisons.renameTitle')}
                icon={<Pencil className="size-4" />}
                onClick={() => {
                  setName(comparison.data.name);
                  setEditingName(true);
                }}
              />
            </>
          )}
        </div>
        <p className="mb-0 text-sm text-[var(--mpf-text-muted)]">{comparison.data.description}</p>
        {rename.isError ? <p role="alert" className="text-sm text-red-300">{rename.error.message}</p> : null}
      </header>
      {run ? (
        <ComparisonWorkspace
          mode="private"
          run={run}
          winnerJobId={comparison.data.winnerJobId}
          onWinnerChange={jobId => winner.mutate(jobId)}
          renderSlotActions={slot => slot.jobId ? (
            <>
              {faceReferenceEligible && slot.status === 'completed' && slot.result?.imageUrl ? (
                <FaceReferenceDestinationDialog
                  source={{ sourceType: 'generation', sourceId: slot.jobId }}
                  imageUrl={slot.result.imageUrl}
                />
              ) : null}
              <CollectionPickerDialog jobId={slot.jobId} />
            </>
          ) : null}
        />
      ) : <ErrorState title={t('ui.comparisons.noRuns')} />}
    </main>
  );
}
