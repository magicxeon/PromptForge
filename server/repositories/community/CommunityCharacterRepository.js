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
      .filter(item => item.visibility === VISIBILITY.PUBLIC && item.status === 'active');
    const page = paginateRepositoryRecords(
      items,
      normalizedQuery,
      JSON.stringify({ visibility: VISIBILITY.PUBLIC, sort: normalizedQuery.sort }),
      this.cursorSecret
    );
    return createPage(page.items, page);
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
      characterType: recordInput.characterType || 'full_character_sheet',
      previewImageAssetId: recordInput.previewImageAssetId || null,
      faceReferencePolicy: recordInput.faceReferencePolicy || 'private',
      outfitReferencePolicy: recordInput.outfitReferencePolicy || 'none',
      sceneBuilderHandoffSnapshot: stripEmbeddedBase64(recordInput.sceneBuilderHandoffSnapshot || {}),
      sourceGenerationResultIds: Array.isArray(recordInput.sourceGenerationResultIds) ? recordInput.sourceGenerationResultIds : [],
      reusePolicy: recordInput.reusePolicy || 'use_as_character'
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

export const communityCharacterRepo = new CommunityCharacterRepository();
