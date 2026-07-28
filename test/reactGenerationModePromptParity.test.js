import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compileGenerationContext,
  normalizeGenerationContext
} from '../server/domain/generation/generationRequestService.js';

const actor = { userId: 'usr_prompt_parity', username: 'prompt_parity' };

test('React Headshot generationMode selects the strict white-background compiler', () => {
  const { context, compiledPrompt } = compileGenerationContext({
    mode: 'normal',
    generationMode: 'headshot',
    aspectRatio: '1:1',
    selections: {
      Gender: selection('female', 'Character', 'character'),
      Environment: selection('in a busy city street', 'Environment', 'environment')
    }
  }, actor);

  assert.equal(context.mode, 'headshot');
  assert.match(compiledPrompt, /straight front-facing portrait/i);
  assert.match(compiledPrompt, /solid pure white background/i);
  assert.doesNotMatch(compiledPrompt, /busy city street/i);
});

test('React Reusable Character Sheet uses casting layout and white uniform', () => {
  const { context, compiledPrompt } = compileGenerationContext({
    mode: 'normal',
    generationMode: 'character-sheet',
    characterType: 'reusable_model',
    selections: {
      Gender: selection('female', 'Character', 'character'),
      Clothing: selection('wearing a red evening dress', 'Clothing', 'clothing')
    }
  }, actor);

  assert.equal(context.mode, 'character-sheet');
  assert.equal(context.characterType, 'reusable_model');
  assert.match(compiledPrompt, /front view, exact side profile, and back view/i);
  assert.match(compiledPrompt, /fitted white short-sleeve top/i);
  assert.match(compiledPrompt, /solid pure white background/i);
  assert.doesNotMatch(compiledPrompt, /red evening dress/i);
});

test('React Styled Character Sheet preserves selected clothing on white', () => {
  const { compiledPrompt } = compileGenerationContext({
    mode: 'normal',
    generationMode: 'character-sheet',
    characterType: 'styled_character',
    selections: {
      Gender: selection('female', 'Character', 'character'),
      'Outfit Base': {
        ...selection('wearing a tailored navy suit', 'Clothing', 'clothing'),
        id: 'outfit.base.tailored',
        tags: ['outfit-base-female']
      }
    }
  }, actor);

  assert.match(compiledPrompt, /front view, side view, and back view/i);
  assert.match(compiledPrompt, /wearing a tailored navy suit/i);
  assert.match(compiledPrompt, /solid pure white background/i);
  assert.doesNotMatch(compiledPrompt, /casting uniform/i);
});

test('React Scene generationMode remains scene-directed and is not forced to white', () => {
  const context = normalizeGenerationContext({
    mode: 'headshot',
    generationMode: 'scene',
    selections: {
      Environment: selection('inside a warm Bangkok cafe', 'Environment', 'environment')
    },
    sceneBuilder: { authoringMode: 'guided' }
  }, actor);
  const { compiledPrompt } = compileGenerationContext(context, actor);

  assert.equal(context.mode, 'normal');
  assert.match(compiledPrompt, /warm Bangkok cafe/i);
  assert.doesNotMatch(compiledPrompt, /straight front-facing portrait/i);
  assert.doesNotMatch(compiledPrompt, /solid pure white background/i);
});

function selection(value, group, category) {
  return {
    id: `${category}.fixture`,
    value,
    group,
    category,
    tags: []
  };
}
