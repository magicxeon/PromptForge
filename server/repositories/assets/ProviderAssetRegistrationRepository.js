import crypto from 'node:crypto';
import { DATA_FILES } from '../../config/paths.js';
import { mutateJsonFile, readJsonFile } from '../json/jsonFileStore.js';

const FALLBACK = { schemaVersion: 1, registrations: [] };
const REUSABLE = new Set(['pending_upload', 'uploading', 'registering', 'processing', 'active', 'reconciliation_required']);

export class ProviderAssetRegistrationRepository {
  constructor({ registrationsFile = DATA_FILES.providerAssetRegistrations } = {}) {
    this.registrationsFile = registrationsFile;
  }

  async findReusable(key, actorContext) {
    const ownerUserId = requireActor(actorContext);
    const registrationKey = createRegistrationKey(key, ownerUserId);
    const data = await readJsonFile(this.registrationsFile, FALLBACK);
    assertStore(data);
    return structuredClone(data.registrations.find(item => (
      item.ownerUserId === ownerUserId
      && item.registrationKey === registrationKey
      && REUSABLE.has(item.status)
    )) || null);
  }

  async begin(key, actorContext) {
    const ownerUserId = requireActor(actorContext);
    const registrationKey = createRegistrationKey(key, ownerUserId);
    const now = new Date().toISOString();
    return mutateJsonFile(this.registrationsFile, FALLBACK, async data => {
      assertStore(data);
      const existing = data.registrations.find(item => (
        item.ownerUserId === ownerUserId
        && item.registrationKey === registrationKey
        && REUSABLE.has(item.status)
      ));
      if (existing) return structuredClone(existing);
      const registration = {
        id: `pareg_${Date.now()}_${crypto.randomBytes(5).toString('hex')}`,
        registrationKey,
        ownerUserId,
        sourceAssetId: String(key.sourceAssetId),
        sourceContentHash: String(key.sourceContentHash),
        providerId: String(key.providerId),
        credentialScope: String(key.credentialScope),
        providerProject: String(key.providerProject),
        status: 'pending_upload',
        providerAssetId: null,
        providerAssetGroupId: null,
        handoffObjectKey: null,
        providerRequestId: null,
        errorCode: null,
        createdAt: now,
        updatedAt: now
      };
      data.registrations.unshift(registration);
      return structuredClone(registration);
    });
  }

  updateForOwner(registrationId, actorContext, operation) {
    const ownerUserId = requireActor(actorContext);
    return mutateJsonFile(this.registrationsFile, FALLBACK, async data => {
      assertStore(data);
      const index = data.registrations.findIndex(item => (
        item.id === registrationId && item.ownerUserId === ownerUserId
      ));
      if (index < 0) throw repositoryError('provider_asset_registration_not_found', 'Provider Asset registration was not found.', 404);
      const draft = structuredClone(data.registrations[index]);
      const result = await operation(draft);
      draft.updatedAt = new Date().toISOString();
      data.registrations[index] = sanitizeRecord(draft);
      return structuredClone(result === undefined ? data.registrations[index] : result);
    });
  }
}

export function createRegistrationKey(value, ownerUserId) {
  const stable = {
    ownerUserId: String(ownerUserId || ''),
    sourceAssetId: String(value?.sourceAssetId || ''),
    sourceContentHash: String(value?.sourceContentHash || ''),
    providerId: String(value?.providerId || ''),
    credentialScope: String(value?.credentialScope || ''),
    providerProject: String(value?.providerProject || '')
  };
  if (Object.values(stable).some(item => !item)) {
    throw repositoryError('provider_asset_registration_key_invalid', 'Provider Asset registration authority is incomplete.');
  }
  return crypto.createHash('sha256').update(JSON.stringify(stable)).digest('hex');
}

function sanitizeRecord(value) {
  const record = structuredClone(value);
  delete record.sourceUrl;
  delete record.signedUrl;
  delete record.bytes;
  delete record.accessKey;
  delete record.secretKey;
  return record;
}

function requireActor(actorContext) {
  const ownerUserId = String(actorContext?.userId || '').trim();
  if (!ownerUserId) throw repositoryError('actor_required', 'An active actor is required.', 401);
  return ownerUserId;
}

function assertStore(data) {
  if (!data || !Array.isArray(data.registrations)) {
    throw new TypeError('Provider Asset registration data must contain a registrations array.');
  }
}

function repositoryError(code, message, statusCode = 400) {
  return Object.assign(new Error(message), { code, statusCode });
}

export const providerAssetRegistrationRepository = new ProviderAssetRegistrationRepository();
