import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { compilePromptFromGenerationContext } from '../server/domain/generation/generationRequestService.js';

const recipeCatalog = JSON.parse(
  fs.readFileSync(new URL('../server/config/scene-pose-recipes.json', import.meta.url), 'utf8')
);
const fashionAttributes = JSON.parse(
  fs.readFileSync(new URL('../attributes/024-fashion-commerce.json', import.meta.url), 'utf8')
).entries;
const attributesById = new Map(fashionAttributes.map(attribute => [attribute.id, attribute]));

const expectedPoseDetails = new Map([
  ['pose.fashion.front-product', /shoulders and pelvis square to the camera/i],
  ['pose.fashion.three-quarter', /35 to 45 degrees.+both eyes remain visible/i],
  ['pose.fashion.creator-reveal', /10 to 20 degrees.+credible weight transfer/i],
  ['pose.fashion.weight-shift', /seventy percent.+opposite knee relaxes/i],
  ['pose.fashion.back', /facing directly away.+without looking over either shoulder/i],
  ['pose.fashion.fabric-motion', /controlled editorial lateral step.+single elegant wave of fabric/i]
]);

test('all Simple Scene recipes resolve to precise single-subject pose directions', () => {
  assert.equal(recipeCatalog.recipes.length, expectedPoseDetails.size);
  assert.equal(recipeCatalog.catalogVersion, '2026-08-mvp-2');

  for (const recipe of recipeCatalog.recipes) {
    assert.equal(recipe.version, 2, `${recipe.id} must carry the revised recipe version`);
    const poseId = recipe.fieldSelections['Pose Intent'];
    const attribute = attributesById.get(poseId);
    assert.ok(attribute, `${recipe.id} must resolve Pose Intent ${poseId}`);
    assert.match(attribute.prompt.default, /one full-body subject/i, `${poseId} must request one subject`);
    assert.match(attribute.prompt.default, expectedPoseDetails.get(poseId), `${poseId} lacks its defining mechanics`);
  }
});

test('Scene generation rejects the multi-view composition of a Character Reference', () => {
  const prompt = compilePromptFromGenerationContext({
    generationMode: 'scene',
    mode: 'normal',
    selections: {
      'Pose Intent': {
        id: 'pose.fashion.three-quarter',
        value: attributesById.get('pose.fashion.three-quarter').prompt.default,
        group: 'Pose',
        category: 'pose'
      }
    },
    aspectRatio: '6:8',
    imageReferences: { characterReference: true },
    characterReferenceOutfitBehavior: 'replaceable',
    template: 'portrait'
  });

  assert.match(prompt, /exactly one continuous photograph containing one person shown once/i);
  assert.match(prompt, /no duplicate person, multiple views.+character sheet.+contact sheet.+split screen/i);
  assert.match(prompt, /multi-view Character Reference only to reconstruct identity and body proportions/i);
  assert.match(prompt, /35 to 45 degrees.+both eyes remain visible/i);
});
