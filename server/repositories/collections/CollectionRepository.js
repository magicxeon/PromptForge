import { resolveDataFile } from '../../config/paths.js';
import { readJsonFile, mutateJsonFile } from '../json/jsonFileStore.js';
import {
  assertActorContext,
  createPage,
  normalizeListQuery,
  RepositoryContractError,
  VISIBILITY
} from '../repositoryContracts.js';
import { normalizeCollectionRecord, stripEmbeddedBase64 } from '../recordNormalizer.js';
import { applyRecordDefaults } from '../schemaVersioning.js';
import { paginateRepositoryRecords } from '../RepositoryCursor.js';
import { mockUserRepo } from '../identity/MockUserRepository.js';

const COLLECTION_FALLBACK = {
  version: 1,
  defaultCollectionId: null,
  defaultCollectionIdsByOwner: {},
  collections: []
};

export class CollectionRepository {
  constructor({
    collectionsFile = resolveDataFile('collections'),
    userRepository = mockUserRepo,
    cursorSecret = process.env.COLLECTION_CURSOR_SECRET || 'local-collection-cursor'
  } = {}) {
    this.collectionsFile = collectionsFile;
    this.userRepository = userRepository;
    this.cursorSecret = cursorSecret;
  }

  async readRaw() {
    const data = await readJsonFile(this.collectionsFile, COLLECTION_FALLBACK);
    if (!data || typeof data !== 'object' || !Array.isArray(data.collections)) {
      throw new TypeError('Collections data must contain a collections array.');
    }
    return {
      version: Number(data.version) || 1,
      defaultCollectionId: data.defaultCollectionId || null,
      defaultCollectionIdsByOwner: data.defaultCollectionIdsByOwner && typeof data.defaultCollectionIdsByOwner === 'object'
        ? data.defaultCollectionIdsByOwner
        : {},
      collections: Array.isArray(data.collections) ? data.collections : []
    };
  }

  async readAll() {
    const data = await this.readRaw();
    const normalized = await Promise.all(
      data.collections.map(col => normalizeCollectionRecord(col, this.userRepository))
    );
    return {
      ...data,
      collections: normalized
    };
  }

  async findById(id) {
    if (!id) return null;
    const { collections } = await this.readAll();
    return collections.find(item => item.id === id) || null;
  }

  async findByIdForOwner(id, ownerUserId) {
    const collection = await this.findById(id);
    return collection?.ownerUserId === ownerUserId ? collection : null;
  }

  async findByOwner(ownerUserId, query = {}) {
    const normalizedQuery = normalizeListQuery(query);
    const { collections, defaultCollectionId, defaultCollectionIdsByOwner } = await this.readAll();
    const ownerDefaultId = defaultCollectionIdsByOwner[ownerUserId]
      || collections.find(col => col.id === defaultCollectionId && col.ownerUserId === ownerUserId)?.id
      || null;
    const userCollections = collections
      .filter(col => col.ownerUserId === ownerUserId && col.status !== 'deleted')
      .map(col => ({
        ...col,
        isDefault: col.id === ownerDefaultId
      }));
    const page = paginateRepositoryRecords(
      userCollections,
      normalizedQuery,
      JSON.stringify({ ownerUserId, sort: normalizedQuery.sort }),
      this.cursorSecret
    );

    return createPage(page.items, page);
  }

  async create(recordInput = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const name = String(recordInput.name || '').trim();
    if (!name) {
      throw new RepositoryContractError('collection_name_required', 'A collection name is required.');
    }

    const now = new Date().toISOString();
    const record = applyRecordDefaults({
      name,
      description: typeof recordInput.description === 'string' ? recordInput.description.trim() : '',
      story: typeof recordInput.story === 'string' ? recordInput.story.trim() : '',
      coverGenerationResultId: recordInput.coverGenerationResultId || recordInput.coverJobId || null,
      jobIds: Array.isArray(recordInput.jobIds) ? [...new Set(recordInput.jobIds)] : [],
      items: Array.isArray(recordInput.items) ? stripEmbeddedBase64(recordInput.items) : [],
      metadata: recordInput.metadata && typeof recordInput.metadata === 'object'
        ? stripEmbeddedBase64(recordInput.metadata)
        : {}
    }, {
      idPrefix: 'col',
      ownerUserId: actor.userId,
      ownerUsername: actor.username,
      visibility: VISIBILITY.PRIVATE,
      status: 'active',
      now
    });

    return mutateJsonFile(this.collectionsFile, COLLECTION_FALLBACK, async data => {
      if (!data || typeof data !== 'object' || !Array.isArray(data.collections)) {
        throw new TypeError('Collections data must contain a collections array.');
      }
      if (!data.defaultCollectionIdsByOwner || typeof data.defaultCollectionIdsByOwner !== 'object') {
        data.defaultCollectionIdsByOwner = {};
      }
      data.collections.unshift(record);
      if (recordInput.setAsDefault === true) {
        data.defaultCollectionIdsByOwner[actor.userId] = record.id;
        if (actor.userId === 'usr_demo') data.defaultCollectionId = record.id;
      }
      return normalizeCollectionRecord(record, this.userRepository);
    });
  }

