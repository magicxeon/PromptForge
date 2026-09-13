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

test('final reference budget shortens only labels after provider wording and mappings are added', () => {
  const project = createSingleCharacterCinematicProject();
  const scene = project.scenes[0], shot = scene.shots[0];
  const config = new CinematicVideoPacketConfigurationService();
  const policy = config.getPolicy();
  const compiler = new CinematicVideoPacketCompiler({ configurationService: {
    getPolicy: () => policy, getPromptStrategy: id => config.getPromptStrategy(id)
  } });
  const packet = compiler.compile({ project, scene, shot });
  packet.storyboardRenderStyle = 'faceless_previs_v1';
  packet.audio.dialogueCues = [
    { speaker: 'Lalin', text: 'Thank you.', startOffsetMs: 2000 },
    { speaker: 'Lalin', text: 'Thank you.', startOffsetMs: 3000 }
  ];
  const options = { providerId: 'modelark', referencePlan: { inputMode: 'multimodal_reference',
    storyboardRenderStyle: 'faceless_previs_v1', references: [{},
      { roleName: 'Lalin', lookName: 'Flower shop' }, { roleName: 'Kin', lookName: 'Rain' }] } };
  const original = compiler.renderForProvider(packet, options).prompt;
  const compactLength = original.split('\n\n').slice(1).map(value => value.replace(/\s+/g, ' ').trim()).join('\n').length;
  policy.compositionReferenceMode.maximumPromptCharacters = compactLength - 3;
  const before = structuredClone(packet);
  const rendered = compiler.renderForProvider(packet, options);
  assert.ok(rendered.prompt.length <= policy.compositionReferenceMode.maximumPromptCharacters);
  assert.match(rendered.prompt, /^Create one fully photorealistic/);
  assert.match(rendered.prompt, /References\/start:/);
  assert.match(rendered.prompt, /Image 2.*Lalin/);
  assert.match(rendered.prompt, /Image 3.*Kin/);
  assert.match(rendered.prompt, /BEFORE output time 0:00/);
  assert.match(rendered.prompt, /Thank you. at 2000ms/);
  assert.match(rendered.prompt, /Thank you. at 3000ms/);
  assert.ok(rendered.prompt.includes(packet.motion.primaryAction));
  assert.deepEqual(packet, before);
  assert.deepEqual(compiler.renderForProvider(packet, options), rendered);
  policy.compositionReferenceMode.maximumPromptCharacters = 4000;
  assert.equal(compiler.renderForProvider(packet, options).prompt, original);
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
  assert.match(result.prompt, /Image 1 governs opening composition/);
  assert.match(result.prompt, /Image 2.*Nara/);
  assert.match(result.prompt, /Image 3.*Mai/);
  assert.match(result.prompt, /Do not copy a Look Sheet/);
  assert.match(result.prompt, /fine sensor grain/);
  assert.match(result.prompt, /BEFORE output time 0:00 \(frame 0\).*OWN Look Sheet/);
  assert.match(result.prompt, /Looks OVERRIDE scene facial appearance/);
  assert.doesNotMatch(result.prompt, /immutable first frame|APPROVED START FRAME/);
  assert.equal(compiler.renderForProvider(packet, { providerId: 'modelark' }).prompt, single.prompt);
  referencePlan.references[1].lookName = 'x'.repeat(4000);
  assert.throws(() => compiler.renderForProvider(packet, { providerId: 'modelark', referencePlan }), { code: 'cinematic_video_reference_prompt_too_long' });
});
import {
  createMultiCharacterCinematicProject,
  createSingleCharacterCinematicProject
} from './fixtures/cinematic/cinematicProjectFixtures.js';

