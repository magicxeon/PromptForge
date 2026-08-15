import { beforeEach, describe, expect, it } from 'vitest';
import {
  readPlaygroundUiPreferences,
  writePlaygroundUiPreferences
} from './playgroundUiPreferences';

describe('playground UI preferences', () => {
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
