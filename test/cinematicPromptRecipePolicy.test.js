import assert from 'node:assert/strict';
import test from 'node:test';
import { loadPromptRecipe } from '../server/config/prompt-recipes/loadPromptRecipe.js';

test('Chapter Scene recipe loads through the canonical recipe contract', () => {
  const recipe = loadPromptRecipe('cinematic/chapter-scenes.v1.json');
  assert.equal(recipe.id, 'cinematic-chapter-scenes');
  assert.equal(recipe.version, 1);
  assert.match(recipe.instruction, /Scene outlines only/i);
  assert.match(recipe.instruction, /continuous location and time/i);
});

test('Scene Shot recipe produces provider-independent timeline documents', () => {
  const recipe = loadPromptRecipe('cinematic/scene-shots.v1.json');
  assert.equal(recipe.id, 'cinematic-scene-shots');
  assert.equal(recipe.version, 2);
  assert.match(recipe.instruction, /one readable provider-independent shotDocument/i);
  assert.match(recipe.instruction, /OPENING must describe only the visible state at time zero/i);
  assert.match(recipe.instruction, /Do not write provider names/i);
  assert.match(recipe.instruction, /exact authored dialogue/i);
});

test('Scene Environment recipe creates an unoccupied production-design image prompt', () => {
  const recipe = loadPromptRecipe('cinematic/scene-environment.v1.json');
  assert.equal(recipe.id, 'cinematic-scene-environment-proposal');
  assert.equal(recipe.version, 1);
  assert.match(recipe.instruction, /Project, Chapter, selected Scene, adjacent Scene and Shot context/i);
  assert.match(recipe.instruction, /unoccupied master environment plate/i);
  assert.match(recipe.instruction, /Do not include people/i);
  assert.match(recipe.instruction, /clear English/i);
});

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
