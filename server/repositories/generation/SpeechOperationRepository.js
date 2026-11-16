import { resolveDataFile } from '../../config/paths.js';
import { readJsonFile, mutateJsonFile } from '../json/jsonFileStore.js';
export class SpeechOperationRepository {
  constructor({ filename = null } = {}) { this.filename = filename; }
  file() { return this.filename || resolveDataFile('speechOperations'); }
  read() { return readJsonFile(this.file(), []); }
  mutate(operation) { return mutateJsonFile(this.file(), [], operation); }
  async get(id, ownerUserId) { return (await this.read()).find(item => item.id === id && item.ownerUserId === ownerUserId) || null; }
  update(id, ownerUserId, patch) { return this.mutate(records => {
    const record = records.find(item => item.id === id && item.ownerUserId === ownerUserId);
    if (!record) throw Object.assign(new Error('Speech unavailable.'), { code: 'speech_not_found', statusCode: 404 });
    Object.assign(record, patch, { updatedAt: new Date().toISOString() }); return structuredClone(record);
  }); }
}
