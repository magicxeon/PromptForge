import assert from 'node:assert/strict';
import test from 'node:test';
import { CinematicKeyframeConfigurationService } from '../server/domain/cinematic/CinematicKeyframeConfigurationService.js';
import { resolveStoryboardPromptPolicy, storyboardCompositionPurpose } from '../server/domain/cinematic/CinematicStoryboardRenderStyle.js';
import { CinematicVideoPacketCompiler } from '../server/domain/cinematic/CinematicVideoPacketCompiler.js';
import { CinematicTimelineCompiler } from '../server/domain/cinematic/CinematicTimelineCompiler.js';
import { CinematicApplicationService } from '../server/domain/cinematic/CinematicApplicationService.js';
import { reconcileVideoDuration } from '../server/domain/generation/VideoDurationReconciliation.js';
import { createSingleCharacterCinematicProject } from './fixtures/cinematic/cinematicProjectFixtures.js';

test('White Previs is a separate facial treatment without changing normal or blank faces', () => {
  const policy = new CinematicKeyframeConfigurationService().getCompilerConfiguration().providerPromptPolicy;
  assert.equal(resolveStoryboardPromptPolicy(policy, true, 'white_previs').renderStyle, 'white_previs_v1');
  assert.equal(resolveStoryboardPromptPolicy(policy, true, 'blank').renderStyle, 'faceless_previs_v1');
  assert.equal(resolveStoryboardPromptPolicy(policy, false, 'white_previs').renderStyle, 'photorealistic_storyboard_v1');
  assert.equal(storyboardCompositionPurpose('white_previs_v1'), 'storyboard_composition');
});

test('White approved composition adds lead-in without reducing the authored action duration', () => {
  const project = createSingleCharacterCinematicProject();
  const scene = project.scenes[0];
  const shot = scene.shots[0];
  shot.durationMs = 4000;
  shot.videoReferenceMode = 'storyboard_and_looks';
  shot.approvedStoryboardSource.storyboardRenderStyle = 'white_previs_v1';
  const compiler = new CinematicVideoPacketCompiler();
  const packet = compiler.compile({ project, scene, shot });
  assert.equal(packet.timing.leadInMs, 500);
  const prompt = compiler.renderForProvider(packet, { providerId: 'modelark' }).prompt;
  assert.match(prompt, /PRE-ROLL/);
  assert.match(prompt, /full usable action lasts 4\.000s/);
  const duration = reconcileVideoDuration({ model: { durations: [4, 5, 6] }, plannedDurationSeconds: 4.5, requestedDurationSeconds: 4 });
  assert.equal(duration.renderDurationSeconds, 5);
  assert.equal(duration.trimDurationSeconds, 0.5);
  shot.videoReferenceMode = 'looks_only';
  assert.equal(compiler.compile({ project, scene, shot }).timing.leadInMs, undefined);
});

test('Finish defaults to usable range while preserving explicit trim and legacy Takes', () => {
  const project = createSingleCharacterCinematicProject();
  const shot = project.scenes[0].shots[0];
  const attempt = project.generationAttempts.find(item => item.id === shot.approvedVideoAttemptId);
  const compiler = new CinematicTimelineCompiler();
  const entry = { shotId: shot.id, transition: 'cut' };
  assert.equal(compiler.compile({ entries: [entry] }, project).entries[0].trimInMs, 0);
  attempt.usableRange = { leadInMs: 500, usableDurationMs: 4000, trimInMs: 500, trimOutMs: 4500 };
  const timeline = compiler.compile({ entries: [entry] }, project);
  assert.equal(timeline.entries[0].trimInMs, 500);
  assert.equal(timeline.entries[0].trimOutMs, 4500);
  assert.equal(timeline.durationMs, 4000);
  assert.equal(compiler.compile({ entries: [{ ...entry, trimInMs: 0, trimOutMs: 3000 }] }, project).durationMs, 3000);
});

