import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { CinematicVideoPacketConfigurationService } from '../server/domain/cinematic/CinematicVideoPacketConfigurationService.js';
import { CinematicVideoPacketCompiler } from '../server/domain/cinematic/CinematicVideoPacketCompiler.js';
import {
  createMultiCharacterCinematicProject,
  createSingleCharacterCinematicProject
} from './fixtures/cinematic/cinematicProjectFixtures.js';

test('Cinematic video packet is deterministic and binds approved first-frame authority', () => {
  const project = createSingleCharacterCinematicProject();
  const scene = project.scenes[0];
  const shot = scene.shots[0];
  const storyboardAttempt = project.generationAttempts.find(item => item.id === shot.approvedStoryboardAttemptId);
  const compiler = new CinematicVideoPacketCompiler();
  const first = compiler.compile({ project, scene, shot, storyboardAttempt });
  const changedCounter = compiler.compile({ project: { ...project, version: 99 }, scene, shot, storyboardAttempt });
  assert.equal(first.packetFingerprint, changedCounter.packetFingerprint);
  assert.equal(first.referenceStrategy.mode, 'first_frame');
  assert.equal(first.approvedStoryboardSourceFingerprint, shot.approvedStoryboardSource.sourceFingerprint);
  assert.match(first.providerIndependentPrompt, /APPROVED START FRAME/);
  assert.match(first.providerIndependentPrompt, /One primary action/);
  assert.ok(first.providerIndependentPrompt.length <= 3800);
});

test('Cinematic video packet retains every Character and Look authority', () => {
  const project = createMultiCharacterCinematicProject();
  project.scenes[0].shots[0].approvedStoryboardSource = {
    assetId: 'asset_multi', assetVersionId: 'asset_multi_v1', sourceJobId: 'job_multi',
    imageUrl: '/api/fixtures/multi', thumbnailUrl: '/api/fixtures/multi-thumb',
    contentHash: 'hash_multi', sourceFingerprint: 'fingerprint_multi',
    approvedAt: '2026-01-01T00:00:00.000Z'
  };
  const packet = new CinematicVideoPacketCompiler().compile({
    project, scene: project.scenes[0], shot: project.scenes[0].shots[0]
  });
  assert.deepEqual(packet.authority.characters.map(item => item.assignmentId), ['cast_lead', 'cast_support']);
  assert.deepEqual(packet.authority.looks.map(item => item.lookId), ['look_lead_day', 'look_support_day']);
  assert.equal(packet.motion.visibleEnd, 'The first step is complete.');
});

test('Cinematic video packet blocks a Storyboard attempt compiled from stale Shot authority', () => {
  const project = createSingleCharacterCinematicProject();
  const scene = project.scenes[0];
  const shot = scene.shots[0];
  const storyboardAttempt = project.generationAttempts.find(item => item.id === shot.approvedStoryboardAttemptId);
  storyboardAttempt.keyframeContractFingerprint = 'stale_keyframe_contract';
  const packet = new CinematicVideoPacketCompiler().compile({ project, scene, shot, storyboardAttempt });
  assert.ok(packet.findings.some(item => (
    item.severity === 'blocking' && item.code === 'cinematic_video_keyframe_contract_stale'
  )));
});

test('Cinematic video packet configuration rejects an unsafe prompt budget', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cine-video-policy-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const policyPath = path.join(directory, 'policy.json');
  await fs.writeFile(policyPath, JSON.stringify({
    schemaVersion: 1,
    id: 'test', version: 1, contractVersion: 'test-v1', maximumPromptCharacters: 5000,
    promptSectionOrder: [
      'startAuthority', 'temporalAction', 'camera', 'performance', 'environment',
      'continuity', 'audio', 'prohibitions', 'authorDirection'
    ],
    globalProhibitions: ['Keep authority.']
  }));
  assert.throws(
    () => new CinematicVideoPacketConfigurationService({ policyPath }).getPolicy(),
    /prompt budget/
  );
});
