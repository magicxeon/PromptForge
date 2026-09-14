import assert from 'node:assert/strict';
import test from 'node:test';
import { fingerprintVideoPacketAuthority } from '../server/domain/cinematic/CinematicVideoPacketCompiler.js';
import { assessCinematicTake, describeCinematicDurationOverride } from '../server/domain/cinematic/CinematicTakeEligibility.js';

const oldPacket = {
  contractVersion: 'cinematic-video-packet-v2', projectId: 'project', projectVersion: 12,
  sceneId: 'scene', sceneVersion: 3, shotId: 'shot', shotVersion: 5,
  keyframeContractFingerprint: 'old-compiler-keyframe', approvedKeyframeContractFingerprint: 'approved-keyframe',
  approvedStoryboardSourceFingerprint: 'source', timing: { plannedDurationMs: 4000 },
  referenceStrategy: { mode: 'composition_reference', firstFrameSourceFingerprint: 'source' },
  authority: { characters: ['cast-a'] }, motion: { primaryAction: 'Walk to the doorway' },
  performance: { gaze: 'doorway' }, environment: { lighting: 'warm practical' },
  continuity: { entry: 'door closed' }, audio: { intent: 'rain' }, authorDirection: 'Hold the doorway',
  prohibitions: ['Old policy wording'], provenance: { policyVersion: 9 },
  findings: [], providerIndependentPrompt: 'Old compiled wording',
  renderedPromptFingerprint: 'old-prompt-hash', packetFingerprint: 'old-packet-hash'
};
const currentPacket = {
  ...oldPacket, projectVersion: 28, sceneVersion: 4, shotVersion: 6,
  keyframeContractFingerprint: 'new-compiler-keyframe',
  prohibitions: ['New policy wording'], provenance: { policyVersion: 11 },
  providerIndependentPrompt: 'New compiled wording', renderedPromptFingerprint: 'new-prompt-hash',
  packetFingerprint: 'new-packet-hash'
};
const project = { commandReceipts: [{ operation: 'approve_storyboard_source', createdAt: '2026-09-12T10:00:00.000Z',
  result: { shotId: 'shot', referenceMode: 'storyboard_and_looks', approvedStoryboardSource: { sourceFingerprint: 'source' }, videoPacket: oldPacket } }] };
const scene = { id: 'scene' };
const shot = { id: 'shot', videoReferenceMode: 'storyboard_and_looks', approvedStoryboardSource: { sourceFingerprint: 'source' } };
const approvedStoryboardAttempt = { keyframeContractFingerprint: 'approved-keyframe' };
const attempt = { id: 'take', sceneId: 'scene', shotId: 'shot', createdAt: '2026-09-12T10:01:00.000Z',
  referenceMode: 'storyboard_and_looks', sourceFingerprint: 'source',
  keyframeContractFingerprint: 'approved-keyframe', videoPacketFingerprint: 'old-packet-hash' };
const task = { status: 'completed', billingStatus: 'captured', outputAsset: { id: 'asset', technicalProbe: { status: 'passed' } } };
const assess = overrides => assessCinematicTake({ project, scene, shot, attempt, task, currentPacket,
  approvedStoryboardAttempt, ...overrides });

test('receipt-backed policy drift preserves an old Take while authored changes do not', () => {
  assert.equal(fingerprintVideoPacketAuthority(oldPacket), fingerprintVideoPacketAuthority(currentPacket));
  assert.equal(assess(), 'ready');
  assert.equal(assess({ currentPacket: { ...currentPacket, timing: { plannedDurationMs: 8000 } } }), 'duration_override_available');
  assert.equal(assess({ currentPacket: { ...currentPacket, motion: { primaryAction: 'Run to the doorway' } } }), 'shot_changed');
  assert.equal(assess({ currentPacket: { ...currentPacket, timing: { plannedDurationMs: 8000 },
    motion: { primaryAction: 'Run to the doorway' } } }), 'shot_changed');
  assert.equal(assess({ project: { commandReceipts: [] } }), 'authority_unverified');
  assert.equal(assess({ attempt: { ...attempt, videoPacketFingerprint: 'unknown' } }), 'authority_unverified');
  assert.equal(assess({ attempt: { ...attempt, keyframeContractFingerprint: 'other' } }), 'keyframe_changed');
  assert.equal(assess({ shot: { ...shot, approvedStoryboardSource: { sourceFingerprint: 'new-source' } } }), 'source_changed');
  assert.equal(assess({ shot: { ...shot, videoReferenceMode: 'looks_only' } }), 'reference_changed');
  assert.equal(assess({ attempt: { ...attempt, downstreamSourceStatus: 'source_changed' } }), 'source_changed');
});

test('duration override requires the submitted receipt and exact remaining Shot authority', () => {
  const changed = { ...currentPacket, timing: { plannedDurationMs: 8000 } };
  assert.deepEqual(describeCinematicDurationOverride({ project, shot, attempt, currentPacket: changed }), {
    kind: 'planned_duration', submittedDurationMs: 4000, currentDurationMs: 8000,
    submittedPacketFingerprint: 'old-packet-hash', receiptCreatedAt: '2026-09-12T10:00:00.000Z'
  });
  assert.equal(describeCinematicDurationOverride({ project: { commandReceipts: [] }, shot, attempt, currentPacket: changed }), null);
  assert.equal(describeCinematicDurationOverride({ project, shot, attempt,
    currentPacket: { ...changed, authority: { characters: ['cast-b'] } } }), null);
});

test('new authored fingerprint survives prompt policy drift without historical receipts', () => {
  const withAuthority = { ...attempt, videoPacketAuthorityFingerprint: fingerprintVideoPacketAuthority(oldPacket) };
  assert.equal(assess({ project: { commandReceipts: [] }, attempt: withAuthority }), 'ready');
  assert.equal(assess({ project: { commandReceipts: [] }, attempt: withAuthority,
    currentPacket: { ...currentPacket, audio: { intent: 'music' } } }), 'shot_changed');
});

test('task, settlement and media checks remain required for every approval', () => {
  assert.equal(assess({ task: null }), 'task_unavailable');
  assert.equal(assess({ task: null, attempt: { ...attempt, generationJobId: null, status: 'preparing' } }), 'processing');
  assert.equal(assess({ task: { ...task, status: 'provider_queued' } }), 'processing');
  assert.equal(assess({ task: { ...task, status: 'failed' } }), 'task_failed');
  assert.equal(assess({ task: { ...task, billingStatus: 'reserved' } }), 'settlement_pending');
  assert.equal(assess({ task: { ...task, outputAsset: null } }), 'media_unavailable');
  assert.equal(assess({ task: { ...task, outputAsset: { id: 'asset', technicalProbe: { status: 'failed' } } } }), 'probe_failed');
});