test('White pre-roll offsets exact manual events and audio without rewriting saved Shot timing', () => {
  const project = createSingleCharacterCinematicProject(), scene = project.scenes[0], shot = scene.shots[0];
  shot.durationMs = 4000; shot.manualStoryboard = true; shot.videoReferenceMode = 'storyboard_and_looks';
  shot.approvedStoryboardSource.storyboardRenderStyle = 'white_previs_v1';
  shot.videoActionTimeline = [{ startMs: 0, endMs: 1000, description: 'Grip the rim.' }, { startMs: 1000, endMs: 4000, description: 'Keep the pot grounded.' }];
  shot.dialogueCues = [{ speaker: 'Mira', text: 'Wait.', startOffsetMs: 1000 }];
  shot.audioCues = [{ kind: 'ambience', description: 'Rain', startOffsetMs: 0 }];
  const before = structuredClone(shot);
  const compiler = new CinematicVideoPacketCompiler();
  const prompt = compiler.renderForProvider(compiler.compile({ project, scene, shot }), { providerId: 'modelark' }).prompt;
  assert.match(prompt, /0:00\.500-0:01\.500: Grip the rim/);
  assert.match(prompt, /0:01\.500-0:04\.500: Keep the pot grounded/);
  assert.match(prompt, /Wait\. at 1500ms/);
  assert.match(prompt, /Rain at 500ms/);
  assert.deepEqual(shot, before);
});

test('White quote and submit delegate the same buffered duration to Generation and retain usable range', async () => {
  let project = createSingleCharacterCinematicProject();
  const actor = { userId: project.ownerUserId, username: 'fixture_owner' };
  const scene = project.scenes[0], shot = scene.shots[0];
  shot.durationMs = 4000; shot.videoReferenceMode = 'storyboard_and_looks';
  shot.approvedStoryboardSource.storyboardRenderStyle = 'white_previs_v1';
  project.generationAttempts = []; delete shot.approvedStoryboardAttemptId;
  const calls = [];
  const service = new CinematicApplicationService({
    repository: { findForActor: async () => structuredClone(project), mutateForActor: async (_id, _actor, fn) => {
      const draft = structuredClone(project); const result = await fn(draft); project = draft; return structuredClone(result);
    } },
    videoCapabilities: { resolve: () => ({ firstFrameEnabled: false, durations: [4, 5, 6, 8] }) },
    videoGenerationService: { getStoredTaskSummaries: async () => [],
      quote: async request => { calls.push(request); return { estimate: { estimateId: 'white_quote', estimatedCredits: 10 } }; },
      submit: async request => { calls.push(request); return { id: 'video_white', status: 'provider_queued', durationSeconds: 5, billingStatus: 'reserved' }; }
    }
  });
  service.videoReferencePlanService = { prepare: async () => ({ mode: 'storyboard_and_looks', inputMode: 'multimodal_reference', storyboardRenderStyle: 'white_previs_v1',
    references: [{ role: 'reference_image', purpose: 'storyboard_composition', assetId: shot.approvedStoryboardSource.assetId,
      referenceImageUrl: shot.approvedStoryboardSource.imageUrl }] }) };
  const context = await service.getProduceShotContext(project.id, scene.id, shot.id, actor);
  const input = { expectedVersion: project.version, expectedShotVersion: shot.version,
    sourceFingerprint: shot.approvedStoryboardSource.sourceFingerprint, videoPacketFingerprint: context.videoPacket.packetFingerprint,
    referenceMode: 'storyboard_and_looks', providerId: 'modelark', modelId: 'fixture', prompt: context.videoPacket.providerIndependentPrompt,
    aspectRatio: '9:16', resolution: '720p', durationSeconds: 4, audioMode: 'none' };
  const quote = await service.quoteVideoAttempt(project.id, scene.id, shot.id, input, actor);
  await assert.rejects(service.quoteVideoAttempt(project.id, scene.id, shot.id, { ...input, durationSeconds: 7 }, actor),
    { code: 'cinematic_take_duration_unsupported' });
  assert.equal(calls.length, 1, 'Unsupported explicit duration must not reach pricing');
  const result = await service.createVideoAttempt(project.id, scene.id, shot.id, { ...input, estimateId: quote.estimate.estimateId, idempotencyKey: 'white_submit' }, actor);
  assert.equal(calls[0].plannedDurationSeconds, 4.5);
  assert.equal(calls[1].plannedDurationSeconds, calls[0].plannedDurationSeconds);
  assert.equal(calls[1].prompt, calls[0].prompt);
  const attempt = project.generationAttempts.find(value => value.id === result.attemptId);
  assert.equal(attempt.renderDurationMs, 5000);
  assert.deepEqual(attempt.usableRange, quote.usableRange);
  assert.deepEqual(quote.usableRange, { leadInMs: 500, usableDurationMs: 4000, trimInMs: 500, trimOutMs: 4500 });
});
