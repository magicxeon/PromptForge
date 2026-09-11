import assert from 'node:assert/strict';
import test from 'node:test';
import { loadPromptRecipe } from '../server/config/prompt-recipes/loadPromptRecipe.js';

test('directed recipes preserve ordered intent, no-person coverage, art direction and time-zero motion separation', () => {
  for (const path of ['cinematic/story-plan.v8.json', 'cinematic/scene-direction.v7.json']) {
    const recipe = loadPromptRecipe(path);
    assert.match(recipe.instruction, /time-zero|t=0/);
    assert.match(recipe.instruction, /subjectAction/);
    assert.match(recipe.instruction, /continuityExit/);
    assert.match(recipe.instruction, /artDirection/);
    assert.match(recipe.instruction, /no visible people/i);
    assert.match(recipe.instruction, /locked fields/i);
  }
  assert.match(loadPromptRecipe('cinematic/story-plan.v8.json').instruction, /ordered genres, audienceFeelings and pacingTraits/);
});

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
