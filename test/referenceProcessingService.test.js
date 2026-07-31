import assert from 'node:assert/strict';
import test from 'node:test';
import { ReferencePolicyRegistry } from '../server/domain/reference-processing/ReferencePolicyRegistry.js';
import { ReferenceProcessingService } from '../server/domain/reference-processing/ReferenceProcessingService.js';

const policyRegistry = new ReferencePolicyRegistry({
  knownProcessorIds: ['image_probe', 'orientation_normalize']
});

test('processing service orders, deduplicates and bounds reference authority', async () => {
  const processorRegistry = {
    async process(input) {
      return {
        sourceAssetId: `ast_${input.slotId}`,
        derivativeAssetId: null,
        imageUrl: input.value,
        contentFingerprint: input.value === '/same.jpg' ? 'same' : input.slotId,
        processorIds: ['image_probe'],
        processorVersions: { image_probe: '1.0.0' },
        fallback: false
      };
    }
  };
  const service = new ReferenceProcessingService({
    policyRegistry,
    processorRegistry
  });
  const context = contextFixture();
  const result = await service.processContext(context, {
    actorContext: { userId: 'usr_test', username: 'test' },
    providerId: 'gemini',
    modelId: 'model',
    modelConfig: { capabilities: { maxReferenceImages: 4 } }
  });

  assert.equal(result.providerPlan.referenceCount, 3);
  assert.equal(result.providerPlan.orderedReferenceIds.length, 3);
  assert.deepEqual(
    result.providerPlan.orderedReferences.map(reference => reference.roles),
    [['face_reference'], ['outfit_front'], ['style_reference', 'pose_reference']]
  );
  assert.match(result.compiledDirective, /outfit_front:/);
  assert.match(result.compiledDirective, /Suppress the source wearer identity/i);
  assert.equal(context.referenceCount, 3);
  assert.equal(context.referenceProcessingLineage.policyVersion, policyRegistry.getPolicyVersion());
  assert.deepEqual(Object.keys(context.selections), ['Expression']);
});

test('processing service enforces a provider that supports no references', async () => {
  const service = new ReferenceProcessingService({
    policyRegistry,
    processorRegistry: {
      async process(input) {
        return {
          sourceAssetId: null,
          derivativeAssetId: null,
          imageUrl: input.value,
          contentFingerprint: input.slotId,
          processorIds: [],
          processorVersions: {},
          fallback: true
        };
      }
    }
  });
  await assert.rejects(
    service.processContext(contextFixture(), {
      actorContext: { userId: 'usr_test', username: 'test' },
      providerId: 'no-reference-provider',
      modelId: 'model',
      modelConfig: { capabilities: { maxReferenceImages: 0 } }
    }),
    error => error.code === 'reference_capacity_exceeded'
  );
});

test('Fashion compiles an ordered Template, Character and Outfit authority brief', async () => {
  const service = new ReferenceProcessingService({
    policyRegistry,
    processorRegistry: {
      async process(input) {
        return {
          sourceAssetId: null,
          derivativeAssetId: null,
          imageUrl: input.value,
          contentFingerprint: input.slotId,
          processorIds: [],
          processorVersions: {},
          fallback: false
        };
      }
    }
  });
  const context = {
    generationSurface: 'fashion',
    aspectRatio: '6:8',
    templateBaselineReference: '/outputs/job_template.png',
    characterReferenceImageA: '/outputs/character/casting-three-view.png',
    outfitReferenceImageFront: '/outputs/references/outfit.jpg',
    characterReferenceOutfitBehavior: 'replaceable',
    imageReferences: {
      characterReference: true,
      outfitReference: true
    },
    selections: {}
  };
  const result = await service.processContext(context, {
    actorContext: { userId: 'usr_fashion', username: 'fashion' },
    providerId: 'gemini',
    modelId: 'gemini-3.1-flash-lite-image',
    modelConfig: { capabilities: { maxReferenceImages: 6 } }
  });

  assert.deepEqual(
    result.providerPlan.orderedReferences.map(reference => reference.slots[0]),
    [
      'template_baseline',
      'character_reference_a',
      'outfit_front'
    ]
  );
  assert.deepEqual(result.providerPlan.dispatchRuleIds, []);
  assert.deepEqual(result.providerPlan.suppressedReferenceRoles, []);
  assert.match(
    result.compiledDirective,
    /"source_image": "IMAGE_0"/
  );
  assert.match(
    result.compiledDirective,
    /"identity_source": "IMAGE_1 only"/
  );
  assert.match(
    result.compiledDirective,
    /"garment_source": "IMAGE_2 only"/
  );
  assert.match(
    result.compiledDirective,
    /"template skin tone"/
  );
});

test('processing service rejects a deduplicated plan above provider capacity', async () => {
  const service = new ReferenceProcessingService({
    policyRegistry,
    processorRegistry: {
      async process(input) {
        return {
          sourceAssetId: null,
          derivativeAssetId: null,
          imageUrl: input.value,
          contentFingerprint: input.slotId,
          processorIds: [],
          processorVersions: {},
          fallback: true
        };
      }
    }
  });
  await assert.rejects(
    service.processContext(contextFixture(), {
      actorContext: { userId: 'usr_test', username: 'test' },
      providerId: 'gemini',
      modelId: 'model',
      modelConfig: { capabilities: { maxReferenceImages: 2 } }
    }),
    error => error.code === 'reference_capacity_exceeded'
  );
});

function contextFixture() {
  return {
    generationSurface: 'playground',
    imageReferences: {
      faceMatch: true,
      characterReference: false,
      outfitReference: true,
      styleMatch: true,
      poseMatch: true
    },
    faceReferenceImageA: '/face.jpg',
    outfitReferenceImageFront: '/outfit.jpg',
    styleReferenceImageA: '/same.jpg',
    styleReferenceImageB: '/same.jpg',
    characterReferenceOutfitBehavior: 'replaceable',
    outfitReferenceOverrides: { enabled: false },
    selections: {
      'Face Shape': { id: 'face', group: 'Face' },
      'Outfit Base': { id: 'outfit', group: 'Clothing' },
      Pose: { id: 'pose', group: 'Pose' },
      Expression: { id: 'expression', group: 'Face' }
    }
  };
}
