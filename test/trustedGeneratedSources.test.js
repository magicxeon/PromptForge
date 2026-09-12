import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { TrustedGeneratedSourceRepository } from '../server/repositories/generation/TrustedGeneratedSourceRepository.js';
import { GenerationResultRepository } from '../server/repositories/generation/GenerationResultRepository.js';
import { HistoryRepository } from '../server/repositories/generation/HistoryRepository.js';
import {
  TrustedGeneratedSourceService,
  isGeneratedLookSheet,
  trustedSourceEligibility,
  verifyTrustedOutputUrl,
  trustedOutputUrlExpired,
  generatedCastSourceFingerprint,
} from '../server/domain/generation/TrustedGeneratedSourceService.js';
import { TRUSTED_GENERATED_SOURCE_POLICY as policy } from '../server/config/trustedGeneratedSources.js';
import { VideoGenerationApplicationService } from '../server/domain/generation/VideoGenerationApplicationService.js';
import { VideoCapabilityRegistry } from '../server/domain/generation/VideoCapabilityRegistry.js';
import { ModelArkSeedreamProvider } from '../server/providers/ModelArkSeedreamProvider.js';
import { loadProviderConfig } from '../server/providers/ProviderConfigLoader.js';
import { buildModelArkSeedancePayload } from '../server/providers/ModelArkSeedanceProvider.js';
import { loadVideoReferenceAssetContent } from '../server/domain/assets/VideoReferenceAssetContent.js';
import { sanitizeVideoReferences } from '../server/domain/generation/VideoReferencePlan.js';
import { validateGeneratedReferencePolicy, isGeneratedReferenceAllowed } from '../server/config/generatedReferencePolicy.js';

const actor = { userId: 'trusted-owner', username: 'trusted', role: 'user' };

test('fallback: signed expiry and expired provider response are distinct from general URL errors', async () => {
  const url = 'https://images.bytepluses.com/a?X-Tos-Date=20260910T142828Z&X-Tos-Expires=86400';
  assert.equal(trustedOutputUrlExpired(url, Date.parse('2026-09-11T14:28:27Z')), false);
  assert.equal(trustedOutputUrlExpired(url, Date.parse('2026-09-11T14:28:28Z')), true);
  await assert.rejects(verifyTrustedOutputUrl({ originalOutputUrl: url }, { fetcher: () => assert.fail('Expired URL should not be fetched') }), { details: { reason: 'url_expired' } });
  await assert.rejects(verifyTrustedOutputUrl(source, { fetcher: async () => Response.json({ Code: 'AccessDenied', Message: 'Request has expired' }, { status: 403 }) }), { details: { reason: 'url_expired' } });
  await assert.rejects(verifyTrustedOutputUrl(source, { fetcher: async () => Response.json({ Code: 'AccessDenied', Message: 'Access denied' }, { status: 403 }) }), { details: { reason: 'url_unavailable' } });
});

test('fallback: Playground mixes original frame URL and local Look bytes once without losing names or price parity', async t => {
  const f = await fixture(t);
  f.service.urlVerifier = async row => { if (row.id === 'look') throw Object.assign(new Error('expired'), { details: { reason: 'url_expired' } }); };
  f.input.references[1].characterName = 'Lalin';
  const quote = await f.app.quote(f.input, actor);
  await f.app.submit({ ...f.input, requestFingerprint: quote.requestFingerprint, estimateId: 'quote', idempotencyKey: 'fallback-mixed' }, actor);
  assert.equal(f.calls.reserves.length, 1);
  assert.equal(f.calls.dispatched.length, 1);
  const request = f.calls.dispatched[0];
  assert.match(request.referenceImages[0].url, /^https:/);
  assert.equal(request.referenceImages[1].url, `data:image/jpeg;base64,${f.bytes.toString('base64')}`);
  assert.deepEqual(request.referenceTransports.map(row => row.mode), ['provider_original_url', 'base64']);
  assert.equal(request.referenceTransports[1].fallbackCode, 'generated_source_local_original');
  assert.equal(f.calls.estimates[0].request.referenceImageCount, 2);
  assert.equal(f.calls.reserves[0].generationRequest.referenceCount, 2);
  assert.match(request.prompt, /Lalin/);
  assert.doesNotMatch(JSON.stringify(sanitizeVideoReferences(request.references)), /base64|secret=private/);
});

test('fallback: Cinematic uses verified local originals for sheets and scene images', async t => {
  const f = await fixture(t);
  f.service.urlVerifier = async () => { throw Object.assign(new Error('expired'), { details: { reason: 'url_expired' } }); };
  const sheet = await f.service.describeOwnedImage('look', actor);
  const resolved = await f.service.resolveOwnedImageWithTransport('look', actor, sheet.contentHash, { allowLookSheetFallback: true });
  assert.equal(resolved.value, `data:image/jpeg;base64,${f.bytes.toString('base64')}`);
  assert.equal(resolved.transport.mode, 'base64');
  assert.match(await f.service.resolveOwnedImage('look', actor, sheet.contentHash), /^data:image/);
  const first = await f.service.describeOwnedImage('first', actor);
  assert.equal((await f.service.resolveOwnedImageWithTransport('first', actor, first.contentHash)).transport.mode, 'base64');
  await fs.writeFile(path.join(f.directory, 'look.jpg'), Buffer.from('changed'));
  await assert.rejects(f.service.resolveOwnedImageWithTransport('look', actor, sheet.contentHash, { allowLookSheetFallback: true }), { code: 'video_reference_content_invalid' });
});

