import { beforeEach, describe, expect, it } from 'vitest';
import {
  readStoryboardEnginePreference,
  writeStoryboardEnginePreference
} from './storyboardEnginePreference';

describe('Storyboard engine preference', () => {
  beforeEach(() => localStorage.clear());

  it('restores the latest provider and model only for the owning actor', () => {
    writeStoryboardEnginePreference('usr_alice', {
      provider: 'meta-muse',
      model: 'muse-image-1.0'
    });

    expect(readStoryboardEnginePreference('usr_alice')).toEqual({
      provider: 'meta-muse',
      model: 'muse-image-1.0'
    });
    expect(readStoryboardEnginePreference('usr_bob')).toBeNull();
  });
});
