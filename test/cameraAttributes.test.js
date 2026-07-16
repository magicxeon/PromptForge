import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const cameraAttributes = JSON.parse(fs.readFileSync('attributes/014-camera.json', 'utf8'));
const motionBlurOptions = cameraAttributes.filter(entry => entry.subcategory === 'Motion Blur');

test('Motion Blur options control optics without inventing scene content', () => {
  const sceneCreatingTerms = [
    'pedestrian',
    'vehicle',
    'nearby leaves',
    'hair strand',
    'clothing',
    'walking subject',
    'surrounding people',
    'street photography',
    'photojournalistic',
    'documentary lifestyle',
    'skin texture',
    'sony',
    'canon',
    'leica'
  ];

  assert.equal(motionBlurOptions.length, 13);
  motionBlurOptions.forEach(option => {
    const promptText = Object.values(option.prompt || {}).join(' ').toLowerCase();
    sceneCreatingTerms.forEach(term => {
      assert.equal(
        promptText.includes(term),
        false,
        `${option.id} Motion Blur prompt must not inject "${term}"`
      );
    });
  });
});

test('Motion Blur options retain bilingual labels and stable IDs', () => {
  motionBlurOptions.forEach(option => {
    assert.match(option.id, /^camera\.blur_/);
    assert.ok(option.label?.en, `${option.id} requires label.en`);
    assert.ok(option.label?.th, `${option.id} requires label.th`);
    assert.ok(option.prompt?.default, `${option.id} requires prompt.default`);
    assert.ok(option.prompt?.['gpt-image'], `${option.id} requires prompt.gpt-image`);
  });
});
