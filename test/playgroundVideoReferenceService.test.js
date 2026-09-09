import assert from 'node:assert/strict';
import test from 'node:test';
import { VideoGenerationApplicationService } from '../server/domain/generation/VideoGenerationApplicationService.js';
import { VideoCapabilityRegistry } from '../server/domain/generation/VideoCapabilityRegistry.js';
import { buildModelArkSeedancePayload } from '../server/providers/ModelArkSeedanceProvider.js';

const actor = { userId: 'poc-owner', username: 'poc', role: 'user' };
function setup() {
  const assets = [
    {
      id: 'frame',
      assetType: 'generation_reference',
      publicUrl: '/outputs/frame.png',
      contentHash: 'frame-hash',
    },
    {
      id: 'look',
      assetType: 'character_look_sheet',
      publicUrl: '/outputs/look.png',
      contentHash: 'look-hash',
    },
    {
      id: 'upload',
      assetType: 'generation_reference',
      publicUrl: '/outputs/upload.png',
      contentHash: 'upload-hash',
    },
  ].map((asset) => ({
    ...asset,
    ownerUserId: actor.userId,
    status: 'active',
    mimeType: 'image/png',
    width: 720,
    height: 1280,
    sizeBytes: 1000,
  }));
  const state = {
    estimates: [],
    reservations: [],
    dispatched: [],
    transports: [],
    revoked: false,
    version: 'profile-v1',
    history: { id: 'job_owned', imageUrl: '/outputs/job_owned.png', status: 'completed', provider: 'gemini' },
  };
  const registry = new VideoCapabilityRegistry({
    runtimeEnvironment: 'development',
    developmentPocEnabled: true,
    availabilityPolicy: {
      assertAvailable() {},
      getVersion() {
        return 0;
      },
      evaluate() {
        return { enabled: true };
      },
    },
  });
  // This fixture exercises the generic adapter contract. Real Seedance 2.x's
  // stricter catalog gate is covered in trustedGeneratedSources.test.js.
  for (const model of registry.load().models) delete model.trustedGeneratedImageSource;
  const service = new VideoGenerationApplicationService({
    capabilityRegistry: registry,
    testingEnabled: true,
    modelArkCredentialScopeResolver: () => 'test-scope',
    playgroundHistoryRepository: { async findByIdForOwner(id, owner) {
      return owner === actor.userId && state.history?.id === id ? state.history : null;
    } },
    assetRepository: {
      async findById(id) { return assets.find(asset => asset.id === id); },
      async findByIdForOwner(id, owner) {
        return assets.find(
          (asset) => asset.id === id && asset.ownerUserId === owner,
        );
      },
      async findByPublicUrlForOwner(url, owner) {
        return assets.find(
          (asset) => asset.publicUrl === url && asset.ownerUserId === owner,
        );
      },
    },
    characterService: {
      async validateGenerationContext(input, owner) {
        assert.equal(owner.userId, actor.userId);
        if (state.revoked)
          throw Object.assign(new Error('revoked'), {
            code: 'character_revoked',
          });
        return {
          authorizedCharacterReferenceAssetId: assets[1].id,
          attribution: {
            characterProfileId: input.characterProfileId,
            characterProfileVersionId: input.characterProfileVersionId,
            role: 'primary',
          },
        };
      },
    },
    lookService: {
      async resolveApprovedSheetReference(profile, look, version, owner) {
        assert.equal(profile, 'character');
        assert.equal(look, 'look-id');
        assert.equal(version, 'look-v1');
        assert.equal(owner.userId, actor.userId);
        return { asset: assets[1], characterProfileVersionId: state.version };
      },
    },
    playgroundReferenceContentLoader: async (asset) => ({
      width: 720, height: 1280, sizeBytes: 1000, mimeType: 'image/png',
      ...asset,
      contentHash: asset.contentHash || 'generated-hash',
      bytes: Buffer.from('original'),
    }),
    firstFrameTransport: {
      async resolve(input) {
        state.transports.push(input);
        return {
          value: `https://example.invalid/${input.sourceAsset.id}.png`,
          transport: { mode: 'gcs_url' },
        };
      },
    },
    referenceResolver: async (url) => url,
    taskRepository: {
      async findByIdempotencyKey() {
        return null;
      },
      async update(id, mutate) {
        const task = { id, status: 'provider_queued' };
        mutate(task);
        return task;
      },
    },
    creditService: {
      async estimateVideo(value) {
        state.estimates.push(value);
        return { estimateId: 'quote', estimatedCredits: 1 };
      },
      async getAccount() {
        return { availableCredits: 100 };
      },
      async validateAndReserveForRequest(value) {
        state.reservations.push(value);
        return {
          estimate: { estimateId: 'quote', estimatedCredits: 1 },
          reservation: { reservationId: 'reservation' },
          billingStatus: 'reserved',
        };
      },
    },
    providerTaskService: {
      async preflightTask() {},
      async submitTask(value) {
        state.dispatched.push(value);
        return { id: value.id, status: 'provider_queued' };
      },
    },
  });
  const input = {
    providerId: 'modelark',
    modelId: 'dreamina-seedance-2-5-260628',
    operation: 'character_to_video',
    inputMode: 'multimodal_reference',
    referencePlanVersion: 'playground-reference-v1',
    prompt: 'Scene first, identity and wardrobe second. A restrained motion.',
    aspectRatio: '9:16',
    resolution: '480p',
    durationSeconds: 6,
    audioMode: 'none',
    characterProfileId: 'character',
    characterProfileVersionId: 'profile-v1',
    references: [
      {
        role: 'reference_image',
        purpose: 'opening_frame',
        referenceImageUrl: assets[0].publicUrl,
      },
      {
        role: 'reference_image',
        purpose: 'character_look',
        characterProfileId: 'character',
        characterLookId: 'look-id',
        characterLookVersionId: 'look-v1',
        referenceImageUrl: '/api/preview-only',
      },
    ],
  };
  return { service, input, state, assets };
}
async function submit(service, input) {
  const quote = await service.quote(input, actor);
  await service.submit(
    {
      ...input,
      estimateId: quote.estimate.estimateId,
      requestFingerprint: quote.requestFingerprint,
      idempotencyKey: 'test-poc-submit',
    },
    actor,
  );
  return quote;
}

