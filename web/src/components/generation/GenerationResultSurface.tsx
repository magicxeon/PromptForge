import { ArrowDown, Download, Image as ImageIcon, LoaderCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ComparisonWorkspace } from '../comparisons/ComparisonWorkspace';
import { Button } from '../ui/Button';
import { Surface } from '../ui/Surface';
import { apiMediaUrl } from '../../lib/api/apiClient';
import type { JobStatus } from '../../features/generation/schemas/generationSchemas';
import type { ComparisonSet } from '../../features/comparisons/schemas/comparisonSchemas';
import { CollectionPickerDialog } from '../collections/CollectionPickerDialog';
import { ShareGeneratedDialog } from '../community/ShareGeneratedDialog';
import {
  GenerationImageViewer,
  type GenerationViewerItem
} from '../media/GenerationImageViewer';

export function GenerationResultSurface({
  job,
  comparison,
  pending,
  onGoToPrompt,
  renderActions,
  showEmpty = false,
  showGoToPrompt = true,
  canRevealPrompt = false,
  viewerContext
}: {
  job?: JobStatus | null;
  comparison?: ComparisonSet | null;
  pending: boolean;
  onGoToPrompt: () => void;
  renderActions?: (job: JobStatus) => ReactNode;
  showEmpty?: boolean;
  showGoToPrompt?: boolean;
  canRevealPrompt?: boolean;
  viewerContext?: {
    prompt?: string;
    provider?: string;
    model?: string;
    estimatedCredit?: number;
    parentImages?: GenerationViewerItem['parentImages'];
  };
}) {
  const { t } = useTranslation('playground');
  const [viewerOpen, setViewerOpen] = useState(false);
  const run = comparison?.runs.at(-1);
  const loading = pending || isActiveGenerationStatus(job?.status);
  const visible = pending || job || run;
  if (!visible && !showEmpty) return null;
  return (
    <section id="generation-results">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div><span className="text-xs font-bold uppercase text-cyan-300">{t('playground.result.kicker')}</span><h2 className="m-0 mt-1 text-xl">{comparison ? comparison.name : t('playground.result.title')}</h2></div>
        {showGoToPrompt ? (
          <Button variant="ghost" icon={<ArrowDown className="size-4" />} onClick={onGoToPrompt}>{t('playground.result.goToPrompt')}</Button>
        ) : null}
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
              <button
                type="button"
                className="generation-result__open"
                title={t('playground.result.openImage')}
                onClick={() => setViewerOpen(true)}
              >
                <img
                  src={apiMediaUrl(job.result.imageUrl) || ''}
                  alt={t('playground.result.imageAlt')}
                />
              </button>
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
              <GenerationImageViewer
                items={[toViewerItem(job, viewerContext)]}
                activeId={job.jobId || job.id || null}
                open={viewerOpen}
                canRevealPrompt={canRevealPrompt}
                onOpenChange={setViewerOpen}
                onActiveIdChange={() => {}}
                renderActions={() => (
                  <>
                    <ShareGeneratedDialog jobId={job.jobId || job.id || ''} />
                    {renderActions?.(job)}
                  </>
                )}
              />
            </>
          ) : (
            <div
              className="grid min-h-72 place-items-center p-6 text-center"
              role={loading ? 'status' : undefined}
              aria-live={loading ? 'polite' : undefined}
              aria-busy={loading}
            >
              <div>
                {loading ? (
                  <span className="relative mx-auto grid size-16 place-items-center text-amber-300">
                    <span
                      className="absolute inset-1 animate-ping rounded-full border border-amber-300/35"
                      aria-hidden="true"
                    />
                    <span
                      className="absolute inset-0 rounded-full border border-amber-300/15 shadow-[0_0_32px_rgb(251_191_36_/_0.3)]"
                      aria-hidden="true"
                    />
                    <LoaderCircle className="size-10 animate-spin" aria-hidden="true" />
                  </span>
                ) : (
                  <span className="mx-auto grid size-12 place-items-center border border-[var(--mpf-border)] text-cyan-300">
                    <ImageIcon aria-hidden="true" />
                  </span>
                )}
                <strong className="mt-4 block">
                  {loading
                    ? t(generationStatusKey(job?.status))
                    : job?.status || t('playground.result.preparing')}
                </strong>
                <p className="text-sm text-[var(--mpf-text-muted)]">
                  {jobError(job) || (loading
                    ? t('playground.result.preparing')
                    : t('playground.result.emptyDescription'))}
                </p>
              </div>
            </div>
          )}
        </Surface>
      )}
    </section>
  );
}

function toViewerItem(
  job: JobStatus,
  context?: {
    prompt?: string;
    provider?: string;
    model?: string;
    estimatedCredit?: number;
    parentImages?: GenerationViewerItem['parentImages'];
  }
): GenerationViewerItem {
  const record = job as JobStatus & Record<string, unknown>;
  const result = (job.result || {}) as Record<string, unknown>;
  return {
    id: job.jobId || job.id || '',
    imageUrl: typeof job.result?.imageUrl === 'string' ? job.result.imageUrl : '',
    title: typeof record.title === 'string' ? record.title : undefined,
    prompt: context?.prompt,
    provider: context?.provider,
    model: context?.model,
    timestamp: typeof record.timestamp === 'number'
      ? record.timestamp
      : typeof record.completedAt === 'number'
        ? record.completedAt
        : Date.now(),
    generationDuration: job.result?.generationDuration,
    width: typeof result.width === 'number' ? result.width : undefined,
    height: typeof result.height === 'number' ? result.height : undefined,
    creditCost: context?.estimatedCredit,
    parentImages: context?.parentImages
  };
}

function jobError(job?: JobStatus | null) {
  if (!job?.error) return '';
  return typeof job.error === 'string' ? job.error : job.error.message || job.error.code || '';
}

function isActiveGenerationStatus(status?: string) {
  return ['queued', 'pending', 'processing', 'streaming', 'generating', 'running']
    .includes((status || '').toLowerCase());
}

function generationStatusKey(status?: string) {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'queued' || normalized === 'pending') {
    return 'playground.result.queued' as const;
  }
  return 'playground.result.generating' as const;
}
