import { resolveDataFile } from '../../config/paths.js';
import { readJsonFile, mutateJsonFile } from '../json/jsonFileStore.js';
import { assertActorContext, createPage, normalizeListQuery, pickAllowedValue } from '../repositoryContracts.js';
import { normalizeOwnedRepositoryRecord } from '../recordNormalizer.js';
import { applyRecordDefaults } from '../schemaVersioning.js';
import { paginateRepositoryRecords } from '../RepositoryCursor.js';
import { mockUserRepo } from '../identity/MockUserRepository.js';

const COMPARISONS_FALLBACK = { sets: [] };

export class ComparisonRepositoryAdapter {
  constructor({
    comparisonsFile = resolveDataFile('comparisons'),
    userRepository = mockUserRepo,
    cursorSecret = process.env.COMPARISON_ADAPTER_CURSOR_SECRET || 'local-comparison-adapter-cursor'
  } = {}) {
    this.comparisonsFile = comparisonsFile;
    this.userRepository = userRepository;
    this.cursorSecret = cursorSecret;
  }

  async readRaw() {
    const data = await readJsonFile(this.comparisonsFile, COMPARISONS_FALLBACK);
    if (!data || typeof data !== 'object' || !Array.isArray(data.sets)) {
      throw new TypeError('Comparisons data must contain a sets array.');
    }
    return Array.isArray(data.sets) ? data.sets : [];
  }

  async findById(id) {
    if (!id) return null;
    const sets = await this.readRaw();
    const found = sets.find(set => set.id === id);
    if (!found) return null;

    return normalizeOwnedRepositoryRecord(found, this.userRepository, {
      visibility: 'private',
      status: 'completed'
    });
  }

  async findByOwner(ownerUserId, query = {}) {
    const normalizedQuery = normalizeListQuery(query);
    const sets = await this.readRaw();
    const normalizedSets = await Promise.all(
      sets.map(set => normalizeOwnedRepositoryRecord(set, this.userRepository, {
        visibility: 'private',
        status: 'completed'
      }))
    );

    const userSets = normalizedSets.filter(set => set.ownerUserId === ownerUserId && set.status !== 'deleted');
    const page = paginateRepositoryRecords(
      userSets,
      normalizedQuery,
      JSON.stringify({ ownerUserId, sort: normalizedQuery.sort }),
      this.cursorSecret
    );

    return createPage(page.items, page);
  }

  async create(recordInput = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const now = new Date().toISOString();

    const record = applyRecordDefaults({
      sourcePrompt: recordInput.sourcePrompt || '',
      mode: recordInput.mode || 'normal',
      selectionsSnapshot: recordInput.selectionsSnapshot || {},
      winnerGenerationResultId: recordInput.winnerGenerationResultId || null,
      runs: Array.isArray(recordInput.runs) ? recordInput.runs : []
    }, {
      idPrefix: 'cmp',
      ownerUserId: actor.userId,
      ownerUsername: actor.username,
      visibility: 'private',
      status: pickAllowedValue(recordInput.status, ['pending', 'running', 'completed', 'failed'], 'completed'),
      now
    });

    return mutateJsonFile(this.comparisonsFile, COMPARISONS_FALLBACK, async data => {
      if (!data || typeof data !== 'object' || !Array.isArray(data.sets)) {
        throw new TypeError('Comparisons data must contain a sets array.');
      }
      data.sets.unshift(record);
      return structuredClone(record);
    });
  }
}

export const comparisonRepositoryAdapter = new ComparisonRepositoryAdapter();