test('named-looks: scene plus two owned sheets preserve order, legend and quote parity', async () => {
  const { service, input, state, assets } = setup();
  assets.push({ ...assets[2], id: 'second', publicUrl: '/outputs/second.png', contentHash: 'second-hash' });
  delete input.characterProfileId; delete input.characterProfileVersionId;
  input.references = [input.references[0], ...['upload', 'second'].map((id, index) => ({
    role: 'reference_image', purpose: 'look_sheet_upload', referenceImageUrl: `/outputs/${id}.png`, characterName: index ? 'Ben' : 'Alice',
  }))];
  const quote = await submit(service, input);
  assert.equal(quote.selection.referenceImageCount, 3);
  assert.equal(state.reservations[0].generationRequest.referenceCount, 3);
  const sent = state.dispatched[0];
  assert.match(sent.prompt, /Image 2: Character 1, name "Alice"/);
  assert.match(sent.prompt, /Image 3: Character 2, name "Ben"/);
  assert.equal(sent.referenceImages.length, 3);
  const renamed = structuredClone(input);
  renamed.references[2].characterName = 'Changed';
  const changed = await service.quote(renamed, actor);
  assert.notEqual(changed.requestFingerprint, quote.requestFingerprint);
  await assert.rejects(service.submit({ ...renamed, requestFingerprint: quote.requestFingerprint,
    estimateId: 'quote', idempotencyKey: 'renamed' }, actor));
  assert.equal(state.reservations.length, 1);
});

test('named-looks: invalid and duplicate names fail before pricing', async () => {
  for (const name of ['A\nB', 'A'.repeat(81), 123]) {
    const { service, input, state } = setup();
    input.references[1].characterName = name;
    await assert.rejects(service.quote(input, actor), { code: 'video_look_name_invalid' });
    assert.equal(state.estimates.length, 0);
  }
});

test('generated first frame and Character alone retain quote-to-submit reference parity', async () => {
  for (const characterOnly of [false, true]) {
    const { service, input, state } = setup();
    input.references = characterOnly
      ? [{ role: 'reference_image', purpose: 'character_reference', characterProfileId: 'character' }]
      : [{ role: 'first_frame', purpose: 'opening_frame', referenceImageUrl: state.history.imageUrl }];
    if (!characterOnly) {
      input.inputMode = 'image_to_video'; input.operation = 'image_to_video';
      delete input.characterProfileId; delete input.characterProfileVersionId;
    }
    await submit(service, input);
    assert.equal(state.reservations.length, 1);
    assert.equal(state.dispatched.length, 1);
    assert.equal(state.transports.length, 0);
  }
});

test('deleted generated image after quote fails before reservation', async () => {
  const { service, input, state } = setup();
  Object.assign(input, { operation: 'image_to_video', inputMode: 'image_to_video', characterProfileId: null, characterProfileVersionId: null,
    references: [{ role: 'first_frame', purpose: 'opening_frame', referenceImageUrl: state.history.imageUrl }] });
  const quote = await service.quote(input, actor);
  state.history.status = 'deleted';
  await assert.rejects(service.submit({ ...input, estimateId: quote.estimate.estimateId, requestFingerprint: quote.requestFingerprint, idempotencyKey: 'deleted-image' }, actor));
  assert.equal(state.reservations.length, 0);
  assert.equal(state.dispatched.length, 0);
});

test('invalid model dimensions or an unknown explicit plan fail before pricing', async () => {
  for (const mutate of [
    (value) => {
      value.assets[0].width = 1;
    },
    (value) => {
      value.input.referencePlanVersion = 'unknown';
    },
  ]) {
    const fixture = setup();
    mutate(fixture);
    await assert.rejects(fixture.service.quote(fixture.input, actor));
    assert.equal(fixture.state.estimates.length, 0);
    assert.equal(fixture.state.reservations.length, 0);
  }
});

