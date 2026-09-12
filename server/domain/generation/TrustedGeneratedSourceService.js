import crypto from 'node:crypto';
import { normalizeLookName, validateLookNames } from './VideoReferencePlan.js';
import {
  TRUSTED_GENERATED_SOURCE_POLICY as POLICY,
  isTrustedGeneratedSourceMode,
  isTrustedGeneratedSourceModel,
  isTrustedOutputUrl,
} from '../../config/trustedGeneratedSources.js';
import { trustedGeneratedSourceRepository } from '../../repositories/generation/TrustedGeneratedSourceRepository.js';
import { generationResultRepo } from '../../repositories/generation/GenerationResultRepository.js';
import { resolveModelArkCredentialScope } from '../../providers/modelArkCredentialScope.js';
import { loadVideoReferenceAssetContent } from '../assets/VideoReferenceAssetContent.js';
import { createProviderOutputProvenance } from './ProviderOutputProvenance.js';
import { generatedReferencePolicy, generatedSourceIdentity, isGeneratedReferenceAllowed,
  assertGeneratedReferenceAllowed } from '../../config/generatedReferencePolicy.js';

const fail = (reason) =>
  Object.assign(new Error(`Trusted reference unavailable: ${reason}`), {
    code: 'video_trusted_source_unavailable',
    statusCode: 409,
    details: { reason },
  });
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

export function isGeneratedLookSheet(item) {
  return item?.mode === 'character-sheet'
    || (item?.lookSheetSnapshot?.schemaVersion === 1 && typeof item.lookSheetSnapshot.presetId === 'string'
      && item.lookSheetSnapshot.presetId.length > 0);
}

export const generatedCastSourceFingerprint = (generationId, contentHash) =>
  hash(JSON.stringify(['cinematic-generated-cast-v1', generationId, contentHash]));

export function trustedSourceEligibility(
  source,
  { scope, policy = POLICY } = {},
) {
  let reason = null;
  if (!source) reason = 'metadata_missing';
  else if (
    source.providerId !== policy.providerId ||
    !isTrustedGeneratedSourceModel(source, policy)
  )
    reason = 'unsupported_model';
  else if (!isTrustedGeneratedSourceMode(source, policy))
    reason = 'unsupported_mode';
  else if (!scope || source.credentialScope !== scope)
    reason = 'account_mismatch';
  else if (!source.contentHash || !source.providerRequestId)
    reason = 'metadata_missing';
  else if (!isTrustedOutputUrl(source.originalOutputUrl))
    reason = 'url_unavailable';
  return {
    eligible: !reason,
    reason,
    expiresAt: null,
    policyVersion: policy.version,
  };
}

export async function verifyTrustedOutputUrl(source, { fetcher = fetch } = {}) {
  if (!isTrustedOutputUrl(source.originalOutputUrl))
    throw fail('url_unavailable');
  if (trustedOutputUrlExpired(source.originalOutputUrl)) throw fail('url_expired');
  let response;
  try {
    response = await fetcher(source.originalOutputUrl, {
      redirect: 'error',
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok || !response.body) {
      const errorBody = response.status === 403 ? await response.json().catch(() => null) : null;
      throw fail(errorBody?.Code === 'AccessDenied' && errorBody?.Message === 'Request has expired'
        ? 'url_expired' : 'url_unavailable');
    }
    const declared = Number(response.headers.get('content-length'));
    if (declared > 30 * 1024 * 1024) throw fail('content_changed');
    const reader = response.body.getReader();
    const digest = crypto.createHash('sha256');
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 30 * 1024 * 1024) throw fail('content_changed');
        digest.update(value);
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    if (
      size !== source.sizeBytes ||
      digest.digest('hex') !== source.contentHash
    )
      throw fail('content_changed');
  } catch (error) {
    await response?.body?.cancel().catch(() => {});
    throw fail(error?.details?.reason || 'url_unavailable');
  }
}

export function trustedOutputUrlExpired(value, now = Date.now()) {
  const url = new URL(value);
  const date = url.searchParams.get('X-Tos-Date');
  const seconds = Number(url.searchParams.get('X-Tos-Expires'));
  const parts = date?.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!parts || !Number.isFinite(seconds) || seconds <= 0) return false;
  const signedAt = Date.parse(`${parts[1]}-${parts[2]}-${parts[3]}T${parts[4]}:${parts[5]}:${parts[6]}Z`);
  return Number.isFinite(signedAt) && signedAt + seconds * 1000 <= now;
}