for (const referenceMode of ['storyboard_only', 'storyboard_and_looks', 'looks_only']) {
  test(`action duration estimate overflow is advisory in ${referenceMode}`, () => {
    const project = createSingleCharacterCinematicProject();
    const scene = project.scenes[0];
    const shot = scene.shots[0];
    shot.durationMs = 4000;
    shot.estimatedActionDurationMs = 5000;
    shot.videoReferenceMode = referenceMode;
    shot.approvedStoryboardSource.storyboardRenderStyle = 'faceless_previs_v1';
    const before = structuredClone(project);
    const packet = new CinematicVideoPacketCompiler().compile({ project, scene, shot });
    assert.equal(packet.findings.find(item => item.code === 'cinematic_video_action_overflow')?.severity, 'warning');
    assert.equal(packet.findings.some(item => item.severity === 'blocking'), false);
    assert.deepEqual(packet.timing, { plannedDurationMs: 4000, estimatedActionDurationMs: 5000 });
    assert.deepEqual(project, before);
  });
}

test('action duration estimate warning cannot bypass missing action or source', () => {
  const project = createSingleCharacterCinematicProject();
  const scene = project.scenes[0];
  const shot = scene.shots[0];
  shot.estimatedActionDurationMs = shot.durationMs + 1000;
  shot.subjectAction = '';
  shot.approvedStoryboardSource = null;
  const packet = new CinematicVideoPacketCompiler().compile({ project, scene, shot });
  for (const code of ['cinematic_video_action_required', 'cinematic_storyboard_source_required']) {
    assert.ok(packet.findings.some(item => item.code === code && item.severity === 'blocking'));
  }
});

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
  assert.equal(first.provenance.policyVersion, new CinematicVideoPacketConfigurationService().getPolicy().version);
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
  assert.match(modelark.prompt, /natural breathing, blinking/i);
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

test('Plan revision identity does not invalidate an unchanged approved still after a duration edit', () => {
  const project = createSingleCharacterCinematicProject();
  const scene = project.scenes[0];
  const shot = scene.shots[0];
  const oldPlan = { ...project.storyPlanVersions.at(-1), id: 'plan_before_duration', sceneIds: [scene.id] };
  project.storyPlanVersions = [oldPlan];
  const approved = new StoryboardKeyframeContractCompiler().compile({ project, scene, shot });
  const storyboardAttempt = { keyframeContractFingerprint: approved.sourceFingerprint };
  const compiler = new CinematicVideoPacketCompiler();
  const before = compiler.compile({ project, scene, shot, storyboardAttempt });
  project.storyPlanVersions.push({ ...oldPlan, id: 'plan_after_duration' });
  shot.durationMs += 4000;
  shot.version += 1;
  const unchangedProject = structuredClone(project);
  const after = compiler.compile({ project, scene, shot, storyboardAttempt });
  assert.ok(!after.findings.some(item => item.code === 'cinematic_video_keyframe_contract_stale'));
  assert.equal(after.timing.plannedDurationMs, shot.durationMs);
  assert.notEqual(after.packetFingerprint, before.packetFingerprint);
  assert.equal(after.approvedStoryboardSourceFingerprint, before.approvedStoryboardSourceFingerprint);
  assert.deepEqual(project, unchangedProject);

  const changedShot = { ...shot, framing: 'New wide composition with different subject placement' };
  assert.ok(compiler.compile({ project, scene, shot: changedShot, storyboardAttempt }).findings
    .some(item => item.code === 'cinematic_video_keyframe_contract_stale'));
  project.storyPlanVersions = [{ ...oldPlan, id: 'plan_after_duration' }];
  assert.ok(compiler.compile({ project, scene, shot, storyboardAttempt }).findings
    .some(item => item.code === 'cinematic_video_keyframe_contract_stale'));
});