test('fallback: changed remote content never falls back and never reserves', async t => {
  const f = await fixture(t);
  for (const reason of ['content_changed']) {
    f.service.urlVerifier = async () => { throw Object.assign(new Error(reason), { details: { reason } }); };
    await assert.rejects(f.app.submit({ ...f.input, estimateId: 'quote', idempotencyKey: 'no-fallback' }, actor), { details: { reason } });
  }
  assert.equal(f.calls.reserves.length, 0);
  assert.equal(f.calls.dispatched.length, 0);
});


test('fallback: Cinematic quote and submission with metadata-only Cast Assets dispatch both expired sheets as exact base64', async t => {
  const f = await fixture(t);
  f.histories.forEach(row => { row.mode = 'character-sheet'; });
  const sheets = await Promise.all(['first', 'look'].map(id => f.service.describeOwnedImage(id, actor)));
  const assets = sheets.map(sheet => ({ id: `asset_${sheet.id}`, ownerUserId: actor.userId, status: 'active',
    assetType: 'character_look_sheet', publicUrl: sheet.publicUrl, mimeType: sheet.mimeType,
    width: sheet.width, height: sheet.height, sizeBytes: sheet.sizeBytes,
    metadata: { trustedGenerationId: sheet.id, contentHash: sheet.contentHash } }));
  f.app.assetRepository = { async findByIdForOwner(id, owner) { return assets.find(asset => asset.id === id && asset.ownerUserId === owner); } };
  f.service.urlVerifier = async () => { throw Object.assign(new Error('expired'), { details: { reason: 'url_expired' } }); };
  const input = { ...f.input, operation: 'image_to_video', referencePlanVersion: undefined,
    commercialOperation: 'cinematic_draft_clip', referenceContainsPerson: true,
    references: sheets.map((sheet, index) => ({ role: 'reference_image', purpose: 'generated_look',
      assetId: assets[index].id, assetVersionId: assets[index].id, trustedGenerationId: sheet.id,
      castAssignmentId: `cast_${index}`, characterName: `Actor ${index + 1}`,
      contentHash: sheet.contentHash, referenceImageUrl: sheet.publicUrl,
      sourceFingerprint: generatedCastSourceFingerprint(sheet.id, sheet.contentHash) })) };
  const workflow = { capability: 'cinematic', generationMode: 'cinematic_video', projectId: 'project', sceneId: 'scene', shotId: 'shot' };
  const quote = await f.app.quote(input, actor, workflow);
  await f.app.submit({ ...input, requestFingerprint: quote.requestFingerprint, estimateId: 'quote', idempotencyKey: 'cinematic-local-sheets' }, actor, workflow);
  const sent = f.calls.dispatched[0];
  assert.equal(sent.referenceImage, null);
  assert.deepEqual(sent.referenceImages.map(row => row.url), sheets.map(() => `data:image/jpeg;base64,${f.bytes.toString('base64')}`));
  assert.deepEqual(sent.referenceTransports.map(row => row.mode), ['base64', 'base64']);
  const payload = buildModelArkSeedancePayload(sent, { requestId: 'payload-only' });
  assert.equal(payload.content.filter(row => row.type === 'image_url').length, 2);
  assert.equal(f.calls.reserves.length, 1);
  assert.equal(f.calls.estimates[0].request.referenceImageCount, 2);
});

test('named-images: trusted general references retain names and roles without granting Look fallback', async t => {
  const f = await fixture(t);
  const input = { ...f.input, operation: 'image_to_video', references: f.input.references.map((row, index) => ({ ...row, purpose: 'image_reference', characterName: `Photo ${index + 1}` })) };
  const quote = await f.app.quote(input, actor);
  await f.app.submit({ ...input, requestFingerprint: quote.requestFingerprint, estimateId: 'quote', idempotencyKey: 'named-images' }, actor);
  assert.equal(f.calls.dispatched[0].inputMode, 'multimodal_reference');
  assert.equal(f.calls.dispatched[0].referenceImage, null);
  assert.deepEqual(f.calls.dispatched[0].referenceImages.map(row => row.role), ['reference_image', 'reference_image']);
  assert.match(f.calls.dispatched[0].prompt, /Image reference mapping/);
  f.service.urlVerifier = async () => { throw Object.assign(new Error('expired'), { details: { reason: 'url_expired' } }); };
  assert.equal((await f.app.quote(input, actor)).selection.referenceImageCount, 2);
});
const now = Date.parse('2026-09-07T00:00:00Z');
const source = {
  id: 'first',
  ownerUserId: actor.userId,
  providerId: 'modelark',
  modelId: policy.modelIds[0],
  generationMode: 'text_to_image',
  referenceCount: 0,
  providerRequestId: 'image-request',
  credentialScope: 'account',
  generatedAt: '2026-09-01T00:00:00Z',
  timestampSource: 'provider',
  receivedAt: '2026-09-01T00:00:01Z',
  originalOutputUrl:
    'https://images.tos-ap-southeast-1.bytepluses.com/original.png?secret=private',
  contentHash: 'hash',
  sizeBytes: 10,
  storageKey: 'first.png',
};

