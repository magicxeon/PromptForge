import { beforeEach, describe, expect, it } from 'vitest';
import {
  resolveRouteTheme,
  resolveTheme
} from './themeContract';
import {
  readThemePreference,
  writeThemePreference
} from './themePreference';

describe('theme preference', () => {
  beforeEach(() => localStorage.clear());

  it('persists independently for each actor', () => {
    writeThemePreference('usr_alice', 'fashion');
    writeThemePreference('usr_bob', 'creative');

    expect(readThemePreference('usr_alice')).toBe('fashion');
    expect(readThemePreference('usr_bob')).toBe('creative');
    expect(readThemePreference('usr_demo')).toBe('auto');
  });

  it('keeps auto actor-wide across routes and preserves explicit choices', () => {
    expect(resolveTheme('auto', resolveRouteTheme('/create/fashion'))).toBe('default');
    expect(resolveTheme('auto', resolveRouteTheme('/playground'))).toBe('default');
    expect(resolveTheme('auto', resolveRouteTheme('/community'))).toBe('default');
    expect(resolveTheme('fashion', resolveRouteTheme('/playground'))).toBe('fashion');
  });

  it('falls back safely when a stored payload is malformed', () => {
    localStorage.setItem(
      'mpf.react.draft:ui-theme-preference:usr_alice',
      JSON.stringify({
        schemaVersion: 1,
        actorId: 'usr_alice',
        feature: 'ui-theme-preference',
        updatedAt: new Date().toISOString(),
        payload: null
      })
    );

    expect(readThemePreference('usr_alice')).toBe('auto');
  });
});
