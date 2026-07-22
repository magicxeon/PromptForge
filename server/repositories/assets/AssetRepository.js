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
import { paginateRepositoryRecords } from '../RepositoryCursor.js';
import { normalizeOwnedRepositoryRecord, stripEmbeddedBase64 } from '../recordNormalizer.js';
import { mockUserRepo } from '../identity/MockUserRepository.js';

const ASSET_FALLBACK = [];

export class AssetRepository {
  constructor({
    assetsFile = resolveDataFile('assets'),
    userRepository = mockUserRepo,
    cursorSecret = process.env.ASSET_CURSOR_SECRET || 'local-asset-cursor'
  } = {}) {
    this.assetsFile = assetsFile;
    this.userRepository = userRepository;
    this.cursorSecret = cursorSecret;
  }

  async readRaw() {
    const data = await readJsonFile(this.assetsFile, ASSET_FALLBACK);
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
    const item = items.find(asset => asset.id === id);
    return item ? structuredClone(item) : null;
  }

  async findByIdForOwner(id, ownerUserId) {
    const asset = await this.findById(id);
    return asset?.ownerUserId === ownerUserId ? asset : null;
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

  async create(recordInput = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const storageKey = String(recordInput.storageKey || recordInput.key || '').trim();
    if (!storageKey) {
      throw new RepositoryContractError('storage_key_required', 'Asset storage key is required.');
    }
    if (storageKey.startsWith('data:') || pathIsUnsafe(storageKey)) {
      throw new RepositoryContractError('invalid_storage_key', 'Asset storage key must be a relative storage path.');
    }

    const now = new Date().toISOString();
    const record = applyRecordDefaults({
      assetType: recordInput.assetType || 'generated_image',
      storageProvider: recordInput.storageProvider || 'local',
      storageKey,
      publicUrl: recordInput.publicUrl || null,
      thumbnailUrl: recordInput.thumbnailUrl || null,
      mimeType: recordInput.mimeType || 'image/png',
      sizeBytes: recordInput.sizeBytes || null,
      width: recordInput.width || null,
      height: recordInput.height || null,
      sourceJobId: recordInput.sourceJobId || null,
      metadata: stripEmbeddedBase64(recordInput.metadata || {})
    }, {
      idPrefix: 'ast',
      ownerUserId: actor.userId,
      ownerUsername: actor.username,
      visibility: pickAllowedValue(
        recordInput.visibility,
        [VISIBILITY.PRIVATE, VISIBILITY.PUBLIC, VISIBILITY.UNLISTED],
        VISIBILITY.PRIVATE
      ),
      status: 'active',
      now
    });

    return mutateJsonFile(this.assetsFile, ASSET_FALLBACK, async items => {
      if (!Array.isArray(items)) throw new TypeError('Assets data must be an array.');
      items.unshift(record);
      return structuredClone(record);
    });
  }
}

function pathIsUnsafe(storageKey) {
  const normalized = storageKey.replace(/\\/g, '/');
  return normalized.startsWith('/')
    || /^[a-z][a-z0-9+.-]*:/i.test(normalized)
    || normalized.split('/').includes('..');
}

export const assetRepo = new AssetRepository();
