import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyShotProposal,
  createManualShot,
  createShotProposal,
  resolveShotDocument,
  updateShotDocument
} from '../server/domain/cinematic/CinematicShotAuthoring.js';

test('Shot bindings validate Scene membership and preserve off-screen speaker identity', () => {
  const current = scene();
  const project = { scenes: [current], castAssignments: [{ id: 'lalin', displayName: 'Lalin', active: true }] };
  const { shot } = createManualShot(project, current.id);
  const input = { expectedShotVersion: shot.version, title: 'Conversation', durationMs: 4000,
    shotDocument: 'DIALOGUE AND FACIAL PERFORMANCE\nLalin: Hello.', speakerBindings: [{ castAssignmentId: 'lalin', alias: 'Lalin', visible: false }] };
  updateShotDocument(project, current.id, shot.id, input);
  assert.equal(shot.speakerBindings[0].castAssignmentId, 'lalin');
  assert.deepEqual(shot.castAssignmentIds, []);
  assert.equal(shot.castMode, 'none');
  assert.throws(() => updateShotDocument(project, current.id, shot.id, { ...input, expectedShotVersion: shot.version,
    speakerBindings: [{ castAssignmentId: 'stranger', alias: 'Stranger', visible: true }] }), { code: 'cinematic_shot_cast_invalid' });
});

test('legacy conversion preserves dialogue with its actual speaker and delivery', () => {
  const document = resolveShotDocument({ durationMs: 6000, dialogueCues: [{ speakerCastAssignmentId: 'lalin',
    text: 'I will repay you.', delivery: 'softly', startOffsetMs: 1000, estimatedDurationMs: 3000 }] }, {}, [{ id: 'lalin', displayName: 'Lalin' }]);
  assert.match(document, /\[1-4 sec\] Lalin \(softly\): I will repay you\./);
});

test('targeted AI revision changes only its Shot and retains custom prompt and media', () => {
  const current = scene();
  const project = { activeChapterVersionId: 'chapter-rev-1', scenes: [current], shotProposals: [] };
  const first = createManualShot(project, current.id).shot;
  const second = createManualShot(project, current.id).shot;
  second.approvedVideoAttemptId = 'old-take';
  second.videoPromptOverride = { text: 'Keep this custom text', sourceFingerprint: 'a'.repeat(64) };
  const firstBefore = structuredClone(first);
  const proposal = createShotProposal({ sceneId: current.id, sourceSceneVersion: current.version,
    sourceChapterRevisionId: 'chapter-rev-1', targetShotId: second.id, sourceShotVersion: second.version,
    shots: [{ title: 'New title', durationMs: 4000, shotDocument: 'Revised dialogue', characterIds: [] }] });
  project.shotProposals.push(proposal);
  applyShotProposal(project, current.id, proposal.id);
  assert.deepEqual(first, firstBefore);
  assert.equal(second.shotDocument, 'Revised dialogue');
  assert.equal(second.approvedVideoAttemptId, 'old-take');
  assert.equal(second.videoPromptOverride.text, 'Keep this custom text');
  assert.equal(current.shots.length, 2);
});

function scene() {
  return {
    id: 'scene-1', version: 2, orderKey: 1, title: 'Rain encounter', synopsis: 'Lalin reaches for the fallen pot.',
    sourceChapterRevisionId: 'chapter-rev-1', castAssignmentIds: ['lalin'], shots: [], shotOrder: [], durationMs: 8000
  };
}

test('Shot proposal creates editable documents without media attempts', () => {
  const project = { activeChapterVersionId: 'chapter-rev-1', shotProposals: [], scenes: [scene()], generationAttempts: [] };
  const proposal = createShotProposal({
    sceneId: 'scene-1', sourceSceneVersion: 2, sourceChapterRevisionId: 'chapter-rev-1', baseProjectVersion: 5,
    allowedCharacterIds: ['lalin'], shots: [{ title: 'Reach for the pot', purpose: 'Begin the encounter', durationMs: 4000,
      shotDocument: 'SHOT DURATION\n4 seconds\n\nPERFORMANCE AND TIMELINE\n[0.0-4.0 sec]\nLalin reaches down.', characterIds: ['lalin'] }]
  });
  project.shotProposals.push(proposal);
  const result = applyShotProposal(project, 'scene-1', proposal.id);

  assert.equal(result.scene.shots.length, 1);
  assert.equal(result.scene.shots[0].shotDocumentVersion, 1);
  assert.equal(result.scene.shots[0].source, 'ai_proposal');
  assert.equal(result.scene.shots[0].storyboardStatus, 'draft');
  assert.deepEqual(project.generationAttempts, []);
});

