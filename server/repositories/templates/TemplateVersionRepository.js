import { resolveDataFile } from '../../config/paths.js';
import { assertActorContext } from '../repositoryContracts.js';
import { applyRecordDefaults } from '../schemaVersioning.js';
import { stripEmbeddedBase64 } from '../recordNormalizer.js';
import {
  insertTemplateRecord,
  readTemplateRecords,
  updateTemplateRecord
} from './templateRepositoryUtils.js';

export class TemplateVersionRepository {
  constructor({ versionsFile = resolveDataFile('templateVersions') } = {}) {
    this.versionsFile = versionsFile;
  }

  readAll() {
    return readTemplateRecords(this.versionsFile);
  }

  async findById(id) {
    const record = (await this.readAll()).find(item => item.id === id);
    return record ? structuredClone(record) : null;
  }

  async findByTemplateId(templateId) {
    return (await this.readAll())
      .filter(item => item.templateId === templateId)
      .sort((left, right) => right.versionNumber - left.versionNumber)
      .map(item => structuredClone(item));
  }

  async create(input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const existing = await this.findByTemplateId(input.templateId);
    const now = new Date().toISOString();
    const record = applyRecordDefaults({
      templateId: input.templateId,
      versionNumber: existing.length ? existing[0].versionNumber + 1 : 1,
      executionSnapshot: stripEmbeddedBase64(input.executionSnapshot || {}),
      publicInputSchema: normalizePublicInputSchema(input.publicInputSchema),
      promptVisibility: input.promptVisibility || 'full',
      compatibility: structuredClone(input.compatibility || {}),
      preview: structuredClone(input.preview || {}),
      publishedAt: input.status === 'published' ? now : null
    }, {
      idPrefix: 'tmplv',
      ownerUserId: actor.userId,
      ownerUsername: actor.username,
      visibility: input.visibility || 'private',
      status: input.status === 'published' ? 'published' : 'draft',
      now
    });
    return insertTemplateRecord(this.versionsFile, record);
  }

  async updatePublishedSettings(versionId, input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const updated = await updateTemplateRecord(this.versionsFile, versionId, current => {
      if (current.ownerUserId !== actor.userId || current.status !== 'published') return current;
      return {
        ...current,
        visibility: input.visibility === undefined
          ? current.visibility
          : input.visibility,
        promptVisibility: input.promptVisibility === undefined
          ? current.promptVisibility
          : input.promptVisibility,
        updatedAt: new Date().toISOString()
      };
    });
    if (!updated || updated.ownerUserId !== actor.userId || updated.status !== 'published') {
      const error = new Error('Template version not found.');
      error.code = 'template_version_not_found';
      error.statusCode = 404;
      throw error;
    }
    return updated;
  }
}

function normalizePublicInputSchema(value) {
  const inputs = Array.isArray(value?.inputs) ? value.inputs : [];
  return {
    schemaVersion: 1,
    inputs: inputs.map((input, index) => ({
      id: String(input.id || `input_${index + 1}`),
      label: String(input.label || input.id || `Input ${index + 1}`),
      type: input.type || 'custom_text',
      sourceFieldName: String(input.sourceFieldName || input.id || ''),
      required: input.required === true,
      replacementPolicy: input.replacementPolicy === 'locked' ? 'locked' : 'replaceable',
      fashionBindingRole: input.fashionBindingRole || null,
      allowedOptionIds: Array.isArray(input.allowedOptionIds)
        ? input.allowedOptionIds.map(String)
        : []
    })).filter(input => input.sourceFieldName)
  };
}

export const templateVersionRepo = new TemplateVersionRepository();
