import { describe, expect, it } from 'vitest';
import type { CinematicAuthoringManifest } from '../../schemas/cinematicSchemas';
import { isCinematicFieldVisible } from './cinematicFieldProjection';

describe('Cinematic field projection', () => {
  const manifest = {
    fields: [
      { path: 'scene.title', visibility: 'simple' },
      { path: 'scene.lighting', visibility: 'advanced' },
      { path: 'scene.castAssignmentIds', visibility: 'system' }
    ]
  } as CinematicAuthoringManifest;

  it('uses one manifest to project Simple, Advanced and system fields', () => {
    expect(isCinematicFieldVisible(manifest, 'scene.title', 'simple')).toBe(true);
    expect(isCinematicFieldVisible(manifest, 'scene.lighting', 'simple')).toBe(false);
    expect(isCinematicFieldVisible(manifest, 'scene.lighting', 'advanced')).toBe(true);
    expect(isCinematicFieldVisible(manifest, 'scene.castAssignmentIds', 'advanced')).toBe(false);
  });

  it('keeps legacy fallback conservative when the public manifest is unavailable', () => {
    expect(isCinematicFieldVisible(undefined, 'scene.lighting', 'simple')).toBe(false);
    expect(isCinematicFieldVisible(undefined, 'scene.lighting', 'advanced')).toBe(true);
  });
});
