import { beforeEach, describe, expect, it } from 'vitest';
import {
  readStoryboardBatchEnginePreference,
  writeStoryboardBatchEnginePreference
} from './storyboardBatchPreferences';

describe('Storyboard batch engine preference', () => {
  beforeEach(() => localStorage.clear());

  it('restores the latest provider and model only for the owning actor', () => {
    writeStoryboardBatchEnginePreference('usr_alice', {
      provider: 'meta-muse',
      model: 'muse-image-1.0'
    });

    expect(readStoryboardBatchEnginePreference('usr_alice')).toEqual({
      provider: 'meta-muse',
      model: 'muse-image-1.0'
    });
    expect(readStoryboardBatchEnginePreference('usr_bob')).toBeNull();
  });
});
