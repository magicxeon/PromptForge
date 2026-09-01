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

export function buildStoryboardPrompt(project: CinematicProject, scene: CinematicScene, shot: CinematicShot) {
  const cast = resolveStoryboardShotCast(project, scene, shot);
  const looks = resolveStoryboardShotLooks(cast, scene, shot);
  const plan = resolveStoryboardPlan(project, scene.id);
  const beat = plan?.beats.find(item => item.id === scene.beatId);
  const continuity = [...scene.continuityNotes, ...shot.continuityNotes];
  const setup = project.setup;
  const emotionalTarget = resolveShotEmotionalTarget(scene, shot);

  return [
    STORYBOARD_STILL_CONTRACT,
    promptSection('Shot prompt', authoredShotPrompt(shot.prompt)),
    promptSection('Project intent', joinSentences([
      setup?.storyBrief,
      setup?.creativeDirection,
      setup?.genre ? `Genre: ${setup.genre}.` : '',
      setup?.audienceFeeling ? `Intended audience feeling: ${setup.audienceFeeling}.` : ''
    ])),
    promptSection('Story plan', joinSentences([
      plan?.objective ? `Objective: ${plan.objective}.` : '',
      plan?.logline ? `Logline: ${plan.logline}.` : '',
      plan?.emotionalArc ? `Overall emotional arc: ${plan.emotionalArc}.` : ''
    ])),
    promptSection('Owning beat', joinSentences([
      beat?.title,
      beat?.purpose ? `Dramatic purpose: ${beat.purpose}.` : '',
      beat?.storyChange ? `Visible story change: ${beat.storyChange}.` : '',
      beat?.cause ? `Cause entering the Beat: ${beat.cause}.` : '',
      beat?.consequence ? `Consequence leaving the Beat: ${beat.consequence}.` : '',
      emotionalArcContext('Beat emotional arc', beat?.emotionalStart, beat?.emotionalEnd)
    ])),
    promptSection('Scene direction', joinSentences([
      scene.title,
      scene.purpose ? `Dramatic purpose: ${scene.purpose}.` : '',
      scene.storyChange ? `Visible story change: ${scene.storyChange}.` : '',
      scene.entryState ? `Scene entry state: ${scene.entryState}.` : '',
      scene.exitState ? `Scene exit state: ${scene.exitState}.` : '',
      scene.objective ? `Scene objective: ${scene.objective}.` : '',
      scene.pressure ? `Visible pressure: ${scene.pressure}.` : '',
      emotionalArcContext('Scene emotional arc', scene.emotionalStart, scene.emotionalEnd),
      scene.location || scene.time ? `Setting: ${[scene.location, scene.time].filter(Boolean).join(', ')}.` : '',
      scene.blocking ? `Character blocking: ${scene.blocking}.` : '',
      scene.performance ? `Performance direction: ${scene.performance}.` : '',
      scene.lighting ? `Lighting: ${scene.lighting}.` : '',
      scene.transitionIntent ? `Composition continuity toward the next scene: ${scene.transitionIntent}.` : ''
    ])),
    promptSection('Selected shot', joinSentences([
      shot.title,
      shot.purpose ? `Visual purpose: ${shot.purpose}.` : '',
      shot.visibleMoment ? `Exact visible moment: ${shot.visibleMoment}.` : '',
      shot.subjectAction ? `One primary physical action: ${shot.subjectAction}.` : '',
      [shot.framing, shot.cameraAngle, shot.cameraMovement, shot.lensIntent].filter(Boolean).length
        ? `Camera: ${[shot.framing, shot.cameraAngle, shot.cameraMovement, shot.lensIntent].filter(Boolean).join(', ')}.`
        : '',
      shot.blocking ? `Blocking: ${shot.blocking}.` : '',
      shot.performance ? `Performance: ${shot.performance}.` : '',
      shot.performanceCue ? `Observable performance cue: ${shot.performanceCue}.` : '',
      shot.gaze ? `Gaze: ${shot.gaze}.` : '',
      emotionalTarget ? `Selected Shot emotional target: ${emotionalTarget}. This target controls the visible expression, posture, gesture and gaze. Do not smile unless this Shot explicitly requests it.` : '',
      shot.lighting || scene.lighting ? `Shot lighting: ${shot.lighting || scene.lighting}.` : '',
      shot.environment ? `Shot environment: ${shot.environment}.` : ''
    ])),
    promptSection('Characters', cast.map(item => joinSentences([
      `${item.displayName} as ${item.storyRole}.`,
      item.objective ? `Objective: ${item.objective}.` : '',
      item.emotionalBaseline ? `Emotional baseline: ${item.emotionalBaseline}.` : '',
      item.performanceDirection ? `Performance authority: ${item.performanceDirection}.` : ''
    ])).join(' ')),
    promptSection('Wardrobe', looks.map(look => [look.name, look.garmentSummary, look.accessorySummary].filter(Boolean).join(', ')).join('; ')),
    promptSection('Continuity', joinSentences([
      shot.continuityEntry ? `Entry anchor: ${shot.continuityEntry}.` : '',
      shot.continuityExit ? `Exit anchor: ${shot.continuityExit}.` : '',
      shot.transitionToNext ? `Outgoing visual transition: ${shot.transitionToNext}.` : '',
      continuity.join('; ')
    ]))
  ].filter(Boolean).join('\n\n');
}

function resolveStoryboardPlan(project: CinematicProject, sceneId: string) {
  const versions = project.storyPlanVersions || [];
  const matching = [...versions].reverse().find(version => version.sceneIds.includes(sceneId));
  return matching || versions.find(version => version.id === project.activeStoryPlanVersionId) || null;
}

function promptSection(label: string, value: string | null | undefined) {
  const normalized = String(value || '').trim();
  return normalized ? `${label}:\n${normalized}` : '';
}

function joinSentences(values: Array<string | null | undefined>) {
  return values.map(value => String(value || '').trim()).filter(Boolean).join(' ');
}

function emotionalArcContext(label: string, start?: string, end?: string) {
  const values = [start, end].map(value => String(value || '').trim());
  if (!values[0] && !values[1]) return '';
  if (values[0] && values[1]) {
    return `${label}: ${values[0]} toward ${values[1]}. Use this as narrative context only; do not blend both states into one expression.`;
  }
  return `${label}: ${values[0] || values[1]}.`;
}

export function resolveShotEmotionalTarget(scene: CinematicScene, shot: CinematicShot) {
  const order = scene.shotOrder.length ? scene.shotOrder : scene.shots.map(item => item.id);
  const index = Math.max(0, order.indexOf(shot.id));
  const start = String(scene.emotionalStart || '').trim();
  const end = String(scene.emotionalEnd || '').trim();
  if (order.length <= 1) return end || start;
  if (index === 0) return start || end;
  if (index === order.length - 1) return end || start;
  if (start && end) return `a restrained transition away from ${start} and not yet fully ${end}`;
  return start || end;
}

function authoredShotPrompt(value: string) {
  const prompt = String(value || '').trim();
  if (!prompt.startsWith(STORYBOARD_STILL_CONTRACT)) return prompt;
  const match = prompt.match(/(?:^|\n\n)Shot prompt:\n([\s\S]*?)(?=\n\n[^\n:]+:\n|$)/);
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
