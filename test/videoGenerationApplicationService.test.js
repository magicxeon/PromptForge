import assert from 'node:assert/strict';
import test from 'node:test';
import { VideoGenerationApplicationService } from '../server/domain/generation/VideoGenerationApplicationService.js';
import { VideoCapabilityRegistry } from '../server/domain/generation/VideoCapabilityRegistry.js';
import { createStoryboardSourceFingerprint } from '../server/domain/assets/CinematicStoryboardAssetService.js';

const actor = { userId: 'usr_video', username: 'video_user', role: 'user' };
const TEST_MODELARK_SCOPE = 'modelark:ark.test:account:video-test';


test('Cinematic multimodal quote binds every Look and dispatches URL references once without a duplicate first frame', async () => {
  const board = compatibleSeedreamAsset();
  const look = { id: 'look_sheet', ownerUserId: actor.userId, assetType: 'character_look_sheet',
    publicUrl: '/outputs/look.png', mimeType: 'image/png', width: 1024, height: 1024, sizeBytes: 1000,
    contentHash: 'look_hash', metadata: {} };
  let revoked = false;
  let dispatched;
  let estimated;
  let reserved;
  const calls = [];
  const service = new VideoGenerationApplicationService({
    capabilityRegistry: new VideoCapabilityRegistry({ runtimeEnvironment: 'development', developmentPocEnabled: true }),
    assetRepository: { async findByIdForOwner(id, owner) { return owner === actor.userId ? [board, look].find(item => item.id === id) : null; } },
    storyboardAssetContentVerifier: async asset => ({ contentHash: asset.metadata.contentHash }),
    modelArkCredentialScopeResolver: () => TEST_MODELARK_SCOPE,
    lookService: { async resolveApprovedSheetReference(profile, id, version, owner) {
      assert.equal(profile, 'character'); assert.equal(version, 'look_version'); assert.equal(owner.userId, actor.userId);
      if (revoked) throw Object.assign(new Error('Look revoked'), { code: 'look_revoked' });
      return { asset: look, sourceFingerprint: 'look_fingerprint' };
    } },
    firstFrameTransport: { async resolve({ sourceAsset, expectedContentHash }) {
      assert.equal(expectedContentHash, sourceAsset.id === look.id ? look.contentHash : board.metadata.contentHash);
      calls.push(`resolve:${sourceAsset.id}`);
      return { value: `https://example.com/${sourceAsset.id}.png`, transport: { mode: 'gcs_url' } };
    } },
    creditService: {
      async estimateVideo(value) { estimated = value.request; return { estimateId: 'multi_quote', estimatedCredits: 1 }; },
      async getAccount() { return { availableCredits: 100 }; },
      async validateAndReserveForRequest(value) { reserved = value.generationRequest; calls.push('reserve');
        return { estimate: { estimateId: 'multi_quote', estimatedCredits: 1 }, reservation: { reservationId: 'multi_reservation' }, billingStatus: 'reserved' }; }
    },
    taskRepository: repositoryStub(new Map()),
    providerTaskService: { async preflightTask(value) {
      if (value.referenceImages?.length) { assert.equal(value.referenceImage, null); assert.equal(value.referenceImages.length, 2); calls.push('preflight-resolved'); }
    }, async submitTask(value) { dispatched = value; calls.push('dispatch'); return { id: value.id, ownerUserId: actor.userId, status: 'provider_queued' }; } },
    testingEnabled: true
  });
  const request = { providerId: 'modelark', modelId: 'dreamina-seedance-2-5-260628',
    operation: 'image_to_video', commercialOperation: 'cinematic_draft_clip', inputMode: 'multimodal_reference',
    prompt: 'Image 1: opening. Image 2: identity and wardrobe.', referenceContainsPerson: true,
    aspectRatio: '9:16', resolution: '480p', durationSeconds: 6, audioMode: 'none', references: [
      { role: 'reference_image', purpose: 'storyboard_opening', assetId: board.id, assetVersionId: board.id,
        sourceFingerprint: createStoryboardSourceFingerprint(board), referenceImageUrl: board.publicUrl },
      { role: 'reference_image', purpose: 'character_look', assetId: look.id, assetVersionId: look.id,
        characterProfileId: 'character', characterLookId: 'look', characterLookVersionId: 'look_version',
        contentHash: look.contentHash, sourceFingerprint: 'look_fingerprint', referenceImageUrl: look.publicUrl }
    ] };
  const workflow = { capability: 'cinematic', generationMode: 'cinematic_video', projectId: 'project', sceneId: 'scene', shotId: 'shot' };
  const quote = await service.quote(request, actor, workflow);
  const submission = { ...request, estimateId: 'multi_quote', requestFingerprint: quote.requestFingerprint, idempotencyKey: 'multi-look-reference' };
  revoked = true;
  await assert.rejects(service.submit(submission, actor, workflow), { code: 'look_revoked' });
  assert.deepEqual(calls, []);
  revoked = false;
  look.contentHash = 'changed_hash';
  await assert.rejects(service.submit(submission, actor, workflow), { code: 'cinematic_video_reference_content_changed' });
  assert.deepEqual(calls, []);
  look.contentHash = 'look_hash';
  await service.submit(submission, actor, workflow);
  assert.equal(dispatched.referenceImage, null);
  assert.deepEqual(dispatched.referenceImages.map(item => item.url), [`https://example.com/${board.id}.png`, 'https://example.com/look_sheet.png']);
  assert.equal(estimated.referenceImageCount, 2);
  assert.equal(reserved.referenceCount, 2);
  assert.equal(reserved.referencePlanFingerprint, estimated.referencePlanFingerprint);
  assert.equal(dispatched.referenceAuthorityFingerprint, quote.selection.referenceAuthorityFingerprint);
  assert.equal(dispatched.referenceTransports.length, 2);
  assert.deepEqual(calls, [`resolve:${board.id}`, 'resolve:look_sheet', 'preflight-resolved', 'reserve', 'dispatch']);
});
const input = {
  providerId: 'gemini', modelId: 'veo-3.1-lite-generate-preview', operation: 'text_to_video',
  prompt: 'A clean fashion walk with a slow camera push.', aspectRatio: '9:16',
  resolution: '720p', durationSeconds: 4, audioMode: 'generated'
};

