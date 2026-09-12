import assert from 'node:assert/strict';
import test from 'node:test';
import { CinematicVideoReferencePlanService } from '../server/domain/cinematic/CinematicVideoReferencePlanService.js';
import { CinematicVideoPacketCompiler } from '../server/domain/cinematic/CinematicVideoPacketCompiler.js';
import { cinematicStoryboardPromptComposer } from '../server/domain/cinematic/CinematicStoryboardPromptComposer.js';
import { assertFirstFramePolicy, validateTrustedGeneratedImageSource } from '../server/domain/generation/VideoCapabilityRegistry.js';
import { createSingleCharacterCinematicProject } from './fixtures/cinematic/cinematicProjectFixtures.js';

test('sketch: opening composition works with first frames disabled and no visible cast', async () => {
  const project = createSingleCharacterCinematicProject();
  const scene = project.scenes[0], shot = scene.shots[0];
  shot.castMode = 'none';
  const source = { ...shot.approvedStoryboardSource, storyboardRenderStyle: 'concept_sketch_v1' };
  const model = { firstFrameEnabled: false, supportsCinematicLookReferences: true, inputModes: ['multimodal_reference'], referenceImageLimit: 3 };
  const service = new CinematicVideoReferencePlanService();
  const plan = await service.prepare({ project, scene, shot, source, mode: 'storyboard_and_looks', model });
  assert.equal(plan.references.length, 1);
  assert.equal(plan.references[0].purpose, 'sketch_composition');
  assert.equal(plan.references[0].role, 'reference_image');
  assert.doesNotThrow(() => assertFirstFramePolicy(plan, model));
  await assert.rejects(service.prepare({ project, scene, shot, source: { ...source, storyboardRenderStyle: null }, mode: 'storyboard_and_looks', model }), { code: 'video_first_frame_disabled' });
});

test('sketch: video prompt keeps drawing composition separate from live action and named Looks', () => {
  const project = createSingleCharacterCinematicProject();
  const scene = project.scenes[0], shot = scene.shots[0];
  const compiler = new CinematicVideoPacketCompiler();
  const packet = compiler.compile({ project, scene, shot });
  const referencePlan = { storyboardRenderStyle: 'concept_sketch_v1', inputMode: 'multimodal_reference', references: [
    { purpose: 'sketch_composition' }, { roleName: 'Lalin', lookName: 'Florist' }, { roleName: 'Kin', lookName: 'Visitor' }
  ] };
  const result = compiler.renderForProvider(packet, { providerId: 'modelark', referencePlan });
  assert.match(result.prompt, /photorealistic live-action/);
  assert.match(result.prompt, /storyboard concept sketch/);
  assert.match(result.prompt, /Image 2.*Lalin/);
  assert.match(result.prompt, /Image 3.*Kin/);
  assert.doesNotMatch(result.prompt, /immutable first frame|Animate the supplied first frame/);
  assert.ok(result.prompt.length <= 4000);
});

test('sketch: still compiler emits drawing instructions without losing opening position', () => {
  const prompt = cinematicStoryboardPromptComposer.compose({ context: { cinematicContainsPeople: false }, visualPrompt: 'A pot rests on the pavement. No movement has started.' });
  assert.match(prompt, /monochrome graphite/);
  assert.match(prompt, /A pot rests on the pavement/);
  assert.match(prompt, /before the action advances/);
  assert.doesNotMatch(prompt, /No glossy retouch, plastic skin, illustration/);
});

test('sketch: only immutable server-derived sketch authority qualifies as composition', () => {
  const authority = { kind: 'cinematic_storyboard_source', purpose: 'sketch_composition', storyboardRenderStyle: 'concept_sketch_v1',
    role: 'reference_image', immutable: true, contentHash: 'hash', sourceFingerprint: 'fingerprint' };
  const model = { supportsCinematicLookReferences: true, trustedGeneratedImageSource: {} };
  const input = { inputMode: 'multimodal_reference', referenceAuthority: authority };
  assert.equal(validateTrustedGeneratedImageSource(input, model), true);
  assert.throws(() => validateTrustedGeneratedImageSource({ ...input, referenceAuthority: { ...authority, immutable: false } }, model));
  assert.throws(() => validateTrustedGeneratedImageSource({ ...input, referenceAuthority: { ...authority, purpose: 'generated_look' } }, model));
});
