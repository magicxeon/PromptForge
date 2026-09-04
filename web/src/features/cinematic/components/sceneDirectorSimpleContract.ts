import type { CinematicScene } from '../schemas/cinematicSchemas';

export function isSimpleSceneReady(scene: CinematicScene | null | undefined) {
  if (!scene) return false;
  if (![scene.title, scene.location, scene.time, scene.storyChange, scene.exitState, scene.emotionalEnd]
    .every(hasText)) return false;
  return scene.shots.length > 0 && scene.shots.every(shot => (
    [shot.title, shot.visibleMoment, shot.subjectAction, shot.emotionalTarget].every(hasText)
      && Number(shot.durationMs) > 0
  ));
}

export function completeSimpleSceneContract(scene: CinematicScene): CinematicScene {
  const firstShot = scene.shots[0];
  const lastShot = scene.shots.at(-1);
  const storyChange = firstText(scene.storyChange, scene.purpose, scene.title);
  const entryState = firstText(
    scene.entryState,
    firstShot?.continuityEntry,
    firstShot?.visibleMoment,
    firstShot?.subjectAction,
    storyChange
  );
  const exitState = firstText(
    scene.exitState,
    lastShot?.continuityExit,
    lastShot?.visibleMoment,
    lastShot?.subjectAction,
    storyChange
  );
  const emotionalStart = firstText(
    scene.emotionalStart,
    firstShot?.emotionalTarget,
    scene.emotionalEnd
  );
  const emotionalEnd = firstText(
    scene.emotionalEnd,
    lastShot?.emotionalTarget,
    emotionalStart
  );

  let previousExit = entryState;
  const shots = scene.shots.map((shot, index) => {
    const nextShot = scene.shots[index + 1];
    const visibleMoment = firstText(shot.visibleMoment, shot.subjectAction, shot.purpose, storyChange);
    const subjectAction = firstText(shot.subjectAction, shot.visibleMoment, shot.purpose, storyChange);
    const emotionalTarget = firstText(
      shot.emotionalTarget,
      index === 0 ? emotionalStart : emotionalEnd,
      emotionalEnd
    );
    const continuityEntry = firstText(shot.continuityEntry, previousExit, entryState, visibleMoment);
    const continuityExit = firstText(
      shot.continuityExit,
      index === scene.shots.length - 1 ? exitState : nextShot?.continuityEntry,
      index === scene.shots.length - 1 ? subjectAction : nextShot?.visibleMoment,
      subjectAction,
      visibleMoment
    );
    previousExit = continuityExit;
    return {
      ...shot,
      purpose: firstText(shot.purpose, visibleMoment, subjectAction, storyChange),
      visibleMoment,
      subjectAction,
      emotionalTarget,
      performanceCue: firstText(shot.performanceCue, scene.performance, emotionalTarget),
      continuityEntry,
      continuityExit,
      transitionToNext: firstText(shot.transitionToNext, scene.transitionIntent, 'cut'),
      estimatedActionDurationMs: Number(shot.estimatedActionDurationMs) > 0
        ? shot.estimatedActionDurationMs
        : shot.durationMs,
      castAssignmentIds: shot.castAssignmentIds.length
        ? shot.castAssignmentIds
        : [...scene.castAssignmentIds],
      wardrobeLookIds: shot.wardrobeLookIds.length
        ? shot.wardrobeLookIds
        : [...scene.wardrobeLookIds]
    };
  });

  return {
    ...scene,
    purpose: firstText(scene.purpose, storyChange, scene.title),
    storyChange,
    entryState,
    exitState,
    emotionalStart,
    emotionalEnd,
    blocking: firstText(scene.blocking, firstShot?.subjectAction, storyChange),
    transitionIntent: firstText(scene.transitionIntent, lastShot?.transitionToNext, 'cut'),
    shots,
    shotOrder: shots.map(shot => shot.id),
    durationMs: shots.reduce((total, shot) => total + shot.durationMs, 0)
  };
}

function firstText(...values: unknown[]) {
  return values.map(value => String(value || '').trim()).find(Boolean) || '';
}

function hasText(value: unknown) {
  return Boolean(String(value || '').trim());
}