test('original URL eligibility distinguishes source model/mode, account and missing evidence without image-age rules', () => {
  assert.equal(
    trustedSourceEligibility(source, { scope: 'account', now }).eligible,
    true,
  );
  assert.equal(
    trustedSourceEligibility(
      { ...source, modelId: policy.modelIds[1] },
      { scope: 'account', now },
    ).eligible,
    true,
  );
  assert.equal(
    trustedSourceEligibility(
      { ...source, modelId: policy.resolvedModelAliases[0] },
      { scope: 'account', now },
    ).eligible,
    true,
  );
  assert.equal(
    trustedSourceEligibility(
      { ...source, generationMode: 'image_to_image', referenceCount: 1 },
      { scope: 'account', now },
    ).eligible,
    true,
  );
  for (const [patch, reason] of [
    [{ modelId: 'seedream-4-5-251128' }, 'unsupported_model'],
    [
      {
        modelId: policy.resolvedModelAliases[0],
        requestedModelId: 'seedream-4-5-251128',
      },
      'unsupported_model',
    ],
    [
      { generationMode: 'image_to_image', referenceCount: 0 },
      'unsupported_mode',
    ],
    [
      { generationMode: 'text_to_image', referenceCount: 1 },
      'unsupported_mode',
    ],
    [{ credentialScope: 'other' }, 'account_mismatch'],
    [{ originalOutputUrl: 'http://127.0.0.1/private' }, 'url_unavailable'],
    [
      { originalOutputUrl: 'https://bytepluses.com.attacker.test/image' },
      'url_unavailable',
    ],
  ])
    assert.equal(
      trustedSourceEligibility(
        { ...source, rejection: { taskId: 'failed' }, ...patch },
        { scope: 'account', now },
      ).reason,
      reason,
    );
  assert.equal(
    trustedSourceEligibility(null, { scope: 'account', now }).reason,
    'metadata_missing',
  );
});

test('trusted family matches every currently cataloged Seedream model marked for Seedance 2', () => {
  const modelark = loadProviderConfig().providers.find(
    (provider) => provider.id === 'modelark',
  );
  const cataloged = modelark.models
    .filter(
      (model) =>
        model.enabled !== false &&
        model.capabilities?.downstreamVideoCompatibility?.[
          'modelark-seedance-2'
        ],
    )
    .map((model) => model.id)
    .sort();
  assert.deepEqual([...policy.modelIds].sort(), cataloged);
});

test('open-source: JSON policy validates rules and matches provider, resolved and requested model IDs', () => {
  const config = validateGeneratedReferencePolicy({ version: 'test', allowAnyProvider: true,
    blockedSources: [{ providerId: 'openai', modelId: 'blocked' }, { providerId: 'disabled' }] });
  assert.equal(isGeneratedReferenceAllowed({ provider: 'openai', submodel: 'allowed' }, config), true);
  assert.equal(isGeneratedReferenceAllowed({ provider: 'openai', submodel: 'blocked', resolvedSubmodel: 'snapshot' }, config), false);
  assert.equal(isGeneratedReferenceAllowed({ provider: 'disabled' }, config), false);
  assert.equal(isGeneratedReferenceAllowed({ provider: 'gemini', submodel: 'blocked' }, config), true);
  assert.throws(() => validateGeneratedReferencePolicy({ version: 'test', allowAnyProvider: true, blockedSources: [{}] }), TypeError);
  assert.throws(() => validateGeneratedReferencePolicy({ version: 'test', allowAnyProvider: true, blockedSources: [{ provider: 'typo' }] }), TypeError);
});

