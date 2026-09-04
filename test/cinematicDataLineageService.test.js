import assert from 'node:assert/strict';
import test from 'node:test';
import { CinematicDataLineageService } from '../server/domain/cinematic/CinematicDataLineageService.js';
import {
  createMultiCharacterCinematicProject,
  createSingleCharacterCinematicProject
} from './fixtures/cinematic/cinematicProjectFixtures.js';

const service = new CinematicDataLineageService();

test('Cinematic data lineage deterministically traces a complete Setup-to-Finish Project', () => {
  const project = createSingleCharacterCinematicProject();
  const first = service.build(project);
  const second = service.build(project);
  assert.deepEqual(first, second);
  assert.equal(first.findings.filter(item => item.severity === 'blocking').length, 0);
  assert.equal(first.storyRoles[0].assignmentIds[0], 'cast_nara');
  assert.equal(first.shots[0].approvedVideoAttemptId, 'attempt_video_single');
  assert.equal(first.timelineEntries[0].shotId, 'shot_cafe_opening');
  assert.equal(first.exports[0].exportEligible, true);
  const serialized = JSON.stringify(first);
  assert.equal(serialized.includes('imageUrl'), false);
  assert.equal(serialized.includes('storyBrief'), false);
  assert.equal(serialized.includes('prompt'), false);
});

test('Cinematic data lineage reports invalid per-Character Look authority at the smallest recovery stage', () => {
  const project = createMultiCharacterCinematicProject();
  project.scenes[0].wardrobeLookIds = ['look_support_day'];
  project.scenes[0].shots[0].wardrobeLookIds = ['look_support_day'];
  project.scenes[0].castAssignmentIds = ['cast_lead'];
  project.scenes[0].shots[0].castAssignmentIds = ['cast_lead'];
  const result = service.build(project, { sceneId: project.scenes[0].id });
  const finding = result.findings.find(item => item.code === 'cinematic_lineage_look_reference_invalid');
  assert.ok(finding);
  assert.equal(finding.recoveryStage, 'cast');
  assert.equal(finding.recoveryTargetId, 'cast_support');
});

test('Cinematic data lineage scopes Shots without losing their owning Scene and Plan authority', () => {
  const project = createSingleCharacterCinematicProject();
  const result = service.build(project, { sceneId: 'scene_cafe_closing', shotId: 'shot_cafe_opening' });
  assert.equal(result.scenes.length, 1);
  assert.equal(result.shots.length, 1);
  assert.equal(result.storyPlan.id, 'plan_cafe_v1');
  assert.equal(result.beats[0].id, 'beat_choice');
});