export class TrustedGeneratedSourceService {
  constructor({
    repository = trustedGeneratedSourceRepository,
    history = generationResultRepo,
    scopeResolver = resolveModelArkCredentialScope,
    now = () => Date.now(),
    contentLoader = loadVideoReferenceAssetContent,
    urlVerifier = verifyTrustedOutputUrl,
    sourcePolicy = generatedReferencePolicy,
  } = {}) {
    Object.assign(this, {
      repository,
      history,
      scopeResolver,
      now,
      contentLoader,
      urlVerifier,
      sourcePolicy,
    });
  }

  async capture({
    id,
    ownerUserId,
    providerId,
    original,
    bytes,
    mimeType,
    storageKey,
  }) {
    if (providerId !== 'modelark' || !original || !ownerUserId) return;
    const evidence = Object.fromEntries(
      [
        'originalOutputUrl',
        'modelId',
        'requestedModelId',
        'providerRequestId',
        'credentialScope',
        'referenceCount',
        'generationMode',
        'generatedAt',
        'timestampSource',
        'receivedAt',
      ].map((key) => [key, original[key] ?? null]),
    );
    const record = {
      id,
      ownerUserId,
      providerId,
      ...evidence,
      mimeType,
      storageKey,
      contentHash: hash(bytes),
      sizeBytes: bytes.length,
    };
    await this.repository.create(record);
  }

  async list(actor, query = {}) {
    const eligibleOnly = query.eligibleOnly === true;
    if (query.category != null && query.category !== 'look-sheet') {
      throw Object.assign(new Error('Unsupported generated source category.'), { code: 'video_source_category_invalid', statusCode: 400 });
    }
    const sheetsOnly = query.category === 'look-sheet';
    const scope = this.scopeResolver();
    const open = this.sourcePolicy.allowAnyProvider;
    const eligibleRecords = eligibleOnly && !open
      ? (await this.repository.listForOwner(actor.userId)).filter((row) => (
          trustedSourceEligibility(row, { scope, now: this.now() }).eligible
        ))
      : null;
    const page = await this.history.findByOwner(actor.userId, {
      limit: 24,
      cursor: query.cursor,
      allowedJobIds: eligibleRecords ? new Set(eligibleRecords.map((row) => row.id)) : null,
      filterKey: `${open ? this.sourcePolicy.policyVersion : eligibleOnly ? `trusted-eligible:${POLICY.version}` : 'trusted-all'}${sheetsOnly ? ':look-sheet' : ''}`,
      itemFilter: row => (!sheetsOnly || isGeneratedLookSheet(row))
        && isGeneratedReferenceAllowed(row, this.sourcePolicy)
        && (!open || isOwnedImageCandidate(row)),
    });
    const records = eligibleRecords || await this.repository.findManyForOwner(
      page.items.map((row) => row.id), actor.userId,
    );
    const byId = new Map(records.map((row) => [row.id, row]));
    return {
      ...page,
      items: page.items
        .filter(
          (row) =>
            row.artifactVisibility !== 'template_owner_only' &&
            row.status !== 'deleted' &&
            typeof row.imageUrl === 'string' &&
            row.imageUrl.length > 0,
        )
        .map((row) => {
          const source = byId.get(row.id);
          return {
            id: row.id,
            previewUrl: row.imageUrl,
            modelId:
              source?.modelId || row.resolvedSubmodel || row.submodel || '',
            generationMode: source?.generationMode || row.generationMode || 'unknown',
            category: isGeneratedLookSheet(row) ? 'look-sheet' : 'image',
            generatedAt: source?.generatedAt || null,
            ...trustedSourceEligibility(source, {
              scope,
              now: this.now(),
            }),
            ...(open ? { eligible: true, reason: null, expiresAt: null,
              policyVersion: this.sourcePolicy.policyVersion } : {}),
          };
        })
        .filter((row) => !eligibleOnly || row.eligible),
    };
  }

  async describeOwnedImage(generationId, actor, { requireLookSheet = false } = {}) {
    if (requireLookSheet && !isGeneratedLookSheet(await this.history.findByIdForOwner(generationId, actor.userId))) {
      throw fail('look_sheet_required');
    }
    const plan = await this.prepareOwnedImage(generationId, actor);
    const source = plan.sources[0];
    const content = plan.assets[0];
    return {
      id: source.id, ownerUserId: actor.userId, storageKey: source.storageKey,
      publicUrl: `/outputs/${source.storageKey.replace(/\\/g, '/')}`,
      contentHash: content.contentHash, mimeType: content.mimeType,
      width: content.width, height: content.height, sizeBytes: content.sizeBytes,
      modelId: source.modelId, providerId: source.providerId,
      expiresAt: null,
      providerOutputProvenance: source.sourceKind === 'owned_generation' ? source.providerOutputProvenance || null : createProviderOutputProvenance({
        providerId: source.providerId, requestedModelId: source.requestedModelId || source.modelId,
        providerMetadata: { resolvedModel: source.modelId, requestId: source.providerRequestId,
          credentialScope: source.credentialScope, generatedAt: source.generatedAt },
        originalBytesPreserved: true
      })
    };
  }

