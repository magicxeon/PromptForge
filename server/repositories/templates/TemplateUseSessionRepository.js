import { resolveDataFile } from '../../config/paths.js';
import { assertActorContext } from '../repositoryContracts.js';
import { applyRecordDefaults } from '../schemaVersioning.js';
import {
  insertTemplateRecord,
  readTemplateRecords,
  updateTemplateRecord
} from './templateRepositoryUtils.js';

export class TemplateUseSessionRepository {
  constructor({ sessionsFile = resolveDataFile('templateUseSessions') } = {}) {
    this.sessionsFile = sessionsFile;
  }

  readAll() {
    return readTemplateRecords(this.sessionsFile);
  }

  async findByIdForActor(id, actorUserId) {
    const record = (await this.readAll())
      .find(item => item.id === id && item.actorUserId === actorUserId);
    return record ? structuredClone(record) : null;
  }

  async create(input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const nowMs = Date.now();
    const record = applyRecordDefaults({
      templateId: input.templateId,
      templateVersionId: input.templateVersionId,
      sourceCommunityPostId: input.sourceCommunityPostId || null,
      actorUserId: actor.userId,
      actorUsername: actor.username,
      pricingSnapshot: structuredClone(input.pricingSnapshot || {}),
      publicInputSchema: structuredClone(input.publicInputSchema || { schemaVersion: 1, inputs: [] }),
      expiresAt: input.expiresAt || new Date(nowMs + 60 * 60 * 1000).toISOString(),
      consumedAt: null,
      generatedJobIds: []
    }, {
      idPrefix: 'tmpls',
      ownerUserId: actor.userId,
      ownerUsername: actor.username,
      visibility: 'private',
      status: 'active',
      now: new Date(nowMs).toISOString()
    });
    return insertTemplateRecord(this.sessionsFile, record);
  }

  async attachJob(id, actorUserId, jobId) {
    return updateTemplateRecord(this.sessionsFile, id, current => {
      if (current.actorUserId !== actorUserId) return current;
      const generatedJobIds = Array.from(new Set([...(current.generatedJobIds || []), jobId].filter(Boolean)));
      return {
        ...current,
        generatedJobIds,
        consumedAt: current.consumedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });
  }
}

export const templateUseSessionRepo = new TemplateUseSessionRepository();
