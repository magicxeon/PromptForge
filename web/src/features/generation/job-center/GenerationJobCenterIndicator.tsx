import { useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle2, Image, LoaderCircle, Video } from 'lucide-react';
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
    const next = new Map(jobs.data.items.map(item => [item.id, item.status]));
    if (previousStatuses.current) {
      for (const item of jobs.data.items) {
        const previous = previousStatuses.current.get(item.id);
        if (!previous || previous === item.status || !item.terminal) continue;
        showToast({
          tone: item.status === 'completed' ? 'success' : 'error',
          title: item.status === 'completed'
            ? t('shell.jobCenter.completed')
            : t('shell.jobCenter.failed'),
          description: item.mediaType === 'video'
            ? t('shell.jobCenter.video')
            : t('shell.jobCenter.image')
        });
      }
    }
    previousStatuses.current = next;
  }, [jobs.data, t]);

  const activeCount = jobs.data?.activeCount || 0;
  return (
    <details className="generation-job-center">
      <summary className="generation-job-center__trigger" aria-label={t('shell.jobCenter.label')}>
        {activeCount > 0
          ? <LoaderCircle className="generation-job-center__spinner" aria-hidden="true" />
          : <CheckCircle2 aria-hidden="true" />}
        <span>{activeCount > 0 ? activeCount : t('shell.jobCenter.idle')}</span>
      </summary>
      <div className="generation-job-center__panel">
        <div className="generation-job-center__heading">
          <strong>{t('shell.jobCenter.label')}</strong>
          {jobs.isFetching ? <LoaderCircle className="generation-job-center__spinner" aria-hidden="true" /> : null}
        </div>
        {jobs.isError ? (
          <p className="generation-job-center__empty">{t('shell.jobCenter.unavailable')}</p>
        ) : jobs.data?.items.length ? (
          <ul className="generation-job-center__list">
            {jobs.data.items.slice(0, 8).map(item => <JobItem key={`${item.kind}:${item.id}`} item={item} />)}
          </ul>
        ) : (
          <p className="generation-job-center__empty">{t('shell.jobCenter.empty')}</p>
        )}
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
            : item.status}</small>
        </span>
        {!item.terminal
          ? <LoaderCircle className="generation-job-center__spinner" aria-hidden="true" />
          : item.status === 'completed'
            ? <CheckCircle2 aria-hidden="true" />
            : <AlertCircle aria-hidden="true" />}
      </Link>
    </li>
  );
}

