import assert from 'node:assert/strict';
import test from 'node:test';
import { VideoCapabilityRegistry, assertFirstFramePolicy } from '../server/domain/generation/VideoCapabilityRegistry.js';
import { CinematicVideoReferencePlanService } from '../server/domain/cinematic/CinematicVideoReferencePlanService.js';
import { CinematicVideoPacketCompiler } from '../server/domain/cinematic/CinematicVideoPacketCompiler.js';
import { createSingleCharacterCinematicProject } from './fixtures/cinematic/cinematicProjectFixtures.js';

test('first-frame policy blocks frame modes and embedded opening references, not ordinary references', () => {
  const disabled = new VideoCapabilityRegistry({ seedanceFirstFrameEnabled: false, developmentPocEnabled: true });
  const enabled = new VideoCapabilityRegistry({ seedanceFirstFrameEnabled: true, developmentPocEnabled: true });
  const model = disabled.resolve('modelark', 'dreamina-seedance-2-5-260628');
  assert.equal(model.firstFrameEnabled, false);
  for (const input of [{ inputMode: 'image_to_video' }, { inputMode: 'first_last_frame' },
    { inputMode: 'multimodal_reference', references: [{ role: 'reference_image', purpose: 'storyboard_opening' }] },
    { inputMode: 'multimodal_reference', references: [{ role: 'reference_image', purpose: 'opening_frame' }] }]) {
    assert.throws(() => assertFirstFramePolicy(input, model), { code: 'video_first_frame_disabled' });
  }
  assert.doesNotThrow(() => assertFirstFramePolicy({ inputMode: 'multimodal_reference', references: [{ purpose: 'generated_look' }] }, model));
  assert.doesNotThrow(() => assertFirstFramePolicy({ inputMode: 'multimodal_reference', references: [{ purpose: 'image_reference' }] }, model));
  assert.doesNotThrow(() => assertFirstFramePolicy({ inputMode: 'text_to_video' }, model));
  assert.doesNotThrow(() => assertFirstFramePolicy({ inputMode: 'image_to_video' }, enabled.resolve(model.providerId, model.modelId)));
  assert.doesNotThrow(() => assertFirstFramePolicy({ inputMode: 'image_to_video' }, disabled.resolve('gemini', 'veo-3.1-generate-preview')));
});

test('no-Cast text-only packet has authored composition and no frame or Look requirement', async () => {
  const project = createSingleCharacterCinematicProject();
  const scene = project.scenes[0], shot = scene.shots[0];
  scene.castMode = shot.castMode = 'none';
  scene.castAssignmentIds = shot.castAssignmentIds = [];
  scene.wardrobeLookIds = shot.wardrobeLookIds = [];
  shot.videoReferenceMode = 'text_only';
  const savedImage = structuredClone(shot.approvedStoryboardSource);
  const packet = new CinematicVideoPacketCompiler().compile({ project, scene, shot });
  assert.equal(packet.referenceStrategy.mode, 'text_only');
  assert.equal(packet.approvedStoryboardSourceFingerprint, null);
  assert.doesNotMatch(packet.providerIndependentPrompt, /Animate the supplied|Use character look sheet|APPROVED START FRAME/);
  assert.match(packet.providerIndependentPrompt, /No reference image/);
  assert.deepEqual(shot.approvedStoryboardSource, savedImage);
  const plan = await new CinematicVideoReferencePlanService().prepare({ project, scene, shot, mode: 'text_only', model: { inputModes: ['text_to_video'] } });
  assert.deepEqual(plan.references, []);
  assert.equal(plan.inputMode, 'text_to_video');
});

test('new audio direction keeps all dialogue, named speakers, delivery and sound without changing legacy packets', () => {
  const project = createSingleCharacterCinematicProject();
  const scene = project.scenes[0], shot = scene.shots[0];
  shot.videoReferenceMode = 'looks_only';
  const compiler = new CinematicVideoPacketCompiler();
  const baseline = compiler.compile({ project, scene, shot });
  assert.equal(baseline.audio.directionVersion, undefined);
  shot.audioDirectionVersion = 1;
  shot.dialogueCues = ['Hello', 'Wait here', 'Thank you'].map((text, i) => ({ text, speakerCastAssignmentId: project.castAssignments[0].id, delivery: 'quietly', startOffsetMs: i * 1000, estimatedDurationMs: 1000, speakerVisible: true }));
  shot.audioCues = [{ kind: 'ambience', description: 'Rain on the awning', startOffsetMs: 0 }, { kind: 'sfx', description: 'A soft bell', startOffsetMs: 2000 }];
  const packet = compiler.compile({ project, scene, shot });
  assert.equal(packet.audio.dialogueCues.length, 3);
  for (const line of shot.dialogueCues) assert.ok(packet.providerIndependentPrompt.includes(line.text));
  assert.ok(packet.providerIndependentPrompt.includes(project.castAssignments[0].displayName));
  assert.match(packet.providerIndependentPrompt, /quietly/);
  assert.match(packet.providerIndependentPrompt, /Rain on the awning/);
  assert.match(packet.providerIndependentPrompt, /A soft bell/);
});
