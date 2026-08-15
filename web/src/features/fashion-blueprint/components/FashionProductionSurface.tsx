import { Download } from 'lucide-react';
import {
  forwardRef,
  useMemo,
  useState
} from 'react';
import { useTranslation } from 'react-i18next';
import { CollectionPickerDialog } from '../../../components/collections/CollectionPickerDialog';
import { ShareGeneratedDialog } from '../../../components/community/ShareGeneratedDialog';
import {
  GenerationQueueStatus,
  type GenerationProcessQueueItem
} from '../../../components/generation/GenerationQueueStatus';
import {
  GenerationResultGrid,
  type GenerationResultGridItem
} from '../../../components/generation/GenerationResultGrid';
import { GenerationStageState } from '../../../components/generation/GenerationStageState';
import {
  GenerationImageViewer
} from '../../../components/media/GenerationImageViewer';
import { apiMediaUrl } from '../../../lib/api/apiClient';
import {
  isActiveJobStatus,
  isCompletedJobStatus,
  isFailedJobStatus
} from '../../../lib/api/jobLifecycle';
import type { FashionRun } from '../schemas/fashionSchemas';
import {
  toFashionResultItems,
  toFashionViewerItems
} from './fashionProductionPresentation';

export const FashionProductionSurface = forwardRef<HTMLElement, {
  run: FashionRun;
}>(function FashionProductionSurface({ run }, ref) {
  const { t } = useTranslation('fashion-blueprint');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeViewerId, setActiveViewerId] = useState<string | null>(null);
  const completedCount = run.operations.filter(operation => isCompletedJobStatus(operation.status)).length;
  const failedCount = run.operations.filter(operation => isFailedJobStatus(operation.status)).length;
  const active = isActiveJobStatus(run.status);
  const resultItems = useMemo(
    () => toFashionResultItems(run),
    [run]
  );
  const viewerItems = useMemo(
    () => toFashionViewerItems(run),
    [run]
  );
  const queueItems = useMemo<GenerationProcessQueueItem[]>(
    () => run.operations.map(operation => ({
      slotId: operation.operationId,
      providerLabel: '',
      modelLabel: operation.productName || operation.productItemKey,
      jobId: operation.jobId,
      status: operation.status
    })),
    [run.operations]
  );

  const openViewer = (id: string) => {
    if (!viewerItems.some(item => item.id === id)) return;
    setActiveViewerId(id);
    setViewerOpen(true);
  };

  return (
    <section
      ref={ref}
      className="fashion-production mt-5 border border-[var(--mpf-border)] bg-[var(--theme-bg-raised)] p-4"
      aria-live="polite"
      aria-busy={active}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="m-0 text-lg" tabIndex={-1}>{t('fashion.run.title')}</h2>
        <GenerationQueueStatus
          groupId={run.id}
          groupStatus={run.status}
          groupCompletedCount={completedCount}
          groupFailedCount={failedCount}
          groupTotalCount={run.operations.length}
          comparisonItems={queueItems}
        />
      </div>

      {run.operations.length === 0 ? (
        <GenerationStageState
          className="fashion-production__empty"
          loading={active}
          title={active
            ? t('fashion.run.preparingTitle')
            : t('fashion.run.emptyTitle')}
          description={active
            ? t('fashion.run.preparingDescription')
            : t('fashion.run.emptyDescription')}
        />
      ) : (
        <GenerationResultGrid
          items={resultItems}
          onOpen={openViewer}
          renderFooter={item => (
            <FashionResultActions item={item} />
          )}
        />
      )}

      <GenerationImageViewer
        items={viewerItems}
        activeId={activeViewerId}
        open={viewerOpen}
        canRevealPrompt={false}
        onOpenChange={setViewerOpen}
        onActiveIdChange={setActiveViewerId}
        renderActions={item => <ShareGeneratedDialog jobId={item.id} />}
      />
    </section>
  );
});

function FashionResultActions({ item }: { item: GenerationResultGridItem }) {
  const { t } = useTranslation('fashion-blueprint');
  return (
    <>
      <strong className="mb-2 block truncate text-sm" title={item.label}>
        {item.label}
      </strong>
      {item.status === 'completed' && item.imageUrl ? (
        <div className="flex flex-wrap gap-2">
          <a
            href={apiMediaUrl(item.imageUrl) || ''}
            download
            className="inline-flex min-h-9 items-center justify-center gap-2 border border-[var(--mpf-border-strong)] px-3 text-xs font-semibold text-[var(--mpf-text)] no-underline"
          >
            <Download className="size-4" aria-hidden="true" />
            {t('fashion.action.download')}
          </a>
          <CollectionPickerDialog jobId={item.id} />
          <ShareGeneratedDialog jobId={item.id} />
        </div>
      ) : null}
    </>
  );
}