test('video quote delegates locked provider pricing to Credits with matching inputs', async () => {
  let quoted = null;
  const service = createService({
    creditService: {
      async estimateVideo(value) { quoted = value; return { estimateId: 'vest_1', estimatedCredits: 80 }; },
      async getAccount() { return { availableCredits: 100, reservedCredits: 0 }; }
    }
  });
  const result = await service.quote(input, actor);
  assert.equal(quoted.userId, actor.userId);
  assert.equal(quoted.request.durationSeconds, 4);
  assert.equal(quoted.request.operation, 'text_to_video');
  assert.equal(quoted.request.commercialOperation, 'playground_video');
  assert.equal(quoted.request.inputMode, 'text_to_video');
  assert.equal(result.selection.commercialOperation, 'playground_video');
  assert.equal(result.selection.inputMode, 'text_to_video');
  assert.match(result.requestFingerprint, /^[a-f0-9]{64}$/);
  assert.equal(result.account.canAfford, true);
});

test('video quote rejects an empty prompt before pricing', async () => {
  const service = createService();
  await assert.rejects(
    service.quote({ ...input, prompt: '   ' }, actor),
    error => error.code === 'video_prompt_required'
  );
});

test('Seedance generated-source policy blocks an unproven Character frame before pricing', async () => {
  let estimates = 0;
  const service = new VideoGenerationApplicationService({
    capabilityRegistry: new VideoCapabilityRegistry({
      runtimeEnvironment: 'development', developmentPocEnabled: true, developmentPocCredits: 1
    }),
    creditService: {
      async estimateVideo() { estimates += 1; throw new Error('must not estimate'); },
      async getAccount() { return { availableCredits: 100 }; }
    },
    taskRepository: repositoryStub(new Map()),
    providerTaskService: { async preflightTask() {} },
    storyboardAssetContentVerifier: async candidate => ({
      contentHash: candidate.metadata.contentHash,
      sizeBytes: candidate.sizeBytes
    }),
    modelArkCredentialScopeResolver: () => TEST_MODELARK_SCOPE,
    testingEnabled: true
  });

  await assert.rejects(service.quote({
    providerId: 'modelark', modelId: 'dreamina-seedance-2-0-mini-260615',
    commercialOperation: 'cinematic_draft_clip', inputMode: 'image_to_video',
    operation: 'image_to_video', prompt: 'Animate the approved frame.',
    aspectRatio: '9:16', resolution: '720p', durationSeconds: 6, audioMode: 'none',
    referenceContainsPerson: true,
    references: [{ role: 'first_frame', referenceImageUrl: 'https://example.com/frame.png' }]
  }, actor), error => error.code === 'video_trusted_source_unavailable');
  assert.equal(estimates, 0);
});

