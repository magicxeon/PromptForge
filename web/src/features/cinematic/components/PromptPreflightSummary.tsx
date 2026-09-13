import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { getCinematicPromptPreflight } from '../api/cinematicApi';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { RotateCcw } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export function PromptPreflightSummary({ projectId, version }: { projectId: string; version: number }) {
  const { t } = useTranslation('cinematic');
  const result = useQuery({ queryKey: ['cinematic-prompt-preflight', getActiveActorId(), projectId, version],
    queryFn: () => getCinematicPromptPreflight(projectId), staleTime: 20_000, gcTime: 60_000, retry: false });
  if (result.isLoading) return <p role="status" className="flex items-center gap-2 text-sm"><ProcessingSpinner className="size-4" />{t('cinematic.promptPreflight.checking')}</p>;
  if (result.error) return <div className="flex items-center gap-2"><p role="status">{t('cinematic.promptPreflight.unavailable')}</p>
    <Button size="icon" variant="ghost" title={t('cinematic.series.retry')} aria-label={t('cinematic.series.retry')}
      onClick={() => void result.refetch()}><RotateCcw className="size-4" /></Button></div>;
  const warnings = result.data?.items.filter(item => item.errorCode || item.promptBudget?.status === 'above_recommendation') || [];
  if (!warnings.length && !result.data?.hasMore) return null;
  return <details className="cinematic-simple-options"><summary>{t('cinematic.promptPreflight.summary', { count: warnings.length })}</summary>
    <p>{t('cinematic.promptPreflight.provisional')}</p>
    <ul>{warnings.map(item => <li key={item.shotId}>{item.title}: {item.promptBudget?.characters ?? t('cinematic.promptPreflight.unavailable')}</li>)}</ul>
    {result.data?.hasMore ? <p>{t('cinematic.promptPreflight.partial')}</p> : null}
  </details>;
}
