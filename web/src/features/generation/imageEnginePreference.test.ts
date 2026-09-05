import { beforeEach, describe, expect, it } from 'vitest';
import {
  readImageEnginePreference,
  writeImageEnginePreference
} from './imageEnginePreference';

describe('image engine preference', () => {
  beforeEach(() => localStorage.clear());

  it('stores only a normalized provider/model pair for the active actor', () => {
    writeImageEnginePreference('usr_alice', {
      provider: ' meta-muse ',
      model: ' muse-image-1.0 '
    });

    expect(readImageEnginePreference('usr_alice')).toEqual({
      provider: 'meta-muse',
      model: 'muse-image-1.0'
    });
    expect(readImageEnginePreference('usr_bob')).toBeNull();
  });

  it('does not persist an incomplete engine selection', () => {
    writeImageEnginePreference('usr_alice', { provider: 'meta-muse', model: '' });
    expect(readImageEnginePreference('usr_alice')).toBeNull();
  });
});