test('Cinematic Seedance quote accepts an owner-scoped compatible Seedream first frame', async () => {
  let estimates = 0;
  const asset = compatibleSeedreamAsset();
  const service = new VideoGenerationApplicationService({
    capabilityRegistry: new VideoCapabilityRegistry({
      runtimeEnvironment: 'development', developmentPocEnabled: true, developmentPocCredits: 1
    }),
    assetRepository: { findByIdForOwner: async (id, ownerUserId) => (
      id === asset.id && ownerUserId === actor.userId ? asset : null
    ) },
    creditService: {
      async estimateVideo() { estimates += 1; return { estimateId: 'vest_seedance', estimatedCredits: 1 }; },
      async getAccount() { return { availableCredits: 100 }; }
    },
    taskRepository: repositoryStub(new Map()),
    providerTaskService: { async preflightTask() {} },
    storyboardAssetContentVerifier: async candidate => ({
      contentHash: candidate.metadata.contentHash,
      sizeBytes: candidate.sizeBytes
    }),
    modelArkCredentialScopeResolver: () => TEST_MODELARK_SCOPE,
    testingEnabled: true
  });
  const sourceFingerprint = createStoryboardSourceFingerprint(asset);
  const result = await service.quote({
    providerId: 'modelark', modelId: 'dreamina-seedance-2-0-mini-260615',
    commercialOperation: 'cinematic_draft_clip', inputMode: 'image_to_video',
    operation: 'image_to_video', prompt: 'Animate one restrained action from the approved frame.',
    aspectRatio: '9:16', resolution: '720p', durationSeconds: 6, audioMode: 'none',
    referenceContainsPerson: true,
    references: [{
      role: 'first_frame', assetId: asset.id, assetVersionId: asset.id,
      sourceFingerprint, referenceImageUrl: asset.publicUrl
    }]
  }, actor, {
    capability: 'cinematic', generationMode: 'cinematic_video', projectId: 'cineproj_seedream',
    sceneId: 'scene_1', shotId: 'shot_1'
  });

  assert.equal(estimates, 1);
  assert.match(result.selection.referenceAuthorityFingerprint, /^[a-f0-9]{64}$/);
  assert.equal(result.selection.developmentPocCredits, 1);
});

test('Cinematic Seedance reports missing ModelArk credentials before pricing', async () => {
  let estimates = 0;
  const service = new VideoGenerationApplicationService({
    capabilityRegistry: new VideoCapabilityRegistry({
      runtimeEnvironment: 'development', developmentPocEnabled: true, developmentPocCredits: 1
    }),
    modelArkCredentialScopeResolver: () => null,
    creditService: {
      async estimateVideo() { estimates += 1; },
      async getAccount() { return { availableCredits: 100 }; }
    },
    taskRepository: repositoryStub(new Map()),
    providerTaskService: { async preflightTask() {} },
    testingEnabled: true
  });

  await assert.rejects(service.quote({
    providerId: 'modelark', modelId: 'dreamina-seedance-2-0-mini-260615',
    commercialOperation: 'cinematic_draft_clip', inputMode: 'image_to_video',
    operation: 'image_to_video', prompt: 'Animate the approved frame.',
    aspectRatio: '9:16', resolution: '720p', durationSeconds: 6, audioMode: 'none',
    referenceContainsPerson: true,
    references: [{ role: 'first_frame', referenceImageUrl: '/outputs/frame.png' }]
  }, actor, {
    capability: 'cinematic', generationMode: 'cinematic_video', projectId: 'cineproj_missing_key',
    sceneId: 'scene_1', shotId: 'shot_1'
  }), error => error.code === 'video_provider_credentials_missing');
  assert.equal(estimates, 0);
});

