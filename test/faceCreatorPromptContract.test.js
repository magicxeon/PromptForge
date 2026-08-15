import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { compilePromptOnServer } from '../server/domain/generation/promptCompiler.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogs = [
  readCatalog('001-character.json'),
  readCatalog('002-face.json'),
  readCatalog('003-eyes.json'),
  readCatalog('004-eyebrows.json'),
  readCatalog('005-nose.json'),
  readCatalog('006-lips.json')
].flat();

const cases = [
  {
    name: 'male',
    ids: {
      Gender: 'character.002',
      Age: 'character.004_e20',
      Beauty: 'character.beauty_mature',
      'Face Shape': 'face.021',
      Eyes: 'eyes.014',
      Eyebrows: 'eyebrows.008',
      Nose: 'nose.007',
      Lips: 'lips.013'
    }
  },
  {
    name: 'female',
    ids: {
      Gender: 'character.001',
      Age: 'character.004_e20',
      'Face Shape': 'face.022',
      Eyes: 'eyes.015',
      Eyebrows: 'eyebrows.009',
      Nose: 'nose.008',
      Lips: 'lips.014'
    }
  }
];

for (const fixture of cases) {
  test(`Face Creator preserves the complete ${fixture.name} catalog contract`, () => {
    const selections = Object.fromEntries(Object.entries(fixture.ids).map(([fieldName, id]) => {
      const entry = catalogs.find(candidate => candidate.id === id);
      assert.ok(entry, `Missing enabled catalog option ${id}`);
      assert.notEqual(entry.enabled, false, `Catalog option ${id} must remain enabled`);
      return [fieldName, {
        id: entry.id,
        value: entry.prompt.default,
        label: entry.label.en,
        group: ['Gender', 'Age', 'Beauty'].includes(fieldName) ? 'Character' : 'Face',
        category: entry.category,
        tags: entry.tags || [],
        isCustom: false
      }];
    }));

    const prompt = compilePromptOnServer(selections, '1:1', {}, 'headshot', 'portrait');
    for (const fieldName of ['Face Shape', 'Eyes', 'Eyebrows', 'Nose', 'Lips']) {
      assert.match(prompt, new RegExp(escapeRegExp(selections[fieldName].value), 'i'));
    }
    assert.match(prompt, /unmistakably early-twenties adult facial maturity/i);
    if (fixture.name === 'male') {
      assert.match(prompt, /clean-shaven face/i);
      assert.doesNotMatch(prompt, /mature sophisticated elegance/i);
    }
  });
}

function readCatalog(filename) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'attributes', filename), 'utf8'));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
