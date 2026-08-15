import { describe, expect, it } from 'vitest';
import {
  comparisonNeedsPolling,
  comparisonRunStatus,
  newestComparisonRun
} from './comparisonRunState';
import type { ComparisonRun, ComparisonSet } from './schemas/comparisonSchemas';

function run(
  id: string,
  createdAt: number,
  statuses: string[]
): ComparisonRun {
  return {
    id,
    status: 'queued',
    sourcePrompt: '',
    estimatedTotalCredit: 0,
    actualTotalCredit: 0,
    createdAt,
    slots: statuses.map((status, index) => ({
      id: `slot_${index + 1}`,
      provider: 'provider',
      model: 'model',
      status,
      submittedPrompt: ''
    }))
  };
}

function comparison(runs: ComparisonRun[]): ComparisonSet {
  return {
    id: 'comparison_1',
    name: 'Comparison',
    description: '',
    createdAt: 1,
    updatedAt: 1,
    runs
  };
}

describe('comparisonRunState', () => {
  it('selects the newest run by creation time instead of array order', () => {
    const older = run('older', 100, ['completed', 'completed']);
    const newer = run('newer', 200, ['queued', 'queued']);

    expect(newestComparisonRun(comparison([older, newer]))?.id).toBe('newer');
    expect(newestComparisonRun(comparison([newer, older]))?.id).toBe('newer');
  });

  it('derives aggregate state from slots when persisted run status lags', () => {
    expect(comparisonRunStatus(run('run', 1, ['completed', 'completed'])))
      .toBe('completed');
    expect(comparisonRunStatus(run('run', 1, ['completed', 'failed'])))
      .toBe('partially_completed');
    expect(comparisonRunStatus(run('run', 1, ['completed', 'processing'])))
      .toBe('processing');
  });

  it('continues polling until a submitted set has a terminal run', () => {
    expect(comparisonNeedsPolling('comparison_1', undefined)).toBe(true);
    expect(comparisonNeedsPolling(
      'comparison_1',
      comparison([run('run', 1, ['queued', 'processing'])])
    )).toBe(true);
    expect(comparisonNeedsPolling(
      'comparison_1',
      comparison([run('run', 1, ['completed', 'completed'])])
    )).toBe(false);
  });
});
