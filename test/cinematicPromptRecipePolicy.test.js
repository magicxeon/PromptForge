import assert from 'node:assert/strict';
import test from 'node:test';
import { loadPromptRecipe } from '../server/config/prompt-recipes/loadPromptRecipe.js';

test('Story Plan v7 prepares complete observable keyframe direction', () => {
  const recipe = loadPromptRecipe('cinematic/story-plan.v7.json');
  assert.equal(recipe.version, 7);
  assert.match(recipe.instruction, /one exact frozen moment/i);
  assert.match(recipe.instruction, /mouth or lip tension, gaze target, head angle/i);
  assert.match(recipe.instruction, /Never inherit their smile, direct camera gaze/i);
  assert.match(recipe.instruction, /current hand, body height, angle and story use/i);
  assert.match(recipe.instruction, /subject exposure, background relationship, practical-fixture on or off state/i);
  assert.match(recipe.instruction, /Keep shot\.prompt empty unless exceptional author direction/i);
});

test('Scene Direction v6 preserves authority while filling visual execution fields', () => {
  const recipe = loadPromptRecipe('cinematic/scene-direction.v6.json');
  assert.equal(recipe.version, 6);
  assert.match(recipe.instruction, /one exact frozen moment/i);
  assert.match(recipe.instruction, /mouth or lip tension, gaze target, head angle/i);
  assert.match(recipe.instruction, /Reject reference smiles, direct gaze/i);
  assert.match(recipe.instruction, /authored hand, body height and angle/i);
  assert.match(recipe.instruction, /subject exposure, background relationship, practical-fixture state/i);
  assert.match(recipe.instruction, /Keep shot\.prompt empty unless/i);
});
