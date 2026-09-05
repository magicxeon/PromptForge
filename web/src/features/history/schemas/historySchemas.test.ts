import { describe, expect, it } from 'vitest';
import { historyItemSchema } from './historySchemas';

describe('History comparison lineage schema', () => {
  it('preserves the parent Comparison identifiers used by Library recovery actions', () => {
    const item = historyItemSchema.parse({
      id: 'job_1',
      prompt: 'test',
      imageUrl: '/outputs/job_1.png',
      timestamp: 100,
      provider: 'meta',
      submodel: 'muse-image-1.0',
      comparisonSetId: 'comparison_1',
      comparisonRunId: 'run_1',
      comparisonSlotId: 'slot_1'
    });

    expect(item).toMatchObject({
      comparisonSetId: 'comparison_1',
      comparisonRunId: 'run_1',
      comparisonSlotId: 'slot_1'
    });
  });
});
