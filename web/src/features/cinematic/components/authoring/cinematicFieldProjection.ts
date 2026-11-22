import type { CinematicAuthoringManifest } from '../../schemas/cinematicSchemas';

export function isCinematicFieldVisible(
  manifest: CinematicAuthoringManifest | undefined,
  fieldPath: string,
  mode: 'simple' | 'advanced'
) {
  const field = manifest?.fields.find(item => item.path === fieldPath);
  if (!field) return mode === 'advanced';
  if (field.visibility === 'system') return false;
  return field.visibility === 'simple' || mode === 'advanced';
}

