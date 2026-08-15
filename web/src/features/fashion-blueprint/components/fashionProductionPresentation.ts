import type {
  GenerationResultGridItem
} from '../../../components/generation/GenerationResultGrid';
import type {
  GenerationViewerItem
} from '../../../components/media/GenerationImageViewer';
import { isCompletedJobStatus } from '../../../lib/api/jobLifecycle';
import type { FashionRun } from '../schemas/fashionSchemas';

export function toFashionResultItems(run: FashionRun): GenerationResultGridItem[] {
  return run.operations.map(operation => ({
    id: operation.jobId,
    imageUrl: operation.result?.imageUrl,
    status: operation.status,
    error: operation.error,
    label: operation.productName || operation.productItemKey
  }));
}

export function toFashionViewerItems(run: FashionRun): GenerationViewerItem[] {
  return run.operations.flatMap(operation => (
    isCompletedJobStatus(operation.status) && operation.result?.imageUrl
      ? [{
          id: operation.jobId,
          imageUrl: operation.result.imageUrl,
          title: operation.productName || operation.productItemKey,
          generationMode: 'fashion'
        }]
      : []));
}

export function focusFashionProduction(
  section: HTMLElement,
  reducedMotion: boolean
) {
  section.scrollIntoView({
    behavior: reducedMotion ? 'auto' : 'smooth',
    block: 'start'
  });
  section.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
}
