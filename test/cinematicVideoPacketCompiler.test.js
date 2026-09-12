import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { CinematicVideoPacketConfigurationService } from '../server/domain/cinematic/CinematicVideoPacketConfigurationService.js';
import { CinematicVideoPacketCompiler } from '../server/domain/cinematic/CinematicVideoPacketCompiler.js';
import { StoryboardKeyframeContractCompiler } from '../server/domain/cinematic/StoryboardKeyframeContractCompiler.js';

test('video packet does not import future Scene consequences into the current Shot', () => {
  const project = createSingleCharacterCinematicProject();
  const scene = project.scenes[0];
  const shot = scene.shots[0];
  shot.videoReferenceMode = 'looks_only';
  scene.propContinuity = 'FUTURE_PHONE_ALREADY_IN_WATER';
  scene.screenDirection = 'FUTURE_RESCUE_PULL';
  scene.exitState = 'FUTURE_CHARACTER_DEPARTED';
  scene.transitionIntent = 'FUTURE_MORNING_CUT';
  scene.continuityNotes = ['FUTURE_PHONE_RECOVERED'];
  shot.continuityEntry = 'Kin holds his phone and looks away.';
  shot.subjectAction = 'Kin turns and notices the danger.';
  shot.continuityExit = 'Kin sees the danger, still holding his phone.';
  shot.transitionToNext = '';
  const compiler = new CinematicVideoPacketCompiler();
  const packet = compiler.compile({ project, scene, shot });
  const prompt = compiler.renderForProvider(packet, { providerId: 'modelark' }).prompt;
  assert.doesNotMatch(prompt, /FUTURE_/);
  assert.ok(prompt.includes(shot.continuityEntry));
  assert.ok(prompt.includes(shot.subjectAction));
  assert.ok(prompt.includes(shot.continuityExit));
});

test('prompt budget removes overhead without dropping mappings or repeated dialogue', () => {
  const project = createSingleCharacterCinematicProject();
  const scene = project.scenes[0];
  const shot = scene.shots[0];
  shot.videoReferenceMode = 'looks_only';
  const compiler = new CinematicVideoPacketCompiler();
  const packet = compiler.compile({ project, scene, shot });
  packet.motion.visibleStart = 'She holds the cup.';
  packet.continuity.entry = packet.motion.visibleStart;
  packet.motion.visibleEnd = 'The cup rests on the table.';
  packet.continuity.exit = packet.motion.visibleEnd;
  packet.audio.dialogueCues = [
    { speaker: 'Mira', text: 'Wait.', startOffsetMs: 1000 },
    { speaker: 'Mira', text: 'Wait.', startOffsetMs: 3000 }
  ];
  const referencePlan = { mode: 'looks_only', references: [
    { roleName: 'Mira', lookName: 'Cafe' }, { roleName: 'Kin', lookName: 'Visitor' }
  ] };
  const baseline = compiler.renderForProvider(packet, { providerId: 'modelark', referencePlan }).prompt;
  assert.equal(baseline.split('She holds the cup.').length - 1, 1);
  assert.equal(baseline.split('The cup rests on the table.').length - 1, 1);
  const config = new CinematicVideoPacketConfigurationService();
  const policy = config.getPolicy();
  policy.looksOnlyMode.maximumPromptCharacters = baseline.length - 1;
  const bounded = new CinematicVideoPacketCompiler({ configurationService: {
    getPolicy: () => policy, getPromptStrategy: id => config.getPromptStrategy(id)
  } });
  const options = { providerId: 'modelark', referencePlan };
  const result = bounded.renderForProvider(packet, options);
  assert.ok(result.prompt.length <= policy.looksOnlyMode.maximumPromptCharacters);
  assert.doesNotMatch(result.prompt, /CINEMATIC VIDEO EXECUTION PACKET/);
  assert.match(result.prompt, /Image 1.*Mira/);
  assert.match(result.prompt, /Image 2.*Kin/);
  assert.match(result.prompt, /Wait. at 1000ms/);
  assert.match(result.prompt, /Wait. at 3000ms/);
  assert.equal(bounded.renderForProvider(packet, options).promptFingerprint, result.promptFingerprint);
  packet.authorDirection = 'z'.repeat(5000);
  assert.throws(() => bounded.renderForProvider(packet, options), { code: 'cinematic_video_reference_prompt_too_long' });
  packet.referenceMode = 'first_frame';
  assert.throws(() => bounded.renderForProvider(packet, { providerId: 'gemini' }), { code: 'cinematic_video_reference_prompt_too_long' });
});

