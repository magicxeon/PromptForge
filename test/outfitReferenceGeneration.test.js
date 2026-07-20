import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compileGenerationContext,
  createQueueOptions,
  normalizeGenerationContext
} from '../server/domain/generation/generationRequestService.js';
import { resolveReferenceForProvider } from '../server/domain/generation/referenceUtils.js';

const basePayload = {
  mode: 'character-sheet',
  selections: {},
  aspectRatio: '1:1',
  imageReferences: { outfitReference: false },
  outfitReferenceImageFront: 'front-image-base64'
};

test('Front reference is canonical even when the client flag is stale', () => {
  const context = normalizeGenerationContext(basePayload);
  assert.equal(context.imageReferences.outfitReference, true);
  assert.equal(context.imageReferences.outfitReferenceFront, true);
  assert.equal(context.referenceCount, 1);
});

test('Back-only outfit reference is rejected', () => {
  assert.throws(
    () => normalizeGenerationContext({
      ...basePayload,
      outfitReferenceImageFront: null,
      outfitReferenceImageBack: 'back-image-base64'
    }),
    error => error.statusCode === 400 && error.code === 'outfit_front_required'
  );
});

test('Front and Back references reach queue options with explicit overrides', () => {
  const context = normalizeGenerationContext({
    ...basePayload,
    outfitReferenceImageBack: 'back-image-base64',
    outfitReferenceOverrides: { enabled: true, pattern: true }
  });
  const options = createQueueOptions(context, {
    username: 'user_demo',
    stream: false,
    modelConfig: { defaults: {} },
    providerConfigVersion: 'test',
    creditCost: 1
  });
  assert.equal(options.outfitReferenceImageFront, 'front-image-base64');
  assert.equal(options.outfitReferenceImageBack, 'back-image-base64');
  assert.deepEqual(options.outfitReferenceOverrides, {
    enabled: true,
    primaryColor: false,
    secondaryColor: false,
    pattern: true,
    material: false
  });
});

test('Only enabled outfit overrides are compiled', () => {
  const selections = {
    Pattern: { id: 'outfit.pattern.pinstripe', value: 'subtle white pinstripe pattern', group: 'Clothing' },
    Material: { id: 'outfit.material.silk', value: 'silk material', group: 'Clothing' }
  };
  const { compiledPrompt } = compileGenerationContext({
    ...basePayload,
    selections,
    outfitReferenceOverrides: { enabled: true, pattern: true, material: false }
  });
  assert.match(compiledPrompt, /subtle white pinstripe pattern/);
  assert.doesNotMatch(compiledPrompt, /silk material/);
  assert.match(compiledPrompt, /preserving all other outfit details/);
});

test('Legacy raw Base64 outfit upload is normalized for providers', async () => {
  const rawPng = `iVBOR${'A'.repeat(250)}=`;
  const resolved = await resolveReferenceForProvider(rawPng, 'user_demo');
  assert.equal(resolved, `data:image/png;base64,${rawPng}`);
});
