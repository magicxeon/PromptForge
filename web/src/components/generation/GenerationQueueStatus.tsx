import { CircleCheck, CircleX, Clock3, LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Surface } from '../ui/Surface';
import {
  ACTIVE_JOB_STATUSES,
  COMPLETE_JOB_STATUSES,
  FAILED_JOB_STATUSES,
  normalizeJobStatus
} from '../../lib/api/jobLifecycle';

type GenerationQueueStatusProps = {
  jobId?: string | null;
  jobStatus?: string | null;
  comparisonSetId?: string | null;
  comparisonStatus?: string | null;
  comparisonItems?: GenerationProcessQueueItem[];
  submitting?: boolean;
};

export type GenerationProcessQueueItem = {
  slotId: string;
  providerLabel: string;
  modelLabel: string;
  jobId?: string | null;
  status: string;
};

export function GenerationQueueStatus({
  jobId = null,
  jobStatus = null,
  comparisonSetId = null,
  comparisonStatus = null,
  comparisonItems = [],
  submitting = false
}: GenerationQueueStatusProps) {
  const { t } = useTranslation('playground');
  const hasQueue = Boolean(
    jobId
    || jobStatus
    || comparisonSetId
    || comparisonStatus
    || comparisonItems.length
    || submitting
  );
  if (!hasQueue) return null;
  const isComparison = Boolean(comparisonSetId || comparisonStatus || comparisonItems.length);
  const rawStatus = (isComparison ? comparisonStatus : jobStatus)
    || (submitting ? 'submitting' : 'idle');
  const status = normalizeJobStatus(rawStatus);
  const active = ACTIVE_JOB_STATUSES.has(status);
  const completed = COMPLETE_JOB_STATUSES.has(status);
  const failed = FAILED_JOB_STATUSES.has(status);
  const href = isComparison && comparisonSetId
    ? `/comparisons/${encodeURIComponent(comparisonSetId)}`
    : jobId
      ? `/history/${encodeURIComponent(jobId)}`
      : null;
  const completedItems = comparisonItems.filter(item =>
    COMPLETE_JOB_STATUSES.has(normalizeJobStatus(item.status))
  ).length;

  return (
    <Surface
      className={`generation-queue-status is-${status}${comparisonItems.length ? ' has-items' : ''}`}
      role={active ? 'status' : undefined}
      aria-live={active ? 'polite' : undefined}
      aria-busy={active}
    >
      <div className="generation-queue-status__icon" aria-hidden="true">
        {active ? <LoaderCircle className="animate-spin" /> : failed ? <CircleX /> : completed ? <CircleCheck /> : <Clock3 />}
      </div>
      <div className="generation-queue-status__copy">
        <strong>{isComparison
          ? t('playground.queue.comparison')
          : t('playground.queue.current')}</strong>
        <small>{comparisonItems.length
          ? t('playground.queue.progress', {
              completed: completedItems,
              total: comparisonItems.length
            })
          : t(queueStatusKey(status))}</small>
      </div>
      {href ? (
        <Link to={href}>{isComparison
          ? t('playground.result.openComparison')
          : t('playground.queue.openJob')}</Link>
      ) : null}
      {comparisonItems.length ? (
        <div className="generation-process-queue" aria-label={t('playground.queue.processList')}>
          {comparisonItems.map(item => {
            const itemStatus = normalizeJobStatus(item.status);
            return (
              <div
                key={item.slotId}
                className={`generation-process-queue__row is-${itemStatus}`}
              >
                <span className="generation-process-queue__state" aria-hidden="true">
                  {queueStatusIcon(itemStatus)}
                </span>
                <span className="generation-process-queue__model">
                  <small>{item.providerLabel}</small>
                  <strong>{item.modelLabel}</strong>
                </span>
                <span className="generation-process-queue__status">
                  {t(queueStatusKey(itemStatus))}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </Surface>
  );
}

function queueStatusKey(status: string) {
  if (status === 'submitting') return 'playground.queue.statusSubmitting';
  if (ACTIVE_JOB_STATUSES.has(status)) {
    return status === 'queued' || status === 'pending'
      ? 'playground.queue.statusQueued'
      : 'playground.queue.statusProcessing';
  }
  if (COMPLETE_JOB_STATUSES.has(status)) return 'playground.queue.statusCompleted';
  if (FAILED_JOB_STATUSES.has(status)) return 'playground.queue.statusFailed';
  return 'playground.queue.statusIdle';
}

function queueStatusIcon(status: string) {
  if (ACTIVE_JOB_STATUSES.has(status)) return <LoaderCircle className="animate-spin" />;
  if (FAILED_JOB_STATUSES.has(status)) return <CircleX />;
  if (COMPLETE_JOB_STATUSES.has(status)) return <CircleCheck />;
  return <Clock3 />;
}
