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
  const ids = shot.castAssignmentIds.length ? shot.castAssignmentIds : scene.castAssignmentIds;
  return ids.flatMap(id => {
    const assignment = project.castAssignments.find(item => item.id === id && item.active !== false);
    return assignment ? [assignment] : [];
  });
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
