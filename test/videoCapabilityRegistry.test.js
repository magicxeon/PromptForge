import assert from 'node:assert/strict';
import test from 'node:test';

test('Cinematic Look mode is catalog-driven and development-only for Seedance 2.x', () => {
  const development = new VideoCapabilityRegistry({ runtimeEnvironment: 'development', developmentPocEnabled: true });
  const production = new VideoCapabilityRegistry({ runtimeEnvironment: 'production', developmentPocEnabled: true });
  const model = development.resolve('modelark', 'dreamina-seedance-2-5-260628');
  assert.equal(model.supportsCinematicLookReferences, true);
  assert.ok(model.inputModes.includes('multimodal_reference'));
  assert.equal(model.referenceImageLimit, 9);
  assert.notEqual(production.resolve('modelark', model.modelId).supportsCinematicLookReferences, true);
  assert.notEqual(development.resolve('modelark', 'seedance-1-0-pro-250528').supportsCinematicLookReferences, true);
});
import {
  normalizeVideoExecutionSelection,
  VideoCapabilityRegistry,
  videoCapabilityRegistry
} from '../server/domain/generation/VideoCapabilityRegistry.js';
import { ProviderAvailabilityPolicyService } from '../server/domain/admin-configuration/ProviderAvailabilityPolicyService.js';

test('video catalog and validation honor a workflow-specific runtime disable', () => {
  const availabilityPolicy = new ProviderAvailabilityPolicyService({
    initialState: {
      schemaVersion: 1, version: 1, updatedAt: null, providers: {}, models: {}, history: [],
      workflows: {
        'modelark/dreamina-seedance-2-5-260628/cinematic.produce_video': {
          enabled: false, reason: 'Cinematic pause'
        }
      }
    }
  });
  const registry = new VideoCapabilityRegistry({
    runtimeEnvironment: 'development', developmentPocEnabled: true, availabilityPolicy
  });
  const models = registry.getPublicCatalog({
    includeResearch: true, workflow: 'cinematic.produce_video'
  }).models;
  assert.equal(models.some(model => model.modelId === 'dreamina-seedance-2-5-260628'), false);
  assert.throws(() => registry.validateRequest({
    providerId: 'modelark', modelId: 'dreamina-seedance-2-5-260628'
  }, { allowTesting: true, workflow: 'cinematic.produce_video' }), error => (
    error.code === 'provider_runtime_disabled' && error.details.scope === 'workflow'
  ));
});

