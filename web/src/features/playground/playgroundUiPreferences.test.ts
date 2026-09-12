import { beforeEach, describe, expect, it } from 'vitest';
import {
  readPlaygroundUiPreferences,
  writePlaygroundUiPreferences
} from './playgroundUiPreferences';

describe('playground UI preferences', () => {
  it('remembers media per actor and preserves it when Recent Renders changes', () => {
    writePlaygroundUiPreferences('usr_alice', { recentExpanded: true, mediaMode: 'video' });
    writePlaygroundUiPreferences('usr_alice', { recentExpanded: false });
    expect(readPlaygroundUiPreferences('usr_alice').mediaMode).toBe('video');
    expect(readPlaygroundUiPreferences('usr_bob').mediaMode).toBe('image');
  });
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults Recent Renders open and isolates the preference by actor', () => {
    expect(readPlaygroundUiPreferences('usr_alice').recentExpanded).toBe(true);
    writePlaygroundUiPreferences('usr_alice', { recentExpanded: false });

    expect(readPlaygroundUiPreferences('usr_alice').recentExpanded).toBe(false);
    expect(readPlaygroundUiPreferences('usr_bob').recentExpanded).toBe(true);
  });
});