test('open-source: local OpenAI and Gemini Looks are listed and quoted/submitted only to selected Seedance', async t => {
  const f = await fixture(t);
  const rows = [{ id: 'openai-look', provider: 'openai', submodel: 'gpt-image-2' },
    { id: 'gemini-look', provider: 'gemini', submodel: 'gemini-image' }];
  for (const row of rows) {
    f.histories.push({ ...row, ownerUserId: actor.userId, imageUrl: `/outputs/${row.id}.jpg`,
      mode: 'character-sheet', createdAt: '2020-01-01T00:00:00Z' });
    await fs.writeFile(path.join(f.directory, `${row.id}.jpg`), f.bytes);
  }
  const page = await f.service.list(actor, { eligibleOnly: true, category: 'look-sheet' });
  for (const row of rows) {
    assert.equal(page.items.find(item => item.id === row.id)?.eligible, true);
    assert.equal(page.items.find(item => item.id === row.id)?.expiresAt, null);
  }
  assert.ok(!page.items.some(item => item.id === 'first'));
  const input = { ...f.input, references: rows.map((row, index) => ({ generationId: row.id,
    purpose: 'generated_look', role: 'reference_image', characterName: `Cast ${index + 1}` })) };
  const quote = await f.app.quote(input, actor);
  assert.equal(f.calls.dispatched.length, 0);
  await f.app.submit({ ...input, estimateId: 'quote', requestFingerprint: quote.requestFingerprint,
    idempotencyKey: 'open-sources' }, actor);
  assert.equal(f.calls.dispatched.length, 1);
  assert.equal(f.calls.reserves.length, 1);
  const sent = f.calls.dispatched[0];
  assert.equal(sent.providerId, 'modelark');
  assert.equal(sent.modelId, input.modelId);
  assert.equal(sent.referenceImageCount, 2);
  assert.ok(sent.references.every(row => row.sourceKind === 'owned_generation'));
  assert.ok(sent.referenceImages.every(row => row.url === `data:image/jpeg;base64,${f.bytes.toString('base64')}`));
  const source = await f.service.describeOwnedImage(rows[0].id, actor, { requireLookSheet: true });
  assert.equal(source.providerId, 'openai');
  assert.equal(source.providerOutputProvenance, null);
  assert.equal(source.expiresAt, null);
});

test('open-source: Cinematic generated Cast uses non-Seedream sheets without inventing original-provider trust', async t => {
  const f = await fixture(t);
  const row = { id: 'other-sheet', provider: 'openai', submodel: 'gpt-image-2', ownerUserId: actor.userId,
    imageUrl: '/outputs/other-sheet.jpg', mode: 'character-sheet' };
  f.histories.push(row);
  await fs.writeFile(path.join(f.directory, 'other-sheet.jpg'), f.bytes);
  const sheet = await f.service.describeOwnedImage(row.id, actor, { requireLookSheet: true });
  const asset = { id: 'cast-sheet-asset', ownerUserId: actor.userId, status: 'active', assetType: 'character_look_sheet',
    publicUrl: sheet.publicUrl, mimeType: sheet.mimeType, width: sheet.width, height: sheet.height, sizeBytes: sheet.sizeBytes,
    metadata: { trustedGenerationId: sheet.id, contentHash: sheet.contentHash, providerOutputProvenance: null } };
  f.app.assetRepository = { async findByIdForOwner(id, owner) { return id === asset.id && owner === actor.userId ? asset : null; } };
  const input = { ...f.input, operation: 'image_to_video', referencePlanVersion: undefined,
    commercialOperation: 'cinematic_draft_clip', referenceContainsPerson: true,
    references: [{ role: 'reference_image', purpose: 'generated_look', assetId: asset.id, assetVersionId: asset.id,
      trustedGenerationId: sheet.id, castAssignmentId: 'cast-one', characterName: 'Lalin', contentHash: sheet.contentHash,
      referenceImageUrl: sheet.publicUrl, sourceFingerprint: generatedCastSourceFingerprint(sheet.id, sheet.contentHash) }] };
  const workflow = { capability: 'cinematic', generationMode: 'cinematic_video', projectId: 'project', sceneId: 'scene', shotId: 'shot' };
  const quote = await f.app.quote(input, actor, workflow);
  await f.app.submit({ ...input, requestFingerprint: quote.requestFingerprint, estimateId: 'quote',
    idempotencyKey: 'cinematic-other-source' }, actor, workflow);
  const sent = f.calls.dispatched[0];
  assert.equal(sent.providerId, 'modelark');
  assert.equal(sent.referenceImages[0].url, `data:image/jpeg;base64,${f.bytes.toString('base64')}`);
  assert.equal(sent.referenceAuthority.references[0].providerOutputProvenance, null);
  assert.equal(f.calls.estimates[0].request.referenceImageCount, 1);
  assert.equal(f.calls.reserves[0].generationRequest.referenceCount, 1);
  f.service.sourcePolicy = validateGeneratedReferencePolicy({ version: 'closed', allowAnyProvider: false, blockedSources: [] });
  await assert.rejects(f.app.quote(input, actor, workflow), { details: { reason: 'metadata_missing' } });
});

test('open-source: deny rules, foreign images and altered bytes fail before dispatch', async t => {
  const f = await fixture(t);
  f.histories.push({ id: 'foreign', ownerUserId: 'someone-else', mode: 'character-sheet', imageUrl: '/outputs/foreign.jpg' });
  await assert.rejects(f.service.describeOwnedImage('foreign', actor), { details: { reason: 'source_unavailable' } });
  f.service.sourcePolicy = validateGeneratedReferencePolicy({ version: 'blocked', allowAnyProvider: true,
    blockedSources: [{ modelId: policy.modelIds[0] }] });
  await assert.rejects(f.app.quote(f.input, actor), { code: 'video_reference_source_disabled' });
  assert.equal(f.calls.estimates.length, 0);
  assert.equal(f.calls.reserves.length, 0);
  assert.equal(f.calls.dispatched.length, 0);
  f.service.sourcePolicy = validateGeneratedReferencePolicy({ version: 'open', allowAnyProvider: true, blockedSources: [] });
  await fs.writeFile(path.join(f.directory, 'look.jpg'), Buffer.from('changed'));
  await assert.rejects(f.service.describeOwnedImage('look', actor), { code: 'video_reference_content_invalid' });
});

