import { ArrowDown, Download, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ComparisonWorkspace } from '../comparisons/ComparisonWorkspace';
import { Button } from '../ui/Button';
import { Surface } from '../ui/Surface';
import { apiMediaUrl } from '../../lib/api/apiClient';
import type { JobStatus } from '../../features/generation/schemas/generationSchemas';
import type { ComparisonSet } from '../../features/comparisons/schemas/comparisonSchemas';
import { CollectionPickerDialog } from '../collections/CollectionPickerDialog';
import { ShareGeneratedDialog } from '../community/ShareGeneratedDialog';

export function GenerationResultSurface({
  job,
  comparison,
  pending,
  onGoToPrompt,
  renderActions
}: {
  job?: JobStatus | null;
  comparison?: ComparisonSet | null;
  pending: boolean;
  onGoToPrompt: () => void;
  renderActions?: (job: JobStatus) => ReactNode;
}) {
  const { t } = useTranslation('playground');
  const run = comparison?.runs.at(-1);
  const visible = pending || job || run;
  if (!visible) return null;
  return (
    <section id="generation-results">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div><span className="text-xs font-bold uppercase text-cyan-300">{t('playground.result.kicker')}</span><h2 className="m-0 mt-1 text-xl">{comparison ? comparison.name : t('playground.result.title')}</h2></div>
        <Button variant="ghost" icon={<ArrowDown className="size-4" />} onClick={onGoToPrompt}>{t('playground.result.goToPrompt')}</Button>
      </header>
      {run ? (
        <>
          <ComparisonWorkspace mode="generation" run={run} winnerJobId={comparison?.winnerJobId} />
          {comparison?.id ? (
            <div className="mt-3 flex justify-end">
              <Link
                to={`/comparisons/${encodeURIComponent(comparison.id)}`}
                className="inline-flex min-h-10 items-center gap-2 border border-[var(--mpf-border)] px-4 text-sm font-semibold text-white no-underline"
              >
                <ImageIcon className="size-4" />
                {t('playground.result.openDetail')}
              </Link>
            </div>
          ) : null}
        </>
      ) : (
        <Surface className="overflow-hidden bg-black p-0">
          {job?.result?.imageUrl ? (
            <>
              <div className="grid min-h-[520px] place-items-center p-3"><img src={apiMediaUrl(job.result.imageUrl) || ''} alt="" className="max-h-[76vh] w-full object-contain" /></div>
              <div className="flex flex-wrap gap-2 border-t border-[var(--mpf-border)] bg-[var(--mpf-surface)] p-3">
                <a href={apiMediaUrl(job.result.imageUrl) || ''} download className="inline-flex min-h-10 items-center gap-2 border border-[var(--mpf-border)] px-4 text-sm font-semibold text-white no-underline"><Download className="size-4" />{t('playground.result.download')}</a>
                {job.jobId || job.id ? (
                  <>
                    <Link to={`/history/${encodeURIComponent(job.jobId || job.id || '')}`} className="inline-flex min-h-10 items-center gap-2 border border-[var(--mpf-border)] px-4 text-sm font-semibold text-white no-underline"><ImageIcon className="size-4" />{t('playground.result.openDetail')}</Link>
                    <CollectionPickerDialog jobId={job.jobId || job.id || ''} />
                    <ShareGeneratedDialog jobId={job.jobId || job.id || ''} />
                  </>
                ) : null}
                {renderActions?.(job)}
              </div>
            </>
          ) : (
            <div className="grid min-h-72 place-items-center p-6 text-center">
              <div><span className="mx-auto grid size-12 place-items-center border border-[var(--mpf-border)] text-cyan-300"><ImageIcon /></span><strong className="mt-4 block">{job?.status || t('playground.result.preparing')}</strong><p className="text-sm text-[var(--mpf-text-muted)]">{jobError(job) || t('playground.result.emptyDescription')}</p></div>
            </div>
          )}
        </Surface>
      )}
    </section>
  );
}

function jobError(job?: JobStatus | null) {
  if (!job?.error) return '';
  return typeof job.error === 'string' ? job.error : job.error.message || job.error.code || '';
}
