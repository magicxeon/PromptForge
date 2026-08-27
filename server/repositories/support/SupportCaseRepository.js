import { resolveDataFile } from '../../config/paths.js';
import { mutateJsonFile, readJsonFile } from '../json/jsonFileStore.js';
import { createPage, normalizeListQuery, RepositoryContractError } from '../repositoryContracts.js';
import { paginateRepositoryRecords } from '../RepositoryCursor.js';
import { createPrefixedId } from '../schemaVersioning.js';

const FALLBACK = { schemaVersion: 1, cases: [] };

export class SupportCaseRepository {
  constructor({ casesFile = resolveDataFile('supportCases'), cursorSecret = process.env.SUPPORT_CASE_CURSOR_SECRET || 'local-support-case-cursor' } = {}) {
    this.casesFile = casesFile;
    this.cursorSecret = cursorSecret;
  }

  async list(query = {}) {
    const normalized = normalizeListQuery(query, { defaultLimit: 25, maxLimit: 50 });
    const search = String(query.search || '').trim().toLowerCase();
    const status = String(query.status || '').trim();
    const priority = String(query.priority || '').trim();
    const data = await this.#read();
    const records = data.cases.filter(item =>
      (!status || item.status === status)
      && (!priority || item.priority === priority)
      && (!search || [item.id, item.title, item.customerUserId, item.assigneeUserId, ...(item.links || []).map(link => link.targetId)]
        .filter(Boolean).some(value => String(value).toLowerCase().includes(search)))
    );
    const page = paginateRepositoryRecords(records, normalized, JSON.stringify({ search, status, priority, sort: normalized.sort }), this.cursorSecret);
    return createPage(page.items, page);
  }

  async findById(caseId) {
    const record = (await this.#read()).cases.find(item => item.id === caseId);
    return record ? structuredClone(record) : null;
  }

  async create(input) {
    return mutateJsonFile(this.casesFile, FALLBACK, data => {
      assertStore(data);
      if (input.idempotencyKey) {
        const replay = data.cases.find(item => item.createdByUserId === input.createdByUserId && item.idempotencyKey === input.idempotencyKey);
        if (replay) return structuredClone(replay);
      }
      const now = new Date().toISOString();
      const record = {
        id: createPrefixedId('case'), schemaVersion: 1, version: 1,
        title: input.title, description: input.description || '', priority: input.priority || 'normal',
        status: 'open', customerUserId: input.customerUserId || null, assigneeUserId: input.assigneeUserId || null,
        links: input.links || [], notes: [], idempotencyKey: input.idempotencyKey || null,
        createdByUserId: input.createdByUserId, createdAt: now, updatedAt: now, resolvedAt: null, closedAt: null
      };
      data.cases.unshift(record);
      return structuredClone(record);
    });
  }

  async update(caseId, expectedVersion, operation) {
    return mutateJsonFile(this.casesFile, FALLBACK, async data => {
      assertStore(data);
      const index = data.cases.findIndex(item => item.id === caseId);
      if (index < 0) throw new RepositoryContractError('support_case_not_found', 'Support case not found.', 404);
      const current = data.cases[index];
      if (Number(expectedVersion) !== current.version) {
        throw new RepositoryContractError('support_case_version_conflict', 'Support case changed. Refresh before retrying.', 409);
      }
      const draft = structuredClone(current);
      await operation(draft);
      draft.version += 1;
      draft.updatedAt = new Date().toISOString();
      data.cases[index] = draft;
      return structuredClone(draft);
    });
  }

  async #read() {
    const data = await readJsonFile(this.casesFile, FALLBACK);
    assertStore(data);
    return data;
  }
}

function assertStore(data) {
  if (!data || !Array.isArray(data.cases)) throw new TypeError('Support case data must contain a cases array.');
}

export const supportCaseRepository = new SupportCaseRepository();
