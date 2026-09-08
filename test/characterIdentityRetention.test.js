import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveCharacterIdentityMetadata, normalizeCharacterIdentityMetadata, resolveSourceCharacterIdentity, applyCharacterIdentity } from '../server/domain/character-profiles/characterIdentityMetadata.js';
import { prepareGenerationReferences } from '../server/domain/generation/prepareGenerationReferences.js';
import { compilePromptFromGenerationContext } from '../server/domain/generation/generationRequestService.js';
import { PromptRefinementService } from '../server/domain/generation/PromptRefinementService.js';

const selections = {
  Age: { id: 'character.004', value: '24-27' }, Gender: { id: 'gender', value: 'female' },
  Ethnicity: { id: 'ethnicity', value: 'Thai' }, Beauty: { id: 'beauty', value: 'natural appearance' },
  'Face Shape': { id: 'face', value: 'oval' }, 'Body Shape': { id: 'body', value: 'athletic' },
  Top: { value: 'red shirt' }, Expression: { value: 'laughing' }
};
const metadata = deriveCharacterIdentityMetadata({ selections });
const characterProfileContext = { purpose: 'character_usage', identityMetadata: metadata };

test('versioned identity is bounded, keeps authored fields and excludes outfit/pose', () => {
  assert.equal(metadata.schemaVersion, 2);
  assert.deepEqual(metadata.missingFields, []);
  assert.equal(metadata.attributes.Ethnicity.attributeId, 'ethnicity');
  assert.equal(metadata.attributes['Body Shape'].value, 'athletic');
  assert.equal(metadata.attributes.Top, undefined);
  assert.equal(metadata.attributes.Expression, undefined);
  const invalid = normalizeCharacterIdentityMetadata({ attributes: { Ethnicity: { value: 'data:image/png;base64,secret' }, Beauty: { value: 'x'.repeat(501) } } });
  assert.deepEqual(invalid.missingFields, ['Age', 'Gender', 'Ethnicity', 'Beauty']);
  assert.deepEqual(invalid.attributes, {});
});

test('owned Face identity survives empty Sheet selections without cross-actor fallback', async () => {
  const repository = { findByIdForOwner: async (id, actor) => id === 'face' && actor === 'alice' ? { mode: 'headshot', selections } : null };
  const source = { selections: {}, characterSheetConfig: { sourceHeadshotIds: ['face'] } };
  assert.deepEqual(await resolveSourceCharacterIdentity(source, 'alice', repository), metadata);
  assert.deepEqual((await resolveSourceCharacterIdentity(source, 'bob', repository)).missingFields, ['Age', 'Gender', 'Ethnicity', 'Beauty']);
  assert.deepEqual((await resolveSourceCharacterIdentity({ ...source, characterSheetConfig: { sourceHeadshotIds: ['face', 'another'] } }, 'alice', repository)).missingFields, ['Age', 'Gender', 'Ethnicity', 'Beauty']);
});

test('reference preparation derives Sheet identity server-side and preserves reference result', async () => {
  const context = { mode: 'character-sheet', characterProfileContext: null, characterSheetConfig: { identityMetadata: { attributes: { Ethnicity: { value: 'forged' } } } }, faceReferenceJobIds: ['face'], selections: {} };
  const result = { referenceCount: 1 };
  assert.equal(await prepareGenerationReferences(context, { actorContext: { userId: 'alice' },
    characterService: { validateGenerationContext: async () => null },
    processingService: { processContext: async () => result },
    generationRepository: { findByIdForOwner: async () => ({ mode: 'headshot', selections }) }
  }), result);
  assert.deepEqual(context.characterSheetConfig.identityMetadata, metadata);
  assert.match(applyCharacterIdentity('three views', context), /Ethnicity: Thai/);
});

test('canonical identity is idempotent and never invents missing attributes', () => {
  const context = { characterProfileContext };
  const once = applyCharacterIdentity('Scene prompt', context);
  assert.equal(applyCharacterIdentity(once, context), once);
  assert.match(once, /24-27 years/);
  assert.match(once, /Gender presentation: female/);
  assert.match(once, /Ethnicity: Thai/);
  assert.match(once, /not permission to beautify/);
  assert.equal(applyCharacterIdentity('unchanged', {}), 'unchanged');
  assert.equal(applyCharacterIdentity('unknown', { characterProfileContext: { purpose: 'character_usage', identityMetadata: {} } }), 'unknown');
});

test('manual compiler and refinement disabled paths preserve identity', async () => {
  const context = { mode: 'scene', authoringMode: 'manual', manualPrompt: 'A person standing in a studio.', imageReferences: {}, selections: {}, characterProfileContext };
  assert.match(compilePromptFromGenerationContext(context), /Ethnicity: Thai/);
  const service = new PromptRefinementService({ policyLoader: () => ({ enabled: false }), logger: { info() {} } });
  const result = await service.refine({ prompt: 'A person in a studio.', context });
  assert.match(result.prompt, /Approved character identity/);
});

test('successful refinement restores omitted identity without duplicating it', async () => {
  const service = new PromptRefinementService({
    policyLoader: () => ({ enabled: true, provider: 'fixture', model: 'fixture' }),
    availabilityPolicy: { assertAvailable() {} },
    providerFactory: () => ({ refinePrompt: async () => ({ refinedPrompt: 'A portrait with soft light.', warnings: [], changeSummary: [], preservedAuthorities: [] }) }),
    logger: { info() {} }
  });
  const result = await service.refine({ prompt: 'A portrait.', requested: true, context: { characterProfileContext } });
  assert.equal(result.metadata.status, 'refined');
  assert.match(result.prompt, /Ethnicity: Thai/);
  assert.equal(result.prompt.split('Approved character identity:').length, 2);
});

for (const surface of ['studio', 'playground', 'fashion', 'cinematic']) {
  test(`${surface} canonical generation retains identity with manual direction`, () => {
    const context = { mode: 'normal', generationSurface: surface, generationMode: 'scene',
      sceneBuilder: { authoringMode: 'manual', manualPromptText: 'Standing beside a window.' },
      imageReferences: {}, selections: {}, characterProfileContext };
    const prompt = compilePromptFromGenerationContext(context);
    assert.match(prompt, /Ethnicity: Thai/);
    assert.match(prompt, /24-27 years/);
  });
}
