import { AlertTriangle, CheckCircle2, Clock3, Film, Image as ImageIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../../components/ui/Button';
import type { ProduceReadiness } from './produceReadModel';

export function ProduceReadinessHeader({
  readiness,
  onRecoverStoryboard,
  onReviewSequence
}: {
  readiness: ProduceReadiness;
  onRecoverStoryboard?: () => void;
  onReviewSequence: () => void;
}) {
  const { t } = useTranslation('cinematic');
  return (
    <section className="cinematic-produce-readiness" aria-labelledby="cinematic-produce-readiness-title">
      <div className="cinematic-produce-readiness__heading">
        <div>
          <span>{t('cinematic.produce.readinessEyebrow')}</span>
          <h3 id="cinematic-produce-readiness-title">{t('cinematic.produce.readinessTitle')}</h3>
        </div>
        <div className="cinematic-produce-readiness__actions">
          {readiness.firstBlockedShotId && onRecoverStoryboard ? (
            <Button variant="secondary" icon={<AlertTriangle aria-hidden="true" />} onClick={onRecoverStoryboard}>
              {t('cinematic.produce.fixStoryboard', { shot: readiness.firstBlockedShotId })}
            </Button>
          ) : null}
          <Button variant="secondary" icon={<Film aria-hidden="true" />} onClick={onReviewSequence}>
            {t('cinematic.produce.reviewSequence')}
          </Button>
        </div>
      </div>
      <dl className="cinematic-produce-readiness__metrics">
        <Metric icon={<ImageIcon />} label={t('cinematic.produce.storyboardsReady')} value={`${readiness.storyboardReady} / ${readiness.totalShots}`} />
        <Metric icon={<CheckCircle2 />} label={t('cinematic.produce.videosApproved')} value={`${readiness.videoApproved} / ${readiness.totalShots}`} />
        <Metric icon={<Film />} label={t('cinematic.produce.jobs')} value={t('cinematic.produce.jobCounts', { active: readiness.activeJobs, failed: readiness.failedJobs })} warning={readiness.failedJobs > 0} />
        <Metric icon={<Clock3 />} label={t('cinematic.produce.duration')} value={`${readiness.assembledDurationSeconds}s / ${readiness.plannedDurationSeconds}s`} />
      </dl>
    </section>
  );
}

function Metric({ icon, label, value, warning = false }: { icon: ReactNode; label: string; value: string; warning?: boolean }) {
  return <div className={warning ? 'is-warning' : undefined}><dt>{icon}<span>{label}</span></dt><dd>{value}</dd></div>;
}
