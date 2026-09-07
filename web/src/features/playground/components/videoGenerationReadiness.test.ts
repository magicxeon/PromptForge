import { describe, expect, it } from 'vitest';
import { getVideoGenerationReadiness } from './videoGenerationReadiness';

const ready = {
  submitting: false,
  hasActiveTask: false,
  hasPrompt: true,
  sourceReady: true,
  modelCanQuote: true,
  quoteFetching: false,
  quoteFailed: false,
  quoteAvailable: true,
  canAfford: true
};

describe('video generation readiness', () => {
  it('enables only a fully quoted request', () => {
    expect(getVideoGenerationReadiness(ready)).toEqual({ ready: true, reason: null });
  });

  it.each([
    ['prompt_required', { hasPrompt: false }],
    ['source_required', { sourceReady: false }],
    ['quote_loading', { quoteFetching: true, quoteAvailable: false }],
    ['quote_failed', { quoteFailed: true, quoteAvailable: false }],
    ['insufficient_credits', { canAfford: false }],
    ['active_task', { hasActiveTask: true }]
  ] as const)('reports %s instead of an ambiguous estimate message', (reason, patch) => {
    expect(getVideoGenerationReadiness({ ...ready, ...patch }).reason).toBe(reason);
  });
});