test('Cinematic Seedance 2.5 dispatches the approved Pro frame URL without Asset Library', async () => {
  const asset = compatibleSeedreamAsset();
  asset.metadata.providerOutputProvenance.requestedModelId = 'dola-seedream-5-0-pro-260628';
  asset.metadata.providerOutputProvenance.resolvedModelId = 'dola-seedream-5-0-pro-260628';
  const originalAsset = structuredClone(asset);
  const originalUrl = 'https://storage.example/approved-frame?signature=private';
  const tasks = new Map();
  const calls = [];
  let dispatched = null;
  const service = new VideoGenerationApplicationService({
    capabilityRegistry: new VideoCapabilityRegistry({
      runtimeEnvironment: 'development', developmentPocEnabled: true, developmentPocCredits: 1
    }),
    assetRepository: { findByIdForOwner: async (id, ownerUserId) => (
      id === asset.id && ownerUserId === actor.userId ? asset : null
    ) },
    storyboardAssetContentVerifier: async candidate => ({
      contentHash: candidate.metadata.contentHash,
      sizeBytes: candidate.sizeBytes
    }),
    modelArkCredentialScopeResolver: () => TEST_MODELARK_SCOPE,
    firstFrameTransport: {
      async resolve({ sourceAsset, ownerUserId, expectedContentHash }) {
        assert.equal(sourceAsset.id, asset.id);
        assert.equal(ownerUserId, actor.userId);
        assert.equal(expectedContentHash, asset.metadata.contentHash);
        calls.push('resolve-original');
        return { value: originalUrl, transport: { mode: 'gcs_url', fallbackCode: null } };
      }
    },
    creditService: {
      async estimateVideo() { return { estimateId: 'vest_seedance_submit', estimatedCredits: 1 }; },
      async getAccount() { return { availableCredits: 100 }; },
      async validateAndReserveForRequest() {
        calls.push('reserve');
        return {
          estimate: { estimateId: 'vest_seedance_submit', estimatedCredits: 1 },
          reservation: { reservationId: 'rsv_seedance_submit' },
          billingStatus: 'reserved'
        };
      }
    },
    taskRepository: repositoryStub(tasks),
    providerTaskService: {
      async preflightTask() { calls.push('preflight'); },
      async submitTask(request) {
        calls.push('dispatch');
        dispatched = request;
        return { id: request.id, ownerUserId: actor.userId, status: 'provider_queued' };
      }
    },
    testingEnabled: true
  });
  const sourceFingerprint = createStoryboardSourceFingerprint(asset);
  const request = {
    providerId: 'modelark', modelId: 'dreamina-seedance-2-5-260628',
    commercialOperation: 'cinematic_draft_clip', inputMode: 'image_to_video',
    operation: 'image_to_video', prompt: 'Animate one restrained action from the approved frame.',
    aspectRatio: '9:16', resolution: '480p', durationSeconds: 6, audioMode: 'none',
    referenceContainsPerson: true,
    references: [{
      role: 'first_frame', assetId: asset.id, assetVersionId: asset.id,
      sourceFingerprint, referenceImageUrl: asset.publicUrl
    }]
  };
  const workflow = {
    capability: 'cinematic', generationMode: 'cinematic_video', projectId: 'cineproj_seedream',
    sceneId: 'scene_1', shotId: 'shot_1'
  };
  const quote = await service.quote(request, actor, workflow);
  await service.submit({
    ...request,
    estimateId: quote.estimate.estimateId,
    requestFingerprint: quote.requestFingerprint,
    idempotencyKey: 'seedream-seedance-exact-bytes'
  }, actor, workflow);

  assert.equal(dispatched.referenceImage, originalUrl);
  assert.equal(dispatched.referenceTransport.mode, 'gcs_url');
  assert.equal(dispatched.modelId, 'dreamina-seedance-2-5-260628');
  assert.equal(dispatched.resolution, '480p');
  assert.deepEqual(dispatched.providerReferenceRegistrations, []);
  assert.deepEqual(asset, originalAsset);
  assert.equal(dispatched.referenceAuthorityFingerprint, quote.selection.referenceAuthorityFingerprint);
  assert.deepEqual(calls, [
    'preflight', 'resolve-original', 'preflight', 'reserve', 'dispatch'
  ]);
});

test('Cinematic Seedance unavailable original bytes fail before Credit reservation', async () => {
  const asset = compatibleSeedreamAsset();
  let reservations = 0;
  const service = new VideoGenerationApplicationService({
    capabilityRegistry: new VideoCapabilityRegistry({
      runtimeEnvironment: 'development', developmentPocEnabled: true, developmentPocCredits: 1
    }),
    assetRepository: { findByIdForOwner: async () => asset },
    storyboardAssetContentVerifier: async candidate => ({
      contentHash: candidate.metadata.contentHash, sizeBytes: candidate.sizeBytes
    }),
    modelArkCredentialScopeResolver: () => TEST_MODELARK_SCOPE,
    firstFrameTransport: { async resolve() { return { value: null }; } },
    creditService: {
      async estimateVideo() { return { estimateId: 'vest_asset_failure', estimatedCredits: 1 }; },
      async getAccount() { return { availableCredits: 100 }; },
      async validateAndReserveForRequest() { reservations += 1; }
    },
    taskRepository: repositoryStub(new Map()),
    providerTaskService: { async preflightTask() {} },
    testingEnabled: true
  });
  const sourceFingerprint = createStoryboardSourceFingerprint(asset);
  const request = {
    providerId: 'modelark', modelId: 'dreamina-seedance-2-0-mini-260615',
    commercialOperation: 'cinematic_draft_clip', inputMode: 'image_to_video',
    operation: 'image_to_video', prompt: 'Animate one restrained action from the approved frame.',
    aspectRatio: '9:16', resolution: '720p', durationSeconds: 6, audioMode: 'none',
    referenceContainsPerson: true,
    references: [{
      role: 'first_frame', assetId: asset.id, assetVersionId: asset.id,
      sourceFingerprint, referenceImageUrl: asset.publicUrl
    }]
  };
  const workflow = {
    capability: 'cinematic', generationMode: 'cinematic_video', projectId: 'cineproj_seedream',
    sceneId: 'scene_1', shotId: 'shot_1'
  };
  const quote = await service.quote(request, actor, workflow);

  await assert.rejects(service.submit({
    ...request, estimateId: quote.estimate.estimateId,
    requestFingerprint: quote.requestFingerprint,
    idempotencyKey: 'seedream-seedance-source-unavailable'
  }, actor, workflow), error => error.code === 'video_reference_unavailable');
  assert.equal(reservations, 0);
});