  async updateById(id, patch = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const now = new Date().toISOString();

    return mutateJsonFile(this.collectionsFile, COLLECTION_FALLBACK, async data => {
      if (!data || typeof data !== 'object' || !Array.isArray(data.collections)) {
        throw new TypeError('Collections data must contain a collections array.');
      }
      const index = data.collections.findIndex(col => col.id === id);
      if (index === -1) {
        throw new RepositoryContractError('collection_not_found', 'Collection not found.', 404);
      }

      const existing = data.collections[index];
      const normalizedExisting = await normalizeCollectionRecord(existing, this.userRepository);
      if (normalizedExisting.ownerUserId !== actor.userId) {
        throw new RepositoryContractError('collection_not_found', 'Collection not found.', 404);
      }

      const updated = applyCollectionPatch(existing, patch, now);
      data.collections[index] = updated;
      if (patch.setAsDefault === true) {
        if (!data.defaultCollectionIdsByOwner || typeof data.defaultCollectionIdsByOwner !== 'object') {
          data.defaultCollectionIdsByOwner = {};
        }
        data.defaultCollectionIdsByOwner[actor.userId] = id;
        if (actor.userId === 'usr_demo') data.defaultCollectionId = id;
      }
      return normalizeCollectionRecord(updated, this.userRepository);
    });
  }

  async softDelete(id, actorContext) {
    const actor = assertActorContext(actorContext);
    const now = new Date().toISOString();

    return mutateJsonFile(this.collectionsFile, COLLECTION_FALLBACK, async data => {
      if (!data || typeof data !== 'object' || !Array.isArray(data.collections)) {
        throw new TypeError('Collections data must contain a collections array.');
      }
      const index = data.collections.findIndex(col => col.id === id);
      if (index === -1) {
        throw new RepositoryContractError('collection_not_found', 'Collection not found.', 404);
      }

      const existing = data.collections[index];
      const normalizedExisting = await normalizeCollectionRecord(existing, this.userRepository);
      if (normalizedExisting.ownerUserId !== actor.userId) {
        throw new RepositoryContractError('collection_not_found', 'Collection not found.', 404);
      }

      existing.status = 'deleted';
      existing.deletedAt = now;
      existing.updatedAt = now;
      if (data.defaultCollectionIdsByOwner?.[actor.userId] === id) {
        delete data.defaultCollectionIdsByOwner[actor.userId];
      }
      if (actor.userId === 'usr_demo' && data.defaultCollectionId === id) data.defaultCollectionId = null;
      return { success: true };
    });
  }
}

function applyCollectionPatch(existing, patch, now) {
  const updated = { ...existing };
  if (Object.hasOwn(patch, 'name')) {
    const name = String(patch.name || '').trim();
    if (!name) throw new RepositoryContractError('collection_name_required', 'A collection name is required.');
    updated.name = name;
  }
  if (Object.hasOwn(patch, 'description')) updated.description = String(patch.description || '').trim();
  if (Object.hasOwn(patch, 'story')) updated.story = String(patch.story || '').trim();
  if (Object.hasOwn(patch, 'coverGenerationResultId')) {
    updated.coverGenerationResultId = patch.coverGenerationResultId || null;
    updated.coverJobId = patch.coverGenerationResultId || null;
  }
  if (Array.isArray(patch.jobIds)) updated.jobIds = [...new Set(patch.jobIds.filter(Boolean))];
  if (Array.isArray(patch.items)) updated.items = stripEmbeddedBase64(patch.items);
  if (patch.metadata && typeof patch.metadata === 'object') updated.metadata = stripEmbeddedBase64(patch.metadata);
  updated.updatedAt = now;
  return updated;
}

export const collectionRepo = new CollectionRepository();
