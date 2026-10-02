import { resolveDataFile } from '../../config/paths.js';
import { mutateJsonFile, readJsonFile } from '../json/jsonFileStore.js';
import { createPrefixedId } from '../schemaVersioning.js';
import { RepositoryContractError } from '../repositoryContracts.js';

const FALLBACK = { schemaVersion: 1, activeRevisionIds: {}, revisions: [] };

export class AdminConfigurationRepository {
  constructor({ revisionsFile = resolveDataFile('adminConfigurationRevisions') } = {}) {
    this.revisionsFile = revisionsFile;
  }
  async list() { return structuredClone((await this.#read()).revisions); }
  async findById(id) { return (await this.list()).find(item => item.id === id) || null; }
  async getState() { return this.#read(); }
  async getActivePricing() {
    const state = await this.#read();
    const id = state.activeRevisionIds.pricing;
    if (!id) return null;
    const active = state.revisions.find(item => item.id === id && item.scope === 'pricing' && item.status === 'active');
    if (!active) throw new RepositoryContractError('admin_pricing_snapshot_invalid', 'Active pricing snapshot is unavailable.', 503);
    return structuredClone(active);
  }
  createDraft(input) {
    return mutateJsonFile(this.revisionsFile, FALLBACK, data => {
      assertStore(data);
      if (input.commandId) {
        const existing = data.revisions.find(item => item.values?.commandId === input.commandId);
        if (existing) {
          if (existing.scope !== input.scope || existing.createdByUserId !== input.createdByUserId
            || JSON.stringify(existing.values) !== JSON.stringify(input.values)) {
            throw new RepositoryContractError('configuration_command_conflict', 'Command was already used with different values.', 409);
          }
          return { ...structuredClone(existing), replayed: true };
        }
      }
      if (input.scope === 'pricing' && input.values.baseActiveRevisionId !== (data.activeRevisionIds.pricing || null)) {
        throw new RepositoryContractError('admin_pricing_revision_conflict', 'Active pricing changed; refresh before saving.', 409);
      }
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
  publishPricing({ revisionId, expectedVersion, baseActiveRevisionId, commandId, reason, actorUserId }) {
    return mutateJsonFile(this.revisionsFile, FALLBACK, data => {
      assertStore(data);
      const replay = data.revisions.find(item => item.activation?.commandId === commandId);
      if (replay) {
        if (replay.id !== revisionId || replay.activation.actorUserId !== actorUserId
          || replay.activation.reason !== reason || replay.activation.expectedVersion !== expectedVersion
          || replay.activation.baseActiveRevisionId !== baseActiveRevisionId) {
          throw new RepositoryContractError('configuration_command_conflict', 'Publication command conflicts with its original input.', 409);
        }
        return { ...structuredClone(replay), replayed: true };
      }
      const revision = data.revisions.find(item => item.id === revisionId && item.scope === 'pricing');
      if (!revision) throw new RepositoryContractError('admin_configuration_not_found', 'Pricing revision not found.', 404);
      if (revision.status !== 'draft' || revision.version !== expectedVersion
        || baseActiveRevisionId !== (data.activeRevisionIds.pricing || null)
        || revision.supersedesRevisionId !== baseActiveRevisionId) {
        throw new RepositoryContractError('admin_pricing_revision_conflict', 'Pricing revision or active baseline changed.', 409);
      }
      const now = new Date().toISOString();
      const previous = data.revisions.find(item => item.id === data.activeRevisionIds.pricing);
      if (previous) previous.status = 'superseded';
      revision.status = 'active';
      revision.version += 1;
      revision.publishedAt = now;
      revision.updatedAt = now;
      // Publication and its audit evidence commit in the same owning JSON mutation.
      revision.activation = { commandId, actorUserId, reason, expectedVersion, baseActiveRevisionId, publishedAt: now,
        profitMarkupPercentByMedia: structuredClone(revision.values.profitMarkupPercentByMedia) };
      data.activeRevisionIds.pricing = revision.id;
      return structuredClone(revision);
    });
  }
  async #read() { const data = await readJsonFile(this.revisionsFile, FALLBACK); assertStore(data); return data; }
}
function assertStore(data) {
  if (!data || !Array.isArray(data.revisions) || !data.activeRevisionIds || typeof data.activeRevisionIds !== 'object') throw new TypeError('Admin configuration data is invalid.');
}
export const adminConfigurationRepository = new AdminConfigurationRepository();
