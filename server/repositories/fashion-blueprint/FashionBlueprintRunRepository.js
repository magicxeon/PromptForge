import { resolveDataFile } from '../../config/paths.js';
import { mutateJsonFile, readJsonFile } from '../json/jsonFileStore.js';

const FALLBACK = { schemaVersion: 1, runs: [] };

export class FashionBlueprintRunRepository {
  constructor({ filePath = resolveDataFile('fashionBlueprintRuns') } = {}) {
    this.filePath = filePath;
  }

  async save(run) {
    return mutateJsonFile(this.filePath, FALLBACK, data => {
      data.schemaVersion = 1;
      data.runs = Array.isArray(data.runs) ? data.runs : [];
      const index = data.runs.findIndex(item => item.id === run.id);
      if (index >= 0) data.runs[index] = structuredClone(run);
      else data.runs.push(structuredClone(run));
      return structuredClone(run);
    });
  }

  async update(id, actorUserId, updater) {
    return mutateJsonFile(this.filePath, FALLBACK, data => {
      data.schemaVersion = 1;
      data.runs = Array.isArray(data.runs) ? data.runs : [];
      const index = data.runs.findIndex(item =>
        item.id === id && item.actorUserId === actorUserId
      );
      if (index < 0) return null;
      const next = updater(structuredClone(data.runs[index]));
      data.runs[index] = {
        ...next,
        updatedAt: new Date().toISOString()
      };
      return structuredClone(data.runs[index]);
    });
  }

  async findRecentForActor(actorUserId, limit = 12) {
    const data = await readJsonFile(this.filePath, FALLBACK);
    return (data.runs || [])
      .filter(item => item.actorUserId === actorUserId)
      .sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0))
      .slice(0, Math.max(1, Math.min(50, Number(limit) || 12)))
      .map(structuredClone);
  }

  async findByIdForActor(id, actorUserId) {
    const data = await readJsonFile(this.filePath, FALLBACK);
    const run = (data.runs || []).find(item => item.id === id && item.actorUserId === actorUserId);
    return run ? structuredClone(run) : null;
  }

  async findByIdempotencyKey(actorUserId, idempotencyKey) {
    const data = await readJsonFile(this.filePath, FALLBACK);
    const run = (data.runs || []).find(item =>
      item.actorUserId === actorUserId && item.idempotencyKey === idempotencyKey
    );
    return run ? structuredClone(run) : null;
  }
}

export const fashionBlueprintRunRepository = new FashionBlueprintRunRepository();