test('Plan revision fallback does not accept identities belonging to another Scene', () => {
  const project = createSingleCharacterCinematicProject();
  const scene = project.scenes[0];
  const shot = scene.shots[0];
  const approved = new StoryboardKeyframeContractCompiler().compile({ project, scene, shot });
  const oldPlan = project.storyPlanVersions.at(-1);
  project.storyPlanVersions = [
    { ...oldPlan, sceneIds: ['unrelated_scene'] },
    { ...oldPlan, id: 'new_plan', sceneIds: [scene.id] }
  ];
  const packet = new CinematicVideoPacketCompiler().compile({
    project, scene, shot, storyboardAttempt: { keyframeContractFingerprint: approved.sourceFingerprint }
  });
  assert.ok(packet.findings.some(item => item.code === 'cinematic_video_keyframe_contract_stale'));
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

for (const [mode, style] of [
  ['storyboard_only', null],
  ['storyboard_and_looks', 'concept_sketch_v1'],
  ['storyboard_and_looks', 'photorealistic_storyboard_v1'],
  ['storyboard_and_looks', 'faceless_previs_v1'],
  ['looks_only', null],
  ['text_only', null]
]) {
  test(`manual video timeline: exact local intervals and no image-only direction in ${style || mode}`, () => {
    const input = manualPacketInput(mode, style);
    const compiler = new CinematicVideoPacketCompiler();
    const before = structuredClone(input);
    const packet = compiler.compile(input);
    const referencePlan = packetReferencePlan(mode, style);
    const prompts = [packet.providerIndependentPrompt,
      compiler.renderForProvider(packet, { providerId: 'modelark', referencePlan }).prompt];
    assert.deepEqual(input, before);
    assert.deepEqual(packet.motion.timeline, input.shot.videoActionTimeline);
    assert.notEqual(packet.motion.timeline, input.shot.videoActionTimeline);
    assert.equal(packet.authorDirection, '');
    assert.equal(packet.motion.primaryAction, '');
    assert.equal(packet.motion.additionalDirection, '');
    assert.equal(packet.findings.some(item => item.severity === 'blocking'), false);
    for (const prompt of prompts) {
      const intervals = [...prompt.matchAll(/\b(\d+:\d{2}(?:\.\d{3})?)-(\d+:\d{2}(?:\.\d{3})?):/g)]
        .map(match => `${match[1]}-${match[2]}`);
      assert.deepEqual(intervals, ['0:00-0:01.250', '0:01.250-0:03.005', '0:03.500-0:06']);
      assert.match(prompt, /local to this clip starting at 0:00/);
      assert.match(prompt, /exact intervals.*preserve state in gaps/);
      assert.match(prompt, /Clip duration: 6.000s/);
      assert.match(prompt, /no automatic extra events/);
      assert.match(prompt, /Continuous real video throughout/);
      assert.match(prompt, /Nara: Wait. at 1000ms/);
      assert.doesNotMatch(prompt, /One primary action|invent a second action|Creator motion correction|LEGACY_|IMAGE_ONLY|zero-time-only still|AUTHOR DIRECTION|\{actionScope\}/);
      assert.ok(prompt.length <= (mode === 'storyboard_only' ? 3200 : 4000));
      for (const event of packet.motion.timeline) assert.ok(prompt.includes(event.description));
    }
    if (mode === 'text_only') {
      assert.equal(packet.authority.characters.length, 0);
      assert.doesNotMatch(prompts[1], /OWN Look Sheet|reconstruct every visible face|PERFORMANCE:/);
      assert.match(prompts[1], /Do not introduce people/);
    } else if (mode !== 'storyboard_only') {
      assert.match(prompts[1], new RegExp(`Image ${mode === 'looks_only' ? 1 : 2}.*Nara`));
      assert.match(prompts[1], /BEFORE output time 0:00 \(frame 0\).*anatomically complete photographic face.*OWN Look Sheet/);
      assert.match(prompts[1], /Looks OVERRIDE scene facial appearance/);
      assert.match(prompts[1], /Preserve head pose and occlusion; no forced frontal faces or features on back-facing\/hidden heads/);
      assert.match(prompts[1], /Keep identity through motion, turns and reappearance/);
      assert.match(prompts[1], /No blank initial faces, guide lines, delayed face reveal, morph or fade-in/);
      assert.doesNotMatch(prompts[1], /immutable first frame|Animate the supplied first frame/);
    }
  });
}

test('manual video timeline: empty or absent timeline blocks even with a legacy subject action', () => {
  for (const mode of ['storyboard_only', 'storyboard_and_looks', 'looks_only', 'text_only']) {
    for (const timeline of [undefined, null, []]) {
      const input = manualPacketInput(mode, 'faceless_previs_v1');
      input.shot.videoActionTimeline = timeline;
      const packet = new CinematicVideoPacketCompiler().compile(input);
      assert.deepEqual(packet.motion.timeline, []);
      assert.ok(packet.findings.some(item => item.severity === 'blocking'
        && item.code === 'cinematic_video_timeline_required' && item.fieldPath === 'shot.videoActionTimeline'));
      assert.doesNotMatch(packet.providerIndependentPrompt, /LEGACY_ACTION/);
    }
  }
});

test('manual video timeline: legacy film-direction fields are optional, but selected Cast remains required', () => {
  for (const mode of ['looks_only', 'text_only']) {
    const input = manualPacketInput(mode);
    for (const key of ['visibleMoment', 'subjectAction', 'emotionalTarget']) input.shot[key] = '';
    input.scene.emotionalStart = '';
    input.scene.emotionalEnd = '';
    const compiler = new CinematicVideoPacketCompiler();
    assert.equal(compiler.compile(input).findings.some(item => item.severity === 'blocking'), false);
    if (mode === 'looks_only') {
      input.project.castAssignments = [];
      assert.ok(compiler.compile(input).findings.some(item => item.code === 'cast_authority_missing' && item.severity === 'blocking'));
    }
  }
});

test('video face authority: empty-cast composition never requests reconstruction or adds Look mappings', () => {
  for (const style of ['concept_sketch_v1', 'photorealistic_storyboard_v1', 'faceless_previs_v1']) {
    for (const manualStoryboard of [false, true]) {
      const input = manualPacketInput('storyboard_and_looks', style);
      input.shot.manualStoryboard = manualStoryboard;
      input.shot.castMode = 'none';
      const compiler = new CinematicVideoPacketCompiler();
      const packet = compiler.compile(input);
      const referencePlan = packetReferencePlan('storyboard_and_looks', style);
      referencePlan.references.pop();
      const prompts = [packet.providerIndependentPrompt,
        compiler.renderForProvider(packet, { providerId: 'modelark', referencePlan }).prompt];
      assert.equal(packet.authority.characters.length, 0);
      assert.equal(packet.authority.looks.length, 0);
      for (const prompt of prompts) {
        assert.doesNotMatch(prompt, /reconstruct every visible face|OWN Look Sheet|Image 2|PERFORMANCE:/);
        assert.ok(prompt.length <= 4000);
      }
    }
  }
});

test('manual video timeline: normalized events bind the fingerprint without mutating Shot data', () => {
  const input = manualPacketInput();
  const compiler = new CinematicVideoPacketCompiler();
  const original = compiler.compile(input);
  for (const [key, value] of [['startMs', 3501], ['endMs', 5999], ['description', 'Nara places the cup on the counter.']]) {
    const changed = structuredClone(input);
    changed.shot.videoActionTimeline[2][key] = value;
    const packet = compiler.compile(changed);
    assert.notEqual(packet.packetFingerprint, original.packetFingerprint, key);
    assert.notEqual(packet.renderedPromptFingerprint, original.renderedPromptFingerprint, key);
  }
  const normalized = structuredClone(input);
  normalized.shot.videoActionTimeline[0].description = `  ${input.shot.videoActionTimeline[0].description.replaceAll(' ', '\n  ')}  `;
  normalized.shot.videoActionTimeline[0].ignored = 'not part of the packet contract';
  assert.equal(compiler.compile(normalized).packetFingerprint, original.packetFingerprint);
  const secondClip = structuredClone(input);
  secondClip.shot.id = 'another_clip';
  assert.match(compiler.compile(secondClip).providerIndependentPrompt, /0:00-0:01.250:/);
  const longer = structuredClone(input);
  longer.shot.durationMs = 7000;
  assert.notEqual(compiler.compile(longer).packetFingerprint, original.packetFingerprint);
  assert.equal(compiler.compile(input).packetFingerprint, original.packetFingerprint);
});

test('manual video timeline: twelve events and Look mappings survive prompt budget compaction without truncation', () => {
  const input = manualPacketInput();
  input.shot.videoActionTimeline = Array.from({ length: 12 }, (_, index) => ({
    startMs: index * 500, endMs: (index + 1) * 500, description: `Nara performs authored gesture ${index + 1}.`
  }));
  const compiler = new CinematicVideoPacketCompiler();
  const packet = compiler.compile(input);
  const options = { providerId: 'modelark', referencePlan: packetReferencePlan('looks_only') };
  options.referencePlan.references.push({ roleName: 'Mai', lookName: 'Visitor' });
  const baseline = compiler.renderForProvider(packet, options).prompt;
  assert.ok(baseline.length <= 4000);
  const configuration = new CinematicVideoPacketConfigurationService();
  const policy = configuration.getPolicy();
  policy.looksOnlyMode.maximumPromptCharacters = baseline.length - 1;
  const bounded = new CinematicVideoPacketCompiler({ configurationService: {
    getPolicy: () => policy, getPromptStrategy: id => configuration.getPromptStrategy(id)
  } });
  const result = bounded.renderForProvider(packet, options);
  assert.ok(result.prompt.length <= policy.looksOnlyMode.maximumPromptCharacters);
  assert.doesNotMatch(result.prompt, /CINEMATIC VIDEO EXECUTION PACKET/);
  assert.match(result.prompt, /Image 1.*Nara/);
  assert.match(result.prompt, /Image 2.*Mai/);
  assert.match(result.prompt, /BEFORE output time 0:00/);
  let lastIndex = -1;
  for (const event of packet.motion.timeline) {
    const index = result.prompt.indexOf(event.description);
    assert.ok(index > lastIndex);
    assert.equal(result.prompt.split(event.description).length - 1, 1);
    lastIndex = index;
  }
  assert.equal(bounded.renderForProvider(packet, options).promptFingerprint, result.promptFingerprint);
  packet.motion.timeline[11].description = 'z'.repeat(5000);
  assert.throws(() => bounded.renderForProvider(packet, options), { code: 'cinematic_video_reference_prompt_too_long' });
  input.shot.videoActionTimeline[11].description = 'z'.repeat(5000);
  assert.throws(() => compiler.compile(input), { code: 'cinematic_video_reference_prompt_too_long' });
});

test('manual video timeline: missing and stale sources and Look authority still block', () => {
  const compiler = new CinematicVideoPacketCompiler();
  const missing = manualPacketInput('storyboard_and_looks', 'faceless_previs_v1');
  missing.shot.approvedStoryboardSource = null;
  assert.ok(compiler.compile(missing).findings.some(item => item.code === 'cinematic_storyboard_source_required' && item.severity === 'blocking'));
  const stale = manualPacketInput('storyboard_and_looks', 'faceless_previs_v1');
  stale.storyboardAttempt = { keyframeContractFingerprint: 'stale-keyframe' };
  assert.ok(compiler.compile(stale).findings.some(item => item.code === 'cinematic_video_keyframe_contract_stale' && item.severity === 'blocking'));
  const unready = manualPacketInput();
  unready.project.castAssignments[0].identityReady = false;
  unready.project.castAssignments[0].looks[0].locked = false;
  for (const code of ['character_identity_not_ready', 'look_authority_not_ready']) {
    assert.ok(compiler.compile(unready).findings.some(item => item.code === code && item.severity === 'blocking'));
  }
  const missingCast = manualPacketInput();
  missingCast.project.castAssignments = [];
  assert.ok(compiler.compile(missingCast).findings.some(item => item.code === 'cast_authority_missing' && item.severity === 'blocking'));
});

test('manual video timeline: legacy optional fields do not change nonmanual temporal rendering or empty-cast behavior', () => {
  for (const mode of ['storyboard_only', 'storyboard_and_looks', 'looks_only', 'text_only']) {
    const input = manualPacketInput(mode, 'faceless_previs_v1');
    delete input.shot.manualStoryboard;
    delete input.shot.videoActionTimeline;
    const compiler = new CinematicVideoPacketCompiler();
    const before = compiler.compile(input);
    const options = { providerId: 'modelark', referencePlan: packetReferencePlan(mode, 'faceless_previs_v1') };
    const prompt = compiler.renderForProvider(before, options).prompt;
    input.shot.manualStoryboard = false;
    input.shot.videoActionTimeline = [{ startMs: 0, endMs: 1000, description: 'UNUSED_MANUAL_EVENT' }];
    const after = compiler.compile(input);
    assert.equal(Object.hasOwn(after.motion, 'timeline'), false);
    assert.equal(after.packetFingerprint, before.packetFingerprint);
    assert.equal(after.providerIndependentPrompt, before.providerIndependentPrompt);
    assert.equal(compiler.renderForProvider(after, options).prompt, prompt);
    assert.match(prompt, /One primary action: LEGACY_ACTION/);
    assert.match(prompt, /Do not invent a second action/);
    assert.doesNotMatch(prompt, /UNUSED_MANUAL_EVENT|Manual timeline/);
    if (mode === 'text_only') assert.doesNotMatch(prompt, /PERFORMANCE:|OWN Look Sheet/);
  }
});

function manualPacketInput(mode = 'looks_only', style = null) {
  const project = createSingleCharacterCinematicProject();
  const scene = project.scenes[0];
  const shot = scene.shots[0];
  shot.manualStoryboard = true;
  shot.videoReferenceMode = mode;
  shot.durationMs = 6000;
  shot.videoActionTimeline = [
    { startMs: 0, endMs: 1250, description: 'Nara lifts the cup.' },
    { startMs: 1250, endMs: 3005, description: 'Nara turns toward the window.' },
    { startMs: 3500, endMs: 6000, description: 'Nara sets down the cup.' }
  ];
  shot.prompt = 'IMAGE_ONLY blank-face image prompt; zero-time-only still; freeze the entire clip.';
  shot.visibleMoment = 'IMAGE_ONLY opening still.';
  shot.subjectAction = 'LEGACY_ACTION takes a step';
  shot.additionalMotionDirection = 'LEGACY_CORRECTION adds a jump';
  shot.performanceCue = 'LEGACY_PERFORMANCE takes a breath';
  shot.cameraMovement = 'LEGACY_CAMERA adds a push-in';
  shot.continuityExit = 'LEGACY_EXIT step completed';
  shot.transitionToNext = 'LEGACY_TRANSITION cut to another scene';
  shot.dialogueCues = [{ speakerCastAssignmentId: 'Nara', text: 'Wait.', startOffsetMs: 1000 }];
  if (style) shot.approvedStoryboardSource.storyboardRenderStyle = style;
  if (mode === 'text_only') {
    shot.castMode = 'none';
    shot.videoActionTimeline.forEach((event, index) => { event.description = `The curtain moves in breeze phase ${index + 1}.`; });
  }
  return { project, scene, shot };
}

function packetReferencePlan(mode, style = null) {
  const look = { roleName: 'Nara', lookName: 'Quiet Resolve' };
  if (mode === 'text_only') return { mode, references: [] };
  if (mode === 'storyboard_only') return null;
  return { mode, inputMode: 'multimodal_reference',
    ...(style && mode === 'storyboard_and_looks' ? { storyboardRenderStyle: style } : {}),
    references: mode === 'looks_only' ? [look] : [{ purpose: style === 'concept_sketch_v1' ? 'sketch_composition' : 'storyboard_composition' }, look]
  };
}
