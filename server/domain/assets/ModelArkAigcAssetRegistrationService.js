import { setTimeout as delay } from 'node:timers/promises';
import { providerAssetRegistrationRepository } from '../../repositories/assets/ProviderAssetRegistrationRepository.js';
import { googleCloudProviderAssetStorage } from '../../repositories/assets/GoogleCloudProviderAssetStorage.js';
import { modelArkAssetLibraryClient } from '../../providers/ModelArkAssetLibraryClient.js';
import { loadVerifiedStoryboardAssetContent } from './CinematicStoryboardAssetService.js';

const ACTIVE = 'active';
const PROCESSING = 'processing';

export class ModelArkAigcAssetRegistrationService {
  constructor({
    repository = providerAssetRegistrationRepository,
    storage = googleCloudProviderAssetStorage,
    assetLibraryClient = modelArkAssetLibraryClient,
    sourceLoader = loadVerifiedStoryboardAssetContent,
    environment = process.env,
    wait = delay,
    clock = () => new Date()
  } = {}) {
    this.repository = repository;
    this.storage = storage;
    this.assetLibraryClient = assetLibraryClient;
    this.sourceLoader = sourceLoader;
    this.wait = wait;
    this.clock = clock;
    this.inflight = new Map();
    this.pollIntervalMs = boundedInteger(environment.MODEL_ARK_ASSET_POLL_INTERVAL_MS, 250, 30_000, 3_000);
    this.ingestTimeoutMs = boundedInteger(environment.MODEL_ARK_ASSET_INGEST_TIMEOUT_MS, 5_000, 600_000, 120_000);
  }

  async preflight({ sourceAuthority, actorContext, credentialScope }) {
    this.assetLibraryClient.assertConfigured();
    const key = this.#registrationKey(sourceAuthority, credentialScope);
    const existing = await this.repository.findReusable(key, actorContext);
    if (!existing || existing.status !== ACTIVE) {
      this.storage.assertConfigured();
      if (Number.isFinite(Number(this.storage.ttlSeconds))
        && Number(this.storage.ttlSeconds) * 1000 < this.ingestTimeoutMs + 60_000) {
        throw registrationError(
          'video_provider_asset_signed_url_ttl_too_short',
          'The provider Asset signed URL lifetime must cover the configured ModelArk ingestion timeout.',
          500
        );
      }
    }
    if (existing?.status === 'reconciliation_required') {
      throw registrationError(
        'video_provider_asset_registration_reconciliation_required',
        'The previous ModelArk Asset registration has an unknown delivery state and requires Support review.',
        409
      );
    }
    return { configured: true, registrationId: existing?.id || null, status: existing?.status || null };
  }

