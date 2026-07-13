import assert from 'node:assert/strict';
import test from 'node:test';
import { compilePromptOnServer } from '../server/promptCompiler.js';

const characterSheetInstruction =
  'Preserve the character design, body proportions, hairstyle, and clothing details from the uploaded character sheet while adapting the pose and scene';

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
