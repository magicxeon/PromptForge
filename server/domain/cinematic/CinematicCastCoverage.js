// Legacy empty Shot lists inherited Scene Cast. Explicit modes must not do so.
export function resolveShotCastIds(scene, shot) {
  if (shot.castMode === 'none' || scene.castMode === 'none') return [];
  if (shot.castMode === 'selected') return [...new Set(shot.castAssignmentIds || [])];
  return [...new Set(shot.castMode === 'inherit' || !shot.castAssignmentIds?.length
    ? scene.castAssignmentIds || [] : shot.castAssignmentIds)];
}

export function resolveShotLookIds(scene, shot) {
  if (!resolveShotCastIds(scene, shot).length) return [];
  return [...new Set(shot.wardrobeLookIds?.length ? shot.wardrobeLookIds : scene.wardrobeLookIds || [])];
}

export function normalizeCastMode(value) {
  if (value === undefined) return undefined;
  if (!['none', 'selected', 'inherit'].includes(value)) {
    throw Object.assign(new Error('Unknown Cast coverage mode.'), { code: 'cinematic_cast_mode_invalid', statusCode: 400 });
  }
  return value;
}
