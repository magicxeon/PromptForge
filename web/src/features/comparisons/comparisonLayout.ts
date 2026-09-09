import type { ComparisonRun } from './schemas/comparisonSchemas';

export type ComparisonLayout = 'auto' | 'side_by_side' | 'stacked';
export type ResolvedComparisonLayout = Exclude<ComparisonLayout, 'auto'>;
export const COMPARISON_LAYOUT_POLICY_VERSION = 1;

export function comparisonAspectRatio(value?: string | null): number | null {
  const match = value?.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const ratio = Number(match[1]) / Number(match[2]);
  return Number.isFinite(ratio) && ratio > 0 ? ratio : null;
}

export function resolveComparisonLayout(
  run: ComparisonRun,
  requested: ComparisonLayout = 'auto'
): ResolvedComparisonLayout {
  if (run.mediaType === 'video') return 'side_by_side';
  if (requested !== 'auto') return requested;
  const fallback = comparisonAspectRatio(run.configurationSnapshot?.aspectRatio);
  // Do not rearrange the inspection grid every time a single slot completes.
  if (!['completed', 'partial', 'partially_completed', 'failed', 'cancelled'].includes(run.status)) {
    return fallback && fallback > 1 ? 'stacked' : 'side_by_side';
  }
  const images = run.slots.filter(slot => slot.result?.imageUrl);
  return images.length > 0 && images.every(slot => {
    const { width, height } = slot.result || {};
    const ratio = width && height && Number.isFinite(width) && Number.isFinite(height)
      && width > 0 && height > 0 ? width / height : fallback;
    return ratio !== null && ratio > 1;
  }) ? 'stacked' : 'side_by_side';
}
