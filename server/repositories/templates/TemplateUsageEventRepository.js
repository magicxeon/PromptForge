import { resolveDataFile } from '../../config/paths.js';
import { assertActorContext } from '../repositoryContracts.js';
import { applyRecordDefaults } from '../schemaVersioning.js';
import { insertTemplateRecordIfAbsent, readTemplateRecords } from './templateRepositoryUtils.js';

export class TemplateUsageEventRepository {
  constructor({ eventsFile = resolveDataFile('templateUsageEvents') } = {}) {
    this.eventsFile = eventsFile;
  }

  readAll() {
    return readTemplateRecords(this.eventsFile);
  }

  async append(input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const record = applyRecordDefaults({
      templateId: input.templateId,
      templateVersionId: input.templateVersionId,
      templateUseSessionId: input.templateUseSessionId,
      sourceCommunityPostId: input.sourceCommunityPostId || null,
      generatedJobId: input.generatedJobId,
      creatorUserId: input.creatorUserId || null,
      creatorUsername: input.creatorUsername || null,
      eventType: input.eventType || 'generation_completed',
      outputCount: Math.max(1, Math.trunc(Number(input.outputCount) || 1)),
      replacementSummary: Array.isArray(input.replacementSummary)
        ? structuredClone(input.replacementSummary)
        : [],
      pricingSnapshot: structuredClone(input.pricingSnapshot || {}),
      creatorEarningCredits: Math.max(0, Number(input.creatorEarningCredits) || 0),
      platformRevenueCredits: Math.max(0, Number(input.platformRevenueCredits) || 0)
    }, {
      idPrefix: 'tmpluse',
      ownerUserId: actor.userId,
      ownerUsername: actor.username,
      visibility: 'private',
      status: 'recorded'
    });
    return insertTemplateRecordIfAbsent(
      this.eventsFile,
      record,
      current => current.templateUseSessionId === record.templateUseSessionId
        && current.generatedJobId === record.generatedJobId
        && current.eventType === record.eventType
    );
  }
}

export const templateUsageEventRepo = new TemplateUsageEventRepository();
