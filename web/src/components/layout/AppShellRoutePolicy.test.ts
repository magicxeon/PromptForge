import { describe, expect, it } from 'vitest';
import { getAppShellRoutePolicy } from './AppShell';

describe('AppShell route policy', () => {
  it.each([
    '/create/cinematic',
    '/create/cinematic/new',
    '/create/cinematic/cineproj_1/setup',
    '/create/cinematic/cineproj_1/shot/shot_1'
  ])('hides only the global Create command and preserves the footer on %s', pathname => {
    expect(getAppShellRoutePolicy(pathname)).toEqual({ showCreate: false, showFooter: true });
  });

  it.each(['/create/playground', '/create/studio/scene', '/profiles/alice', '/'])('preserves the normal shell on %s', pathname => {
    expect(getAppShellRoutePolicy(pathname)).toEqual({ showCreate: true, showFooter: true });
  });
});
