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
const cameraAttributes = JSON.parse(
  fs.readFileSync(new URL('../attributes/014-camera.json', import.meta.url), 'utf8')
);
const attributesById = new Map(
  [...fashionAttributes, ...cameraAttributes].map(attribute => [attribute.id, attribute])
);

const expectedPoseDetails = new Map([
  ['pose.fashion.front-product', /shoulders and pelvis square to the camera/i],
  ['pose.fashion.three-quarter', /35 to 45 degrees.+both eyes remain visible/i],
  ['pose.fashion.creator-reveal', /10 to 20 degrees.+credible weight transfer/i],
  ['pose.fashion.weight-shift', /seventy percent.+opposite knee relaxes/i],
  ['pose.fashion.back', /facing directly away.+without looking over either shoulder/i],
  ['pose.fashion.fabric-motion', /controlled editorial lateral step.+single elegant wave of fabric/i],
  ['pose.fashion.street-walk-editorial', /natural editorial mid-stride.+credible weight transfer/i],
  ['pose.fashion.architectural-lean', /architectural lean.+physically plausible contact/i],
  ['pose.fashion.window-shadow-lookbook', /seventy percent of weight.+restrained negative space/i],
  ['pose.fashion.cafe-seated-lifestyle', /anatomically stable seated fashion pose.+footwear without cropped limbs/i],
  ['pose.fashion.sunlit-storefront', /storefront fashion stance.+clean environmental escape space/i],
  ['pose.fashion.low-angle-campaign-hero', /campaign stance.+upper-frame negative space/i],
  ['pose.fashion.soft-character-portrait', /tight identity-first head-and-shoulders portrait.+margin above every strand of hair/i],
  ['pose.fashion.color-light-editorial', /strong controlled editorial pose.+limbs distinct/i]
]);

