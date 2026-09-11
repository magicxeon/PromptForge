import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveShotCastIds, resolveShotLookIds } from '../server/domain/cinematic/CinematicCastCoverage.js';
import { normalizeCinematicCastReferences, resolveCinematicCastReferences } from '../server/domain/cinematic/CinematicImageCastReferences.js';
import { storyboardKeyframeContractCompiler } from '../server/domain/cinematic/StoryboardKeyframeContractCompiler.js';
import { cinematicStoryboardPromptComposer } from '../server/domain/cinematic/CinematicStoryboardPromptComposer.js';
import { ReferenceProcessingService } from '../server/domain/reference-processing/ReferenceProcessingService.js';
import { ReferencePolicyRegistry } from '../server/domain/reference-processing/ReferencePolicyRegistry.js';
import { createSingleCharacterCinematicProject } from './fixtures/cinematic/cinematicProjectFixtures.js';
import { CinematicSimpleAuthoringService } from '../server/domain/cinematic/CinematicSimpleAuthoringService.js';

test('explicit zero Cast never inherits identity or wardrobe; legacy still inherits', () => {
  const scene = { castAssignmentIds: ['a'], wardrobeLookIds: ['look'] };
  assert.deepEqual(resolveShotCastIds(scene, { castAssignmentIds: [] }), ['a']);
  assert.deepEqual(resolveShotCastIds(scene, { castMode: 'none', castAssignmentIds: ['a'] }), []);
  assert.deepEqual(resolveShotLookIds(scene, { castMode: 'none' }), []);
  const result = new CinematicSimpleAuthoringService().completeStoryPlanInput({ scenes: [{ ...scene, shots: [{ castMode: 'none', castAssignmentIds: [], wardrobeLookIds: [] }] }] });
  assert.deepEqual(result.input.scenes[0].shots[0].castAssignmentIds, []);
  const selectedEmpty = new CinematicSimpleAuthoringService().completeStoryPlanInput({ scenes: [{ ...scene, shots: [{ castMode: 'selected', castAssignmentIds: [], wardrobeLookIds: [] }] }] });
  assert.deepEqual(selectedEmpty.input.scenes[0].shots[0].wardrobeLookIds, []);
});

test('time-zero image omits subsequent action and retains art; legacy image semantics stay readable', () => {
  const project = createSingleCharacterCinematicProject();
  const scene = project.scenes[0], shot = scene.shots[0];
  scene.artDirection = 'Oxidized green metal, layered shelves, amber practicals.';
  Object.assign(shot, { openingFrameVersion: 1, visibleMoment: 'A sealed envelope rests on the table.',
    continuityEntry: 'The envelope remains closed.', subjectAction: 'The envelope slides across the table.',
    continuityExit: 'The envelope falls to the floor.', castMode: 'none' });
  const contract = storyboardKeyframeContractCompiler.compile({ project, scene, shot });
  assert.equal(contract.characterAuthority.length, 0);
  assert.match(contract.providerIndependentPrompt, /Time zero/);
  assert.match(contract.providerIndependentPrompt, /Oxidized green metal/);
  assert.doesNotMatch(contract.providerIndependentPrompt, /slides across|falls to the floor|Expression and posture/);
  const prompt = cinematicStoryboardPromptComposer.compose({ context: { cinematicContainsPeople: false }, visualPrompt: contract.providerIndependentPrompt });
  assert.match(prompt, /No visible people/);
  assert.doesNotMatch(prompt, /authorized apparent age/);
});

const actor = { userId: 'owner', username: 'owner' };
const rows = ['a', 'b'].map(id => ({ castAssignmentId: id, displayName: id.toUpperCase(), sourceType: 'generated_sheet', generationId: `job_${id}`, contentHash: `hash_${id}` }));

test('named sheets validate actor and pinned hash; forged URLs are never used', async () => {
  const options = { trustedSources: { describeOwnedImage: async (id, owner) => {
    assert.equal(owner.userId, actor.userId);
    return { contentHash: `hash_${id.slice(-1)}`, publicUrl: `/outputs/${id}.png` };
  } } };
  const resolved = await resolveCinematicCastReferences(rows.map(row => ({ ...row, referenceValue: 'https://untrusted.example/image' })), actor, options);
  assert.equal(resolved[0].referenceValue, '/outputs/job_a.png');
  await assert.rejects(resolveCinematicCastReferences([{ ...rows[0], contentHash: 'changed' }], actor, options), { code: 'cinematic_cast_references_invalid' });
  assert.throws(() => normalizeCinematicCastReferences([rows[0], rows[0]]));
  assert.throws(() => normalizeCinematicCastReferences(Array(7).fill(rows[0])));
});

test('ordered multi-Cast count, mapping and provider capacity use Reference Processing', async () => {
  const context = { generationSurface: 'cinematic', generationMode: 'scene', imageReferences: {}, selections: {},
    cinematicCastReferences: rows.map(row => ({ ...row, referenceValue: `/outputs/${row.generationId}.png` })) };
  const service = new ReferenceProcessingService({ policyRegistry: new ReferencePolicyRegistry({ knownProcessorIds: ['image_probe', 'orientation_normalize'] }), processorRegistry: { process() { assert.fail('Approved sheets must keep original bytes'); } } });
  const result = await service.processContext(context, { actorContext: actor, providerId: 'modelark', modelId: 'seedream', modelConfig: { capabilities: { maxReferenceImages: 2 } } });
  assert.equal(result.providerPlan.referenceCount, 2);
  assert.deepEqual(result.providerPlan.orderedReferences.map(row => row.slots), [['cinematic_cast_0'], ['cinematic_cast_1']]);
  const prompt = cinematicStoryboardPromptComposer.compose({ context, visualPrompt: 'Two separate people face the closed doorway.' });
  assert.match(prompt, /Reference image 1.*ONLY for "A"/);
  assert.match(prompt, /Reference image 2.*ONLY for "B"/);
  const renamed = await service.processContext({ ...context, cinematicCastReferences: context.cinematicCastReferences.map(row => ({ ...row, displayName: `${row.displayName} renamed` })) }, { actorContext: actor, providerId: 'modelark', modelId: 'seedream', modelConfig: { capabilities: { maxReferenceImages: 2 } } });
  assert.notEqual(renamed.planFingerprint, result.planFingerprint);
  await assert.rejects(service.processContext(context, { actorContext: actor, providerId: 'modelark', modelId: 'seedream', modelConfig: { capabilities: { maxReferenceImages: 1 } } }), { code: 'reference_capacity_exceeded' });
});
