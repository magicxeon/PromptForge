import { beforeEach, describe, expect, it } from 'vitest';
import {
  generationRoutePointerFeature,
  readGenerationRoutePointer,
  writeGenerationRoutePointer
} from './generationRoutePointer';

describe('generation route pointer', () => {
  beforeEach(() => localStorage.clear());

  it('keeps job identities scoped by actor and creation surface', () => {
    const studio = generationRoutePointerFeature('studio', 'scene');
    const playground = generationRoutePointerFeature('playground', 'playground');
    writeGenerationRoutePointer('usr_alice', studio, {
      jobId: 'job_alice',
      generationGroupId: null,
      comparisonSetId: null
    });
    writeGenerationRoutePointer('usr_alice', playground, {
      jobId: null,
      generationGroupId: 'group_alice',
      comparisonSetId: null
    });

    expect(readGenerationRoutePointer('usr_alice', studio).jobId).toBe('job_alice');
    expect(readGenerationRoutePointer('usr_alice', playground).generationGroupId).toBe('group_alice');
    expect(readGenerationRoutePointer('usr_bob', studio).jobId).toBeNull();
  });

  it('removes an empty pointer instead of retaining stale work', () => {
    const feature = generationRoutePointerFeature('studio', 'headshot');
    writeGenerationRoutePointer('usr_alice', feature, {
      jobId: 'job_1',
      generationGroupId: null,
      comparisonSetId: null
    });
    writeGenerationRoutePointer('usr_alice', feature, {
      jobId: null,
      generationGroupId: null,
      comparisonSetId: null
    });
    expect(readGenerationRoutePointer('usr_alice', feature).jobId).toBeNull();
  });
});