  prepareOwnedImage(generationId, actor) {
    return this.prepare({ referencePlanVersion: 'playground-trusted-v1', inputMode: 'image_to_video',
      references: [{ role: 'first_frame', purpose: 'opening_frame', generationId }] }, actor);
  }

  async resolveOwnedImage(generationId, actor, expectedContentHash) {
    return (await this.resolveOwnedImageWithTransport(generationId, actor, expectedContentHash)).value;
  }

  async resolveOwnedImageWithTransport(generationId, actor, expectedContentHash) {
    const plan = await this.prepareOwnedImage(generationId, actor);
    if (!expectedContentHash || plan.assets[0].contentHash !== expectedContentHash) throw fail('content_changed');
    const result = await this.resolve(plan);
    const { mode, fallbackCode = null } = result.referenceTransports[0];
    return { value: result.referenceImage, transport: { mode, fallbackCode } };
  }

  async prepare(input, actor) {
    const rows = input.references;
    if (
      input.referencePlanVersion !== 'playground-trusted-v1' ||
      input.characterProfileId ||
      input.characterProfileVersionId ||
      input.referenceImageUrl ||
      !Array.isArray(rows) ||
      rows.length < 1 ||
      rows.length > 12
    )
      throw fail('generated_selection_required');
    const first = input.inputMode === 'image_to_video';
    const generalImages = rows.every(row => row.purpose === 'image_reference');
    if (
      (!first && input.inputMode !== 'multimodal_reference') ||
      (first &&
        (rows.length !== 1 ||
          rows[0].role !== 'first_frame' ||
          rows[0].purpose !== 'opening_frame')) ||
      (!first &&
        (rows.some((row) => row.role !== 'reference_image') ||
          (!generalImages && (rows.at(-1).purpose !== 'generated_look' ||
          rows.some((row, index) => row.purpose !== 'generated_look' && !(index === 0 && row.purpose === 'opening_frame')))))) ||
      rows.some(
        (row) =>
          !row.generationId ||
          row.referenceImageUrl ||
          row.url ||
          row.assetId ||
          row.characterLookId,
      ) ||
      new Set(rows.map((row) => row.generationId)).size !== rows.length
    )
      throw fail('generated_selection_required');
    validateLookNames(rows);
    const records = await this.repository.findManyForOwner(
      rows.map((row) => row.generationId),
      actor.userId,
    );
    const assets = [],
      references = [],
      sources = [];
    for (const row of rows) {
      const history = await this.history.findByIdForOwner(
        row.generationId,
        actor.userId,
      );
      if (
        !history ||
        history.status === 'deleted' ||
        history.artifactVisibility === 'template_owner_only'
      )
        throw fail('source_unavailable');
      assertGeneratedReferenceAllowed(history, this.sourcePolicy);
      const original = records.find((item) => item.id === row.generationId);
      const eligibility = trustedSourceEligibility(original, {
        scope: this.scopeResolver(),
        now: this.now(),
      });
      if (!eligibility.eligible && !this.sourcePolicy.allowAnyProvider) throw fail(eligibility.reason);
      const source = eligibility.eligible ? original : ownedImageSource(history, actor, original);
      assertGeneratedReferenceAllowed(source, this.sourcePolicy);
      if (row.purpose === 'generated_look' && !isGeneratedLookSheet(history)) throw fail('look_sheet_required');
      const { bytes: _bytes, ...content } = await this.contentLoader(source);
      const fingerprint = hash(
        JSON.stringify([
          source.id,
          content.contentHash,
          source.generatedAt,
          source.credentialScope,
          this.sourcePolicy.allowAnyProvider ? this.sourcePolicy.policyVersion : POLICY.version,
        ]),
      );
      assets.push({ ...content, id: source.id });
      sources.push(source);
      references.push({
        ...(normalizeLookName(row.characterName) ? { characterName: normalizeLookName(row.characterName) } : {}),
        role: row.role,
        purpose: row.purpose,
        assetId: source.id,
        assetVersionId: source.id,
        sourceKind: source.sourceKind || 'trusted_generated',
        contentHash: content.contentHash,
        sourceFingerprint: fingerprint,
        referenceImageUrl: `generated:${source.id}`,
      });
    }
    return {
      input: { ...input, references },
      sources,
      assets,
      attributions: [],
      trusted: true,
    };
  }

