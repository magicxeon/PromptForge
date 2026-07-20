import { resolveDataFile } from '../../config/paths.js';
import { readJsonFile, mutateJsonFile } from '../../repositories/json/jsonFileStore.js';

export class CollectionError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'CollectionError';
    this.code = code;
    this.status = status;
  }
}

export class CollectionManager {
  constructor({
    collectionsFile = resolveDataFile('collections'),
    historyFile = resolveDataFile('history')
  } = {}) {
    this.collectionsFile = collectionsFile;
    this.historyFile = historyFile;
  }

  async init() {
    // No-op for compatibility: path resolver and shared store handle init on-demand
  }

  async readData() {
    const data = await readJsonFile(this.collectionsFile, { version: 1, defaultCollectionId: null, collections: [] });
    return {
      version: Number(data.version) || 1,
      defaultCollectionId: data.defaultCollectionId || null,
      collections: Array.isArray(data.collections) ? data.collections : []
    };
  }

  mutate(operation) {
    return mutateJsonFile(this.collectionsFile, { version: 1, defaultCollectionId: null, collections: [] }, async (data) => {
      if (!data.version) data.version = 1;
      if (!Array.isArray(data.collections)) data.collections = [];
      return operation(data);
    });
  }

  async readHistory() {
    return readJsonFile(this.historyFile, []);
  }

  normalizeText(value, field, maxLength, { required = false } = {}) {
    if (value === undefined) return undefined;
    if (typeof value !== 'string') {
      throw new CollectionError('invalid_field', `${field} must be a string.`);
    }
    const normalized = value.trim();
    if (required && !normalized) {
      throw new CollectionError('invalid_field', `${field} is required.`);
    }
    if (normalized.length > maxLength) {
      throw new CollectionError(
        'invalid_field',
        `${field} must not exceed ${maxLength} characters.`
      );
    }
    return normalized;
  }

  validateCollectionId(value) {
    if (typeof value !== 'string' || !/^col_[a-zA-Z0-9_]+$/.test(value)) {
      throw new CollectionError('invalid_collection_id', 'Invalid collection ID.');
    }
    return value;
  }

  validateJobId(value) {
    if (typeof value !== 'string' || !/^job_[a-zA-Z0-9_]+$/.test(value)) {
      throw new CollectionError('invalid_job_id', 'Invalid history job ID.');
    }
    return value;
  }

  isOwnedBy(collection, username) {
    if (!username) return true;
    return (collection.ownerUsername || 'user_demo') === username;
  }

  getCollectionOrThrow(data, collectionId, username = null) {
    this.validateCollectionId(collectionId);
    const collection = data.collections.find(item => item.id === collectionId);
    if (!collection || !this.isOwnedBy(collection, username)) {
      throw new CollectionError('collection_not_found', 'Collection not found.', 404);
    }
    return collection;
  }

  toSummary(collection, defaultCollectionId) {
    return {
      ...collection,
      imageCount: collection.jobIds.length,
      isDefault: collection.id === defaultCollectionId
    };
  }

  async list(username = null) {
    const data = await this.readData();
    const collections = username
      ? data.collections.filter(collection => this.isOwnedBy(collection, username))
      : data.collections;
    const defaultCollection = collections.find(collection => collection.id === data.defaultCollectionId);
    return {
      version: data.version,
      defaultCollectionId: defaultCollection ? data.defaultCollectionId : null,
      collections: collections.map(collection =>
        this.toSummary(collection, data.defaultCollectionId)
      )
    };
  }

  async get(collectionId, username = null) {
    const data = await this.readData();
    const collection = this.getCollectionOrThrow(data, collectionId, username);
    const history = await this.readHistory();
    const historyById = new Map(history.map(item => [item.id, item]));
    const members = collection.jobIds
      .map(jobId => historyById.get(jobId))
      .filter(Boolean);
    const orphanCount = collection.jobIds.length - members.length;
    if (orphanCount > 0) {
      console.warn(`[Collections] ${collection.id} contains ${orphanCount} orphan history reference(s).`);
    }
    return {
      collection: this.toSummary(collection, data.defaultCollectionId),
      members,
      orphanCount
    };
  }

  async create(payload = {}, username = 'user_demo') {
    const name = this.normalizeText(payload.name, 'name', 100, { required: true });
    const description = this.normalizeText(payload.description ?? '', 'description', 1000);
    const story = this.normalizeText(payload.story ?? '', 'story', 20000);
    return this.mutate(async data => {
      const timestamp = Date.now();
      const collection = {
        id: `col_${timestamp}_${Math.random().toString(36).slice(2, 8)}`,
        name,
        description,
        story,
        ownerUsername: username || 'user_demo',
        coverJobId: null,
        jobIds: [],
        createdAt: timestamp,
        updatedAt: timestamp,
        futureAutomation: {
          status: 'not_configured',
          characterProfiles: [],
          generationPlan: null
        }
      };
      data.collections.unshift(collection);
      if (payload.setAsDefault === true) {
        data.defaultCollectionId = collection.id;
      }
      return this.toSummary(collection, data.defaultCollectionId);
    });
  }