test('production catalog does not request internal testing models', () => {
  let catalogOptions = null;
  const service = new VideoGenerationApplicationService({
    capabilityRegistry: {
      getPublicCatalog(options) { catalogOptions = options; return { models: [] }; }
    },
    creditService: {},
    characterService: {},
    taskRepository: repositoryStub(new Map()),
    providerTaskService: {},
    testingEnabled: false
  });
  service.getCatalog();
  assert.deepEqual(catalogOptions, { includeTesting: false, workflow: 'playground.video' });
});

test('video submit reserves the exact quote before provider dispatch', async () => {
  const calls = [];
  const tasks = new Map();
  const repository = repositoryStub(tasks);
  const service = createService({
    taskRepository: repository,
    creditService: {
      async validateAndReserveForRequest(value) {
        calls.push(['reserve', value]);
        return {
          estimate: { estimateId: 'vest_1', estimatedCredits: 80 },
          reservation: { reservationId: 'rsv_1' }
        };
      },
      async refundForJob() { throw new Error('refund should not run'); }
    },
    providerTaskService: {
      async submitTask(request) {
        calls.push(['dispatch', request]);
        const task = { id: request.id, status: 'provider_queued', reservationId: request.reservationId };
        tasks.set(task.id, task);
        return task;
      }
    }
  });
  const task = await service.submit({ ...input, estimateId: 'vest_1', idempotencyKey: 'video-test-key-1' }, actor);
  assert.equal(calls[0][0], 'reserve');
  assert.equal(calls[1][0], 'dispatch');
  assert.equal(calls[0][1].generationRequest.operation, 'text_to_video');
  assert.equal(calls[0][1].generationRequest.commercialOperation, 'playground_video');
  assert.equal(calls[0][1].generationRequest.inputMode, 'text_to_video');
  assert.equal(calls[0][1].generationRequest.durationSeconds, 4);
  assert.equal(task.billingStatus, 'reserved');
});

test('video submit completes provider preflight before any Credit reservation', async () => {
  let reservations = 0;
  const service = createService({
    creditService: {
      async validateAndReserveForRequest() { reservations += 1; throw new Error('must not reserve'); }
    },
    providerTaskService: {
      async preflightTask() {
        throw Object.assign(new Error('credential unavailable'), {
          code: 'video_provider_credentials_missing', providerBillableState: 'not_billable'
        });
      }
    }
  });
  await assert.rejects(
    service.submit({ ...input, estimateId: 'vest_1', idempotencyKey: 'video-preflight-key' }, actor),
    error => error.code === 'video_provider_credentials_missing'
  );
  assert.equal(reservations, 0);
});

test('qualification authorization is persisted on the provider task without a reservation', async () => {
  const tasks = new Map();
  let dispatched = null;
  const service = createService({
    taskRepository: repositoryStub(tasks),
    creditService: {
      async validateAndReserveForRequest() {
        return {
          estimate: { estimateId: 'vest_qualification', estimatedCredits: 0 },
          authorization: { authorizationId: 'vqual_test' },
          billingStatus: 'qualification_no_charge'
        };
      }
    },
    providerTaskService: {
      async submitTask(request) {
        dispatched = request;
        const task = { id: request.id, ownerUserId: actor.userId, status: 'provider_queued' };
        tasks.set(task.id, task);
        return task;
      }
    }
  });
  const task = await service.submit({
    ...input, estimateId: 'vest_qualification', idempotencyKey: 'video-qualification-key'
  }, actor);
  assert.equal(dispatched.reservationId, null);
  assert.equal(dispatched.qualificationAuthorizationId, 'vqual_test');
  assert.equal(task.billingStatus, 'qualification_no_charge');
  assert.equal(task.qualificationAuthorizationId, 'vqual_test');
});

