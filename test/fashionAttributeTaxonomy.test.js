import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const schema = JSON.parse(fs.readFileSync('attributes/spec/ui-schema.json', 'utf8'));
const fashionPack = JSON.parse(fs.readFileSync('attributes/024-fashion-commerce.json', 'utf8'));
const entries = fashionPack.entries;

test('fashion pack IDs are unique and bilingual', () => {
  const ids = entries.map(entry => entry.id);
  assert.equal(new Set(ids).size, ids.length);
  entries.forEach(entry => {
    assert.ok(entry.label?.en, `${entry.id} requires label.en`);
    assert.ok(entry.label?.th, `${entry.id} requires label.th`);
    assert.ok(entry.prompt?.default, `${entry.id} requires prompt.default`);
    assert.equal(entry.enabled, true);
  });
});

test('fashion UI fields have active options', () => {
  const fashionGroups = new Set([
    'Fashion Direction', 'Scene Story', 'Photographic Context', 'Hair', 'Body',
    'Clothing', 'Pose', 'Environment', 'Lighting'
  ]);
  const legacyBackedFields = new Set(['Length', 'Color', 'Finish']);

  schema
    .filter(group => fashionGroups.has(group.group))
    .flatMap(group => group.fields)
    .filter(field => !legacyBackedFields.has(field.name))
    .forEach(field => {
      const options = entries.filter(entry => entry.subcategory === field.name && entry.enabled !== false);
      assert.ok(options.length > 0, `${field.name} must have an active fashion option`);
    });
});

test('legacy Character Reference Image field is removed from UI schema', () => {
  const character = schema.find(group => group.group === 'Character');
  assert.ok(character);
  assert.equal(character.fields.some(field => field.name === 'Reference Image'), false);
});

test('Fashion Direction defaults resolve to active pack entries', () => {
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  const directions = entries.filter(entry => entry.category === 'fashion_direction');
  assert.equal(directions.length, 5);

  directions.forEach(direction => {
    Object.values(direction.defaults || {}).forEach(defaultId => {
      assert.equal(byId.get(defaultId)?.enabled, true, `${direction.id} has unknown default ${defaultId}`);
    });
  });
});