  async update(collectionId, payload = {}, username = null) {
    const allowedFields = new Set(['name', 'description', 'story', 'coverJobId']);
    const requestedFields = Object.keys(payload);
    if (!requestedFields.some(field => allowedFields.has(field))) {
      throw new CollectionError('invalid_payload', 'No editable collection fields were provided.');
    }
    return this.mutate(async data => {
      const collection = this.getCollectionOrThrow(data, collectionId, username);
      if (payload.name !== undefined) {
        collection.name = this.normalizeText(payload.name, 'name', 100, { required: true });
      }
      if (payload.description !== undefined) {
        collection.description = this.normalizeText(payload.description, 'description', 1000);
      }
      if (payload.story !== undefined) {
        collection.story = this.normalizeText(payload.story, 'story', 20000);
      }
      if (payload.coverJobId !== undefined) {
        if (payload.coverJobId === null || payload.coverJobId === '') {
          collection.coverJobId = collection.jobIds[0] || null;
        } else {
          const coverJobId = this.validateJobId(payload.coverJobId);
          if (!collection.jobIds.includes(coverJobId)) {
            throw new CollectionError(
              'invalid_cover',
              'Cover image must be a member of the collection.'
            );
          }
          collection.coverJobId = coverJobId;
        }
      }
      collection.updatedAt = Date.now();
      return this.toSummary(collection, data.defaultCollectionId);
    });
  }

  async remove(collectionId, username = null) {
    return this.mutate(async data => {
      this.getCollectionOrThrow(data, collectionId, username);
      data.collections = data.collections.filter(item => item.id !== collectionId);
      if (data.defaultCollectionId === collectionId) {
        data.defaultCollectionId = null;
      }
      return { success: true };
    });
  }

  async addImages(collectionId, jobIds, username = null) {
    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      throw new CollectionError('invalid_payload', 'jobIds must be a non-empty array.');
    }
    const normalizedIds = [...new Set(jobIds.map(jobId => this.validateJobId(jobId)))];
    const history = await this.readHistory();
    const historyIds = new Set(history
      .filter(item => !username || (item.username || 'user_demo') === username)
      .map(item => item.id));
    const unknownIds = normalizedIds.filter(jobId => !historyIds.has(jobId));
    if (unknownIds.length > 0) {
      throw new CollectionError(
        'history_not_found',
        `History item not found: ${unknownIds[0]}`,
        404
      );
    }
    return this.mutate(async data => {
      const collection = this.getCollectionOrThrow(data, collectionId, username);
      normalizedIds.forEach(jobId => {
        if (!collection.jobIds.includes(jobId)) collection.jobIds.push(jobId);
      });
      if (!collection.coverJobId) collection.coverJobId = collection.jobIds[0] || null;
      collection.updatedAt = Date.now();
      return this.toSummary(collection, data.defaultCollectionId);
    });
  }

  async removeImage(collectionId, jobId, username = null) {
    this.validateJobId(jobId);
    return this.mutate(async data => {
      const collection = this.getCollectionOrThrow(data, collectionId, username);
      collection.jobIds = collection.jobIds.filter(id => id !== jobId);
      if (collection.coverJobId === jobId) {
        collection.coverJobId = collection.jobIds[0] || null;
      }
      collection.updatedAt = Date.now();
      return this.toSummary(collection, data.defaultCollectionId);
    });
  }

  async setDefault(collectionId, username = null) {
    return this.mutate(async data => {
      const collection = this.getCollectionOrThrow(data, collectionId, username);
      data.defaultCollectionId = collection.id;
      collection.updatedAt = Date.now();
      return this.toSummary(collection, data.defaultCollectionId);
    });
  }

  async clearDefault(username = null) {
    return this.mutate(async data => {
      if (!username) {
        data.defaultCollectionId = null;
      } else {
        const currentDefault = data.collections.find(collection => collection.id === data.defaultCollectionId);
        if (currentDefault && this.isOwnedBy(currentDefault, username)) {
          data.defaultCollectionId = null;
        }
      }
      return { success: true, defaultCollectionId: null };
    });
  }

  async addToDefault(jobId, username = null) {
    this.validateJobId(jobId);
    return this.mutate(async data => {
      if (!data.defaultCollectionId) return null;
      const collection = data.collections.find(item =>
        item.id === data.defaultCollectionId && this.isOwnedBy(item, username)
      );
      if (!collection) {
        data.defaultCollectionId = null;
        return null;
      }
      if (!collection.jobIds.includes(jobId)) collection.jobIds.push(jobId);
      if (!collection.coverJobId) collection.coverJobId = jobId;
      collection.updatedAt = Date.now();
      return collection.id;
    });
  }

  async removeJobEverywhere(jobId) {
    this.validateJobId(jobId);
    return this.mutate(async data => {
      data.collections.forEach(collection => {
        const previousLength = collection.jobIds.length;
        collection.jobIds = collection.jobIds.filter(id => id !== jobId);
        if (collection.coverJobId === jobId) {
          collection.coverJobId = collection.jobIds[0] || null;
        }
        if (collection.jobIds.length !== previousLength) {
          collection.updatedAt = Date.now();
        }
      });
      return { success: true };
    });
  }
}

export const collectionManager = new CollectionManager();
