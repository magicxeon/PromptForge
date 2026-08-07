import { beforeEach, describe, expect, it } from 'vitest';
import {
  readPromptRefinementPreference,
  writePromptRefinementPreference
} from './promptRefinementPreference';

describe('prompt refinement preference', () => {
  beforeEach(() => localStorage.clear());

  it('defaults off and remains isolated by actor', () => {
    writePromptRefinementPreference('usr_alice', true);
    expect(readPromptRefinementPreference('usr_alice')).toBe(true);
    expect(readPromptRefinementPreference('usr_bob')).toBe(false);
  });
});