test('Playground scene and approved Look quote/reserve/dispatch exactly two images in order', async () => {
  const { service, input, state } = setup();
  const quote = await submit(service, input);
  const sent = state.dispatched[0];
  const payload = buildModelArkSeedancePayload(sent);
  assert.equal(quote.selection.referenceImageCount, 2);
  assert.equal(state.reservations[0].generationRequest.referenceCount, 2);
  assert.equal(sent.referenceImage, null);
  assert.deepEqual(
    payload.content.slice(1).map((item) => [item.role, item.image_url.url]),
    [
      ['reference_image', 'https://example.invalid/frame.png'],
      ['reference_image', 'https://example.invalid/look.png'],
    ],
  );
  assert.equal(sent.characterAttributions.length, 1);
  assert.equal(
    sent.referencePlanFingerprint,
    quote.selection.referencePlanFingerprint,
  );
  assert.deepEqual(
    state.transports.map((item) => item.expectedContentHash),
    ['frame-hash', 'look-hash'],
  );
});

test('single first frame omits ratio and never adds hidden Character or Look data', async () => {
  const { service, input, state } = setup();
  Object.assign(input, {
    operation: 'image_to_video',
    inputMode: 'image_to_video',
    characterProfileId: null,
    characterProfileVersionId: null,
    references: [
      {
        role: 'first_frame',
        purpose: 'opening_frame',
        referenceImageUrl: '/outputs/frame.png',
      },
    ],
  });
  await submit(service, input);
  const payload = buildModelArkSeedancePayload(state.dispatched[0]);
  assert.equal(payload.content.length, 2);
  assert.equal(payload.content[1].role, 'first_frame');
  assert.equal(payload.ratio, undefined);
  assert.deepEqual(state.dispatched[0].characterAttributions, []);
});

test('uploaded Look without a Character is one reference_image, not a duplicate first frame', async () => {
  const { service, input, state } = setup();
  Object.assign(input, {
    characterProfileId: null,
    characterProfileVersionId: null,
    references: [
      {
        role: 'reference_image',
        purpose: 'look_sheet_upload',
        assetId: 'upload',
        referenceImageUrl: '/outputs/upload.png',
      },
    ],
  });
  await submit(service, input);
  assert.equal(
    buildModelArkSeedancePayload(state.dispatched[0]).content.length,
    2,
  );
  assert.equal(state.dispatched[0].referenceImage, null);
});

test('mixed roles, reversed order and oversized lists fail without pricing or reservation', async () => {
  for (const transform of [
    (rows) => [{ ...rows[0], role: 'first_frame' }, rows[1]],
    (rows) => rows.toReversed(),
    (rows) => [...rows, rows[0]],
  ]) {
    const { service, input, state } = setup();
    input.references = transform(input.references);
    await assert.rejects(service.quote(input, actor));
    assert.equal(state.estimates.length, 0);
    assert.equal(state.reservations.length, 0);
  }
});

test('foreign, deleted, URL-substituted or mismatched-version references cannot be quoted', async () => {
  for (const change of [
    (setup) => {
      setup.assets[0].ownerUserId = 'other';
    },
    (setup) => {
      setup.assets[0].status = 'deleted';
    },
    (setup) => {
      setup.input.references[0].assetId = 'frame';
      setup.input.references[0].referenceImageUrl =
        'https://example.invalid/private';
    },
    (setup) => {
      setup.state.version = 'other-version';
    },
  ]) {
    const fixture = setup();
    change(fixture);
    await assert.rejects(fixture.service.quote(fixture.input, actor));
    assert.equal(fixture.state.estimates.length, 0);
  }
});

test('changed original bytes or revoked Character after quote fail before reservation/transport', async () => {
  for (const reason of ['content', 'rights']) {
    const { service, input, assets, state } = setup();
    const quote = await service.quote(input, actor);
    if (reason === 'content') assets[0].contentHash = 'changed';
    else state.revoked = true;
    await assert.rejects(
      service.submit(
        {
          ...input,
          estimateId: 'quote',
          requestFingerprint: quote.requestFingerprint,
          idempotencyKey: 'poc-retry',
        },
        actor,
      ),
      {
        code:
          reason === 'content'
            ? 'video_quote_request_changed'
            : 'character_revoked',
      },
    );
    assert.equal(state.reservations.length, 0);
    assert.equal(state.transports.length, 0);
  }
});

test('a single-image adapter cannot silently drop the second image', async () => {
  const { service, input, state } = setup();
  Object.assign(input, {
    providerId: 'gemini',
    modelId: 'veo-3.1-lite-generate-preview',
  });
  await assert.rejects(service.quote(input, actor), {
    code: 'video_multiple_references_unsupported',
  });
  assert.equal(state.estimates.length, 0);
});
