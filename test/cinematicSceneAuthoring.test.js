import assert from 'node:assert/strict';
import test from 'node:test';
import { applySceneProposal, createSceneProposal, scenePlanningProjection, updateSceneOutline } from '../server/domain/cinematic/CinematicSceneAuthoring.js';

test('Scene regeneration preserves stable Scene and Shot production evidence', () => {
  const project = {
    activeChapterVersionId: 'chapter-rev-2',
    sceneProposals: [],
    scenes: [{
      id: 'scene-1', version: 3, orderKey: 1, title: 'Old title', purpose: 'dramatic',
      shots: [{ id: 'shot-1', generationAttempts: ['take-1'] }], shotOrder: ['shot-1'], durationMs: 4000
    }]
  };
  const proposal = createSceneProposal({
    sourceChapterRevisionId: 'chapter-rev-2', baseProjectVersion: 7, allowedCharacterIds: [],
    scenes: [{ title: 'New title', synopsis: 'Revised situation.', purpose: 'dialogue', objective: '', location: 'Cafe',
      time: 'Morning', weather: 'Clear', environment: 'Warm interior.', entryState: 'They sit apart.', exitState: 'They agree.',
      emotionalStart: 'Guarded', emotionalEnd: 'Open', transitionIntent: 'Cut to the street.', targetDurationSeconds: 30,
      dialogueTargetPercent: 60, characterIds: [] }]
  });
  project.sceneProposals.push(proposal);

  applySceneProposal(project, proposal.id);

  assert.equal(project.scenes[0].id, 'scene-1');
  assert.equal(project.scenes[0].shots[0].id, 'shot-1');
  assert.deepEqual(project.scenes[0].shots[0].generationAttempts, ['take-1']);
  assert.equal(project.scenes[0].planningStatus, 'review_required');
  assert.deepEqual(scenePlanningProjection(project), {
    sceneCount: 1, shotCount: 1, scenePlanningStatus: 'ready', pendingSceneProposalId: null
  });
});

test('Scene proposal cannot apply after the Chapter revision changes', () => {
  const proposal = createSceneProposal({
    sourceChapterRevisionId: 'chapter-rev-1', baseProjectVersion: 2, allowedCharacterIds: [],
    scenes: [{ title: 'Scene 1', synopsis: '', purpose: 'dramatic', targetDurationSeconds: 10, characterIds: [] }]
  });
  const project = { activeChapterVersionId: 'chapter-rev-2', scenes: [], sceneProposals: [proposal] };
  assert.equal(scenePlanningProjection(project).scenePlanningStatus, 'source_changed');
  assert.throws(() => applySceneProposal(project, proposal.id), { code: 'cinematic_scene_proposal_stale' });
  assert.equal(project.scenes.length, 0);
});

test('Scene outline rejects an empty title without changing the saved Scene', () => {
  const scene = { id: 'scene-1', version: 2, orderKey: 1, title: 'Saved Scene', shots: [], castAssignmentIds: [] };
  const project = { activeChapterVersionId: 'chapter-rev-1', scenes: [scene], sceneProposals: [], castAssignments: [] };
  assert.throws(() => updateSceneOutline(project, scene.id, { expectedSceneVersion: 2, title: '  ' }), {
    code: 'cinematic_scene_title_required'
  });
  assert.equal(scene.title, 'Saved Scene');
  assert.equal(scene.version, 2);
});
