import { resolveDataFile } from '../../config/paths.js';
import { readJsonFile, mutateJsonFile } from '../json/jsonFileStore.js';
import {
  assertActorContext,
  createPage,
  normalizeListQuery,
  pickAllowedValue,
  RepositoryContractError,
  VISIBILITY
} from '../repositoryContracts.js';
import { applyRecordDefaults } from '../schemaVersioning.js';
import { normalizeOwnedRepositoryRecord, stripEmbeddedBase64 } from '../recordNormalizer.js';
import { paginateRepositoryRecords } from '../RepositoryCursor.js';
import { mockUserRepo } from '../identity/MockUserRepository.js';

const CHARACTER_FALLBACK = [];
const CHARACTER_TYPES = Object.freeze([
  'headshot_only',
  'full_character',
  'face_and_outfit',
  'reusable_model',
  'styled_character'
]);
const REFERENCE_POLICIES = Object.freeze([
  'private',
  'owner_only',
  'replace_required',
  'public_reusable',
  'none'
]);
const CHARACTER_REUSE_POLICIES = Object.freeze([
  'none',
  'view_only',
  'use_as_character',
  'remix_with_required_replacements'
]);

export class CommunityCharacterRepository {
  constructor({
    characterFile = resolveDataFile('communityCharacters'),
    userRepository = mockUserRepo,
    cursorSecret = process.env.COMMUNITY_CHARACTER_CURSOR_SECRET || 'local-community-character-cursor'
  } = {}) {
    this.characterFile = characterFile;
    this.userRepository = userRepository;
    this.cursorSecret = cursorSecret;
  }

  async readRaw() {
    const data = await readJsonFile(this.characterFile, CHARACTER_FALLBACK);
    return Array.isArray(data) ? data : [];
  }

  async readAll() {
    const items = await this.readRaw();
    return Promise.all(items.map(item => normalizeOwnedRepositoryRecord(
      item,
      this.userRepository,
      { visibility: VISIBILITY.PRIVATE, status: 'active' }
    )));
  }

  async findById(id) {
    if (!id) return null;
    const items = await this.readAll();
    const item = items.find(character => character.id === id);
    return item ? structuredClone(item) : null;
  }

  async findByIdForOwner(id, ownerUserId) {
    const item = await this.findById(id);
    return item?.ownerUserId === ownerUserId ? item : null;
  }

  async findByCharacterProfileId(characterProfileId) {
    if (!characterProfileId) return null;
    return (await this.readAll()).find(item => item.characterProfileId === characterProfileId) || null;
  }

  async findPublicById(id) {
    const item = await this.findById(id);
    if (!item || item.visibility !== VISIBILITY.PUBLIC || item.status !== 'active') return null;
    return createPublicCharacterSummary(item);
  }

  async findByOwner(ownerUserId, query = {}) {
    const normalizedQuery = normalizeListQuery(query);
    const items = (await this.readAll())
      .filter(item => item.ownerUserId === ownerUserId && item.status !== 'deleted');
    const page = paginateRepositoryRecords(
      items,
      normalizedQuery,
      JSON.stringify({ ownerUserId, sort: normalizedQuery.sort }),
      this.cursorSecret
    );
    return createPage(page.items, page);
  }

  async listPublic(query = {}) {
    const normalizedQuery = normalizeListQuery(query);
    const requestedCreatorProfileId = normalizedQuery.filters.creatorProfileId || null;
    const requestedOwnerUserId = normalizedQuery.filters.ownerUserId || null;
    const items = (await this.readAll())
      .filter(item =>
        item.visibility === VISIBILITY.PUBLIC
        && item.status === 'active'
        && (!requestedOwnerUserId || item.ownerUserId === requestedOwnerUserId)
        && (!requestedCreatorProfileId
          || item.creatorProfileId === requestedCreatorProfileId
          || (!item.creatorProfileId && requestedOwnerUserId === item.ownerUserId))
      );
    const page = paginateRepositoryRecords(
      items,
      normalizedQuery,
      JSON.stringify({
        visibility: VISIBILITY.PUBLIC,
        creatorProfileId: requestedCreatorProfileId,
        ownerUserId: requestedOwnerUserId,
        sort: normalizedQuery.sort
      }),
      this.cursorSecret
    );
    return createPage(page.items.map(createPublicCharacterSummary), page);
  }

