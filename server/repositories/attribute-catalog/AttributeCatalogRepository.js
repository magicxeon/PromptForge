import { resolveDataFile } from '../../config/paths.js';
import { mutateJsonFile, readJsonFile } from '../json/jsonFileStore.js';
import { RepositoryContractError } from '../repositoryContracts.js';
import { createPrefixedId } from '../schemaVersioning.js';

const EMPTY_DRAFTS = [];

export class AttributeCatalogRepository {
  constructor({ draftsFile = resolveDataFile('attributeCatalogDrafts') } = {}) {
    this.draftsFile = draftsFile;
  }

  async list() {
    const records = await readJsonFile(this.draftsFile, EMPTY_DRAFTS);
    return Array.isArray(records) ? structuredClone(records) : [];
  }

  async findById(draftId) {
    const record = (await this.list()).find(item => item.id === draftId);
    if (!record) throw notFound('attribute_catalog_draft_not_found', 'Attribute Catalog draft not found.');
    return record;
  }

  async create(input, actor) {
    const now = new Date().toISOString();
    const record = {
      ...structuredClone(input),
      id: createPrefixedId('attrdraft'),
      schemaVersion: 1,
      revision: 1,
      status: 'draft',
      ownerUserId: actor.userId,
      ownerUsername: actor.username,
      createdAt: now,
      updatedAt: now
    };
    return mutateJsonFile(this.draftsFile, EMPTY_DRAFTS, drafts => {
      assertArray(drafts, 'Attribute Catalog drafts');
      drafts.push(record);
      return structuredClone(record);
    });
  }

  async update(draftId, expectedRevision, updater) {
    return mutateJsonFile(this.draftsFile, EMPTY_DRAFTS, async drafts => {
      assertArray(drafts, 'Attribute Catalog drafts');
      const index = drafts.findIndex(item => item.id === draftId);
      if (index < 0) throw notFound('attribute_catalog_draft_not_found', 'Attribute Catalog draft not found.');
      const current = drafts[index];
      if (current.revision !== expectedRevision) {
        throw new RepositoryContractError(
          'attribute_catalog_revision_conflict',
          'The Attribute Catalog draft changed. Refresh before saving again.',
          409
        );
      }
      if (current.status === 'published') {
        throw new RepositoryContractError(
          'attribute_catalog_draft_immutable',
          'Published Attribute Catalog drafts are immutable.',
          409
        );
      }
      const next = await updater(structuredClone(current));
      drafts[index] = {
        ...next,
        id: current.id,
        schemaVersion: current.schemaVersion,
        revision: current.revision + 1,
        ownerUserId: current.ownerUserId,
        ownerUsername: current.ownerUsername,
        createdAt: current.createdAt,
        updatedAt: new Date().toISOString()
      };
      return structuredClone(drafts[index]);
    });
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`${label} data must be an array.`);
}

function notFound(code, message) {
  return new RepositoryContractError(code, message, 404);
}

export const attributeCatalogRepository = new AttributeCatalogRepository();