test('Shot regeneration preserves stable IDs and production evidence', () => {
  const current = scene();
  current.shots = [{
    id: 'shot-1', version: 3, orderKey: 1, title: 'Old', purpose: '', durationMs: 4000,
    approvedVideoAttemptId: 'take-1', approvedStoryboardSource: { assetId: 'asset-1' }
  }];
  current.shotOrder = ['shot-1'];
  const project = { activeChapterVersionId: 'chapter-rev-1', shotProposals: [], scenes: [current], generationAttempts: [{ shotId: 'shot-1' }] };
  const proposal = createShotProposal({
    sceneId: 'scene-1', sourceSceneVersion: 2, sourceChapterRevisionId: 'chapter-rev-1', baseProjectVersion: 8,
    allowedCharacterIds: [], shots: [{ title: 'Revised', purpose: 'Refine motion', durationMs: 5000, shotDocument: 'Revised document', characterIds: [] }]
  });
  project.shotProposals.push(proposal);
  applyShotProposal(project, 'scene-1', proposal.id);

  assert.equal(current.shots[0].id, 'shot-1');
  assert.equal(current.shots[0].approvedVideoAttemptId, 'take-1');
  assert.equal(current.shots[0].approvedStoryboardSource.assetId, 'asset-1');
  assert.equal(current.shots[0].shotPlanningStatus, 'review_required');
});

test('Shot proposal becomes stale when its Scene changes', () => {
  const current = scene();
  const project = { activeChapterVersionId: 'chapter-rev-1', shotProposals: [], scenes: [current] };
  const proposal = createShotProposal({
    sceneId: current.id, sourceSceneVersion: current.version, sourceChapterRevisionId: 'chapter-rev-1',
    shots: [{ title: 'Shot 1', durationMs: 4000, shotDocument: 'Direction', characterIds: [] }]
  });
  project.shotProposals.push(proposal);
  current.version += 1;
  assert.throws(() => applyShotProposal(project, current.id, proposal.id), { code: 'cinematic_shot_proposal_stale' });
});

test('Shot proposal becomes stale when the active Chapter revision changes', () => {
  const current = scene();
  const project = { activeChapterVersionId: 'chapter-rev-1', shotProposals: [], scenes: [current] };
  const proposal = createShotProposal({
    sceneId: current.id, sourceSceneVersion: current.version, sourceChapterRevisionId: 'chapter-rev-1',
    shots: [{ title: 'Shot 1', durationMs: 4000, shotDocument: 'Direction', characterIds: [] }]
  });
  project.shotProposals.push(proposal);
  project.activeChapterVersionId = 'chapter-rev-2';
  assert.throws(() => applyShotProposal(project, current.id, proposal.id), { code: 'cinematic_shot_proposal_stale' });
});

test('Manual Shot and versioned writer save preserve free-form prose', () => {
  const project = { activeChapterVersionId: 'chapter-rev-1', shotProposals: [], scenes: [scene()] };
  const { shot } = createManualShot(project, 'scene-1');
  const custom = 'UNKNOWN HEADING\nเก็บข้อความนี้ตามเดิม\n\n[0.0-3.5 sec]\nShe pauses.';
  const result = updateShotDocument(project, 'scene-1', shot.id, {
    expectedShotVersion: shot.version, title: 'Quiet pause', durationMs: 3500, shotDocument: custom, source: 'manual'
  });
  assert.equal(result.shot.shotDocument, custom);
  assert.equal(result.shot.durationMs, 3500);
  assert.equal(result.shot.shotDocumentVersion, 2);
  assert.throws(() => updateShotDocument(project, 'scene-1', shot.id, {
    expectedShotVersion: result.shot.version, title: 'Too long', durationMs: 3500, shotDocument: 'x'.repeat(12001)
  }), { code: 'cinematic_shot_document_too_long' });
  assert.equal(result.shot.shotDocument, custom);
});