  async create(recordInput = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const displayName = String(recordInput.displayName || '').trim();
    if (!displayName) {
      throw new RepositoryContractError('character_name_required', 'Character display name is required.');
    }

    const now = new Date().toISOString();
    const record = applyRecordDefaults({
      displayName,
      description: recordInput.description || '',
      characterType: pickAllowedValue(
        recordInput.characterType,
        CHARACTER_TYPES,
        'full_character'
      ),
      creatorProfileId: recordInput.creatorProfileId || null,
      sourceCommunityPostId: recordInput.sourceCommunityPostId || null,
      sourceGenerationResultId: recordInput.sourceGenerationResultId
        || recordInput.sourceGenerationResultIds?.[0]
        || null,
      previewImageAssetId: recordInput.previewImageAssetId || null,
      faceReferencePolicy: pickAllowedValue(
        recordInput.faceReferencePolicy,
        REFERENCE_POLICIES,
        'private'
      ),
      outfitReferencePolicy: pickAllowedValue(
        recordInput.outfitReferencePolicy,
        REFERENCE_POLICIES,
        'none'
      ),
      sceneBuilderHandoffSnapshot: stripEmbeddedBase64(recordInput.sceneBuilderHandoffSnapshot || null),
      characterProfileId: recordInput.characterProfileId || null,
      characterProfileVersionId: recordInput.characterProfileVersionId || null,
      personalitySummary: String(recordInput.personalitySummary || '').trim().slice(0, 500),
      intendedUses: normalizeStringArray(recordInput.intendedUses),
      canonicalCastingExportAssetId: recordInput.canonicalCastingExportAssetId || null,
      canonicalCharacterSheetAssetId: recordInput.canonicalCharacterSheetAssetId || null,
      destinationCapabilities: destinationsForType(
        recordInput.destinationCapabilities,
        recordInput.characterType
      ),
      outfitBehavior: normalizeOutfitBehavior(recordInput.outfitBehavior, recordInput.characterType),
      sourceGenerationResultIds: Array.isArray(recordInput.sourceGenerationResultIds) ? recordInput.sourceGenerationResultIds : [],
      officialTags: normalizeStringArray(recordInput.officialTags),
      reusePolicy: pickAllowedValue(
        recordInput.reusePolicy,
        CHARACTER_REUSE_POLICIES,
        'use_as_character'
      )
    }, {
      idPrefix: 'char',
      ownerUserId: actor.userId,
      ownerUsername: actor.username,
      visibility: pickAllowedValue(
        recordInput.visibility,
        [VISIBILITY.PRIVATE, VISIBILITY.PUBLIC, VISIBILITY.MEMBERS_ONLY],
        VISIBILITY.PRIVATE
      ),
      status: 'active',
      now
    });

    return mutateJsonFile(this.characterFile, CHARACTER_FALLBACK, async items => {
      if (!Array.isArray(items)) throw new TypeError('Community characters data must be an array.');
      items.unshift(record);
      return structuredClone(record);
    });
  }