test('open-source: image age no longer expires and signed URL expiry uses verified local bytes', async t => {
  assert.equal(trustedSourceEligibility({ ...source, generatedAt: '2020-01-01T00:00:00Z' }, { scope: 'account' }).eligible, true);
  assert.equal(trustedSourceEligibility(source, { scope: 'account' }).expiresAt, null);
  const f = await fixture(t);
  f.service.urlVerifier = async () => { throw Object.assign(new Error('expired'), { details: { reason: 'url_expired' } }); };
  const sheet = await f.service.describeOwnedImage('look', actor);
  const result = await f.service.resolveOwnedImageWithTransport('look', actor, sheet.contentHash);
  assert.equal(result.transport.mode, 'base64');
  assert.equal(result.value, `data:image/jpeg;base64,${f.bytes.toString('base64')}`);
});

async function fixture(t, ids = ['first', 'look']) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'trusted-video-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const bytes = await fs.readFile(
    new URL(
      '../client/assets/scene-builder/shot-recipes/cafe-seated-lifestyle.jpg',
      import.meta.url,
    ),
  );
  const repository = new TrustedGeneratedSourceRepository({
    file: path.join(directory, 'sources.json'),
  });
  const histories = ids.map((id) => ({
    id,
    ownerUserId: actor.userId,
    imageUrl: `/outputs/${id}.jpg`,
    submodel: policy.modelIds[0],
    mode: id === 'first' ? 'scene' : 'character-sheet',
  }));
  const history = {
    async findByOwner(owner, query) {
      assert.equal(query.limit, 24);
      let selected = histories.filter((row) => row.ownerUserId === owner);
      if (query.allowedJobIds instanceof Set) {
        selected = selected.filter((row) => query.allowedJobIds.has(row.id));
      }
      if (query.itemFilter) selected = selected.filter(query.itemFilter);
      return {
        items: selected,
        hasMore: false,
      };
    },
    async findByIdForOwner(id, owner) {
      return histories.find(
        (row) => row.id === id && row.ownerUserId === owner,
      );
    },
  };
  const checked = [];
  const service = new TrustedGeneratedSourceService({
    repository,
    history,
    scopeResolver: () => 'account',
    now: () => now,
    contentLoader: (asset) =>
      loadVideoReferenceAssetContent(asset, { outputsDirectory: directory }),
    urlVerifier: async (row) => {
      checked.push(row.id);
    },
  });
  for (const row of histories) {
    await fs.writeFile(path.join(directory, `${row.id}.jpg`), bytes);
    const original =
      row.id === 'look'
        ? {
            ...source,
            modelId: policy.modelIds[1],
            requestedModelId: policy.modelIds[1],
            generationMode: 'image_to_image',
            referenceCount: 1,
          }
        : source;
    await service.capture({
      id: row.id,
      ownerUserId: actor.userId,
      providerId: 'modelark',
      original: {
        ...original,
        id: row.id,
        originalOutputUrl: source.originalOutputUrl.replace('original', row.id),
      },
      bytes,
      mimeType: 'image/jpeg',
      storageKey: `${row.id}.jpg`,
    });
  }
  const registry = new VideoCapabilityRegistry({ seedanceFirstFrameEnabled: true,
    developmentPocEnabled: true,
    runtimeEnvironment: 'development',
    availabilityPolicy: {
      assertAvailable() {},
      getVersion() {
        return 1;
      },
      evaluate() {
        return { enabled: true };
      },
    },
  });
  const calls = {
    estimates: [],
    reserves: [],
    dispatched: [],
    tasks: new Map(),
  };
  const app = new VideoGenerationApplicationService({
    capabilityRegistry: registry,
    trustedSourceService: service,
    modelArkCredentialScopeResolver: () => 'account',
    testingEnabled: true,
    creditService: {
      async estimateVideo(value) {
        calls.estimates.push(value);
        return { estimateId: 'quote', estimatedCredits: 1 };
      },
      async getAccount() {
        return { availableCredits: 100 };
      },
      async validateAndReserveForRequest(value) {
        calls.reserves.push(value);
        return {
          estimate: { estimateId: 'quote', estimatedCredits: 1 },
          reservation: { reservationId: 'reserve' },
        };
      },
    },
    taskRepository: {
      async findByIdempotencyKey() {
        return null;
      },
      async update(id, mutate) {
        const task = calls.tasks.get(id);
        mutate(task);
        return task;
      },
    },
    providerTaskService: {
      async preflightTask() {},
      async submitTask(request) {
        calls.dispatched.push(request);
        const task = {
          id: request.id,
          ownerUserId: actor.userId,
          status: 'provider_queued',
          submittedRequest: {
            references: sanitizeVideoReferences(request.references),
          },
        };
        calls.tasks.set(task.id, task);
        return task;
      },
    },
  });
  const input = {
    providerId: 'modelark',
    modelId: 'dreamina-seedance-2-5-260628',
    operation: 'character_to_video',
    inputMode: 'multimodal_reference',
    referencePlanVersion: 'playground-trusted-v1',
    prompt: 'Subtle motion; scene in image 1 and identity in image 2.',
    aspectRatio: '9:16',
    resolution: '480p',
    durationSeconds: 6,
    audioMode: 'none',
    references: [
      {
        generationId: 'first',
        role: 'reference_image',
        purpose: 'opening_frame',
      },
      {
        generationId: 'look',
        role: 'reference_image',
        purpose: 'generated_look',
      },
    ],
  };
  return {
    directory,
    bytes,
    repository,
    histories,
    checked,
    service,
    app,
    calls,
    input,
  };
}

