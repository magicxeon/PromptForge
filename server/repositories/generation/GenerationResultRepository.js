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

export const generationResultRepo = new GenerationResultRepository();

