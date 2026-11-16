import { randomUUID } from 'node:crypto';
import { resolveDataFile } from '../../config/paths.js';
import { readJsonFile, mutateJsonFile } from '../json/jsonFileStore.js';

export const voiceError = (code, statusCode = 400) => Object.assign(new Error(code), { code, statusCode });
const keys = { documents: 'voiceStudioDocuments', characters: 'voiceStudioCharacters', takes: 'voiceStudioTakes', customVoices: 'voiceStudioCustomVoices' };

// All mutable Voice Studio metadata passes through this actor-scoped repository.
export class VoiceStudioRepository {
  constructor({ files } = {}) { this.files = files || Object.fromEntries(Object.entries(keys).map(([k,v]) => [k, resolveDataFile(v)])); }
  async list(kind, owner) { return (await readJsonFile(this.files[kind], [])).filter(r => r.ownerUserId === owner && !r.deletedAt); }
  async get(kind, id, owner, { includeDeleted = false } = {}) {
    const values = includeDeleted ? (await readJsonFile(this.files[kind], [])).filter(r => r.ownerUserId === owner) : await this.list(kind, owner);
    const value = values.find(r => r.id === id);
    if (!value) throw voiceError('voice_record_not_found', 404);
    return structuredClone(value);
  }
  async insert(kind, owner, input) {
    return mutateJsonFile(this.files[kind], [], records => {
      const existing = records.find(r => r.ownerUserId === owner && r.id === input.id);
      if (existing) return structuredClone(existing);
      const now = new Date().toISOString();
      const record = { ...input, id: input.id || randomUUID(), schemaVersion: input.schemaVersion || 1, ownerUserId: owner, revision: 1, createdAt: now, updatedAt: now };
      records.push(record); return structuredClone(record);
    });
  }
  async update(kind, id, owner, revision, command) {
    return mutateJsonFile(this.files[kind], [], async records => {
      const record = records.find(r => r.id === id && r.ownerUserId === owner && !r.deletedAt);
      if (!record) throw voiceError('voice_record_not_found', 404);
      if (revision !== undefined && revision !== record.revision) throw voiceError('voice_revision_conflict', 409);
      await command(record);
      record.revision++; record.updatedAt = new Date().toISOString();
      return structuredClone(record);
    });
  }
}
