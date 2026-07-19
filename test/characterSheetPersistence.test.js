import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createCharacterSheetConfigSnapshot,
  normalizeGenerationContext
} from '../server/domain/generation/generationRequestService.js';

test('creates a semantic Character Sheet configuration snapshot without raw outfit images', () => {
  const context = normalizeGenerationContext({
    mode: 'character-sheet',
    selections: {
      Gender: { id: 'char.gender_01', group: 'Character' },
      'Face Shape': { id: 'face.002', group: 'Face' },
      'Body Silhouette': { id: 'body.011', group: 'Body' },
      'Sheet Layout': { id: 'body.sheet_layout.front_back', group: 'Body' },
      'Outfit Base': { id: 'outfit.base.unisex.tshirt_wide_jeans', group: 'Clothing' }
    },
    imageReferences: {
      faceMatch: true,
      outfitReference: true
    },
    faceReferenceImageA: '/outputs/job_headshot.png',
    faceReferenceJobIds: ['job_headshot'],
    outfitReferenceImageFront: 'data:image/png;base64,PRIVATE_FRONT',
    outfitReferenceImageBack: 'data:image/png;base64,PRIVATE_BACK',
    outfitReferenceJobIds: ['job_front', 'job_back'],
    sourceOwnership: {
      mode: 'character-sheet',
      outfit: { source: 'outfit-front-back-reference' }
    }
  });

  assert.equal(context.characterSheetConfig.version, 1);
  assert.deepEqual(context.characterSheetConfig.sourceHeadshotIds, ['job_headshot']);
  assert.equal(context.characterSheetConfig.identitySelectionIds.Gender, 'char.gender_01');
  assert.equal(context.characterSheetConfig.identitySelectionIds['Face Shape'], 'face.002');
  assert.equal(context.characterSheetConfig.bodySelectionIds['Body Silhouette'], 'body.011');
  assert.equal(context.characterSheetConfig.layout.type, 'body.sheet_layout.front_back');
  assert.equal(context.characterSheetConfig.outfitSelectionIds['Outfit Base'], 'outfit.base.unisex.tshirt_wide_jeans');
  assert.equal(context.characterSheetConfig.outfitSource.type, 'front-back-reference');
  assert.deepEqual(context.characterSheetConfig.outfitSource.frontReferenceIds, ['job_front']);
  assert.deepEqual(context.characterSheetConfig.outfitSource.backReferenceIds, ['job_back']);
  assert.equal(JSON.stringify(context.characterSheetConfig).includes('PRIVATE_FRONT'), false);
  assert.equal(JSON.stringify(context.characterSheetConfig).includes('PRIVATE_BACK'), false);
});

test('does not create Character Sheet config outside Character Sheet mode', () => {
  assert.equal(createCharacterSheetConfigSnapshot({
    mode: 'normal',
    selections: {
      Gender: { id: 'char.gender_01', group: 'Character' }
    }
  }), null);
});