test('paid video catalog exposes no unqualified research models', () => {
  assert.deepEqual(videoCapabilityRegistry.getPublicCatalog().models, []);
  const researchModels = videoCapabilityRegistry.getPublicCatalog({ includeResearch: true }).models;
  assert.equal(researchModels.length, 11);
  const omni = researchModels.find(model => model.modelId === 'gemini-omni-1.1-flash');
  assert.equal(omni.providerApi, 'interactions');
  assert.equal(omni.pricingStatus, 'research_only');
  assert.deepEqual(omni.operations, ['text_to_video', 'image_to_video', 'character_to_video']);
  assert.equal(omni.durationControlMode, 'prompted');
  assert.deepEqual(omni.durations, [3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(omni.resolutions, ['720p']);
  assert.ok(researchModels.some(model => model.modelId === 'seedance-1-0-pro-250528'));
  const testingModels = videoCapabilityRegistry.getPublicCatalog({ includeTesting: true }).models;
  assert.equal(testingModels.length, 9);
  assert.equal(testingModels.filter(model => model.providerId === 'modelark').length, 7);
  assert.deepEqual(
    testingModels.filter(model => model.providerId === 'gemini').map(model => model.modelId),
    ['veo-3.1-lite-generate-preview', 'gemini-omni-1.1-flash']
  );
  const testingOmni = testingModels.find(model => model.modelId === 'gemini-omni-1.1-flash');
  assert.equal(testingOmni.testingRoutingEnabled, true);
  assert.equal(testingOmni.pricingStatus, 'research_only');
  assert.ok(testingModels.filter(model => model.providerId === 'modelark')
    .every(model => model.operations.includes('text_to_video') && model.paidRoutingEnabled === false));
});

test('Preview Omni model ID resolves to the GA catalog model for historical compatibility', () => {
  const model = videoCapabilityRegistry.resolve('gemini', 'gemini-omni-flash-preview');
  assert.equal(model.modelId, 'gemini-omni-1.1-flash');
});

test('Seedance internal routing accepts Prompt only and blocks unqualified private-reference operations', () => {
  const request = {
    providerId: 'modelark', modelId: 'dreamina-seedance-2-5-260628',
    operation: 'text_to_video', aspectRatio: '9:16', resolution: '720p',
    durationSeconds: 5, audioMode: 'generated', referenceImageCount: 0
  };
  assert.equal(videoCapabilityRegistry.validateRequest(request, { allowTesting: true }).providerId, 'modelark');
  assert.throws(
    () => videoCapabilityRegistry.validateRequest({ ...request, operation: 'character_to_video', referenceImageCount: 1 }, { allowTesting: true }),
    error => error.code === 'video_parameter_unsupported'
  );
});

test('development POC exposes unverified Seedance first-frame modes without changing production', () => {
  const development = new VideoCapabilityRegistry({
    runtimeEnvironment: 'development', developmentPocEnabled: true, developmentPocCredits: 1
  });
  const production = new VideoCapabilityRegistry({
    runtimeEnvironment: 'production', developmentPocEnabled: true, developmentPocCredits: 1
  });
  const request = {
    providerId: 'modelark', modelId: 'dreamina-seedance-2-5-260628',
    commercialOperation: 'cinematic_draft_clip', inputMode: 'image_to_video',
    operation: 'image_to_video', aspectRatio: '9:16', resolution: '720p',
    durationSeconds: 5, audioMode: 'generated', referenceImageCount: 1
  };
  const developmentModel = development.validateRequest(request, { allowTesting: true });
  assert.equal(developmentModel.developmentPocUnverified, true);
  assert.equal(developmentModel.developmentPocCredits, 1);
  assert.ok(developmentModel.inputModes.includes('image_to_video'));
  assert.ok(developmentModel.referenceConstraints.maximumBytes > 0);
  assert.equal(developmentModel.portraitReferencePolicy, 'provider_generated_asset_required');
  assert.equal(development.getPublicCatalog({ includeTesting: true }).models
    .filter(model => model.providerId === 'modelark' && model.modelId.includes('seedance-2'))
    .every(model => model.portraitReferencePolicy === 'provider_generated_asset_required'), true);
  assert.equal(development.getPublicCatalog({ includeTesting: true }).models
    .filter(model => model.providerId === 'modelark' && model.modelId.includes('seedance-2'))
    .every(model => model.trustedGeneratedImageSource.modelIds.includes('dola-seedream-5-0-pro-260628')), true);
  assert.throws(
    () => development.validateRequest({ ...request, referenceContainsPerson: true }, { allowTesting: true }),
    error => error.code === 'video_provider_synthetic_character_source_required'
      && error.details.recovery === 'regenerate_storyboard_with_compatible_seedream'
  );
  assert.equal(development.validateRequest({
    ...request,
    referenceContainsPerson: true,
    providerCredentialScope: 'modelark:test:shared',
    referenceAuthority: {
      kind: 'cinematic_storyboard_source',
      immutable: true,
      contentHash: 'content_hash',
      sourceFingerprint: 'source_fingerprint',
      providerOutputProvenance: {
        kind: 'provider_generated_image',
        providerId: 'modelark',
        requestedModelId: 'seedream-5-0-lite-260128',
        resolvedModelId: 'seedream-5-0-lite-260128',
        credentialScope: 'modelark:test:shared',
        generatedAt: new Date().toISOString(),
        originalBytesPreserved: true
      }
    }
  }, { allowTesting: true }).modelId, request.modelId);
  assert.equal(development.validateRequest({
    ...request,
    referenceContainsPerson: true,
    providerCredentialScope: 'modelark:test:shared',
    referenceAuthority: {
      kind: 'cinematic_storyboard_source', immutable: true,
      contentHash: 'content_hash_pro', sourceFingerprint: 'source_fingerprint_pro',
      providerOutputProvenance: {
        kind: 'provider_generated_image', providerId: 'modelark',
        requestedModelId: 'dola-seedream-5-0-pro-260628',
        resolvedModelId: 'dola-seedream-5-0-pro-260628',
        credentialScope: 'modelark:test:shared', generatedAt: new Date().toISOString(),
        originalBytesPreserved: true
      }
    }
  }, { allowTesting: true }).modelId, request.modelId);
  assert.throws(
    () => development.validateRequest({
      ...request,
      referenceContainsPerson: true,
      providerCredentialScope: 'modelark:test:shared',
      referenceAuthority: {
        kind: 'cinematic_storyboard_source', immutable: true,
        contentHash: 'content_hash_unlisted', sourceFingerprint: 'source_fingerprint_unlisted',
        providerOutputProvenance: {
          kind: 'provider_generated_image', providerId: 'modelark',
          requestedModelId: 'seedream-4-5-251128', resolvedModelId: 'seedream-4-5-251128',
          credentialScope: 'modelark:test:shared', generatedAt: new Date().toISOString(),
          originalBytesPreserved: true
        }
      }
    }, { allowTesting: true }),
    error => error.code === 'video_provider_synthetic_character_source_required'
      && error.details.reason === 'source_model_not_qualified'
  );
  assert.match(development.getPublicCatalog({ includeTesting: true }).catalogVersion, /development-poc$/);
  assert.throws(
    () => production.validateRequest(request, { allowTesting: true }),
    error => error.code === 'video_parameter_unsupported' && error.details.field === 'inputMode'
  );
});

test('commercial operation and provider input mode are validated independently', () => {
  const request = {
    providerId: 'modelark', modelId: 'seedance-1-0-pro-fast-251015',
    commercialOperation: 'cinematic_draft_clip', inputMode: 'image_to_video',
    operation: 'image_to_video', aspectRatio: '9:16', resolution: '720p',
    durationSeconds: 6, audioMode: 'none', referenceImageCount: 1
  };
  const model = videoCapabilityRegistry.validateRequest(request, { allowTesting: true });
  assert.equal(model.providerId, 'modelark');
  assert.ok(model.commercialOperations.includes('cinematic_draft_clip'));
  assert.ok(model.inputModes.includes('image_to_video'));
  assert.throws(
    () => videoCapabilityRegistry.validateRequest({
      ...request,
      commercialOperation: 'cinematic_final_clip'
    }, { allowTesting: true }),
    error => error.code === 'video_parameter_unsupported'
      && error.details.field === 'commercialOperation'
  );
});

test('legacy operation requests receive a bounded normalized selection', () => {
  assert.deepEqual(normalizeVideoExecutionSelection({ operation: 'image_to_video' }), {
    commercialOperation: 'playground_video',
    inputMode: 'image_to_video',
    operation: 'image_to_video',
    legacyInferred: true
  });
  assert.deepEqual(normalizeVideoExecutionSelection({
    operation: 'cinematic_draft_clip', referenceImageCount: 1
  }), {
    commercialOperation: 'cinematic_draft_clip',
    inputMode: 'image_to_video',
    operation: 'image_to_video',
    legacyInferred: true
  });
});

test('video capability validation blocks paid routing and rejects unsupported Veo combinations', () => {
  const request = {
    providerId: 'gemini', modelId: 'veo-3.1-fast-generate-preview',
    operation: 'cinematic_draft_clip', aspectRatio: '9:16', resolution: '720p',
    durationSeconds: 4, audioMode: 'generated', referenceImageCount: 0
  };
  assert.throws(() => videoCapabilityRegistry.validateRequest(request), error => error.code === 'video_model_not_qualified');
  assert.throws(
    () => videoCapabilityRegistry.validateRequest({ ...request, resolution: '1080p' }, { allowResearch: true }),
    error => error.code === 'video_parameter_combination_unsupported'
  );
  assert.equal(videoCapabilityRegistry.validateRequest({ ...request, durationSeconds: 8, resolution: '1080p' }, { allowResearch: true }).providerId, 'gemini');
});

test('Seedance 2.5 keeps 1080p blocked by capability evidence', () => {
  assert.throws(() => videoCapabilityRegistry.validateRequest({
    providerId: 'modelark', modelId: 'dreamina-seedance-2-5-260628',
    operation: 'cinematic_final_clip', aspectRatio: '9:16', resolution: '1080p',
    durationSeconds: 5, audioMode: 'generated', referenceImageCount: 1
  }, { allowResearch: true }), error => error.code === 'video_parameter_unsupported');
});
