import {
  ArrowDown,
  Check,
  Download,
  Image as ImageIcon,
  LoaderCircle,
  Pencil,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, type FormEvent, type ReactNode } from 'react';
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
import momeloMark from '../../assets/brand/momelo-mark.svg';
import { newestComparisonRun } from '../../features/comparisons/comparisonRunState';

export function GenerationResultSurface({
  job,
  comparison,
  pending,
  onGoToPrompt,
  renderActions,
  showEmpty = false,
  showGoToPrompt = true,
  comparisonActive = false,
  canRevealPrompt = false,
  viewerContext,
  onRenameComparison,
  comparisonRenamePending = false,
  comparisonRenameError = null
}: {
  job?: JobStatus | null;
  comparison?: ComparisonSet | null;
  pending: boolean;
  onGoToPrompt: () => void;
  renderActions?: (job: JobStatus) => ReactNode;
  showEmpty?: boolean;
  showGoToPrompt?: boolean;
  comparisonActive?: boolean;
  canRevealPrompt?: boolean;
  onRenameComparison?: (name: string) => Promise<unknown>;
  comparisonRenamePending?: boolean;
  comparisonRenameError?: string | null;
  viewerContext?: {
    prompt?: string;
    provider?: string;
    model?: string;
    estimatedCredit?: number;
    parentImages?: GenerationViewerItem['parentImages'];
  };
}) {
  const { t } = useTranslation('playground');
  const { t: tUi } = useTranslation('react-ui');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [editingComparisonName, setEditingComparisonName] = useState(false);
  const [comparisonNameDraft, setComparisonNameDraft] = useState(comparison?.name || '');
  const run = newestComparisonRun(comparison);
  const loading = pending || isActiveGenerationStatus(job?.status);
  const visible = pending || job || run || comparisonActive;
  if (!visible && !showEmpty) return null;

  async function saveComparisonName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = comparisonNameDraft.trim();
    if (!nextName || nextName === comparison?.name) {
      setEditingComparisonName(false);
      return;
    }
    try {
      await onRenameComparison?.(nextName);
      setEditingComparisonName(false);
    } catch {
      // The owning mutation exposes its sanitized error beside the editor.
    }
  }

  return (
    <section id="generation-results">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs font-bold uppercase text-cyan-300">{t('playground.result.kicker')}</span>
          {editingComparisonName ? (
            <form className="mt-1 flex flex-wrap items-center gap-2" onSubmit={saveComparisonName}>
              <input
                autoFocus
                aria-label={tUi('ui.comparisons.renameTitle')}
                className="h-10 min-w-56 rounded-[var(--mpf-radius-sm)] border border-cyan-400/50 bg-black/45 px-3 text-base font-semibold text-white outline-none focus:border-cyan-300"
                maxLength={120}
                value={comparisonNameDraft}
                onChange={event => setComparisonNameDraft(event.target.value)}
              />
              <Button
                type="submit"
                size="icon"
                title={tUi('ui.action.save')}
                aria-label={tUi('ui.action.save')}
                disabled={comparisonRenamePending || !comparisonNameDraft.trim()}
                icon={comparisonRenamePending
                  ? <LoaderCircle className="size-4 animate-spin" />
                  : <Check className="size-4" />}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                title={tUi('ui.action.cancel')}
                aria-label={tUi('ui.action.cancel')}
                disabled={comparisonRenamePending}
                icon={<X className="size-4" />}
                onClick={() => {
                  setComparisonNameDraft(comparison?.name || '');
                  setEditingComparisonName(false);
                }}
              />
            </form>
          ) : (
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <h2 className="m-0 truncate text-xl">{comparison?.name || (comparisonActive ? t('playground.result.comparisonTitle') : t('playground.result.title'))}</h2>
              {comparison?.id && onRenameComparison ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-9 min-h-9 shrink-0"
                  title={tUi('ui.comparisons.renameTitle')}
                  aria-label={tUi('ui.comparisons.renameTitle')}
                  icon={<Pencil className="size-4" />}
                  onClick={() => {
                    setComparisonNameDraft(comparison.name);
                    setEditingComparisonName(true);
                  }}
                />
              ) : null}
            </div>
          )}
          {comparisonRenameError ? (
            <p role="alert" className="mb-0 mt-1 text-xs text-red-300">{comparisonRenameError}</p>
          ) : null}
        </div>
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
                {t('playground.result.openComparison')}
              </Link>
            </div>
          ) : null}
        </>
      ) : comparisonActive ? (
        <Surface className="comparison-result-stage__empty">
          {loading ? (
            <LoaderCircle className="size-10 animate-spin text-amber-300" aria-hidden="true" />
          ) : (
            <img
              className="generation-result__momelo-mark"
              src={momeloMark}
              alt=""
              aria-hidden="true"
            />
          )}
          <strong>{loading
            ? t('playground.result.generatingComparison')
            : t('playground.result.comparisonReady')}</strong>
          <p>{loading
            ? t('playground.result.comparisonProcessing')
            : t('playground.result.comparisonEmptyDescription')}</p>
        </Surface>
      ) : (
        <Surface className="generation-result__media-surface overflow-hidden bg-black p-0">
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
              <div className="generation-result__action-bar">
                <div className="generation-result__utility-actions">
                  <a
                    href={apiMediaUrl(job.result.imageUrl) || ''}
                    download
                    className="generation-result__action"
                  >
                    <Download aria-hidden="true" />
                    {t('playground.result.download')}
                  </a>
                  {job.jobId || job.id ? (
                    <>
                      <Link
                        to={`/history/${encodeURIComponent(job.jobId || job.id || '')}`}
                        className="generation-result__action"
                      >
                        <ImageIcon aria-hidden="true" />
                        {t('playground.result.openDetail')}
                      </Link>
                      <CollectionPickerDialog jobId={job.jobId || job.id || ''} />
                      <ShareGeneratedDialog jobId={job.jobId || job.id || ''} />
                    </>
                  ) : null}
                </div>
                <div className="generation-result__workflow-actions">
                  {renderActions?.(job)}
                </div>
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
                  <img
                    className="generation-result__momelo-mark"
                    src={momeloMark}
                    alt=""
                    aria-hidden="true"
                  />
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