test('named-looks: three references preserve URLs and mappings without age expiry', async t => {
  const f = await fixture(t, ['first', 'look', 'second']);
  f.input.references[1].characterName = 'Alice';
  f.input.references.push({ generationId: 'second', role: 'reference_image', purpose: 'generated_look', characterName: 'Ben' });
  const quote = await f.app.quote(f.input, actor);
  assert.equal(quote.selection.referenceImageCount, 3);
  await f.app.submit({ ...f.input, estimateId: 'quote', requestFingerprint: quote.requestFingerprint, idempotencyKey: 'three-looks' }, actor);
  const sent = f.calls.dispatched[0];
  assert.match(sent.prompt, /Image 3: Character 2, name "Ben"/);
  assert.deepEqual(sent.referenceImages.map(row => row.url), ['first', 'look', 'second'].map(id => source.originalOutputUrl.replace('original', id)));
  assert.equal(f.calls.reserves[0].generationRequest.referenceCount, 3);
  const noScene = { ...f.input, references: f.input.references.slice(1).map(row => ({ ...row, characterName: '' })) };
  const noSceneQuote = await f.app.quote(noScene, actor);
  assert.equal(noSceneQuote.selection.referenceImageCount, 2);
  assert.match(f.calls.estimates.at(-1).request.prompt, /Image 1: Character 1/);
  const reversedQuote = await f.app.quote({ ...noScene, references: [...noScene.references].reverse() }, actor);
  assert.notEqual(noSceneQuote.requestFingerprint, reversedQuote.requestFingerprint);
  f.input.references[2].characterName = 'alice';
  await assert.rejects(f.app.quote(f.input, actor), { code: 'video_look_name_duplicate' });
  f.input.references[2].characterName = 'Ben';
  f.service.now = () => Date.parse('2026-11-01');
  await f.app.submit({ ...f.input, estimateId: 'quote', requestFingerprint: quote.requestFingerprint, idempotencyKey: 'older-three' }, actor);
  assert.equal(f.calls.reserves.length, 2);
});

test('private captured URL does not leak through listing or task references', async (t) => {
  const f = await fixture(t);
  const list = await f.service.list(actor);
  assert.equal(list.items.length, 2);
  assert.equal(list.items[0].eligible, true);
  assert.doesNotMatch(
    JSON.stringify(list),
    /secret=|originalOutputUrl|credentialScope/,
  );
  assert.deepEqual((await f.service.list({ userId: 'other' })).items, []);
  const quote = await f.app.quote(f.input, actor);
  const task = await f.app.submit(
    {
      ...f.input,
      estimateId: 'quote',
      requestFingerprint: quote.requestFingerprint,
      idempotencyKey: 'trusted-poc',
    },
    actor,
  );
  const payload = buildModelArkSeedancePayload(f.calls.dispatched[0]);
  assert.deepEqual(
    payload.content.slice(1).map((row) => row.image_url.url),
    [
      source.originalOutputUrl.replace('original', 'first'),
      source.originalOutputUrl.replace('original', 'look'),
    ],
  );
  assert.equal(f.calls.reserves[0].generationRequest.referenceCount, 2);
  assert.doesNotMatch(JSON.stringify(task), /secret=|originalOutputUrl/);
  assert.equal(f.checked.length, 4);
});

test('past rejection remains eligible in image and Look Sheet listings without erasing evidence', async (t) => {
  const f = await fixture(t);
  await f.repository.reject(['look'], actor.userId, {
    reason: 'provider_rejected', createdAt: new Date(now).toISOString()
  });
  const page = await f.service.list(actor, { eligibleOnly: true });
  assert.deepEqual(page.items.map((row) => row.id), ['first', 'look']);
  assert.ok(page.items.every(row => row.eligible && row.reason === null));
  const sheets = await f.service.list(actor, { eligibleOnly: true, category: 'look-sheet' });
  assert.deepEqual(sheets.items.map(row => row.id), ['look']);
  assert.equal((await f.repository.findManyForOwner(['look'], actor.userId))[0].rejection.reason, 'provider_rejected');
  assert.equal(f.calls.reserves.length, 0);
  assert.equal(f.calls.dispatched.length, 0);
});