  async resolveFirstFrame({ sourceAsset, sourceAuthority, actorContext, credentialScope }) {
    const operationKey = [
      actorContext?.userId,
      sourceAuthority?.assetId,
      sourceAuthority?.contentHash,
      credentialScope,
      this.assetLibraryClient.projectName || 'default'
    ].join(':');
    const activeOperation = this.inflight.get(operationKey);
    if (activeOperation) return activeOperation;
    const operation = this.#resolveFirstFrame({
      sourceAsset, sourceAuthority, actorContext, credentialScope
    });
    this.inflight.set(operationKey, operation);
    try {
      return await operation;
    } finally {
      if (this.inflight.get(operationKey) === operation) this.inflight.delete(operationKey);
    }
  }

  async #resolveFirstFrame({ sourceAsset, sourceAuthority, actorContext, credentialScope }) {
    await this.preflight({ sourceAuthority, actorContext, credentialScope });
    const key = this.#registrationKey(sourceAuthority, credentialScope);
    let registration = await this.repository.findReusable(key, actorContext);
    if (registration?.status === ACTIVE && registration.providerAssetId) {
      const current = await this.assetLibraryClient.getAsset(registration.providerAssetId);
      if (current.status === ACTIVE) {
        await this.#cleanupHandoff(registration, actorContext);
        return registrationResult(registration);
      }
      registration = await this.#recordProviderStatus(registration, current, actorContext);
    }
    if (registration?.status === 'reconciliation_required') {
      throw registrationError(
        'video_provider_asset_registration_reconciliation_required',
        'The previous ModelArk Asset registration has an unknown delivery state and requires Support review.',
        409
      );
    }
    if (registration?.providerAssetId) {
      return this.#waitUntilActive(registration, actorContext);
    }
    if (registration?.status === 'registering') {
      await this.repository.updateForOwner(registration.id, actorContext, draft => {
        draft.status = 'reconciliation_required';
        draft.errorCode = 'provider_asset_id_missing_after_registration_started';
      });
      throw registrationError(
        'video_provider_asset_registration_reconciliation_required',
        'The previous ModelArk Asset registration may have been delivered and requires Support review.',
        409
      );
    }

    registration ||= await this.repository.begin(key, actorContext);
    const verified = await this.sourceLoader(sourceAsset);
    if (verified.contentHash !== sourceAuthority.contentHash) {
      throw registrationError(
        'cinematic_video_reference_content_changed',
        'The approved Storyboard image no longer matches its immutable Asset.',
        409
      );
    }

    await this.repository.updateForOwner(registration.id, actorContext, draft => {
      draft.status = 'uploading';
      draft.errorCode = null;
    });
    const handoff = await this.storage.publish({
      ownerUserId: actorContext.userId,
      sourceAssetId: sourceAsset.id,
      contentHash: verified.contentHash,
      bytes: verified.bytes,
      mimeType: sourceAsset.mimeType
    });
    await this.repository.updateForOwner(registration.id, actorContext, draft => {
      draft.handoffObjectKey = handoff.objectKey;
      draft.status = 'registering';
    });

    let groupId;
    try {
      groupId = await this.assetLibraryClient.resolveAigcGroup();
    } catch (error) {
      await this.repository.updateForOwner(registration.id, actorContext, draft => {
        draft.status = error?.deliveryState === 'unknown' ? 'reconciliation_required' : 'failed';
        draft.errorCode = String(error?.code || 'video_provider_asset_group_failed').slice(0, 160);
      });
      throw error;
    }
    let created;
    try {
      created = await this.assetLibraryClient.createImageAsset({
        groupId,
        sourceUrl: handoff.sourceUrl,
        name: `momelo-${String(sourceAsset.id).slice(-40)}`
      });
    } catch (error) {
      await this.repository.updateForOwner(registration.id, actorContext, draft => {
        draft.status = error?.deliveryState === 'unknown' ? 'reconciliation_required' : 'failed';
        draft.errorCode = String(error?.code || 'video_provider_asset_registration_failed').slice(0, 160);
        draft.providerAssetGroupId = groupId;
      });
      throw error;
    }
    registration = await this.repository.updateForOwner(registration.id, actorContext, draft => {
      draft.providerAssetId = created.id;
      draft.providerAssetGroupId = groupId;
      draft.providerRequestId = created.requestId || null;
      draft.status = PROCESSING;
      draft.errorCode = null;
    });
    return this.#waitUntilActive(registration, actorContext);
  }

  #registrationKey(sourceAuthority, credentialScope) {
    if (!sourceAuthority?.assetId || !sourceAuthority?.contentHash || !credentialScope) {
      throw registrationError(
        'video_provider_asset_registration_authority_invalid',
        'The approved Storyboard Asset authority is incomplete for ModelArk registration.',
        409
      );
    }
    return {
      sourceAssetId: sourceAuthority.assetId,
      sourceContentHash: sourceAuthority.contentHash,
      providerId: 'modelark',
      credentialScope,
      providerProject: this.assetLibraryClient.projectName || 'default'
    };
  }

  async #waitUntilActive(registration, actorContext) {
    const deadline = this.clock().getTime() + this.ingestTimeoutMs;
    let current = registration;
    while (this.clock().getTime() < deadline) {
      const providerAsset = await this.assetLibraryClient.getAsset(current.providerAssetId);
      current = await this.#recordProviderStatus(current, providerAsset, actorContext);
      if (current.status === ACTIVE) {
        await this.#cleanupHandoff(current, actorContext);
        return registrationResult(current);
      }
      if (current.status === 'failed') {
        throw registrationError(
          'video_provider_asset_ingest_failed',
          'ModelArk could not activate the approved Storyboard image in the private AIGC Asset Library.',
          409,
          { providerCode: current.errorCode }
        );
      }
      await this.wait(this.pollIntervalMs);
    }
    throw registrationError(
      'video_provider_asset_ingest_timeout',
      'ModelArk is still preparing the approved Storyboard image. Retry Generate to resume this registration.',
      504,
      { retryable: true, registrationId: current.id }
    );
  }

  #recordProviderStatus(registration, providerAsset, actorContext) {
    return this.repository.updateForOwner(registration.id, actorContext, draft => {
      draft.status = providerAsset.status === ACTIVE
        ? ACTIVE
        : providerAsset.status === 'failed' ? 'failed' : PROCESSING;
      draft.providerAssetId = providerAsset.id || draft.providerAssetId;
      draft.providerAssetGroupId = providerAsset.groupId || draft.providerAssetGroupId;
      draft.providerRequestId = providerAsset.requestId || draft.providerRequestId;
      draft.errorCode = providerAsset.status === 'failed'
        ? providerAsset.errorCode || 'provider_asset_ingest_failed'
        : null;
      if (draft.status === ACTIVE) draft.activatedAt = this.clock().toISOString();
    });
  }

  async #cleanupHandoff(registration, actorContext) {
    if (!registration.handoffObjectKey) return;
    const cleaned = await this.storage.cleanup(registration.handoffObjectKey);
    if (!cleaned) return;
    await this.repository.updateForOwner(registration.id, actorContext, draft => {
      draft.handoffObjectKey = null;
    });
  }
}

function registrationResult(registration) {
  if (!registration?.providerAssetId || registration.status !== ACTIVE) {
    throw registrationError('video_provider_asset_not_active', 'The ModelArk AIGC Asset is not active.', 409);
  }
  return {
    assetUri: `asset://${registration.providerAssetId}`,
    registration: {
      id: registration.id,
      providerId: 'modelark',
      providerAssetId: registration.providerAssetId,
      providerAssetGroupId: registration.providerAssetGroupId || null,
      sourceAssetId: registration.sourceAssetId,
      sourceContentHash: registration.sourceContentHash,
      status: ACTIVE,
      activatedAt: registration.activatedAt || null
    }
  };
}

function boundedInteger(value, minimum, maximum, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number >= minimum && number <= maximum ? number : fallback;
}

function registrationError(code, message, statusCode = 400, details = null) {
  return Object.assign(new Error(message), {
    code,
    statusCode,
    details,
    retryable: details?.retryable === true
  });
}

export const modelArkAigcAssetRegistrationService = new ModelArkAigcAssetRegistrationService();
