import assert from 'node:assert/strict';
import test from 'node:test';
import { compilePromptOnServer } from '../server/domain/generation/promptCompiler.js';

const beard = {
  id: 'facial_hair.short_boxed_beard',
  value: 'short groomed boxed beard with a defined natural cheek and neckline',
  group: 'Face',
  category: 'facial_hair',
  tags: ['facial-hair', 'adult-male']
};

test('adult male Facial Hair compiles in all guided generation modes', () => {
  for (const mode of ['headshot', 'character-sheet', 'normal']) {
    const prompt = compilePromptOnServer({
      Gender: selection('character.002', 'male man'),
      Age: selection('character.004_e20', '21-year-old young adult'),
      'Facial Hair': beard
    }, '6:8', {}, mode, 'portrait');
    assert.match(prompt, /short groomed boxed beard/i);
    assert.doesNotMatch(prompt, /clean-shaven face/i);
  }
});

test('adult male without a Facial Hair selection defaults to clean-shaven', () => {
  for (const mode of ['headshot', 'character-sheet']) {
    const prompt = compilePromptOnServer({
      Gender: selection('character.002', 'male man'),
      Age: selection('character.004_e20', '21-year-old young adult')
    }, '6:8', {}, mode, 'portrait');
    assert.match(prompt, /clean-shaven face with no moustache, beard, or stubble/i);
  }
});

test('female and minor presentations cannot compile stale Facial Hair', () => {
  for (const selections of [
    { Gender: selection('character.001', 'female woman'), Age: selection('character.004_e20', '21-year-old young adult'), 'Facial Hair': beard },
    { Gender: selection('character.002', 'male man'), Age: selection('character.age.child', '12-year-old child'), 'Facial Hair': beard }
  ]) {
    const prompt = compilePromptOnServer(selections, '6:8', {}, 'headshot', 'portrait');
    assert.doesNotMatch(prompt, /short groomed boxed beard/i);
  }
});

test('presentation-specific lead anatomy cannot compile for another presentation or a minor', () => {
  const maleLeadFace = {
    id: 'face.021',
    value: 'adult masculine face with defined cheekbones and a naturally tapered chin',
    group: 'Face',
    category: 'face',
    tags: ['vertical-drama-lead', 'adult-male']
  };
  const allowed = compilePromptOnServer({
    Gender: selection('character.002', 'male man'),
    Age: selection('character.004_e20', '21-year-old young adult'),
    'Face Shape': maleLeadFace
  }, '6:8', {}, 'headshot', 'portrait');
  assert.match(allowed, /defined cheekbones/i);

  for (const selections of [
    { Gender: selection('character.001', 'female woman'), Age: selection('character.004_e20', '21-year-old young adult'), 'Face Shape': maleLeadFace },
    { Gender: selection('character.002', 'male man'), Age: selection('character.age.child', '12-year-old child'), 'Face Shape': maleLeadFace }
  ]) {
    assert.doesNotMatch(
      compilePromptOnServer(selections, '6:8', {}, 'headshot', 'portrait'),
      /defined cheekbones/i
    );
  }
});

function selection(id, value) {
  return { id, value, label: value, group: 'Character', category: 'character', tags: [] };
}
