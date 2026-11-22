import { randomUUID } from 'node:crypto';
import { resolveDataFile } from '../../config/paths.js';
import { readJsonFile, mutateJsonFile } from '../json/jsonFileStore.js';

export const voiceError = (code, statusCode = 400) => Object.assign(new Error(code), { code, statusCode });
const keys = { documents: 'voiceStudioDocuments', characters: 'voiceStudioCharacters', takes: 'voiceStudioTakes', customVoices: 'voiceStudioCustomVoices' };

// Takes are appended atomically and deletions retain their record. Count those
// records too, so deleting a take never renumbers the surviving performances.
function rowHistory(records, owner, documentId, rowId) {
  return records.filter(take => take.ownerUserId === owner && take.documentId === documentId && take.rowId === rowId);
}

// All mutable Voice Studio metadata passes through this actor-scoped repository.
export class VoiceStudioRepository {
  constructor({ files } = {}) { this.files = files || Object.fromEntries(Object.entries(keys).map(([k,v]) => [k, resolveDataFile(v)])); }
  async list(kind, owner) { return (await readJsonFile(this.files[kind], [])).filter(r => r.ownerUserId === owner && !r.deletedAt); }
  async rowTakes(owner, documentId, rowId) {
    const history = rowHistory(await readJsonFile(this.files.takes, []), owner, documentId, rowId);
    return history.map((take, index) => ({ ...take, takeNumber: index + 1 }))
      .filter(take => !take.deletedAt && !take.deletingAt).reverse();
  }
  async setDubPins(owner, projectId, takeIds, keepExisting = false) {
    const wanted = new Set(takeIds);
    return mutateJsonFile(this.files.takes, [], records => {
      const owned = records.filter(record => record.ownerUserId === owner);
      const available = new Set(owned.filter(r => !r.deletedAt && !r.deletingAt).map(r => r.id));
      if ([...wanted].some(id => !available.has(id))) throw voiceError('voice_record_not_found',404);
      const previous = [];
      for (const record of owned) {
        const pins = record.dubProjectIds || [];
        if (pins.includes(projectId)) {
          previous.push(record.id);
          if (!keepExisting && !wanted.has(record.id)) record.dubProjectIds = pins.filter(id => id !== projectId);
        } else if (wanted.has(record.id)) {
          record.dubProjectIds = [...pins,projectId];
        }
      }
      return previous;
    });
  }
  async get(kind, id, owner, { includeDeleted = false } = {}) {
    const values = includeDeleted ? (await readJsonFile(this.files[kind], [])).filter(r => r.ownerUserId === owner) : await this.list(kind, owner);
    const value = values.find(r => r.id === id);
    if (!value) throw voiceError('voice_record_not_found', 404);
    return structuredClone(value);
  }
  async insert(kind, owner, input) {
    return mutateJsonFile(this.files[kind], [], records => {
      const existing = records.find(r => r.ownerUserId === owner && r.id === input.id);
      if (existing) {
        if (kind !== 'takes') return structuredClone(existing);
        const history = rowHistory(records, owner, existing.documentId, existing.rowId);
        return { ...structuredClone(existing), takeNumber: history.indexOf(existing) + 1 };
      }
      const now = new Date().toISOString();
      const record = { ...input, id: input.id || randomUUID(), schemaVersion: input.schemaVersion || 1, ownerUserId: owner, revision: 1, createdAt: now, updatedAt: now };
      records.push(record);
      const result = structuredClone(record);
      if (kind === 'takes') result.takeNumber = rowHistory(records, owner, record.documentId, record.rowId).length;
      return result;
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
