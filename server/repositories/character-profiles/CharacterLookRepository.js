import { resolveDataFile } from '../../config/paths.js';
import { mutateJsonFile, readJsonFile } from '../json/jsonFileStore.js';
import { assertActorContext, RepositoryContractError } from '../repositoryContracts.js';
import { applyRecordDefaults, createPrefixedId } from '../schemaVersioning.js';

const FALLBACK = [];

export class CharacterLookRepository {
  constructor({ looksFile = resolveDataFile('characterLooks') } = {}) {
    this.looksFile = looksFile;
  }

  async readAll() {
    const records = await readJsonFile(this.looksFile, FALLBACK);
    if (!Array.isArray(records)) throw new TypeError('Character Looks data must be an array.');
    return structuredClone(records);
  }

  async listVisibleForActor(characterProfileId, actorContext) {
    const actor = assertActorContext(actorContext);
    return (await this.readAll())
      .filter(item => item.characterProfileId === characterProfileId
        && item.ownerUserId === actor.userId
        && !['deleted', 'retired'].includes(item.lifecycleStatus))
      .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));
  }

  async findForOwner(lookId, actorContext) {
    const actor = assertActorContext(actorContext);
    return (await this.readAll()).find(item => item.id === lookId && item.ownerUserId === actor.userId) || null;
  }

  async createDraft(input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const now = new Date().toISOString();
    return mutateJsonFile(this.looksFile, FALLBACK, async records => {
      if (!Array.isArray(records)) throw new TypeError('Character Looks data must be an array.');
      const idempotencyKey = String(input.idempotencyKey || '').trim();
      const existing = idempotencyKey
        ? records.find(item => item.ownerUserId === actor.userId && item.idempotencyKey === idempotencyKey)
        : null;
      if (existing) return structuredClone(existing);
      const version = createVersion({ ...input, versionNumber: 1 }, actor, now);
      const record = applyRecordDefaults({
        characterProfileId: input.characterProfileId,
        sourceCharacterProfileVersionId: input.sourceCharacterProfileVersionId,
        sourceCharacterOwnerUserId: input.sourceCharacterOwnerUserId,
        official: input.official === true,
        name: input.name,
        description: input.description || '',
        tags: input.tags || [],
        suggestionSnapshot: structuredClone(input.suggestionSnapshot || null),
        idempotencyKey: idempotencyKey || null,
        lifecycleStatus: 'draft',
        activeVersionId: version.id,
        approvedVersionId: null,
        versions: [version]
      }, {
        idPrefix: 'charlook', ownerUserId: actor.userId, ownerUsername: actor.username,
        visibility: 'private', status: 'active', now
      });
      records.unshift(record);
      return structuredClone(record);
    });
  }

  async attachReview(lookId, versionId, review, actorContext) {
    return this.#mutateOwned(lookId, actorContext, record => {
      const version = record.versions.find(item => item.id === versionId);
      if (!version || version.status !== 'source_ready') {
        throw new RepositoryContractError('character_look_version_not_ready', 'Look sources are not ready for review.', 409);
      }
      version.status = 'review';
      version.approvedViewAssets = structuredClone(review.approvedViewAssets);
      version.approvedSheetAsset = structuredClone(review.approvedSheetAsset || null);
      version.cropManifest = structuredClone(review.cropManifest || null);
      version.generationLineage = structuredClone(review.generationLineage || null);
      version.provenance = structuredClone(review.provenance || null);
      version.identityAssurance = structuredClone(review.identityAssurance || null);
      version.rightsDeclaration = structuredClone(review.rightsDeclaration || null);
      version.updatedAt = new Date().toISOString();
      record.lifecycleStatus = 'review';
      return record;
    });
  }

  async approve(lookId, versionId, actorContext) {
    return this.#mutateOwned(lookId, actorContext, record => {
      const version = record.versions.find(item => item.id === versionId);
      if (!version || version.status !== 'review' || !hasCompleteViews(version.approvedViewAssets)) {
        throw new RepositoryContractError('character_look_review_required', 'A complete front, side and back review set is required.', 409);
      }
      const now = new Date().toISOString();
      for (const item of record.versions) {
        if (item.status === 'approved') item.status = 'superseded';
      }
      version.status = 'approved';
      version.approvedAt = now;
      version.updatedAt = now;
      if (version.provenance?.kind === 'system_generated'
        && version.identityAssurance?.status === 'unverified') {
        version.identityAssurance.status = 'lineage_bound';
        version.identityAssurance.updatedAt = now;
      }
      if (version.provenance?.kind === 'user_uploaded'
        && version.rightsDeclaration?.accepted === true
        && version.identityAssurance?.status === 'unverified') {
        version.identityAssurance.status = 'user_confirmed';
        version.identityAssurance.updatedAt = now;
      }
      record.approvedVersionId = version.id;
      record.activeVersionId = version.id;
      record.lifecycleStatus = 'approved';
      return record;
    });
  }

  async retire(lookId, actorContext) {
    return this.#mutateOwned(lookId, actorContext, record => {
      const now = new Date().toISOString();
      record.lifecycleStatus = 'retired';
      record.retiredAt = now;
      for (const version of record.versions) {
        if (version.status !== 'approved' && version.status !== 'superseded') {
          version.status = 'retired';
          version.updatedAt = now;
        }
      }
      return record;
    });
  }

  async #mutateOwned(lookId, actorContext, operation) {
    const actor = assertActorContext(actorContext);
    return mutateJsonFile(this.looksFile, FALLBACK, async records => {
      if (!Array.isArray(records)) throw new TypeError('Character Looks data must be an array.');
      const index = records.findIndex(item => item.id === lookId && item.ownerUserId === actor.userId);
      if (index < 0) throw new RepositoryContractError('character_look_not_found', 'Character Look not found.', 404);
      const draft = structuredClone(records[index]);
      const result = await operation(draft);
      draft.updatedAt = new Date().toISOString();
      records[index] = draft;
      return structuredClone(result || draft);
    });
  }
}

function createVersion(input, actor, now) {
  return {
    id: createPrefixedId('charlookver'),
    versionNumber: input.versionNumber,
    sourceMode: input.sourceMode,
    garmentAuthorities: structuredClone(input.garmentAuthorities || {}),
    sourceSheetAssetId: input.sourceSheetAssetId || null,
    authoritySnapshot: structuredClone(input.authoritySnapshot || []),
    canonicalFaceAssetId: input.canonicalFaceAssetId || null,
    status: 'source_ready',
    approvedViewAssets: null,
    approvedSheetAsset: null,
    cropManifest: null,
    generationLineage: null,
    provenance: null,
    identityAssurance: null,
    rightsDeclaration: null,
    ownerUserId: actor.userId,
    createdAt: now,
    updatedAt: now,
    approvedAt: null
  };
}

function hasCompleteViews(assets) {
  return Boolean(assets?.front?.assetId && assets?.side?.assetId && assets?.back?.assetId);
}

export const characterLookRepository = new CharacterLookRepository();
