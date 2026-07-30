import assert from 'node:assert/strict';
import test from 'node:test';
import { ReferenceAuthorityPlanner } from '../server/domain/reference-processing/ReferenceAuthorityPlanner.js';
import { ReferencePolicyRegistry } from '../server/domain/reference-processing/ReferencePolicyRegistry.js';

const registry = new ReferencePolicyRegistry({
  knownProcessorIds: ['image_probe', 'orientation_normalize']
});
const planner = new ReferenceAuthorityPlanner({ policyRegistry: registry });

test('Face Reference suppresses identity fields while preserving Expression', () => {
  const result = planner.createPlan({
    references: [{ role: 'face_reference' }],
    selections: {
      'Face Shape': selection('Face'),
      Eyes: selection('Face'),
      Expression: selection('Face'),
      Environment: selection('Environment')
    }
  });
  assert.deepEqual(Object.keys(result.effectiveSelections).sort(), [
    'Environment',
    'Expression'
  ]);
  assert.equal(result.authorityPlan.identity.primarySource, 'face_reference');
  assert.deepEqual(result.suppressedSelections.map(item => item.fieldName).sort(), [
    'Eyes',
    'Face Shape'
  ]);
});

test('Reusable Character leaves clothing editable but Styled Character preserves it', () => {
  const input = {
    references: [{ role: 'character_reference' }],
    selections: {
      Gender: selection('Character'),
      Hair: selection('Hair'),
      Clothing: selection('Clothing'),
      Expression: selection('Face')
    }
  };
  const reusable = planner.createPlan({
    ...input,
    characterReferenceOutfitBehavior: 'replaceable'
  });
  assert.deepEqual(Object.keys(reusable.effectiveSelections).sort(), [
    'Clothing',
    'Expression'
  ]);

  const styled = planner.createPlan({
    ...input,
    characterReferenceOutfitBehavior: 'preserve'
  });
  assert.deepEqual(Object.keys(styled.effectiveSelections), ['Expression']);
});

test('Outfit Reference owns garment fields and honors explicit configured overrides', () => {
  const selections = {
    'Outfit Base': selection('Clothing'),
    'Primary Color': selection('Clothing'),
    Material: selection('Clothing'),
    Pose: selection('Pose')
  };
  const strict = planner.createPlan({
    references: [{ role: 'outfit_front' }],
    selections
  });
  assert.deepEqual(Object.keys(strict.effectiveSelections), ['Pose']);

  const customized = planner.createPlan({
    references: [{ role: 'outfit_front' }],
    selections,
    outfitReferenceOverrides: {
      enabled: true,
      primaryColor: true,
      material: true
    }
  });
  assert.deepEqual(Object.keys(customized.effectiveSelections).sort(), [
    'Material',
    'Pose',
    'Primary Color'
  ]);
});

function selection(group) {
  return { id: `selection_${group}`, group };
}
