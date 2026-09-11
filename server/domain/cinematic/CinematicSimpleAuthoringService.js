import { resolveShotCastIds } from './CinematicCastCoverage.js';

export class CinematicSimpleAuthoringService {
  completeStoryPlanInput(input = {}) {
    const completions = [];
    const scenes = (Array.isArray(input.scenes) ? input.scenes : []).map((scene, sceneIndex) => (
      completeScene(scene, sceneIndex, completions)
    ));
    return {
      input: { ...input, scenes },
      completions
    };
  }
}

function completeScene(value, sceneIndex, completions) {
  const scene = structuredClone(value || {});
  const shots = Array.isArray(scene.shots) ? scene.shots : [];
  const firstShot = shots[0];
  const lastShot = shots.at(-1);
  fill(scene, 'purpose', [scene.storyChange, scene.title], completions, sceneCompletion(scene, sceneIndex, 'purpose'));
  fill(scene, 'entryState', [firstShot?.continuityEntry, firstShot?.visibleMoment, firstShot?.subjectAction, scene.storyChange], completions, sceneCompletion(scene, sceneIndex, 'entryState'));
  fill(scene, 'exitState', [lastShot?.continuityExit, lastShot?.visibleMoment, lastShot?.subjectAction, scene.storyChange], completions, sceneCompletion(scene, sceneIndex, 'exitState'));
  fill(scene, 'emotionalStart', [firstShot?.emotionalTarget, scene.emotionalEnd], completions, sceneCompletion(scene, sceneIndex, 'emotionalStart'));
  fill(scene, 'emotionalEnd', [lastShot?.emotionalTarget, scene.emotionalStart], completions, sceneCompletion(scene, sceneIndex, 'emotionalEnd'));
  fill(scene, 'blocking', [firstShot?.subjectAction, scene.storyChange], completions, sceneCompletion(scene, sceneIndex, 'blocking'));
  fill(scene, 'transitionIntent', [lastShot?.transitionToNext, 'cut'], completions, sceneCompletion(scene, sceneIndex, 'transitionIntent'));

  let previousExit = scene.entryState;
  scene.shots = shots.map((shotValue, index) => {
    const shot = structuredClone(shotValue || {});
    const nextShot = shots[index + 1];
    fill(shot, 'visibleMoment', [shot.subjectAction, shot.purpose, scene.storyChange], completions, shotCompletion(scene, sceneIndex, shot, index, 'visibleMoment'));
    fill(shot, 'subjectAction', [shot.visibleMoment, shot.purpose, scene.storyChange], completions, shotCompletion(scene, sceneIndex, shot, index, 'subjectAction'));
    fill(shot, 'emotionalTarget', [index === 0 ? scene.emotionalStart : scene.emotionalEnd, scene.emotionalEnd], completions, shotCompletion(scene, sceneIndex, shot, index, 'emotionalTarget'));
    fill(shot, 'purpose', [shot.visibleMoment, shot.subjectAction, scene.storyChange], completions, shotCompletion(scene, sceneIndex, shot, index, 'purpose'));
    fill(shot, 'performanceCue', [scene.performance, shot.emotionalTarget], completions, shotCompletion(scene, sceneIndex, shot, index, 'performanceCue'));
    fill(shot, 'continuityEntry', [previousExit, scene.entryState, shot.visibleMoment], completions, shotCompletion(scene, sceneIndex, shot, index, 'continuityEntry'));
    fill(shot, 'continuityExit', [
      index === shots.length - 1 ? scene.exitState : nextShot?.continuityEntry,
      index === shots.length - 1 ? shot.subjectAction : nextShot?.visibleMoment,
      shot.subjectAction,
      shot.visibleMoment
    ], completions, shotCompletion(scene, sceneIndex, shot, index, 'continuityExit'));
    fill(shot, 'transitionToNext', [scene.transitionIntent, 'cut'], completions, shotCompletion(scene, sceneIndex, shot, index, 'transitionToNext'));
    if (!(Number(shot.estimatedActionDurationMs) > 0)) {
      shot.estimatedActionDurationMs = Number(shot.durationMs) || 0;
      completions.push(shotCompletion(scene, sceneIndex, shot, index, 'estimatedActionDurationMs'));
    }
    if (!shot.castMode && (!Array.isArray(shot.castAssignmentIds) || !shot.castAssignmentIds.length)) {
      shot.castAssignmentIds = [...(scene.castAssignmentIds || [])];
      completions.push(shotCompletion(scene, sceneIndex, shot, index, 'castAssignmentIds', 'inherited'));
    }
    if (!resolveShotCastIds(scene, shot).length) shot.wardrobeLookIds = [];
    else if (!Array.isArray(shot.wardrobeLookIds) || !shot.wardrobeLookIds.length) {
      shot.wardrobeLookIds = [...(scene.wardrobeLookIds || [])];
      completions.push(shotCompletion(scene, sceneIndex, shot, index, 'wardrobeLookIds', 'inherited'));
    }
    previousExit = shot.continuityExit;
    return shot;
  });
  return scene;
}

function fill(target, field, candidates, completions, completion) {
  if (meaningful(target[field])) return;
  const value = candidates.find(meaningful);
  if (!meaningful(value)) return;
  target[field] = value;
  completions.push(completion);
}

function sceneCompletion(scene, sceneIndex, field, source = 'default') {
  return { entity: 'scene', id: String(scene.id || ''), sceneIndex, field, source };
}

function shotCompletion(scene, sceneIndex, shot, shotIndex, field, source = 'default') {
  return {
    entity: 'shot', sceneId: String(scene.id || ''), id: String(shot.id || ''),
    sceneIndex, shotIndex, field, source
  };
}

function meaningful(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== undefined && value !== null;
}

export const cinematicSimpleAuthoringService = new CinematicSimpleAuthoringService();
