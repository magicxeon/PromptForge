import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createLegacyCinematicProject,
  createMultiCharacterCinematicProject,
  createSingleCharacterCinematicProject
} from './fixtures/cinematic/cinematicProjectFixtures.js';

test('Cinematic core fixtures are deterministic, sanitized and independently cloned', () => {
  const first = createSingleCharacterCinematicProject();
  const second = createSingleCharacterCinematicProject();
  assert.deepEqual(first, second);
  first.title = 'Mutated';
  assert.equal(second.title, 'Single Character Fixture');
  for (const fixture of [second, createMultiCharacterCinematicProject(), createLegacyCinematicProject()]) {
    const serialized = JSON.stringify(fixture);
    assert.equal(serialized.includes('data:image/'), false);
    assert.equal(serialized.includes('Bearer '), false);
    assert.equal(serialized.includes('apiKey'), false);
    assert.equal(fixture.ownerUserId, 'usr_fixture_owner');
  }
});

test('Cinematic core fixtures preserve stable Cast, Look, Beat, Scene and Shot linkage', () => {
  for (const fixture of [createSingleCharacterCinematicProject(), createMultiCharacterCinematicProject()]) {
    const assignmentIds = new Set(fixture.castAssignments.map(item => item.id));
    const lookIds = new Set(fixture.castAssignments.flatMap(item => item.looks.map(look => look.id)));
    const sceneIds = new Set(fixture.scenes.map(item => item.id));
    const plan = fixture.storyPlanVersions.find(item => item.id === fixture.activeStoryPlanVersionId);
    assert.ok(plan);
    assert.ok(plan.sceneIds.every(id => sceneIds.has(id)));
    for (const scene of fixture.scenes) {
      assert.ok(scene.castAssignmentIds.every(id => assignmentIds.has(id)));
      assert.ok(scene.wardrobeLookIds.every(id => lookIds.has(id)));
      assert.equal(scene.durationMs, scene.shots.reduce((total, shot) => total + shot.durationMs, 0));
      assert.deepEqual(scene.shotOrder, scene.shots.map(shot => shot.id));
    }
  }
});

test('Legacy Cinematic fixture intentionally has no authoring metadata', () => {
  const fixture = createLegacyCinematicProject();
  assert.equal(fixture.authoringContractVersion, undefined);
  assert.equal(fixture.authoringState, undefined);
  assert.equal(fixture.storyPlanVersions[0].contractVersion, 'legacy');
});

