import assert from 'node:assert/strict';
import test from 'node:test';
import { compilePromptOnServer } from '../server/promptCompiler.js';

const characterSheetInstruction =
  'Preserve the character identity, body proportions, hairstyle, and clothing details from the uploaded character reference while adapting only the pose and scene';

test('Story mode adds the role-specific character sheet instruction', () => {
  const prompt = compilePromptOnServer(
    {},
    '1:1',
    { characterReference: true },
    'normal',
    'portrait'
  );

  assert.match(prompt, new RegExp(characterSheetInstruction));
});

test('Character Sheet mode ignores legacy and Story character reference flags', () => {
  const prompt = compilePromptOnServer(
    {},
    '1:1',
    { characterReference: true, useReferenceImage: true },
    'character-sheet',
    'portrait'
  );

  assert.doesNotMatch(prompt, /Reference uploaded image/);
  assert.doesNotMatch(prompt, new RegExp(characterSheetInstruction));
  assert.match(prompt, /character model sheet/);
});

test('Character Sheet mode uses Face Match as its identity reference', () => {
  const prompt = compilePromptOnServer(
    {},
    '1:1',
    { faceMatch: true },
    'character-sheet',
    'portrait'
  );

  assert.match(prompt, /Preserve the identity of the uploaded person/);
});

test('Story Character Reference suppresses reference-owned structured attributes', () => {
  const selections = {
    Gender: { value: 'male model', group: 'Character', category: 'character' },
    Hair: { value: 'platinum sculptural hair', group: 'Hair', category: 'hair' },
    Clothing: { value: 'red tailored suit', group: 'Clothing', category: 'clothing' },
    Pose: { value: 'catwalk stride', group: 'Pose', category: 'pose' }
  };
  const prompt = compilePromptOnServer(
    selections,
    '1:1',
    { characterReference: true },
    'normal',
    'portrait',
    false,
    { 'Product Type': { enabled: true, color: '#ff0000' } }
  );

  assert.doesNotMatch(prompt, /male model|platinum sculptural hair|red tailored suit|#ff0000/);
  assert.match(prompt, /catwalk stride/);
  assert.match(prompt, new RegExp(characterSheetInstruction));
});

test('Advanced Character Reference override retains explicit fashion styling', () => {
  const prompt = compilePromptOnServer(
    {
      Hair: { value: 'sleek bob', group: 'Hair', category: 'hair' },
      Clothing: { value: 'tailored blazer', group: 'Clothing', category: 'clothing' }
    },
    '1:1',
    { characterReference: true, characterOverrides: true },
    'normal',
    'portrait'
  );

  assert.match(prompt, /sleek bob/);
  assert.match(prompt, /tailored blazer/);
  assert.match(prompt, /explicitly selected character styling overrides/);
});

test('Fashion Direction is compiled with scene context', () => {
  const prompt = compilePromptOnServer(
    {
      Direction: {
        value: 'marketplace fashion commerce photography',
        group: 'Fashion Direction',
        category: 'fashion_direction'
      }
    },
    '4:5',
    {},
    'normal',
    'portrait'
  );

  assert.match(prompt, /marketplace fashion commerce photography/);
});

test('Fashion Story and Photography Context are compiled together', () => {
  const prompt = compilePromptOnServer(
    {
      'Fashion Photography Context': {
        value: 'luxury fashion campaign key visual',
        group: 'Photographic Context',
        category: 'photo_context'
      },
      'Fashion Story': {
        value: 'arriving as the central campaign character',
        group: 'Scene Story',
        category: 'scene_story'
      }
    },
    '4:5',
    {},
    'normal',
    'portrait'
  );

  assert.match(prompt, /luxury fashion campaign key visual/);
  assert.match(prompt, /arriving as the central campaign character/);
});

test('Character Sheet mode excludes scene context and environment language', () => {
  const prompt = compilePromptOnServer(
    {
      'Fashion Photography Context': {
        value: 'luxury fashion campaign key visual',
        group: 'Photographic Context',
        category: 'photo_context'
      },
      'Fashion Story': {
        value: 'walking through a neon city street',
        group: 'Scene Story',
        category: 'scene_story'
      },
      Location: {
        value: 'inside a glossy shopping mall atrium',
        group: 'Environment',
        category: 'environment'
      },
      'Skin Texture': {
        value: 'natural bare-face look with realistic skin texture and visible fine pores',
        group: 'Skin',
        category: 'skin'
      }
    },
    '6:8',
    {},
    'character-sheet',
    'portrait'
  );

  assert.match(prompt, /character model sheet/);
  assert.match(prompt, /natural bare-face look with realistic skin texture and visible fine pores/);
  assert.doesNotMatch(prompt, /luxury fashion campaign key visual/);
  assert.doesNotMatch(prompt, /walking through a neon city street/);
  assert.doesNotMatch(prompt, /shopping mall atrium/);
});
