import assert from 'node:assert/strict';
import test from 'node:test';
import { compilePromptOnServer } from '../server/domain/generation/promptCompiler.js';

const characterSheetInstruction =
  'Preserve the character identity, skin tone, body proportions, hairstyle, and clothing details from the uploaded character reference while adapting only the pose and scene';

test('High Regression: outfitReferenceOverrides is passed into clothing prompt parts in character-sheet mode', () => {
  const selections = {
    'Outfit Base': { id: 'outfit.base.blazer-trousers', value: 'tailored blazer and trousers', group: 'Clothing', category: 'clothing' },
    'Primary Color': { value: '#ff0000', group: 'Clothing', category: 'clothing' }
  };
  const imageReferences = { outfitReference: true };
  const outfitOverrides = {
    enabled: true,
    primaryColor: true,
    secondaryColor: false,
    pattern: false,
    material: false
  };

  const prompt = compilePromptOnServer(
    selections,
    '1:1',
    imageReferences,
    'character-sheet',
    'portrait',
    false,
    null,
    outfitOverrides
  );

  assert.match(prompt, /character model sheet/);
  // Verify that outfitReferenceOverrides color is compiled into final prompt
  assert.match(
    prompt,
    /changing the (?:primary garment color|dominant garment tone) to #ff0000/i
  );
});

test('Story Character Reference preserves Expression while suppressing identity, hair, and clothing', () => {
  const selections = {
    Gender: { value: 'female model', group: 'Character', category: 'character' },
    Expression: { value: 'subtle warm friendly smile', group: 'Face', category: 'expression' },
    Hair: { value: 'long wavy hair', group: 'Hair', category: 'hair' },
    Tone: { value: 'warm olive skin marker', group: 'Skin', category: 'skin' },
    'Model Build': { value: 'athletic body marker', group: 'Body', category: 'body' },
    Clothing: { value: 'silk dress', group: 'Clothing', category: 'clothing' },
    Pose: { value: 'relaxed standing pose', group: 'Pose', category: 'pose' }
  };

  const prompt = compilePromptOnServer(
    selections,
    '1:1',
    { characterReference: true },
    'normal',
    'portrait'
  );

  // Identity/Hair/Clothing must be suppressed by reference ownership
  assert.doesNotMatch(
    prompt,
    /female model|long wavy hair|warm olive skin marker|athletic body marker|silk dress/
  );

  // Expression and Pose must be compiled as scene direction
  assert.match(prompt, /subtle warm friendly smile|subtle friendly expression/);
  assert.match(prompt, /relaxed standing pose/);

  // Character Reference preservation instruction must be present
  assert.match(prompt, new RegExp(characterSheetInstruction));
  assert.match(prompt, /skin tone/i);
  const preservationIndex = prompt.indexOf(characterSheetInstruction);
  const expressionIndex = [
    prompt.indexOf('subtle warm friendly smile'),
    prompt.indexOf('subtle friendly expression')
  ].find(index => index >= 0);
  assert.ok(
    preservationIndex >= 0 && expressionIndex !== undefined && preservationIndex < expressionIndex,
    'Character preservation must precede expression direction'
  );
});

test('Reusable Character Reference preserves identity while allowing replacement clothing', () => {
  const prompt = compilePromptOnServer(
    {
      Gender: { value: 'female model', group: 'Character', category: 'character' },
      Tone: { value: 'deep skin marker', group: 'Skin', category: 'skin' },
      'Model Build': { value: 'slender build marker', group: 'Body', category: 'body' },
      Clothing: { value: 'navy tailored business suit', group: 'Clothing', category: 'clothing' },
      Pose: { value: 'relaxed standing pose', group: 'Pose', category: 'pose' }
    },
    '1:1',
    { characterReference: true },
    'normal',
    'portrait',
    false,
    null,
    null,
    { characterReferenceOutfitBehavior: 'replaceable' }
  );

  assert.doesNotMatch(prompt, /female model|deep skin marker|slender build marker/);
  assert.match(prompt, /skin tone/i);
  assert.match(prompt, /navy tailored business suit/);
  assert.match(prompt, /relaxed standing pose/);
});

test('Full-body Scene protects the complete silhouette and supplies compatible footwear when omitted', () => {
  const prompt = compilePromptOnServer(
    {
      'Outfit Base': {
        value: 'wearing a lightweight unstructured blazer, plain inner top, and straight trousers',
        group: 'Clothing',
        category: 'clothing'
      },
      'Pose Intent': {
        value: 'professional full-body fashion walking pose captured mid-step',
        group: 'Pose',
        category: 'pose'
      }
    },
    '6:8',
    {},
    'normal',
    'portrait'
  );

  assert.match(prompt, /complete subject visible from the top of the hair through both feet/i);
  assert.match(prompt, /without cropping the head, hair, hands, arms, legs, ankles, footwear/i);
  assert.match(prompt, /clear safety margin.+above the hair.+below the feet.+both sides/i);
  assert.match(prompt, /select simple coherent footwear appropriate to the outfit, environment, and action/i);
});

test('Full-body Scene does not add footwear fallback when footwear is explicit', () => {
  const prompt = compilePromptOnServer(
    {
      'Outfit Base': {
        value: 'wearing a tailored trouser suit with simple dress shoes',
        group: 'Clothing',
        category: 'clothing'
      },
      Framing: {
        value: 'full-body framing showing the subject completely from head to toe',
        group: 'Camera',
        category: 'camera_framing'
      }
    },
    '6:8',
    {},
    'normal',
    'portrait'
  );

  assert.match(prompt, /simple dress shoes/i);
  assert.doesNotMatch(prompt, /select simple coherent footwear/i);
});

