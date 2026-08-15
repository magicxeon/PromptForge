import { resolveDataFile } from '../../config/paths.js';
import { readJsonFile, mutateJsonFile } from '../json/jsonFileStore.js';
import { applyRecordDefaults } from '../schemaVersioning.js';

const FALLBACK = [];

export class CharacterUsageRepository {
  constructor({ usageFile = resolveDataFile('characterUsageEvents') } = {}) {
    this.usageFile = usageFile;
  }

  async readAll() {
    const data = await readJsonFile(this.usageFile, FALLBACK);
    if (!Array.isArray(data)) throw new TypeError('Character usage data must be an array.');
    return data.map(item => structuredClone(item));
  }

  async createIdempotent(input = {}) {
    return mutateJsonFile(this.usageFile, FALLBACK, async items => {
      if (!Array.isArray(items)) throw new TypeError('Character usage data must be an array.');
      const existing = items.find(item => item.idempotencyKey === input.idempotencyKey);
      if (existing) return structuredClone(existing);
      const record = applyRecordDefaults({
        characterProfileId: input.characterProfileId,
        characterProfileVersionId: input.characterProfileVersionId,
        consumerUserId: input.consumerUserId,
        useCase: normalizeUseCase(input.useCase),
        sourceType: input.sourceType || 'direct_generation',
        sourceId: input.sourceId || null,
        generationJobId: input.generationJobId,
        successfulOutputCount: Math.max(1, Number(input.successfulOutputCount || 1)),
        idempotencyKey: input.idempotencyKey
      }, {
        idPrefix: 'charuse',
        ownerUserId: input.consumerUserId,
        visibility: 'private',
        status: 'active'
      });
      items.unshift(record);
      return structuredClone(record);
    });
  }

  async aggregate(characterProfileId) {
    const items = (await this.readAll()).filter(item =>
      item.characterProfileId === characterProfileId && item.status === 'active'
    );
    const stats = { totalOutputs: 0, byUseCase: { fashion: 0, sceneStory: 0, other: 0 } };
    items.forEach(item => {
      const count = Math.max(0, Number(item.successfulOutputCount || 0));
      stats.totalOutputs += count;
      if (item.useCase === 'fashion') stats.byUseCase.fashion += count;
      else if (item.useCase === 'scene_story') stats.byUseCase.sceneStory += count;
      else stats.byUseCase.other += count;
    });
    return stats;
  }
}

function normalizeUseCase(value) {
  return ['fashion', 'scene_story', 'general'].includes(value) ? value : 'general';
}

export const characterUsageRepo = new CharacterUsageRepository();
