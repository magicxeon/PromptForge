import type {
  ComparisonRun,
  ComparisonSet,
  ComparisonSlot
} from './schemas/comparisonSchemas';

const ACTIVE_STATUSES = new Set([
  'pending',
  'queued',
  'processing',
  'streaming',
  'generating',
  'running'
]);

const TERMINAL_STATUSES = new Set([
  'completed',
  'succeeded',
  'failed',
  'cancelled'
]);

export function newestComparisonRun(
  comparison?: Pick<ComparisonSet, 'runs'> | null
): ComparisonRun | undefined {
  return comparison?.runs.reduce<ComparisonRun | undefined>((newest, candidate) => {
    if (!newest) return candidate;
    return Number(candidate.createdAt || 0) > Number(newest.createdAt || 0)
      ? candidate
      : newest;
  }, undefined);
}

export function comparisonRunStatus(run?: ComparisonRun | null): string | null {
  if (!run) return null;
  if (!run.slots.length) return normalizeStatus(run.status);

  const statuses = run.slots.map(slot => normalizeStatus(slot.status));
  const terminal = statuses.every(status => TERMINAL_STATUSES.has(status));
  const completed = statuses.filter(status =>
    status === 'completed' || status === 'succeeded'
  ).length;

  if (terminal && completed === statuses.length) return 'completed';
  if (terminal && completed > 0) return 'partially_completed';
  if (terminal) return 'failed';
  if (statuses.some(status =>
    status === 'processing'
    || status === 'streaming'
    || status === 'generating'
    || status === 'running'
  )) {
    return 'processing';
  }
  return 'queued';
}

export function comparisonNeedsPolling(
  comparisonSetId?: string | null,
  comparison?: Pick<ComparisonSet, 'runs'> | null
): boolean {
  if (!comparisonSetId) return false;
  const run = newestComparisonRun(comparison);
  if (!run) return true;

  const derivedStatus = comparisonRunStatus(run);
  if (derivedStatus && ACTIVE_STATUSES.has(derivedStatus)) return true;
  return run.slots.some(slot => ACTIVE_STATUSES.has(normalizeStatus(slot.status)));
}

export function completedComparisonSlotCount(slots: ComparisonSlot[]): number {
  return slots.filter(slot => {
    const status = normalizeStatus(slot.status);
    return status === 'completed' || status === 'succeeded';
  }).length;
}

function normalizeStatus(status?: string | null) {
  return String(status || '').trim().toLowerCase();
}