  async upsertProfileProjection(recordInput = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const characterProfileId = String(recordInput.characterProfileId || '').trim();
    if (!characterProfileId) {
      throw new RepositoryContractError('character_profile_id_required', 'Character Profile ID is required.');
    }
    const existing = await this.findByCharacterProfileId(characterProfileId);
    if (!existing) return this.create(recordInput, actor);
    return mutateJsonFile(this.characterFile, CHARACTER_FALLBACK, async items => {
      if (!Array.isArray(items)) throw new TypeError('Community characters data must be an array.');
      const index = items.findIndex(item => item.id === existing.id);
      if (index < 0 || items[index].ownerUserId !== actor.userId) {
        throw new RepositoryContractError('community_character_not_found', 'Community Character not found.', 404);
      }
      const now = new Date().toISOString();
      items[index] = {
        ...items[index],
        creatorProfileId: recordInput.creatorProfileId || existing.creatorProfileId || null,
        displayName: String(recordInput.displayName || existing.displayName).trim().slice(0, 80),
        description: String(recordInput.description ?? existing.description ?? '').trim().slice(0, 280),
        personalitySummary: String(recordInput.personalitySummary ?? existing.personalitySummary ?? '').trim().slice(0, 500),
        intendedUses: normalizeStringArray(recordInput.intendedUses ?? existing.intendedUses),
        characterType: pickAllowedValue(
          recordInput.characterType,
          CHARACTER_TYPES,
          existing.characterType || 'full_character'
        ),
        characterProfileVersionId: recordInput.characterProfileVersionId || existing.characterProfileVersionId || null,
        previewImageAssetId: recordInput.previewImageAssetId || existing.previewImageAssetId || null,
        canonicalCastingExportAssetId: Object.hasOwn(recordInput, 'canonicalCastingExportAssetId')
          ? recordInput.canonicalCastingExportAssetId || null
          : existing.canonicalCastingExportAssetId || null,
        canonicalCharacterSheetAssetId: Object.hasOwn(recordInput, 'canonicalCharacterSheetAssetId')
          ? recordInput.canonicalCharacterSheetAssetId || null
          : existing.canonicalCharacterSheetAssetId || null,
        destinationCapabilities: destinationsForType(
          recordInput.destinationCapabilities ?? existing.destinationCapabilities,
          recordInput.characterType || existing.characterType
        ),
        outfitBehavior: Object.hasOwn(recordInput, 'outfitBehavior')
          ? normalizeOutfitBehavior(recordInput.outfitBehavior, recordInput.characterType || existing.characterType)
          : normalizeOutfitBehavior(existing.outfitBehavior, existing.characterType),
        sourceGenerationResultId: recordInput.sourceGenerationResultId || existing.sourceGenerationResultId || null,
        sourceGenerationResultIds: Array.isArray(recordInput.sourceGenerationResultIds)
          ? recordInput.sourceGenerationResultIds
          : existing.sourceGenerationResultIds || [],
        reusePolicy: pickAllowedValue(recordInput.reusePolicy, CHARACTER_REUSE_POLICIES, existing.reusePolicy),
        visibility: pickAllowedValue(
          recordInput.visibility,
          [VISIBILITY.PRIVATE, VISIBILITY.PUBLIC, VISIBILITY.MEMBERS_ONLY],
          existing.visibility
        ),
        status: recordInput.status || existing.status,
        updatedAt: now
      };
      return structuredClone(items[index]);
    });
  }
}

function createPublicCharacterSummary(item) {
  return {
    id: item.id,
    ownerUsername: item.ownerUsername || null,
    creatorProfileId: item.creatorProfileId || null,
    characterProfileId: item.characterProfileId || null,
    characterProfileVersionId: item.characterProfileVersionId || null,
    displayName: item.displayName || '',
    description: item.description || '',
    personalitySummary: item.personalitySummary || '',
    intendedUses: normalizeStringArray(item.intendedUses),
    previewImageAssetId: item.previewImageAssetId || null,
    canonicalCastingExportAssetId: item.canonicalCastingExportAssetId || null,
    characterType: item.characterType || 'full_character',
    destinationCapabilities: destinationsForType(item.destinationCapabilities, item.characterType),
    outfitBehavior: normalizeOutfitBehavior(item.outfitBehavior, item.characterType),
    faceReferencePolicy: publicReferencePolicy(item.faceReferencePolicy),
    outfitReferencePolicy: publicReferencePolicy(item.outfitReferencePolicy),
    reusePolicy: item.reusePolicy || 'view_only',
    handoffAvailable: Boolean(
      (
        item.characterProfileId
        && (
          item.canonicalCastingExportAssetId
          || (
            item.characterType === 'styled_character'
            && item.canonicalCharacterSheetAssetId
          )
        )
        && item.reusePolicy === 'use_as_character'
      )
      || (
        hasHandoffSnapshot(item.sceneBuilderHandoffSnapshot)
        && ['use_as_character', 'remix_with_required_replacements'].includes(item.reusePolicy)
      )
    ),
    officialTags: normalizeStringArray(item.officialTags),
    visibility: VISIBILITY.PUBLIC,
    status: item.status,
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null
  };
}

function hasHandoffSnapshot(value) {
  return Boolean(value && typeof value === 'object' && Object.keys(value).length);
}

function publicReferencePolicy(value) {
  return value === 'public_reusable' ? 'public_reusable' : 'replace_required';
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .filter(item => typeof item === 'string')
      .map(item => item.trim())
      .filter(Boolean)
  )];
}

function normalizeDestinations(value) {
  const allowed = new Set(['fashion_blueprint', 'scene_builder']);
  return normalizeStringArray(value).filter(item => allowed.has(item));
}

function destinationsForType(value, characterType) {
  const destinations = normalizeDestinations(value);
  if (destinations.length) return destinations;
  return characterType === 'styled_character'
    ? ['scene_builder']
    : ['fashion_blueprint', 'scene_builder'];
}

function normalizeOutfitBehavior(value, characterType) {
  if (value === 'preserve' || value === 'replaceable') return value;
  return characterType === 'styled_character' ? 'preserve' : 'replaceable';
}

export const communityCharacterRepo = new CommunityCharacterRepository();