test('development POC marker and Credit value remain bound through reservation and dispatch', async () => {
  const tasks = new Map();
  let reservedRequest = null;
  let dispatched = null;
  const pocModel = {
    providerId: input.providerId, modelId: input.modelId, testingRoutingEnabled: true,
    durationControlMode: 'exact', durations: [4], developmentPocUnverified: true,
    developmentPocCredits: 1, developmentPocWarningCode: 'video_model_unverified_development_poc'
  };
  const service = createService({
    model: pocModel,
    taskRepository: repositoryStub(tasks),
    creditService: {
      async validateAndReserveForRequest(value) {
        reservedRequest = value.generationRequest;
        return {
          estimate: { estimateId: 'vest_poc', estimatedCredits: 1 },
          reservation: { reservationId: 'rsv_poc' }
        };
      }
    },
    providerTaskService: {
      async submitTask(request) {
        dispatched = request;
        const task = { id: request.id, ownerUserId: actor.userId, status: 'provider_queued' };
        tasks.set(task.id, task);
        return task;
      }
    }
  });
  const task = await service.submit({
    ...input, estimateId: 'vest_poc', idempotencyKey: 'video-development-poc-key'
  }, actor);
  assert.equal(reservedRequest.developmentPocUnverified, true);
  assert.equal(reservedRequest.developmentPocCredits, 1);
  assert.equal(dispatched.developmentPocWarningCode, 'video_model_unverified_development_poc');
  assert.equal(task.developmentPocUnverified, true);
  assert.equal(task.developmentPocCredits, 1);
});

test('cinematic workflow context preserves quote-submit parity and durable lineage', async () => {
  const calls = [];
  const tasks = new Map();
  const service = createService({
    taskRepository: repositoryStub(tasks),
    creditService: {
      async estimateVideo(value) {
        calls.push(['quote', value]);
        return { estimateId: 'vest_cine', estimatedCredits: 40 };
      },
      async getAccount() { return { availableCredits: 100 }; },
      async validateAndReserveForRequest(value) {
        calls.push(['reserve', value]);
        return { estimate: { estimateId: 'vest_cine', estimatedCredits: 40 }, reservation: { reservationId: 'rsv_cine' } };
      }
    },
    providerTaskService: {
      async submitTask(request) {
        calls.push(['dispatch', request]);
        const task = { id: request.id, status: 'provider_queued', reservationId: request.reservationId };
        tasks.set(task.id, task);
        return task;
      }
    }
  });
  const workflow = {
    capability: 'cinematic', generationMode: 'cinematic_video', projectId: 'cineproj_1',
    sceneId: 'scene_1', shotId: 'shot_1', generationAttemptId: 'cineattempt_1'
  };
  const cinematicInput = {
    ...input,
    commercialOperation: 'cinematic_draft_clip',
    inputMode: 'text_to_video',
    durationSeconds: 4,
    plannedDurationSeconds: 7
  };
  const quote = await service.quote(cinematicInput, actor, workflow);
  await service.submit({ ...cinematicInput, estimateId: 'vest_cine', idempotencyKey: 'cinematic-video-key' }, actor, workflow);
  assert.equal(calls[0][1].generationMode, 'cinematic_video');
  assert.equal(calls[0][1].request.durationSeconds, 8);
  assert.equal(calls[1][1].generationRequest.generationMode, 'cinematic_video');
  assert.equal(calls[1][1].generationRequest.durationSeconds, 8);
  assert.equal(calls[1][1].generationRequest.plannedDurationSeconds, 7);
  assert.equal(calls[1][1].generationRequest.commercialOperation, 'cinematic_draft_clip');
  assert.equal(calls[1][1].generationRequest.inputMode, 'text_to_video');
  assert.equal(calls[1][1].metadata.capability, 'cinematic');
  assert.equal(calls[2][1].projectId, 'cineproj_1');
  assert.equal(calls[2][1].generationAttemptId, 'cineattempt_1');
  assert.equal(calls[2][1].durationSeconds, 8);
  assert.equal(calls[2][1].plannedDurationSeconds, 7);
  assert.equal(calls[2][1].durationReconciliation.strategy, 'pad_and_trim');
  assert.equal(calls[2][1].requestFingerprint, quote.requestFingerprint);
});

