import { describe, expect, it } from 'vitest';
import { parseOperationalVideoTasks } from './cinematicOperationsApi';

describe('Cinematic operations API schema', () => {
  it('accepts Playground Video tasks without Cinematic project, scene or shot IDs', () => {
    const result = parseOperationalVideoTasks({ items: [{
      id: 'videotask_1', ownerUserId: 'usr_demo', ownerUsername: 'user_demo', status: 'completed',
      providerId: 'gemini', modelId: 'veo-3.1', providerTaskId: null,
      supportReference: 'support_1', updatedAt: '2026-08-25T00:00:00.000Z'
    }], nextCursor: null, hasMore: false });
    expect(result.items[0]?.id).toBe('videotask_1');
    expect(result.items[0]?.sceneId).toBeUndefined();
    expect(result.items[0]?.shotId).toBeUndefined();
  });
});
