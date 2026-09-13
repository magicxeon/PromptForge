import { useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle2, Image, Video } from 'lucide-react';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useActor } from '../../../lib/auth/ActorProvider';
import { showToast } from '../../../components/ui/toastStore';
import { useGenerationJobCenter } from './useGenerationJobCenter';
import type { GenerationJobCenterItem } from './generationJobCenterSchemas';

export function GenerationJobCenterIndicator() {
  const { t } = useTranslation('shell');
  const { actor } = useActor();
  const jobs = useGenerationJobCenter();
  const previousStatuses = useRef<Map<string, string> | null>(null);

  useEffect(() => {
    previousStatuses.current = null;
  }, [actor?.userId]);

  useEffect(() => {
    if (!jobs.data) return;
    const next = new Map(previousStatuses.current || []);
    if (previousStatuses.current) {
      for (const item of jobs.data.items) {
        const previous = previousStatuses.current.get(`${item.kind}:${item.id}`);
        if (!previous || previous === item.status || !item.terminal) continue;
        showToast({
          tone: item.status === 'completed' ? 'success' : item.status === 'reconciliation_required' ? 'warning' : 'error',
          title: t(jobCenterStatusKey(item.status)),
          description: item.mediaType === 'video'
            ? t('shell.jobCenter.video')
            : t('shell.jobCenter.image')
        });
      }
    }
    for (const item of jobs.data.items) {
      const key = `${item.kind}:${item.id}`;
      next.delete(key);
      next.set(key, item.status);
    }
    previousStatuses.current = new Map([...next].slice(-128));
  }, [jobs.data, t]);

  const activeCount = jobs.data?.activeCount || 0;
  const reviewRequired = (jobs.data?.reviewRequiredCount || 0) > 0
    || jobs.data?.items.some(item => item.status === 'reconciliation_required');
  const activityLabel = t(activeCount > 0 ? 'shell.jobCenter.processing' : reviewRequired ? 'shell.jobCenter.reviewRequired'
    : jobs.isError || !jobs.data ? 'shell.jobCenter.unknown' : 'shell.jobCenter.idle');
  return (
    <details className="generation-job-center">
      <summary className="generation-job-center__trigger" aria-label={t('shell.jobCenter.label')}
        aria-description={activityLabel} title={activityLabel}>
        {activeCount > 0
          ? <ProcessingSpinner className="generation-job-center__spinner" aria-hidden="true" />
          : reviewRequired || jobs.isError || !jobs.data ? <AlertCircle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
        <span role="status" title={activeCount > 0 ? t('shell.jobCenter.processing') : undefined}>
          {activeCount > 0 ? activeCount : t(reviewRequired ? 'shell.jobCenter.reviewRequired'
            : jobs.isError || !jobs.data ? 'shell.jobCenter.unknown' : 'shell.jobCenter.idle')}
        </span>
      </summary>
      <div className="generation-job-center__panel">
        <div className="generation-job-center__heading">
          <strong>{t('shell.jobCenter.label')}</strong>
        </div>
        {jobs.isError ? (
          <p className="generation-job-center__empty">{t('shell.jobCenter.unavailable')}</p>
        ) : null}
        {jobs.data?.items.length ? (
          <ul className="generation-job-center__list">
            {jobs.data.items.slice(0, 8).map(item => <JobItem key={`${item.kind}:${item.id}`} item={item} />)}
          </ul>
        ) : !jobs.isError ? (
          <p className="generation-job-center__empty">{t('shell.jobCenter.empty')}</p>
        ) : null}
        <Link className="generation-job-center__history" to="/library/recent">
          {t('shell.jobCenter.viewHistory')}
        </Link>
      </div>
    </details>
  );
}

function JobItem({ item }: { item: GenerationJobCenterItem }) {
  const { t } = useTranslation('shell');
  const Icon = item.mediaType === 'video' ? Video : Image;
  const destination = item.detailHref || item.resumeHref || '/library/recent';
  return (
    <li>
      <Link to={destination} className="generation-job-center__item">
        <Icon aria-hidden="true" />
        <span>
          <strong>{item.mediaType === 'video' ? t('shell.jobCenter.video') : t('shell.jobCenter.image')}</strong>
          <small>{item.progress
            ? t('shell.jobCenter.progress', { completed: item.progress.completed, total: item.progress.total })
            : t(jobCenterStatusKey(item.status))}</small>
        </span>
        {!item.terminal
          ? <ProcessingSpinner className="generation-job-center__spinner" aria-hidden="true" />
          : item.status === 'completed'
            ? <CheckCircle2 aria-hidden="true" />
            : <AlertCircle aria-hidden="true" />}
      </Link>
    </li>
  );
}

function jobCenterStatusKey(status: string) {
  if (status === 'completed') return 'shell.jobCenter.completed';
  if (status === 'reconciliation_required') return 'shell.jobCenter.reviewRequired';
  if (['failed', 'cancelled', 'expired'].includes(status)) {
    return 'shell.jobCenter.failed';
  }
  if (['accepted', 'provider_submitting', 'submitted'].includes(status)) {
    return 'shell.jobCenter.submitting';
  }
  if (['queued', 'provider_queued'].includes(status)) return 'shell.jobCenter.queued';
  return 'shell.jobCenter.processing';
}