  async resolve(plan, { verifyUrl = true } = {}) {
    const values = [], referenceTransports = [];
    for (const [index, source] of plan.sources.entries()) {
      assertGeneratedReferenceAllowed(source, this.sourcePolicy);
      if (source.sourceKind === 'owned_generation') {
        if (!this.sourcePolicy.allowAnyProvider) throw fail('unsupported_model');
        const current = await this.history.findByIdForOwner(source.id, source.ownerUserId);
        if (!isOwnedImageCandidate(current) || current.imageUrl !== `/outputs/${source.storageKey}`) throw fail('source_unavailable');
        assertGeneratedReferenceAllowed(current, this.sourcePolicy);
        const content = await this.contentLoader({ ...source, contentHash: plan.assets[index].contentHash });
        values.push(`data:${content.mimeType};base64,${content.bytes.toString('base64')}`);
        referenceTransports.push({ assetId: source.id, mode: 'base64' });
        continue;
      }
      const eligibility = trustedSourceEligibility(source, {
        scope: this.scopeResolver(),
        now: this.now(),
      });
      if (!eligibility.eligible) throw fail(eligibility.reason);
      let value = source.originalOutputUrl;
      let mode = 'provider_original_url', fallbackCode = null;
      try {
        if (verifyUrl) await this.urlVerifier(source);
      } catch (error) {
        const localAllowed = ['url_expired', 'url_unavailable'].includes(error?.details?.reason);
        if (!localAllowed) throw error;
        const content = await this.contentLoader(source);
        if (content.contentHash !== source.contentHash || content.sizeBytes !== source.sizeBytes) throw fail('content_changed');
        value = `data:${content.mimeType};base64,${content.bytes.toString('base64')}`;
        mode = 'base64';
        fallbackCode = 'generated_source_local_original';
      }
      values.push(value);
      referenceTransports.push({ assetId: source.id, mode, ...(fallbackCode ? { fallbackCode } : {}) });
    }
    const ordered = plan.input.inputMode === 'multimodal_reference';
    return {
      referenceImage: ordered ? null : values[0],
      lastFrameImage: null,
      referenceImages: ordered
        ? plan.sources.map((source, i) => ({
            role: plan.input.references[i].role,
            url: values[i],
          }))
        : [],
      characterAttributions: [],
      providerReferenceRegistrations: [],
      referenceTransports,
    };
  }

  async recordRejection(task, actor) {
    const code =
      task?.providerError?.providerCode || task?.providerError?.code || '';
    if (!code.includes('InputImageSensitiveContentDetected')) return;
    const ids = (task.submittedRequest?.references || [])
      .map((row) => row.trustedGenerationId || row.assetId)
      .filter(Boolean);
    if (ids.length)
      await this.repository.reject(ids, actor.userId, {
        taskId: task.id,
        providerRequestId: task.providerError.providerRequestId || null,
        modelId: task.modelId || null,
        reason: 'request_rejected_source_not_individually_proven',
        createdAt: new Date(this.now()).toISOString(),
      });
  }
}
function isOwnedImageCandidate(row) {
  return Boolean(row && row.status !== 'deleted' && row.artifactVisibility !== 'template_owner_only'
    && !['failed', 'cancelled', 'processing', 'queued'].includes(row.status)
    && typeof row.imageUrl === 'string' && row.imageUrl.startsWith('/outputs/')
    && !/[?#%\\]/.test(row.imageUrl) && !row.imageUrl.split('/').includes('..'));
}

function ownedImageSource(history, actor, original) {
  if (!isOwnedImageCandidate(history)) throw fail('source_unavailable');
  const identity = generatedSourceIdentity(history);
  return { id: history.id, ownerUserId: actor.userId, ...identity,
    storageKey: history.imageUrl.slice('/outputs/'.length), sourceKind: 'owned_generation',
    contentHash: original?.contentHash || null, sizeBytes: original?.sizeBytes || null,
    providerOutputProvenance: history.providerOutputProvenance || null,
    generatedAt: history.createdAt || null, generationMode: history.generationMode || 'unknown' };
}
export const trustedGeneratedSourceService =
  new TrustedGeneratedSourceService();
