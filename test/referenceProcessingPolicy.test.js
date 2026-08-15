import assert from 'node:assert/strict';
import test from 'node:test';
import { ReferencePolicyRegistry } from '../server/domain/reference-processing/ReferencePolicyRegistry.js';

const processors = ['image_probe', 'orientation_normalize'];

test('reference processing policy loads every canonical role', () => {
  const registry = new ReferencePolicyRegistry({ knownProcessorIds: processors });
  assert.match(registry.getPolicyVersion(), /^rpp-/);
  assert.equal(registry.getRole('face_reference').intent, 'identity_transfer');
  assert.equal(registry.getRole('outfit_front').authorityDomains.includes('garment'), true);
  assert.deepEqual(
    registry.getReferenceOrder('gemini', 'any-model').slice(0, 3),
    ['template_baseline', 'character_reference', 'face_reference']
  );
  assert.equal(
    registry.getProviderStructuredBrief('gemini', 'any-model').id,
    'fashion_template_character_outfit_v1'
  );
});

test('reference processing policy rejects unknown processors and directives', () => {
  const policy = minimalPolicy();
  policy.roles.face_reference.processors = ['unknown_processor'];
  assert.throws(
    () => new ReferencePolicyRegistry({ policy, knownProcessorIds: processors }),
    error => error.code === 'reference_policy_invalid'
  );

  const directivePolicy = minimalPolicy();
  directivePolicy.roles.face_reference.directiveId = 'missing';
  assert.throws(
    () => new ReferencePolicyRegistry({
      policy: directivePolicy,
      knownProcessorIds: processors
    }),
    error => error.code === 'reference_policy_invalid'
  );
});

function minimalPolicy() {
  const role = {
    intent: 'test',
    allowedSourceKinds: ['asset'],
    preserveTraits: [],
    suppressTraits: [],
    authorityDomains: [],
    ownedAttributeGroups: [],
    editableAttributeFields: [],
    processors: ['image_probe'],
    directiveId: 'test.v1'
  };
  const roles = Object.fromEntries([
    'template_baseline',
    'character_reference',
    'face_reference',
    'outfit_front',
    'outfit_back',
    'style_reference',
    'pose_reference',
    'product_reference',
    'environment_reference'
  ].map(name => [name, structuredClone(role)]));
  return {
    schemaVersion: 1,
    policyVersion: 'test-v1',
    defaultFallbackMode: 'safe_deterministic',
    defaultReferenceOrder: Object.keys(roles),
    domainPriorities: {
      identity: ['attributes'],
      body: ['attributes'],
      expression: ['attributes'],
      pose: ['attributes'],
      garment: ['attributes'],
      environment: ['attributes'],
      lighting: ['attributes'],
      composition: ['attributes'],
      renderingStyle: ['attributes']
    },
    roles,
    directives: { 'test.v1': { base: 'Test directive.' } },
    providerOverrides: {}
  };
}
