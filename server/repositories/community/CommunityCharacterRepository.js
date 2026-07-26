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
  'face_and_outfit'
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
    const items = (await this.readAll())
      .filter(item =>
        item.visibility === VISIBILITY.PUBLIC
        && item.status === 'active'
        && (!normalizedQuery.filters.creatorProfileId
          || item.creatorProfileId === normalizedQuery.filters.creatorProfileId)
      );
    const page = paginateRepositoryRecords(
      items,
      normalizedQuery,
      JSON.stringify({
        visibility: VISIBILITY.PUBLIC,
        creatorProfileId: normalizedQuery.filters.creatorProfileId || null,
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
}

function createPublicCharacterSummary(item) {
  return {
    id: item.id,
    ownerUsername: item.ownerUsername || null,
    creatorProfileId: item.creatorProfileId || null,
    displayName: item.displayName || '',
    description: item.description || '',
    characterType: item.characterType || 'full_character',
    faceReferencePolicy: publicReferencePolicy(item.faceReferencePolicy),
    outfitReferencePolicy: publicReferencePolicy(item.outfitReferencePolicy),
    reusePolicy: item.reusePolicy || 'view_only',
    handoffAvailable: Boolean(
      hasHandoffSnapshot(item.sceneBuilderHandoffSnapshot)
      && ['use_as_character', 'remix_with_required_replacements'].includes(item.reusePolicy)
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

export const communityCharacterRepo = new CommunityCharacterRepository();