test('all Simple Scene recipes resolve to precise single-subject pose directions', () => {
  assert.equal(recipeCatalog.recipes.length, expectedPoseDetails.size);
  assert.equal(recipeCatalog.catalogVersion, '2026-08-professional-6');
  const discoverable = recipeCatalog.recipes.filter(recipe => recipe.discoverable !== false);
  assert.equal(discoverable.length, 8);

  for (const recipe of recipeCatalog.recipes) {
    const poseId = recipe.fieldSelections['Pose Intent'];
    const attribute = attributesById.get(poseId);
    assert.ok(attribute, `${recipe.id} must resolve Pose Intent ${poseId}`);
    assert.match(attribute.prompt.default, /one (?:full-body )?subject/i, `${poseId} must request one subject`);
    assert.match(attribute.prompt.default, expectedPoseDetails.get(poseId), `${poseId} lacks its defining mechanics`);
    for (const [fieldName, optionId] of Object.entries(recipe.fieldSelections)) {
      assert.ok(attributesById.has(optionId), `${recipe.id} ${fieldName} must resolve ${optionId}`);
    }
  }

  for (const recipe of discoverable) {
    assert.match(recipe.previewAsset, /^\/assets\/scene-builder\/shot-recipes\/.+\.jpg$/);
    assert.equal(
      recipe.version,
      [
        'scene-pose.sunlit-storefront',
        'scene-pose.window-shadow-lookbook',
        'scene-pose.soft-character-portrait'
      ].includes(recipe.id)
        ? 2
        : 1
    );
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

test('a professional Shot Recipe reaches the canonical compiler as one resolved direction', () => {
  const recipe = recipeCatalog.recipes.find(item =>
    item.id === 'scene-pose.street-walk-editorial'
  );
  assert.ok(recipe);
  const selections = Object.fromEntries(
    Object.entries(recipe.fieldSelections).map(([fieldName, optionId]) => {
      const attribute = attributesById.get(optionId);
      return [fieldName, {
        id: optionId,
        value: attribute.prompt.default,
        group: fieldName === 'Fashion Direction'
          ? 'Fashion Direction'
          : (attribute.ui?.group || attribute.category),
        category: attribute.category
      }];
    })
  );

  const prompt = compilePromptFromGenerationContext({
    generationMode: 'scene',
    mode: 'normal',
    selections,
    aspectRatio: '6:8',
    imageReferences: {},
    template: 'portrait'
  });

  assert.match(prompt, /natural editorial mid-stride/i);
  assert.match(prompt, /one hand resting naturally inside one available garment pocket/i);
  assert.match(prompt, /quiet contemporary city street/i);
  assert.match(prompt, /outdoor open-shade lighting/i);
  assert.match(prompt, /environmental portrait framing/i);
  assert.match(prompt, /slight handheld camera movement/i);
});

test('Sunlit Storefront compiles physical camera, contact, and lighting direction', () => {
  const recipe = recipeCatalog.recipes.find(item =>
    item.id === 'scene-pose.sunlit-storefront'
  );
  assert.ok(recipe);
  assert.equal(recipe.version, 2);
  assert.equal(recipe.fieldSelections['Camera Imperfections'], 'camera.imp_01');

  const selections = Object.fromEntries(
    Object.entries(recipe.fieldSelections).map(([fieldName, optionId]) => {
      const attribute = attributesById.get(optionId);
      return [fieldName, {
        id: optionId,
        value: attribute.prompt.default,
        group: fieldName === 'Fashion Direction'
          ? 'Fashion Direction'
          : (attribute.ui?.group || attribute.category),
        category: attribute.category
      }];
    })
  );

  const prompt = compilePromptFromGenerationContext({
    generationMode: 'scene',
    mode: 'normal',
    selections,
    aspectRatio: '6:8',
    imageReferences: {},
    template: 'portrait'
  });

  assert.match(prompt, /photorealistic on-location fashion photography/i);
  assert.match(prompt, /shoulder blade and outer hip.+contact with the storefront wall/i);
  assert.match(prompt, /looking diagonally along the storefront wall.+thirty degrees/i);
  assert.match(prompt, /late-afternoon sunlight.+upper camera-left/i);
  assert.match(prompt, /opposite side approximately one-and-a-half stops darker/i);
  assert.match(prompt, /contact shadows.+body meets the wall.+beneath both feet/i);
  assert.match(prompt, /no frontal beauty fill.+no flat uniform illumination/i);
  assert.doesNotMatch(prompt, /gentle highlight halation/i);
});

test('Window Shadow Lookbook lights the subject and uses a grounded fashion location', () => {
  const recipe = recipeCatalog.recipes.find(item =>
    item.id === 'scene-pose.window-shadow-lookbook'
  );
  assert.ok(recipe);
  assert.equal(recipe.version, 2);

  const selections = Object.fromEntries(
    Object.entries(recipe.fieldSelections).map(([fieldName, optionId]) => {
      const attribute = attributesById.get(optionId);
      return [fieldName, {
        id: optionId,
        value: attribute.prompt.default,
        group: fieldName === 'Fashion Direction'
          ? 'Fashion Direction'
          : (attribute.ui?.group || attribute.category),
        category: attribute.category
      }];
    })
  );

  const prompt = compilePromptFromGenerationContext({
    generationMode: 'scene',
    mode: 'normal',
    selections,
    aspectRatio: '6:8',
    imageReferences: {},
    template: 'portrait'
  });

  assert.match(prompt, /real contemporary gallery prepared for an on-location fashion lookbook/i);
  assert.match(prompt, /visible floor-to-wall junction.+tall architectural window/i);
  assert.match(prompt, /direct sunlight visibly illuminates a substantial area of the subject/i);
  assert.match(prompt, /window-mullion shadow bands crossing the subject/i);
  assert.match(prompt, /same aligned window-frame geometry continues.+onto the wall and floor/i);
  assert.match(prompt, /no evenly lit subject.+no shadow pattern isolated only on the background/i);
  assert.match(prompt, /no abstract void.+floating lights.+unexplained neon/i);
});

test('Soft Character Portrait compiles a tight identity portrait without environmental conflicts', () => {
  const recipe = recipeCatalog.recipes.find(item =>
    item.id === 'scene-pose.soft-character-portrait'
  );
  assert.ok(recipe);
  assert.equal(recipe.version, 2);
  assert.deepEqual(recipe.clearFields, ['Lighting Accent', 'Film Look', 'Color Grading']);
  assert.equal(recipe.fieldSelections['Fashion Venue'], 'environment.fashion.character-wall');
  assert.equal(recipe.fieldSelections['Camera Imperfections'], 'camera.imp_01');

  const selections = Object.fromEntries(
    Object.entries(recipe.fieldSelections).map(([fieldName, optionId]) => {
      const attribute = attributesById.get(optionId);
      return [fieldName, {
        id: optionId,
        value: attribute.prompt.default,
        group: fieldName === 'Fashion Direction'
          ? 'Fashion Direction'
          : (attribute.ui?.group || attribute.category),
        category: attribute.category
      }];
    })
  );

  const prompt = compilePromptFromGenerationContext({
    generationMode: 'scene',
    mode: 'normal',
    selections,
    aspectRatio: '6:8',
    imageReferences: { characterReference: true },
    characterReferenceOutfitBehavior: 'replaceable',
    template: 'portrait'
  });

  assert.match(prompt, /identity-first character portrait photography/i);
  assert.match(prompt, /tight identity-first head-and-shoulders portrait/i);
  assert.match(prompt, /crop consistently from the upper chest upward/i);
  assert.match(prompt, /never widen to a half-body.+environmental portrait/i);
  assert.match(prompt, /plain matte warm-white plaster wall/i);
  assert.match(prompt, /large window just outside the frame on camera-left/i);
  assert.match(prompt, /one large diffused window source.+far cheek falls approximately one stop darker/i);
  assert.match(prompt, /no ring light.+no neon.+no colored accent/i);
  assert.match(prompt, /slight handheld camera movement/i);
  assert.match(prompt, /no floor, floor-to-wall junction, corridor, furniture/i);
  assert.doesNotMatch(prompt, /inside a real contemporary gallery|gentle highlight halation/i);
  assert.doesNotMatch(prompt, /For this full-body photograph|select simple coherent footwear/i);
});
