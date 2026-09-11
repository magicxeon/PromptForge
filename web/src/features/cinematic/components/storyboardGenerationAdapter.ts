import type {
  CinematicCastAssignment,
  CinematicProject,
  CinematicScene,
  CinematicShot
} from '../schemas/cinematicSchemas';

export type StoryboardLook = {
  id: string;
  name: string;
  garmentSummary: string;
  accessorySummary: string;
};

const STORYBOARD_STILL_CONTRACT = 'STORYBOARD STILL CONTRACT';

function authoredShotPrompt(value: string) {
  const prompt = String(value || '').trim();
  if (!prompt.startsWith(STORYBOARD_STILL_CONTRACT)) return prompt;
  const match = prompt.match(/(?:^|\n\n)Shot prompt:\n([\s\S]*?)(?=\n\n[^\n:]+:\n|$)/);
  return match?.[1]?.trim() || '';
}

export function readStoryboardAuthorDirection(value: string) {
  const prompt = String(value || '').trim();
  if (!prompt.startsWith(STORYBOARD_STILL_CONTRACT)
    && !prompt.startsWith('STORYBOARD KEYFRAME CONTRACT')) return prompt;
  if (prompt.startsWith(STORYBOARD_STILL_CONTRACT)) return authoredShotPrompt(prompt);
  const match = prompt.match(/(?:^|\n\n)AUTHOR DIRECTION:\n([\s\S]*?)(?=\n\n[A-Z][A-Z ]+:\n|$)/);
  return match?.[1]?.trim() || '';
}

export function resolveStoryboardShotCast(project: CinematicProject, scene: CinematicScene, shot: CinematicShot) {
  const ids = shot.castMode === 'none' || scene.castMode === 'none' ? []
    : shot.castMode === 'inherit' ? scene.castAssignmentIds
    : shot.castMode === 'selected' || shot.castAssignmentIds.length ? shot.castAssignmentIds : scene.castAssignmentIds;
  return [...new Set(ids)].flatMap(id => {
    const assignment = project.castAssignments.find(item => item.id === id && item.active !== false);
    return assignment ? [assignment] : [];
  });
}

// Preview pinned selections only. Quote/submit still resolve and validate on the server.
export function shotVideoReferencePreviews(project: CinematicProject, scene: CinematicScene, shot: CinematicShot,
  mode: 'storyboard_only' | 'storyboard_and_looks' | 'looks_only') {
  const rows: Array<{ assetId: string | null; purpose: string; roleName: string | null; lookName: string | null; previewUrl: string }> = [];
  if (mode !== 'looks_only' && shot.approvedStoryboardSource) rows.push({
    assetId: shot.approvedStoryboardSource.assetId, purpose: 'storyboard_opening', roleName: null, lookName: null,
    previewUrl: shot.approvedStoryboardSource.imageUrl
  });
  if (mode !== 'storyboard_only') {
    const selectedIds = new Set(shot.wardrobeLookIds.length ? shot.wardrobeLookIds : scene.wardrobeLookIds);
    for (const cast of resolveStoryboardShotCast(project, scene, shot)) {
      const looks = cast.looks.filter((value): value is Record<string, unknown> => Boolean(value && typeof value === 'object'))
        .filter(look => selectedIds.has(String(look.id)) && look.locked === true);
      if (looks.length !== 1) continue;
      const look = looks[0]!;
      const generated = cast.sourceType === 'generated_sheet' ? cast.generatedSheet : null;
      const previewUrl = generated?.previewUrl || (cast.characterProfileId && look.characterLookId && look.characterLookVersionId
        ? `/api/character-profiles/${encodeURIComponent(cast.characterProfileId)}/looks/${encodeURIComponent(String(look.characterLookId))}/versions/${encodeURIComponent(String(look.characterLookVersionId))}/media/sheet` : null);
      if (previewUrl) rows.push({ assetId: generated?.assetId || null, purpose: generated ? 'generated_look' : 'character_look',
        roleName: cast.storyRole || cast.displayName, lookName: String(look.name || cast.displayName), previewUrl });
    }
  }
  return rows.map((row, index) => ({ ...row, imageNumber: index + 1 }));
}

export function resolveStoryboardShotLooks(assignments: CinematicCastAssignment[], scene: CinematicScene, shot: CinematicShot) {
  const selectedIds = new Set(shot.wardrobeLookIds.length ? shot.wardrobeLookIds : scene.wardrobeLookIds);
  return assignments.flatMap(assignment => (assignment.looks || []).flatMap(value => {
    if (!value || typeof value !== 'object') return [];
    const record = value as Record<string, unknown>;
    const id = String(record.id || '');
    if (!id || !selectedIds.has(id)) return [];
    return [{
      id,
      name: String(record.name || id),
      garmentSummary: String(record.garmentSummary || ''),
      accessorySummary: String(record.accessorySummary || '')
    } satisfies StoryboardLook];
  }));
}

export function previousApprovedStoryboardSource(scene: CinematicScene, shotId: string) {
  const ordered = scene.shotOrder
    .map(id => scene.shots.find(shot => shot.id === id))
    .filter((shot): shot is CinematicShot => Boolean(shot));
  const index = ordered.findIndex(shot => shot.id === shotId);
  return index > 0 ? ordered[index - 1]?.approvedStoryboardSource || null : null;
}
