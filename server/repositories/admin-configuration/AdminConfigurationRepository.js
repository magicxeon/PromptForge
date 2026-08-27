import { resolveDataFile } from '../../config/paths.js';
import { mutateJsonFile, readJsonFile } from '../json/jsonFileStore.js';
import { createPrefixedId } from '../schemaVersioning.js';

const FALLBACK = { schemaVersion: 1, activeRevisionIds: {}, revisions: [] };

export class AdminConfigurationRepository {
  constructor({ revisionsFile = resolveDataFile('adminConfigurationRevisions') } = {}) {
    this.revisionsFile = revisionsFile;
  }
  async list() { return structuredClone((await this.#read()).revisions); }
  async findById(id) { return (await this.list()).find(item => item.id === id) || null; }
  async getState() { return this.#read(); }
  createDraft(input) {
    return mutateJsonFile(this.revisionsFile, FALLBACK, data => {
      assertStore(data);
      const now = new Date().toISOString();
      const record = {
        id: createPrefixedId('cfgrev'), schemaVersion: 1, version: 1, scope: input.scope,
        status: 'draft', values: structuredClone(input.values), validation: input.validation,
        createdByUserId: input.createdByUserId, createdAt: now, updatedAt: now,
        publishedAt: null, supersedesRevisionId: data.activeRevisionIds[input.scope] || null
      };
      data.revisions.unshift(record);
      return structuredClone(record);
    });
  }
  async #read() { const data = await readJsonFile(this.revisionsFile, FALLBACK); assertStore(data); return data; }
}
function assertStore(data) {
  if (!data || !Array.isArray(data.revisions) || !data.activeRevisionIds || typeof data.activeRevisionIds !== 'object') throw new TypeError('Admin configuration data is invalid.');
}
export const adminConfigurationRepository = new AdminConfigurationRepository();
