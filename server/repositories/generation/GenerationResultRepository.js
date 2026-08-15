import { createPage, assertOwnerScope } from '../repositoryContracts.js';
import { normalizeGenerationHistoryRecord } from '../recordNormalizer.js';
import { historyRepository } from './HistoryRepository.js';
import { mockUserRepo } from '../identity/MockUserRepository.js';

export class GenerationResultRepository {
  constructor({
    historyStore = historyRepository,
    userRepository = mockUserRepo
  } = {}) {
    this.historyStore = historyStore;
    this.userRepository = userRepository;
  }

  async findById(id) {
    const historyItem = await this.historyStore.getById(id);
    return historyItem ? normalizeGenerationHistoryRecord(historyItem, this.userRepository) : null;
  }

  async findByIdForOwner(id, ownerUserId) {
    const item = await this.findById(id);
    return item?.ownerUserId === ownerUserId ? item : null;
  }

  async findByIds(ids = []) {
    const requestedIds = new Set((Array.isArray(ids) ? ids : []).filter(Boolean));
    if (!requestedIds.size) return [];
    const historyItems = await this.historyStore.readAll();
    return Promise.all(
      historyItems
        .filter(item => requestedIds.has(item.id))
        .map(item => normalizeGenerationHistoryRecord(item, this.userRepository))
    );
  }

  async findByCharacterProfileIds(profileIds = []) {
    const requestedIds = new Set((Array.isArray(profileIds) ? profileIds : []).filter(Boolean));
    if (!requestedIds.size) return [];
    const historyItems = await this.historyStore.readAll();
    const items = await Promise.all(
      historyItems
        .filter(item => requestedIds.has(item?.characterProfileContext?.characterProfileId))
        .map(item => normalizeGenerationHistoryRecord(item, this.userRepository))
    );
    return items.sort((left, right) => generationTimestamp(right) - generationTimestamp(left));
  }

  async findByOwner(ownerUserId, query = {}) {
    const owner = await this.userRepository.findById(ownerUserId);
    if (!owner) return createPage([]);
    const page = await this.historyStore.listPage({
      cursor: query.cursor || null,
      limit: query.limit,
      collectionId: query.collectionId || 'all',
      allowedJobIds: query.allowedJobIds || null,
      username: owner.username
    });
    const items = await Promise.all(page.items.map(item => normalizeGenerationHistoryRecord(item, this.userRepository)));
    return createPage(items, { nextCursor: page.nextCursor, hasMore: page.hasMore });
  }

  async assertOwner(id, ownerUserId) {
    const result = await this.findById(id);
    return assertOwnerScope(result, ownerUserId);
  }
}

function generationTimestamp(item = {}) {
  const value = Number(item.timestamp);
  if (Number.isFinite(value)) return value;
  const parsed = Date.parse(item.createdAt || item.updatedAt || '');
  return Number.isFinite(parsed) ? parsed : 0;
}

export const generationResultRepo = new GenerationResultRepository();