test('Look reference strategy maps Image 1 and multiple Characters without changing the first-frame packet', () => {
  const project = createSingleCharacterCinematicProject();
  const scene = project.scenes[0];
  const shot = scene.shots[0];
  const compiler = new CinematicVideoPacketCompiler();
  const packet = compiler.compile({ project, scene, shot });
  const single = compiler.renderForProvider(packet, { providerId: 'modelark' });
  const referencePlan = { inputMode: 'multimodal_reference', references: [
    { purpose: 'storyboard_opening' }, { roleName: 'Nara', lookName: 'Cafe' }, { roleName: 'Mai', lookName: 'Visitor' }
  ] };
  const result = compiler.renderForProvider(packet, { providerId: 'modelark', referencePlan });
  assert.match(result.prompt, /Image 1 is the Storyboard reference/);
  assert.match(result.prompt, /Image 2.*Nara/);
  assert.match(result.prompt, /Image 3.*Mai/);
  assert.match(result.prompt, /Do not copy a Look Sheet/);
  assert.match(result.prompt, /fine sensor noise/);
  assert.doesNotMatch(result.prompt, /immutable first frame|APPROVED START FRAME/);
  assert.equal(compiler.renderForProvider(packet, { providerId: 'modelark' }).prompt, single.prompt);
  referencePlan.references[1].lookName = 'x'.repeat(4000);
  assert.throws(() => compiler.renderForProvider(packet, { providerId: 'modelark', referencePlan }), { code: 'cinematic_video_reference_prompt_too_long' });
});
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
  assert.equal(first.contractVersion, 'cinematic-video-packet-v2');
  assert.equal(first.provenance.policyVersion, 6);
  assert.match(first.renderedPromptFingerprint, /^[a-f0-9]{64}$/);
  assert.equal(first.approvedStoryboardSourceFingerprint, shot.approvedStoryboardSource.sourceFingerprint);
  assert.match(first.providerIndependentPrompt, /APPROVED START FRAME/);
  assert.match(first.providerIndependentPrompt, /One primary action/);
  assert.ok(first.providerIndependentPrompt.length <= 3800);
});

test('looks-only packet ignores unused images, maps from Image 1 and keeps authored opening', () => {
  const project = createSingleCharacterCinematicProject();
  const scene = project.scenes[0];
  const shot = scene.shots[0];
  shot.videoReferenceMode = 'looks_only';
  shot.framing = 'Wide shot under the cafe awning';
  const compiler = new CinematicVideoPacketCompiler();
  const before = compiler.compile({ project, scene, shot });
  assert.equal(before.approvedStoryboardSourceFingerprint, null);
  assert.equal(before.findings.some(item => item.severity === 'blocking'), false);
  delete shot.approvedStoryboardSource;
  shot.version += 1;
  scene.version += 1;
  assert.equal(compiler.compile({ project, scene, shot }).packetFingerprint, before.packetFingerprint);
  const referencePlan = { mode: 'looks_only', inputMode: 'multimodal_reference', references: [
    { roleName: 'Mira', lookName: 'Cafe' }, { roleName: 'Kin', lookName: 'Visitor' }
  ] };
  const rendered = compiler.renderForProvider(before, { providerId: 'modelark', referencePlan }).prompt;
  assert.match(rendered, /Image 1.*Mira/);
  assert.match(rendered, /Image 2.*Kin/);
  assert.match(rendered, /Wide shot under the cafe awning/);
  assert.doesNotMatch(rendered, /immutable first frame|APPROVED START FRAME|Image 1 is the Storyboard|Animate the supplied first frame/);
  assert.match(rendered, /Never reproduce sheet panels/);
  shot.subjectAction = 'Pick up the cup';
  assert.notEqual(compiler.compile({ project, scene, shot }).packetFingerprint, before.packetFingerprint);
  referencePlan.references[0].roleName = 'a'.repeat(4000);
  assert.throws(() => compiler.renderForProvider(before, { providerId: 'modelark', referencePlan }), { code: 'cinematic_video_reference_prompt_too_long' });
});

