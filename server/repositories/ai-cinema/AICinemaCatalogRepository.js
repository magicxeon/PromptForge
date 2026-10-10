import { resolveDataFile } from '../../config/paths.js';
import { mutateJsonFile, readJsonFile } from '../json/jsonFileStore.js';
import { assertActorContext } from '../repositoryContracts.js';
import { LearningError } from '../../domain/content-access/catalogContract.js';

const EMPTY = { schemaVersion: 1, items: [] };
const TYPES = ['film', 'series'];

export class AICinemaCatalogRepository {
  constructor({ catalogFile = resolveDataFile('aiCinemaCatalog') } = {}) {
    this.catalogFile = catalogFile;
  }

  async listForActor(actorContext) {
    const actor = assertActorContext(actorContext);
    const data = await readJsonFile(this.catalogFile, EMPTY);
    assertStore(data);
    return structuredClone(data.items.filter(item => item.ownerUserId === actor.userId && TYPES.includes(item.type)));
  }

  async findForActor(id, actorContext) {
    const records = await this.listForActor(actorContext);
    return records.find(item => item.id === id) || null;
  }

  async create(record, actorContext) {
    const actor = assertActorContext(actorContext);
    assertRecordScope(record, actor);
    return mutateJsonFile(this.catalogFile, EMPTY, data => {
      assertStore(data);
      if (data.items.some(item => item.id === record.id)) throw new Error('Duplicate catalog identity.');
      data.items.push(structuredClone(record));
      assertCapacity(data);
      return structuredClone(record);
    });
  }

  async mutateForActor(id, actorContext, operation) {
    const actor = assertActorContext(actorContext);
    return mutateJsonFile(this.catalogFile, EMPTY, async data => {
      assertStore(data);
      const index = data.items.findIndex(item => item.id === id && item.ownerUserId === actor.userId && TYPES.includes(item.type));
      const record = index < 0 ? null : structuredClone(data.items[index]);
      const result = await operation(record);
      if (index < 0) throw new Error('Cannot mutate missing catalog metadata.');
      if (result === null) data.items.splice(index, 1);
      else {
        assertRecordScope(result, actor);
        if (result.id !== id || result.type !== record.type) throw new Error('Catalog identity cannot change.');
        data.items[index] = structuredClone(result);
      }
      assertCapacity(data);
      return structuredClone(result);
    });
  }
}

function assertRecordScope(record, actor) {
  if (!TYPES.includes(record?.type) || record.ownerUserId !== actor.userId) throw new Error('Invalid catalog record scope.');
}

function assertStore(data) {
  if (data?.schemaVersion !== 1 || !Array.isArray(data.items)
    || data.items.some(item => !item || typeof item.id !== 'string' || !TYPES.includes(item.type)
      || typeof item.ownerUserId !== 'string' || !Number.isSafeInteger(item.revision))) {
    throw new Error('Invalid catalog store.');
  }
}

function assertCapacity(data) {
  // Local POC bound, not a replacement for a paginated database adapter.
  if (data.items.length > 1000 || Buffer.byteLength(JSON.stringify(data), 'utf8') > 20 * 1024 * 1024) {
    throw new LearningError('learning_catalog_full', 'Catalog metadata capacity reached.', 409);
  }
}