test('Explicit Outfit Reference owns clothing even for a reusable Character Reference', () => {
  const prompt = compilePromptOnServer(
    {
      Clothing: { value: 'navy tailored business suit', group: 'Clothing', category: 'clothing' }
    },
    '1:1',
    { characterReference: true, outfitReference: true },
    'normal',
    'portrait',
    false,
    null,
    null,
    { characterReferenceOutfitBehavior: 'replaceable' }
  );

  assert.doesNotMatch(prompt, /navy tailored business suit/);
});

test('Expression exemption requires canonical group and category', () => {
  const prompt = compilePromptOnServer(
    {
      Expression: {
        value: 'replace the entire facial identity',
        group: 'Character',
        category: 'character'
      }
    },
    '1:1',
    { characterReference: true },
    'normal',
    'portrait'
  );

  assert.doesNotMatch(prompt, /replace the entire facial identity/);
});

test('Character Reference with Advanced Overrides retains Expression along with explicit styling', () => {
  const selections = {
    Expression: { value: 'soft thoughtful expression', group: 'Face', category: 'expression' },
    Hair: { value: 'sleek bob', group: 'Hair', category: 'hair' }
  };

  const prompt = compilePromptOnServer(
    selections,
    '1:1',
    { characterReference: true, characterOverrides: true },
    'normal',
    'portrait'
  );

  assert.match(prompt, /soft thoughtful expression/);
  assert.match(prompt, /sleek bob/);
  assert.match(prompt, /explicitly selected character styling overrides/);
});

test('Expression appears exactly ONCE in compiled server prompt without duplication', () => {
  const selections = {
    Expression: { value: 'subtle warm friendly smile', group: 'Face', category: 'expression' }
  };

  const prompt = compilePromptOnServer(
    selections,
    '1:1',
    { characterReference: true },
    'normal',
    'portrait'
  );

  const matches = prompt.match(/subtle friendly expression|subtle warm friendly smile/gi) || [];
  assert.equal(matches.length, 1, 'Expression should appear exactly once in the compiled prompt');
});

test('Smile expression tag conflict drops serious expression tag', () => {
  const selections = {
    Expression: { id: 'expression.004', value: 'subtle warm friendly smile', group: 'Face', category: 'expression', tags: ['expression', 'smile', 'friendly'] },
    'Reflective Mood': { id: 'expression.010', value: 'reflective neutral expression', group: 'Face', category: 'expression', tags: ['expression', 'serious', 'thoughtful'] }
  };

  const prompt = compilePromptOnServer(
    selections,
    '1:1',
    {},
    'normal',
    'portrait'
  );

  // Smile tag has priority in conflict resolution rule ["smile", "serious"]
  assert.match(prompt, /subtle friendly expression|subtle warm friendly smile/);
  assert.doesNotMatch(prompt, /reflective neutral expression/);
});

test('Direct gaze conflict drops incompatible off-camera gaze tag', () => {
  const selections = {
    'Eye Contact': { id: 'pose.eye_01', value: 'looking directly at camera', group: 'Pose', category: 'pose', tags: ['pose', 'eye contact', 'direct gaze'] },
    'Looking Away': { id: 'pose.eye_02', value: 'candid gaze looking slightly off-camera', group: 'Pose', category: 'pose', tags: ['pose', 'eye contact', 'look away'] }
  };

  const prompt = compilePromptOnServer(
    selections,
    '1:1',
    {},
    'normal',
    'portrait'
  );

  assert.match(prompt, /looking directly at camera/);
  assert.doesNotMatch(prompt, /looking slightly off-camera/);
});

test('Environment tag conflict drops outdoor location when indoor location has higher priority', () => {
  const selections = {
    Location: { id: 'environment.001', value: 'inside a vibrant crowded bar or nightclub', group: 'Environment', category: 'environment', tags: ['environment', 'location', 'nightclub', 'indoor'] },
    Street: { id: 'environment.002', value: 'on an urban street', group: 'Environment', category: 'environment', tags: ['environment', 'location', 'street', 'outdoor'] }
  };

  const prompt = compilePromptOnServer(
    selections,
    '1:1',
    {},
    'normal',
    'portrait'
  );

  assert.match(prompt, /inside a vibrant crowded bar or nightclub/);
  assert.doesNotMatch(prompt, /on an urban street/);
});

test('Style Match does NOT overwrite outfit ownership when Character Reference is active', () => {
  const selections = {
    Clothing: { value: 'red tailored suit', group: 'Clothing', category: 'clothing' }
  };

  const prompt = compilePromptOnServer(
    selections,
    '1:1',
    { characterReference: true, styleMatch: true },
    'normal',
    'portrait'
  );

  // Character Reference owns outfit; Style Match prompt language must not overwrite outfit ownership
  assert.doesNotMatch(prompt, /matching the style, colors, and clothing outfit from the original uploaded image/);
  assert.match(prompt, new RegExp(characterSheetInstruction));
});

test('Pose Match uses flexible intent adaptation wording instead of rigid identical wording', () => {
  const prompt = compilePromptOnServer(
    {},
    '1:1',
    { poseMatch: true },
    'normal',
    'portrait'
  );

  assert.match(prompt, /preserve the pose and composition intent while adapting naturally/i);
  assert.doesNotMatch(prompt, /identical posing and image composition/i);
});