test('cinematic quote reconciles a seven-second Shot to an eight-second exact request', async () => {
  let quoted = null;
  const model = {
    providerId: input.providerId, modelId: input.modelId, testingRoutingEnabled: true,
    durationControlMode: 'exact', durations: [4, 6, 8]
  };
  const service = createService({
    model,
    creditService: {
      async estimateVideo(value) { quoted = value; return { estimateId: 'vest_duration', estimatedCredits: 80 }; },
      async getAccount() { return { availableCredits: 100 }; }
    }
  });
  const result = await service.quote({
    ...input,
    durationSeconds: 4,
    plannedDurationSeconds: 7
  }, actor, {
    capability: 'cinematic', generationMode: 'cinematic_video', projectId: 'cineproj_1',
    sceneId: 'scene_1', shotId: 'shot_1'
  });
  assert.equal(quoted.request.durationSeconds, 8);
  assert.equal(result.durationReconciliation.trimDurationSeconds, 1);
});

test('completed durable video captures its reservation once', async () => {
  const tasks = new Map([['videotask_done', {
    id: 'videotask_done', ownerUserId: actor.userId, status: 'provider_processing',
    reservationId: 'rsv_done', billingStatus: 'reserved'
  }]]);
  let captures = 0;
  const repository = repositoryStub(tasks);
  const service = createService({
    taskRepository: repository,
    creditService: { async captureForJob() { captures += 1; } },
    providerTaskService: {
      async pollTask() {
        const task = { ...tasks.get('videotask_done'), status: 'completed', outputAsset: { publicUrl: '/outputs/video.mp4' }, providerUsage: { outputSeconds: 4 } };
        tasks.set(task.id, task);
        return task;
      }
    }
  });
  const completed = await service.getAndPoll('videotask_done', actor);
  assert.equal(completed.billingStatus, 'captured');
  assert.equal(captures, 1);
  await service.getAndPoll('videotask_done', actor);
  assert.equal(captures, 1);
});

test('startup recovery settles a completed reserved task once', async () => {
  const tasks = new Map([['videotask_recovered', {
    id: 'videotask_recovered', ownerUserId: actor.userId, status: 'completed',
    reservationId: 'rsv_recovered', billingStatus: 'reserved',
    providerUsage: { outputSeconds: 4 }, outputAsset: { publicUrl: '/outputs/recovered.mp4' }
  }]]);
  let captures = 0;
  let recoveryCalls = 0;
  const service = createService({
    taskRepository: repositoryStub(tasks),
    creditService: { async captureForJob() { captures += 1; } },
    providerTaskService: {
      async resumeRecoverable() {
        recoveryCalls += 1;
        return recoveryCalls === 1 ? [{ ...tasks.get('videotask_recovered') }] : [];
      }
    }
  });
  const [settled] = await service.resumeRecoverable();
  assert.equal(settled.billingStatus, 'captured');
  await service.resumeRecoverable();
  assert.equal(captures, 1);
});

test('completed video with an already-refunded reservation stops for reconciliation', async () => {
  const tasks = new Map([['videotask_refunded', {
    id: 'videotask_refunded', ownerUserId: actor.userId, status: 'completed',
    reservationId: 'rsv_refunded', billingStatus: 'refunded',
    outputAsset: { publicUrl: '/outputs/refunded-video.mp4' },
    providerUsage: { outputSeconds: 6 }
  }]]);
  let captures = 0;
  const service = createService({
    taskRepository: repositoryStub(tasks),
    creditService: { async captureForJob() { captures += 1; } },
    providerTaskService: { async pollTask() { throw new Error('terminal task must not poll'); } }
  });

  const result = await service.getAndPoll('videotask_refunded', actor);
  assert.equal(result.status, 'reconciliation_required');
  assert.equal(result.billingStatus, 'refunded');
  assert.equal(result.providerError.code, 'video_credit_settlement_conflict');
  assert.equal(result.outputAsset.publicUrl, '/outputs/refunded-video.mp4');
  assert.equal(captures, 0);
});

