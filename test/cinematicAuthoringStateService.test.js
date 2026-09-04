import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CinematicAuthoringStateService,
  cinematicFieldKey
} from '../server/domain/cinematic/CinematicAuthoringStateService.js';
import {
  createLegacyCinematicProject,
  createSingleCharacterCinematicProject
} from './fixtures/cinematic/cinematicProjectFixtures.js';

const service = new CinematicAuthoringStateService();

test('Cinematic authoring state infers legacy values without changing canonical fields', () => {
  const project = createLegacyCinematicProject();
  const before = project.scenes[0].storyChange;
  const current = service.resolveFieldState(project, cinematicFieldKey({
    entity: 'scene', id: project.scenes[0].id, field: 'storyChange'
  }));
  const missing = service.resolveFieldState(project, cinematicFieldKey({
    entity: 'scene', id: project.scenes[0].id, field: 'audioIntent'
  }));
  assert.equal(current.source, 'legacy_inferred');
  assert.equal(current.status, 'current');
  assert.equal(missing.status, 'current');
  assert.equal(project.scenes[0].storyChange, before);
  assert.equal(project.authoringState.inferenceMode, 'legacy');
});

test('Cinematic authoring state records AI provenance and preserves locked user authority', () => {
  const project = createSingleCharacterCinematicProject();
  service.normalizeProject(project, { newRecord: true });
  const sceneKey = cinematicFieldKey({ entity: 'scene', id: project.scenes[0].id, field: 'emotionalEnd' });
  const shotKey = cinematicFieldKey({
    entity: 'shot', sceneId: project.scenes[0].id, id: project.scenes[0].shots[0].id, field: 'emotionalTarget'
  });
  service.recordFieldUpdate(project, sceneKey, { source: 'user', locked: true, updatedByActorId: 'usr_fixture_owner' });
  service.recordFieldUpdate(project, shotKey, {
    source: 'ai', recipe: { id: 'scene-direction', version: 2, fingerprint: 'abc123' }
  });
  service.markDependentsStale(project, [sceneKey]);
  assert.equal(service.resolveFieldState(project, sceneKey).locked, true);
  assert.equal(service.resolveFieldState(project, sceneKey).status, 'current');
  assert.equal(service.resolveFieldState(project, shotKey).status, 'stale');
  assert.equal(service.resolveFieldState(project, shotKey).recipe.id, 'scene-direction');
});

test('Cinematic authoring state limits Scene changes to dependent Shots in that Scene', () => {
  const project = createSingleCharacterCinematicProject();
  const firstScene = project.scenes[0];
  const secondScene = structuredClone(firstScene);
  secondScene.id = 'scene_unrelated';
  secondScene.shots[0].id = 'shot_unrelated';
  secondScene.shotOrder = ['shot_unrelated'];
  project.scenes.push(secondScene);
  service.normalizeProject(project, { newRecord: true });
  const firstSceneKey = cinematicFieldKey({ entity: 'scene', id: firstScene.id, field: 'emotionalEnd' });
  const firstShotKey = cinematicFieldKey({ entity: 'shot', sceneId: firstScene.id, id: firstScene.shots[0].id, field: 'emotionalTarget' });
  const secondShotKey = cinematicFieldKey({ entity: 'shot', sceneId: secondScene.id, id: secondScene.shots[0].id, field: 'emotionalTarget' });
  service.recordFieldUpdate(project, firstShotKey, { source: 'ai' });
  service.recordFieldUpdate(project, secondShotKey, { source: 'ai' });
  const stale = service.markDependentsStale(project, [firstSceneKey]);
  assert.ok(stale.includes(firstShotKey));
  assert.equal(stale.includes(secondShotKey), false);
  assert.equal(service.resolveFieldState(project, secondShotKey).status, 'current');
});

