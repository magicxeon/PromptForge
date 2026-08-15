import { resolveDataFile } from '../../config/paths.js';
import { assertActorContext, RepositoryContractError, VISIBILITY } from '../repositoryContracts.js';
import { applyRecordDefaults } from '../schemaVersioning.js';
import {
  insertTemplateRecord,
  readTemplateRecords,
  updateTemplateRecord
} from './templateRepositoryUtils.js';

export class TemplateRepository {
  constructor({ templatesFile = resolveDataFile('templates') } = {}) {
    this.templatesFile = templatesFile;
  }

  readAll() {
    return readTemplateRecords(this.templatesFile);
  }

  async findById(id) {
    const record = (await this.readAll()).find(item => item.id === id);
    return record ? structuredClone(record) : null;
  }

  async findByOwner(ownerUserId) {
    return (await this.readAll())
      .filter(item => item.ownerUserId === ownerUserId && item.status !== 'deleted')
      .map(item => structuredClone(item));
  }

  async listPublished({ kind = null, limit = 24 } = {}) {
    return (await this.readAll())
      .filter(item => item.status === 'published')
      .filter(item => item.visibility === VISIBILITY.PUBLIC)
      .filter(item => !kind || item.kind === kind)
      .sort((left, right) => Date.parse(right.updatedAt || 0) - Date.parse(left.updatedAt || 0))
      .slice(0, Math.min(50, Math.max(1, Number(limit) || 24)))
      .map(item => structuredClone(item));
  }

  async create(input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const title = String(input.title || '').trim();
    if (!title) throw new RepositoryContractError('template_title_required', 'A template title is required.');
    const now = new Date().toISOString();
    const record = applyRecordDefaults({
      kind: input.kind || 'scene_image',
      title,
      description: String(input.description || '').trim(),
      currentVersionId: input.currentVersionId || null,
      preview: input.preview && typeof input.preview === 'object' ? structuredClone(input.preview) : {},
      pricing: normalizePricing(input.pricing),
      compatibility: input.compatibility && typeof input.compatibility === 'object'
        ? structuredClone(input.compatibility)
        : {},
      sourceGenerationId: input.sourceGenerationId || null,
      sourceCommunityPostId: input.sourceCommunityPostId || null
    }, {
      idPrefix: 'tmpl',
      ownerUserId: actor.userId,
      ownerUsername: actor.username,
      visibility: [VISIBILITY.PUBLIC, VISIBILITY.UNLISTED, VISIBILITY.PRIVATE].includes(input.visibility)
        ? input.visibility
        : VISIBILITY.PRIVATE,
      status: input.status === 'published' ? 'published' : 'draft',
      now
    });
    return insertTemplateRecord(this.templatesFile, record);
  }

  async publishVersion(templateId, versionId, actorContext, patch = {}) {
    const actor = assertActorContext(actorContext);
    const updated = await updateTemplateRecord(this.templatesFile, templateId, current => {
      if (current.ownerUserId !== actor.userId) return current;
      return {
        ...current,
        currentVersionId: versionId,
        status: 'published',
        visibility: patch.visibility || current.visibility,
        preview: patch.preview || current.preview,
        pricing: normalizePricing(patch.pricing || current.pricing),
        updatedAt: new Date().toISOString()
      };
    });
    if (!updated || updated.ownerUserId !== actor.userId) {
      throw new RepositoryContractError('template_not_found', 'Template not found.', 404);
    }
    return updated;
  }

  async archive(templateId, actorContext) {
    const actor = assertActorContext(actorContext);
    const updated = await updateTemplateRecord(this.templatesFile, templateId, current => {
      if (current.ownerUserId !== actor.userId) return current;
      return {
        ...current,
        status: 'archived',
        visibility: VISIBILITY.PRIVATE,
        updatedAt: new Date().toISOString()
      };
    });
    if (!updated || updated.ownerUserId !== actor.userId) {
      throw new RepositoryContractError('template_not_found', 'Template not found.', 404);
    }
    return updated;
  }

  async updatePublishedSettings(templateId, input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const updated = await updateTemplateRecord(this.templatesFile, templateId, current => {
      if (current.ownerUserId !== actor.userId || current.status !== 'published') return current;
      return {
        ...current,
        visibility: input.visibility === undefined
          ? current.visibility
          : normalizeVisibility(input.visibility, current.visibility),
        pricing: input.pricing === undefined
          ? current.pricing
          : normalizePricing(input.pricing),
        updatedAt: new Date().toISOString()
      };
    });
    if (!updated || updated.ownerUserId !== actor.userId || updated.status !== 'published') {
      throw new RepositoryContractError('template_not_found', 'Template not found.', 404);
    }
    return updated;
  }
}

function normalizeVisibility(value, fallback = VISIBILITY.PRIVATE) {
  return [VISIBILITY.PUBLIC, VISIBILITY.UNLISTED, VISIBILITY.PRIVATE].includes(value)
    ? value
    : fallback;
}

function normalizePricing(value = {}) {
  const accessCredits = Math.max(0, Math.trunc(Number(value.accessCredits) || 0));
  return {
    accessCredits,
    cadence: 'per_output',
    creatorShareBps: Math.min(10000, Math.max(0, Math.trunc(Number(value.creatorShareBps) || 0))),
    platformShareBps: Math.min(10000, Math.max(0, Math.trunc(Number(value.platformShareBps) || 10000))),
    currency: 'credits'
  };
}

export const templateRepo = new TemplateRepository();