test('Cinematic video packet renders deterministic provider strategies from one authority packet', () => {
  const project = createSingleCharacterCinematicProject();
  const scene = project.scenes[0];
  const shot = scene.shots[0];
  const compiler = new CinematicVideoPacketCompiler();
  const packet = compiler.compile({ project, scene, shot });
  const modelark = compiler.renderForProvider(packet, { providerId: 'modelark' });
  const modelarkReplay = compiler.renderForProvider(packet, { providerId: 'modelark' });
  const gemini = compiler.renderForProvider(packet, { providerId: 'gemini' });
  assert.equal(modelark.prompt, modelarkReplay.prompt);
  assert.equal(modelark.promptFingerprint, modelarkReplay.promptFingerprint);
  assert.notEqual(modelark.strategyId, gemini.strategyId);
  assert.notEqual(modelark.promptFingerprint, gemini.promptFingerprint);
  assert.doesNotMatch(modelark.prompt, /Project intent|Story plan/i);
  assert.match(modelark.prompt, /photorealistic live-action shot/i);
  assert.match(modelark.prompt, /natural breathing and blinking/i);
  assert.doesNotMatch(modelark.prompt, /AUTHOR DIRECTION/);
  assert.ok(modelark.prompt.length <= 3200);
});

test('Cinematic video packet compiles an optional creator motion correction into its fingerprint', () => {
  const project = createSingleCharacterCinematicProject();
  const scene = project.scenes[0];
  const shot = scene.shots[0];
  const compiler = new CinematicVideoPacketCompiler();
  const original = compiler.compile({ project, scene, shot });
  shot.additionalMotionDirection = 'Slow the push-in and stop before the hand reaches the switch.';
  const corrected = compiler.compile({ project, scene, shot });

  assert.equal(corrected.motion.additionalDirection, shot.additionalMotionDirection);
  assert.match(corrected.providerIndependentPrompt, /Creator motion correction: Slow the push-in/);
  assert.notEqual(corrected.packetFingerprint, original.packetFingerprint);
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

test('Cinematic video packet preserves the previous approved keyframe reference used by Storyboard', () => {
  const project = createSingleCharacterCinematicProject();
  const scene = project.scenes[0];
  const firstShot = scene.shots[0];
  const secondShot = structuredClone(firstShot);
  secondShot.id = 'shot_cafe_detail';
  secondShot.title = 'Detail after the establishing frame';
  secondShot.orderKey = 2;
  secondShot.approvedStoryboardAttemptId = 'attempt_storyboard_detail';
  secondShot.approvedStoryboardSource = {
    ...secondShot.approvedStoryboardSource,
    assetId: 'asset_storyboard_detail',
    assetVersionId: 'asset_storyboard_detail_v1',
    sourceJobId: 'job_storyboard_detail',
    sourceFingerprint: 'fingerprint_storyboard_detail'
  };
  scene.shots.push(secondShot);
  scene.shotOrder.push(secondShot.id);
  const approvedContract = new StoryboardKeyframeContractCompiler().compile({
    project,
    scene,
    shot: secondShot,
    referencePlan: {
      previousApprovedShotId: firstShot.id,
      previousApprovedSourceFingerprint: firstShot.approvedStoryboardSource.sourceFingerprint
    }
  });

  const packet = new CinematicVideoPacketCompiler().compile({
    project,
    scene,
    shot: secondShot,
    storyboardAttempt: {
      id: secondShot.approvedStoryboardAttemptId,
      keyframeContractFingerprint: approvedContract.sourceFingerprint
    }
  });

  assert.equal(packet.keyframeContractFingerprint, approvedContract.sourceFingerprint);
  assert.ok(!packet.findings.some(item => item.code === 'cinematic_video_keyframe_contract_stale'));
});

test('Cinematic video packet accepts the bounded legacy fingerprint created before approval increments Shot version', () => {
  const project = createSingleCharacterCinematicProject();
  const scene = project.scenes[0];
  const currentShot = { ...scene.shots[0], version: 2 };
  const generationContract = new StoryboardKeyframeContractCompiler().compile({
    project,
    scene,
    shot: { ...currentShot, version: 1 }
  });
  const {
    sourceFingerprint: _sourceFingerprint,
    providerIndependentPrompt,
    ...legacyContract
  } = generationContract;
  delete legacyContract.projectVersion;
  const legacyFingerprint = crypto.createHash('sha256')
    .update(JSON.stringify({ ...legacyContract, providerIndependentPrompt }))
    .digest('hex');
  const storyboardAttempt = {
    ...project.generationAttempts.find(item => item.id === currentShot.approvedStoryboardAttemptId),
    keyframeContractFingerprint: legacyFingerprint
  };

  const packet = new CinematicVideoPacketCompiler().compile({
    project,
    scene,
    shot: currentShot,
    storyboardAttempt
  });

  assert.ok(!packet.findings.some(item => item.code === 'cinematic_video_keyframe_contract_stale'));
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