test('recent video tasks are actor-scoped and projected without private request data', async () => {
  const service = createService({
    taskRepository: {
      async listForActor(context, options) {
        assert.equal(context.userId, actor.userId);
        assert.equal(options.limit, 4);
        return [{
          id: 'videotask_recent', status: 'completed', ownerUserId: actor.userId,
          prompt: 'private prompt', createdAt: '2026-08-18T00:00:00.000Z',
          submittedRequest: {
            operation: 'character_to_video',
            commercialOperation: 'playground_video',
            inputMode: 'multimodal_reference',
            durationSeconds: 4,
            prompt: 'private submitted prompt',
            referenceImageUrl: '/private/reference.png',
            characterAttributions: [{
              characterProfileId: 'charprof_recent',
              characterProfileVersionId: 'charver_recent',
              role: 'primary'
            }]
          },
          outputAsset: { publicUrl: '/outputs/video.mp4' }
        }];
      }
    }
  });
  const result = await service.listRecent(actor, { limit: 4 });
  assert.equal(result.items[0].id, 'videotask_recent');
  assert.equal(result.items[0].durationSeconds, 4);
  assert.equal('prompt' in result.items[0], false);
  assert.equal('ownerUserId' in result.items[0], false);
  assert.equal(result.items[0].submittedRequest.characterAttributions[0].characterProfileId, 'charprof_recent');
  assert.equal(result.items[0].commercialOperation, 'playground_video');
  assert.equal(result.items[0].inputMode, 'multimodal_reference');
  assert.equal('prompt' in result.items[0].submittedRequest, false);
  assert.equal('referenceImageUrl' in result.items[0].submittedRequest, false);
});

test('durable Video reservation ownership requires matching task, actor, and reservation', async () => {
  const service = createService({
    taskRepository: {
      async find(id) {
        return id === 'videotask_owned'
          ? { id, ownerUserId: actor.userId, reservationId: 'rsv_owned' }
          : null;
      }
    }
  });

  assert.equal(await service.hasDurableTaskForReservation({
    userId: actor.userId,
    reservationId: 'rsv_owned',
    jobId: 'videotask_owned'
  }), true);
  assert.equal(await service.hasDurableTaskForReservation({
    userId: 'usr_other',
    reservationId: 'rsv_owned',
    jobId: 'videotask_owned'
  }), false);
  assert.equal(await service.hasDurableTaskForReservation({
    userId: actor.userId,
    reservationId: 'rsv_other',
    jobId: 'videotask_owned'
  }), false);
  assert.equal(await service.hasDurableTaskForReservation({
    userId: actor.userId,
    reservationId: 'rsv_owned',
    jobId: 'videotask_missing'
  }), false);
});

function createService(overrides = {}) {
  const model = overrides.model || {
    providerId: input.providerId, modelId: input.modelId, testingRoutingEnabled: true,
    durationControlMode: 'exact', durations: [4, 6, 8]
  };
  return new VideoGenerationApplicationService({
    capabilityRegistry: {
      getPublicCatalog: () => ({ schemaVersion: 1, catalogVersion: 'test', models: [model] }),
      resolve: (providerId, modelId) => providerId === model.providerId && modelId === model.modelId ? model : null,
      validateRequest: () => model
    },
    creditService: overrides.creditService || {},
    characterService: overrides.characterService || {},
    assetRepository: overrides.assetRepository,
    storyboardAssetContentVerifier: overrides.storyboardAssetContentVerifier,
    referenceResolver: overrides.referenceResolver,
    modelArkCredentialScopeResolver: overrides.modelArkCredentialScopeResolver,
    firstFrameTransport: overrides.firstFrameTransport,
    taskRepository: overrides.taskRepository || repositoryStub(new Map()),
    providerTaskService: overrides.providerTaskService || {},
    testingEnabled: true
  });
}

function compatibleSeedreamAsset() {
  return {
    id: 'ast_seedream', assetType: 'cinematic_storyboard_source', status: 'active',
    ownerUserId: actor.userId, publicUrl: '/outputs/seedream.png', mimeType: 'image/png',
    width: 1600, height: 2848, sizeBytes: 1200000, sourceJobId: 'job_seedream',
    metadata: {
      immutable: true, contentHash: 'seedream_content_hash',
      providerOutputProvenance: {
        kind: 'provider_generated_image', providerId: 'modelark',
        requestedModelId: 'seedream-5-0-lite-260128', resolvedModelId: 'seedream-5-0-lite-260128',
        providerRequestId: 'req_seedream', credentialScope: TEST_MODELARK_SCOPE,
        generatedAt: new Date().toISOString(), responseFormat: 'b64_json',
        originalBytesPreserved: true
      }
    }
  };
}

function repositoryStub(tasks) {
  return {
    async findByIdempotencyKey() { return null; },
    async findForActor(id, context) {
      const task = tasks.get(id);
      return task?.ownerUserId === context.userId ? { ...task } : null;
    },
    async update(id, operation) {
      const draft = { ...(tasks.get(id) || { id, ownerUserId: actor.userId }) };
      const result = await operation(draft);
      tasks.set(id, draft);
      return result === undefined ? { ...draft } : result;
    }
  };
}