test('sheet-only listing excludes other categories without restricting generic first-frame selection', async (t) => {
  const f = await fixture(t);
  const sheets = await f.service.list(actor, { eligibleOnly: true, category: 'look-sheet' });
  assert.deepEqual(sheets.items.map(row => row.id), ['look']);
  assert.equal(sheets.items[0].category, 'look-sheet');
  assert.equal((await f.service.list(actor, { eligibleOnly: true })).items.length, 2);
  assert.deepEqual((await f.service.list({ userId: 'other' }, { category: 'look-sheet' })).items, []);
  await assert.rejects(f.service.describeOwnedImage('first', actor, { requireLookSheet: true }), error => error.details.reason === 'look_sheet_required');
  assert.equal((await f.service.describeOwnedImage('look', actor, { requireLookSheet: true })).id, 'look');
  await assert.rejects(f.service.list(actor, { category: 'anything' }), { code: 'video_source_category_invalid' });
});

test('Look Sheet metadata filtering precedes real repository pagination and binds cursor scope', async (t) => {
  const f = await fixture(t);
  const rows = Array.from({ length: 60 }, (_, index) => ({
    id: `item-${index}`, timestamp: 1000 - index, username: actor.username,
    imageUrl: `/outputs/${index}.jpg`, mode: index % 2 ? 'scene' : 'character-sheet'
  }));
  const store = new HistoryRepository();
  store.readAll = async () => rows;
  f.service.history = new GenerationResultRepository({ historyStore: store,
    userRepository: { findById: async id => id === actor.userId ? actor : null,
      findByUsername: async () => actor } });
  const first = await f.service.list(actor, { category: 'look-sheet' });
  assert.equal(first.items.length, 24);
  assert.ok(first.items.every(item => item.category === 'look-sheet'));
  assert.equal(first.hasMore, true);
  const next = await f.service.list(actor, { category: 'look-sheet', cursor: first.nextCursor });
  assert.equal(next.items.length, 6);
  assert.equal(next.hasMore, false);
  await assert.rejects(f.service.list(actor, { cursor: first.nextCursor }), { code: 'invalid_history_cursor' });
  assert.equal(isGeneratedLookSheet({ lookSheetSnapshot: { schemaVersion: 1, presetId: 'momelo' } }), true);
  assert.equal(isGeneratedLookSheet({ prompt: 'character look sheet', mode: 'scene' }), false);
});

test('first frame sends one original URL with no ratio or hidden Look', async (t) => {
  const f = await fixture(t);
  Object.assign(f.input, {
    operation: 'image_to_video',
    inputMode: 'image_to_video',
    references: [
      { generationId: 'first', purpose: 'opening_frame', role: 'first_frame' },
    ],
  });
  const quote = await f.app.quote(f.input, actor);
  await f.app.submit(
    {
      ...f.input,
      estimateId: 'quote',
      requestFingerprint: quote.requestFingerprint,
      idempotencyKey: 'first-only',
    },
    actor,
  );
  const payload = buildModelArkSeedancePayload(f.calls.dispatched[0]);
  assert.equal(payload.content.length, 2);
  assert.equal(payload.ratio, undefined);
});

test('all restricted catalog models reject legacy upload/URL/Character and forged plans before pricing', async (t) => {
  const f = await fixture(t);
  for (const model of f.app
    .getCatalog()
    .models.filter((row) => row.playgroundReferencePolicy)) {
    for (const patch of [
      { referencePlanVersion: 'playground-reference-v1' },
      { referencePlanVersion: undefined },
      { characterProfileId: 'character' },
      {
        references: [
          {
            ...f.input.references[0],
            referenceImageUrl: source.originalOutputUrl,
          },
        ],
      },
      {
        references: [
          {
            generationId: 'first',
            role: 'first_frame',
            purpose: 'opening_frame',
          },
          f.input.references[1],
        ],
      },
      {
        references: [
          f.input.references[0],
          { ...f.input.references[1], generationId: 'first' },
        ],
      },
      { inputMode: 'text_to_video' },
    ])
      await assert.rejects(
        f.app.quote({ ...f.input, modelId: model.modelId, ...patch }, actor),
      );
  }
  assert.equal(f.calls.estimates.length, 0);
  assert.equal(f.calls.reserves.length, 0);
});

