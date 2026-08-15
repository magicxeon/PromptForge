import assert from 'node:assert/strict';
import test from 'node:test';
import { GENERATION_INPUT_POLICY } from '../server/config/generationInputPolicy.js';
import { normalizeCustomAttributeSelections } from '../server/domain/generation/customAttributeInputPolicy.js';

function customSelection(value) {
  return {
    id: 'custom.pose-intent',
    value,
    isCustom: true,
    group: 'Pose',
    category: 'pose',
    tags: []
  };
}

test('custom attribute policy preserves a detailed pose without truncation', () => {
  const pose = 'A'.repeat(829);
  const normalized = normalizeCustomAttributeSelections({
    'Pose Intent': customSelection(`  ${pose}  `)
  });

  assert.equal(normalized['Pose Intent'].value, pose);
});

test('custom attribute policy rejects a field above its character limit', () => {
  const limit = GENERATION_INPUT_POLICY.customAttribute.maxCharactersPerField;
  assert.throws(
    () => normalizeCustomAttributeSelections({
      'Pose Intent': customSelection('A'.repeat(limit + 1))
    }),
    error => error.code === 'custom_attribute_too_long'
      && error.details.fieldName === 'Pose Intent'
  );
});

test('custom attribute policy rejects the combined custom prompt budget', () => {
  const fieldLimit = GENERATION_INPUT_POLICY.customAttribute.maxCharactersPerField;
  assert.throws(
    () => normalizeCustomAttributeSelections({
      'Pose Intent': customSelection('A'.repeat(fieldLimit)),
      Location: {
        ...customSelection('B'.repeat(fieldLimit)),
        id: 'custom.location',
        group: 'Environment',
        category: 'environment'
      },
      Lighting: {
        ...customSelection('C'),
        id: 'custom.lighting',
        group: 'Lighting',
        category: 'lighting'
      }
    }),
    error => error.code === 'custom_attribute_total_too_long'
  );
});
