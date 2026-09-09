import { DATA_FILES } from '../../config/paths.js';
import { mutateJsonFile, readJsonFile } from '../json/jsonFileStore.js';

const empty = { schemaVersion: 1, records: [] };
export class PromptEnhancementRepository {
  constructor(filePath = DATA_FILES.promptEnhancements) { this.filePath = filePath; }
  async get(id, userId) {
    return (await readJsonFile(this.filePath, empty)).records.find(item => item.id === id && item.userId === userId) || null;
  }
  async listUnsettled() {
    return (await readJsonFile(this.filePath, empty)).records.filter(item => !['quoted', 'succeeded', 'failed'].includes(item.status));
  }
  mutate(fn) {
    return mutateJsonFile(this.filePath, empty, data => {
      const now = Date.now();
      data.records = data.records.filter(item => item.status !== 'quoted' || Date.parse(item.quote.expiresAt) > now);
      for (const item of data.records) {
        if (Date.parse(item.artifactExpiresAt) < now && ['succeeded', 'failed'].includes(item.status)) {
          delete item.prompt; delete item.snapshot; delete item.originalPrompt;
        }
      }
      return fn(data.records);
    });
  }
  insert(record) {
    return this.mutate(records => {
      if (records.length >= 5000) throw Object.assign(new Error('Enhancement storage capacity reached.'), { code: 'enhancement_capacity', statusCode: 503 });
      records.push(structuredClone(record)); return record;
    });
  }
  claim(id, userId, fingerprint) {
    return this.mutate(records => {
      const item = records.find(record => record.id === id && record.userId === userId);
      if (!item || item.fingerprint !== fingerprint) throw Object.assign(new Error('Enhancement quote changed.'), { code: 'enhancement_stale', statusCode: 409 });
      if (item.status !== 'quoted') return { record: structuredClone(item), claimed: false };
      if (Date.parse(item.quote.expiresAt) <= Date.now()) throw Object.assign(new Error('Enhancement quote expired.'), { code: 'enhancement_stale', statusCode: 409 });
      item.status = 'accepted'; return { record: structuredClone(item), claimed: true };
    });
  }
  update(id, userId, patch) {
    return this.mutate(records => {
      const item = records.find(record => record.id === id && record.userId === userId);
      if (!item) throw new Error('Enhancement record not found.');
      Object.assign(item, structuredClone(patch), { updatedAt: new Date().toISOString() });
      return structuredClone(item);
    });
  }
}
export const promptEnhancementRepository = new PromptEnhancementRepository();