test('past rejection permits explicit retry while deleted, foreign and changed originals remain blocked', async (t) => {
  const f = await fixture(t);
  await assert.rejects(f.app.quote(f.input, { userId: 'other' }));
  f.histories[0].status = 'deleted';
  await assert.rejects(f.app.quote(f.input, actor));
  delete f.histories[0].status;
  const quote = await f.app.quote(f.input, actor);
  await f.service.recordRejection(
    {
      id: 'failed-task',
      providerError: {
        providerCode: 'InputImageSensitiveContentDetected.PrivacyInformation',
        providerRequestId: 'provider-error',
      },
      submittedRequest: { references: [{ assetId: 'first' }] },
    },
    actor,
  );
  assert.equal(f.calls.reserves.length, 0);
  assert.equal(f.calls.dispatched.length, 0);
  const retryQuote = await f.app.quote(f.input, actor);
  assert.equal(retryQuote.requestFingerprint, quote.requestFingerprint);
  await f.app.submit(
      {
        ...f.input,
        estimateId: 'quote',
        requestFingerprint: quote.requestFingerprint,
        idempotencyKey: 'explicit-user-retry',
      },
      actor,
    );
  assert.equal(f.calls.reserves.length, 1);
  assert.equal(f.calls.dispatched.length, 1);
  assert.deepEqual(buildModelArkSeedancePayload(f.calls.dispatched[0]).content.slice(1).map(row => row.image_url.url),
    ['first', 'look'].map(id => source.originalOutputUrl.replace('original', id)));
  assert.equal((await f.repository.findManyForOwner(['first'], actor.userId))[0].rejection.taskId, 'failed-task');
  assert.equal(
    (await f.service.list(actor)).items[0].reason,
    null,
  );
  await fs.writeFile(path.join(f.directory, 'look.jpg'), 'changed');
  await assert.rejects(
    f.service.prepare(
      { ...f.input, references: [f.input.references[1]] },
      actor,
    ),
  );
});

test('image age crossing thirty days during verification does not invalidate the source', async (t) => {
  const f = await fixture(t);
  let time = now;
  f.service.now = () => time;
  f.service.urlVerifier = async () => {
    time = Date.parse(source.generatedAt) + 30 * 86400000;
  };
  const plan = await f.service.prepare(
    {
      ...f.input,
      inputMode: 'image_to_video',
      references: [
        {
          generationId: 'first',
          role: 'first_frame',
          purpose: 'opening_frame',
        },
      ],
    },
    actor,
  );
  assert.ok((await f.service.resolve(plan)).referenceImage);
  assert.equal(f.calls.estimates.length, 0);
});

test('URL verification is bounded, no redirects, rejects changed/unreachable/untrusted URLs', async () => {
  const bytes = Buffer.from('original');
  const row = {
    ...source,
    sizeBytes: bytes.length,
    contentHash: crypto.createHash('sha256').update(bytes).digest('hex'),
  };
  await verifyTrustedOutputUrl(row, {
    fetcher: async (url, options) => {
      assert.equal(options.redirect, 'error');
      return new Response(bytes);
    },
  });
  await assert.rejects(
    verifyTrustedOutputUrl(row, {
      fetcher: async () => new Response('edited'),
    }),
  );
  await assert.rejects(
    verifyTrustedOutputUrl(row, {
      fetcher: async () => new Response('', { status: 403 }),
    }),
  );
  await assert.rejects(
    verifyTrustedOutputUrl(
      { ...row, originalOutputUrl: 'http://localhost/private' },
      {
        fetcher: () => {
          throw new Error('must not fetch');
        },
      },
    ),
  );
});

test('invalid provider timestamps preserve image output without inventing trusted age', async (t) => {
  const bytes = Buffer.from('original-provider-output');
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(
        JSON.stringify({
          created: 1e100,
          data: [{ b64_json: bytes.toString('base64') }],
        }),
      ),
  );
  const provider = new ModelArkSeedreamProvider('test-key', {
    defaultModel: policy.modelIds[0],
  });
  const result = await provider.generateImage('A fictional portrait');
  assert.deepEqual(Buffer.from(result.base64, 'base64'), bytes);
  assert.equal(result.originalSource.generatedAt, null);
  assert.equal(result.originalSource.timestampSource, 'unknown');
});

test('Lite adapter captures real provider timestamp/count/URL separately while preserving bytes', async (t) => {
  const bytes = Buffer.from('original-provider-output');
  let payload;
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    if (options?.method === 'POST') {
      payload = JSON.parse(options.body);
      return new Response(
        JSON.stringify({
          created: Math.floor(now / 1000),
          model: policy.modelIds[0],
          data: [{ url: source.originalOutputUrl }],
        }),
        { headers: { 'x-request-id': 'request-original' } },
      );
    }
    return new Response(bytes, { headers: { 'content-type': 'image/png' } });
  });
  const provider = new ModelArkSeedreamProvider('test-key', {
    defaultModel: policy.modelIds[0],
  });
  const result = await provider.generateImage('A fictional portrait');
  assert.equal(payload.response_format, 'url');
  assert.deepEqual(Buffer.from(result.base64, 'base64'), bytes);
  assert.equal(result.originalSource.generatedAt, new Date(now).toISOString());
  assert.equal(result.originalSource.generationMode, 'text_to_image');
  assert.equal(result.originalSource.referenceCount, 0);
  assert.equal(
    result.originalSource.originalOutputUrl,
    source.originalOutputUrl,
  );
  assert.doesNotMatch(
    JSON.stringify(result.providerMetadata),
    /secret=|originalOutputUrl/,
  );
});
