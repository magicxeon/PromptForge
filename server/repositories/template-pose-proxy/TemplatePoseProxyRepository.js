import { resolveDataFile } from '../../config/paths.js';
import { mutateJsonFile, readJsonFile } from '../json/jsonFileStore.js';

export class TemplatePoseProxyRepository {
  constructor({ filePath = resolveDataFile('templatePoseProxies') } = {}) {
    this.filePath = filePath;
  }

  async readAll() {
    const records = await readJsonFile(this.filePath, []);
    return Array.isArray(records) ? records : [];
  }

  async findById(id) {
    const record = (await this.readAll()).find(item => item.id === id);
    return record ? structuredClone(record) : null;
  }

  async findByCacheKey(cacheKey) {
    const record = (await this.readAll()).find(item =>
      item.cacheKey === cacheKey && item.status !== 'superseded'
    );
    return record ? structuredClone(record) : null;
  }

  async findActiveForVersion(templateVersionId, poseVariantId = 'default') {
    const records = await this.readAll();
    const record = records
      .filter(item => item.templateVersionId === templateVersionId)
      .filter(item => item.poseVariantId === poseVariantId && item.status === 'active')
      .sort((left, right) => Date.parse(right.activatedAt || 0) - Date.parse(left.activatedAt || 0))[0];
    return record ? structuredClone(record) : null;
  }

  async createIfAbsent(record) {
    return mutateJsonFile(this.filePath, [], records => {
      const existing = records.find(item =>
        item.cacheKey === record.cacheKey && item.status !== 'superseded'
      );
      if (existing) return { ...structuredClone(existing), repositoryCreated: false };
      records.push(structuredClone(record));
      return { ...structuredClone(record), repositoryCreated: true };
    });
  }

  async update(id, updater) {
    return mutateJsonFile(this.filePath, [], records => {
      const index = records.findIndex(item => item.id === id);
      if (index < 0) return null;
      const updated = updater(structuredClone(records[index]));
      records[index] = { ...updated, updatedAt: new Date().toISOString() };
      return structuredClone(records[index]);
    });
  }
}

export const templatePoseProxyRepository = new TemplatePoseProxyRepository();
