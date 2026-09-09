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

const fail = (reason) =>
  Object.assign(new Error(`Trusted reference unavailable: ${reason}`), {
    code: 'video_trusted_source_unavailable',
    statusCode: 409,
    details: { reason },
  });
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

export function trustedSourceEligibility(
  source,
  { scope, now = Date.now(), policy = POLICY } = {},
) {
  const generated = Date.parse(source?.generatedAt || '');
  const expires = Number.isFinite(generated)
    ? generated + policy.maximumAgeDays * 86400000
    : null;
  let reason = null;
  if (!source) reason = 'metadata_missing';
  else if (source.rejection) reason = 'provider_rejected';
  else if (
    source.providerId !== policy.providerId ||
    !isTrustedGeneratedSourceModel(source, policy)
  )
    reason = 'unsupported_model';
  else if (!isTrustedGeneratedSourceMode(source, policy))
    reason = 'unsupported_mode';
  else if (!Number.isFinite(generated) || source.timestampSource !== 'provider')
    reason = 'timestamp_unknown';
  else if (generated > now || generated < Date.parse(policy.effectiveFrom))
    reason = 'timestamp_invalid';
  else if (expires <= now) reason = 'expired';
  else if (!scope || source.credentialScope !== scope)
    reason = 'account_mismatch';
  else if (!source.contentHash || !source.providerRequestId)
    reason = 'metadata_missing';
  else if (!isTrustedOutputUrl(source.originalOutputUrl))
    reason = 'url_unavailable';
  return {
    eligible: !reason,
    reason,
    expiresAt: expires ? new Date(expires).toISOString() : null,
    policyVersion: policy.version,
  };
}

export async function verifyTrustedOutputUrl(source, { fetcher = fetch } = {}) {
  if (!isTrustedOutputUrl(source.originalOutputUrl))
    throw fail('url_unavailable');
  let response;
  try {
    response = await fetcher(source.originalOutputUrl, {
      redirect: 'error',
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok || !response.body) throw fail('url_unavailable');
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

export class TrustedGeneratedSourceService {
  constructor({
    repository = trustedGeneratedSourceRepository,
    history = generationResultRepo,
    scopeResolver = resolveModelArkCredentialScope,
    now = () => Date.now(),
    contentLoader = loadVideoReferenceAssetContent,
    urlVerifier = verifyTrustedOutputUrl,
  } = {}) {
    Object.assign(this, {
      repository,
      history,
      scopeResolver,
      now,
      contentLoader,
      urlVerifier,
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
    const scope = this.scopeResolver();
    const eligibleRecords = eligibleOnly
      ? (await this.repository.listForOwner(actor.userId)).filter((row) => (
          trustedSourceEligibility(row, { scope, now: this.now() }).eligible
        ))
      : null;
    const page = await this.history.findByOwner(actor.userId, {
      limit: 24,
      cursor: query.cursor,
      allowedJobIds: eligibleRecords ? new Set(eligibleRecords.map((row) => row.id)) : null,
      filterKey: eligibleOnly ? `trusted-eligible:${POLICY.version}` : null,
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
            generationMode: source?.generationMode || 'unknown',
            generatedAt: source?.generatedAt || null,
            ...trustedSourceEligibility(source, {
              scope,
              now: this.now(),
            }),
          };
        })
        .filter((row) => !eligibleOnly || row.eligible),
    };
  }

  async describeOwnedImage(generationId, actor) {
    const plan = await this.prepareOwnedImage(generationId, actor);
    const source = plan.sources[0];
    const content = plan.assets[0];
    return {
      id: source.id, ownerUserId: actor.userId, storageKey: source.storageKey,
      publicUrl: `/outputs/${source.storageKey.replace(/\\/g, '/')}`,
      contentHash: content.contentHash, mimeType: content.mimeType,
      width: content.width, height: content.height, sizeBytes: content.sizeBytes,
      modelId: source.modelId, providerId: source.providerId,
      expiresAt: trustedSourceEligibility(source, { scope: this.scopeResolver(), now: this.now() }).expiresAt,
      providerOutputProvenance: createProviderOutputProvenance({
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
    const plan = await this.prepareOwnedImage(generationId, actor);
    if (!expectedContentHash || plan.assets[0].contentHash !== expectedContentHash) throw fail('content_changed');
    return (await this.resolve(plan)).referenceImage;
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
    if (
      (!first && input.inputMode !== 'multimodal_reference') ||
      (first &&
        (rows.length !== 1 ||
          rows[0].role !== 'first_frame' ||
          rows[0].purpose !== 'opening_frame')) ||
      (!first &&
        (rows.some((row) => row.role !== 'reference_image') ||
          rows.at(-1).purpose !== 'generated_look' ||
          rows.some((row, index) => row.purpose !== 'generated_look' && !(index === 0 && row.purpose === 'opening_frame')))) ||
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
      const source = records.find((item) => item.id === row.generationId);
      const eligibility = trustedSourceEligibility(source, {
        scope: this.scopeResolver(),
        now: this.now(),
      });
      if (!eligibility.eligible) throw fail(eligibility.reason);
      const { bytes: _bytes, ...content } = await this.contentLoader(source);
      const fingerprint = hash(
        JSON.stringify([
          source.id,
          content.contentHash,
          source.generatedAt,
          source.credentialScope,
          POLICY.version,
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
        sourceKind: 'trusted_generated',
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
    for (const source of plan.sources) {
      const eligibility = trustedSourceEligibility(source, {
        scope: this.scopeResolver(),
        now: this.now(),
      });
      if (!eligibility.eligible) throw fail(eligibility.reason);
      if (verifyUrl) await this.urlVerifier(source);
    }
    // The first source can expire while the second URL is being verified.
    for (const source of plan.sources) {
      const eligibility = trustedSourceEligibility(source, {
        scope: this.scopeResolver(),
        now: this.now(),
      });
      if (!eligibility.eligible) throw fail(eligibility.reason);
    }
    const ordered = plan.input.inputMode === 'multimodal_reference';
    return {
      referenceImage: ordered ? null : plan.sources[0].originalOutputUrl,
      lastFrameImage: null,
      referenceImages: ordered
        ? plan.sources.map((source, i) => ({
            role: plan.input.references[i].role,
            url: source.originalOutputUrl,
          }))
        : [],
      characterAttributions: [],
      providerReferenceRegistrations: [],
      referenceTransports: plan.sources.map((source) => ({
        assetId: source.id,
        mode: 'provider_original_url',
      })),
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
export const trustedGeneratedSourceService =
  new TrustedGeneratedSourceService();
