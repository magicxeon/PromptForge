import { assetRepo } from '../../repositories/assets/AssetRepository.js';
import { characterProfileRepo } from '../../repositories/character-profiles/CharacterProfileRepository.js';
import { communityPostRepo } from '../../repositories/community/CommunityPostRepository.js';
import { historyRepository } from '../../repositories/generation/HistoryRepository.js';
import { videoProviderTaskRepository } from '../../repositories/generation/VideoProviderTaskRepository.js';
import { templateRepo } from '../../repositories/templates/TemplateRepository.js';
import { normalizeListQuery } from '../../repositories/repositoryContracts.js';
import { paginateRepositoryRecords } from '../../repositories/RepositoryCursor.js';
import { adminFeaturePolicyService } from './AdminFeaturePolicyService.js';

const READERS = {
  asset: () => assetRepo.readAll(),
  character: () => characterProfileRepo.readAll(),
  post: () => communityPostRepo.readAll(),
  template: () => templateRepo.readAll()
};

export class AdminInvestigationService {
  constructor({ featurePolicy = adminFeaturePolicyService, providerRegistry = null } = {}) {
    this.featurePolicy = featurePolicy;
    this.providerRegistry = providerRegistry;
  }

  async listContent(query, actorContext) {
    this.featurePolicy.assertEnabled('contentRead', actorContext);
    const type = Object.hasOwn(READERS, query.type) ? query.type : 'all';
    const normalized = normalizeListQuery(query, { defaultLimit: 25, maxLimit: 50 });
    const search = String(query.search || '').trim().toLowerCase();
    const status = String(query.status || '').trim();
    const visibility = String(query.visibility || '').trim();
    const sources = type === 'all' ? Object.keys(READERS) : [type];
    const grouped = await Promise.all(sources.map(async sourceType => (await READERS[sourceType]()).map(record => summarizeContent(sourceType, record))));
    const records = grouped.flat()
      .filter(item => !status || item.status === status)
      .filter(item => !visibility || item.visibility === visibility)
      .filter(item => !search || [item.id, item.title, item.ownerUserId, item.ownerUsername, item.sourceId]
        .filter(Boolean).some(value => String(value).toLowerCase().includes(search)));
    return paginateRepositoryRecords(records, normalized, JSON.stringify({ type, search, status, visibility, sort: normalized.sort }));
  }

  async trace(identifier, actorContext) {
    this.featurePolicy.assertEnabled('traceRead', actorContext);
    const id = String(identifier || '').trim();
    if (id.length < 4) throw Object.assign(new Error('Enter a complete Job, task, post, asset, template or Character ID.'), { code: 'admin_trace_identifier_required', statusCode: 400 });
    const [image, video, post, asset, template, character] = await Promise.all([
      historyRepository.getById(id), videoProviderTaskRepository.find(id), communityPostRepo.findById(id),
      assetRepo.findById(id), templateRepo.findById(id), characterProfileRepo.findById(id)
    ]);
    const direct = [
      image && summarizeTrace('image_job', image), video && summarizeTrace('video_task', video),
      post && summarizeTrace('community_post', post), asset && summarizeTrace('asset', asset),
      template && summarizeTrace('template', template), character && summarizeTrace('character', character)
    ].filter(Boolean);
    const allSources = await Promise.all([communityPostRepo.readAll(), assetRepo.readAll(), templateRepo.readAll(), characterProfileRepo.readAll()]);
    const related = allSources.flat().filter(record => record && JSON.stringify(traceIndex(record)).includes(id)).slice(0, 50)
      .map(record => summarizeTrace(inferTraceType(record), record));
    return { identifier: id, found: direct.length > 0 || related.length > 0, direct, related, sensitiveFieldsRedacted: true };
  }

  providerHealth(actorContext) {
    this.featurePolicy.assertEnabled('providerHealthRead', actorContext);
    const catalog = this.providerRegistry?.getPublicCatalog?.() || { schemaVersion: null, defaultProvider: null, providers: [] };
    return {
      checkedAt: new Date().toISOString(), schemaVersion: catalog.schemaVersion, defaultProvider: catalog.defaultProvider,
      providers: catalog.providers.map(provider => ({
        id: provider.id, displayName: provider.displayName, status: 'configured',
        modelCount: provider.models.length,
        models: provider.models.map(model => ({ id: model.id, displayName: model.displayName, status: 'available' }))
      })),
      note: 'Configuration health only. This endpoint does not issue billable provider probes.'
    };
  }

  generationCommandPreview(identifier, actorContext) {
    const exposure = this.featurePolicy.getExposure(actorContext).capabilities.generationCommands;
    return {
      identifier: String(identifier || '').trim(), executable: exposure.enabled,
      availableCommands: exposure.enabled ? ['retry', 'cancel', 'reconcile'] : [],
      reason: exposure.reason,
      prerequisites: exposure.prerequisites
    };
  }
}

function summarizeContent(type, record = {}) {
  return {
    type, id: record.id || null, title: record.title || record.name || null,
    ownerUserId: record.ownerUserId || null, ownerUsername: record.ownerUsername || record.ownerUsernameSnapshot || null,
    status: record.status || 'active', visibility: record.visibility || 'private',
    sourceId: record.sourceJobId || record.sourceGenerationId || record.sourceCommunityPostId || null,
    updatedAt: record.updatedAt || record.createdAt || null,
    moderation: record.moderationState || record.moderation || null
  };
}

function summarizeTrace(type, record = {}) {
  return {
    type, id: record.id || null, status: record.status || null,
    ownerUserId: record.ownerUserId || null, ownerUsername: record.ownerUsername || null,
    providerId: record.providerId || record.provider || null, modelId: record.modelId || record.submodel || null,
    supportReference: record.supportReference || null,
    createdAt: record.createdAt || record.timestamp || null, updatedAt: record.updatedAt || null
  };
}

function traceIndex(record = {}) {
  return {
    id: record.id, sourceJobId: record.sourceJobId, sourceGenerationId: record.sourceGenerationId,
    sourceGenerationResultId: record.sourceGenerationResultId, sourceCommunityPostId: record.sourceCommunityPostId,
    templateId: record.templateId, characterProfileId: record.characterProfileId, currentVersionId: record.currentVersionId
  };
}

function inferTraceType(record = {}) {
  if (record.assetType || record.storageKey) return 'asset';
  if (record.kind || record.currentVersionId) return 'template';
  if (record.reusePolicy || record.intendedUses) return 'character';
  return 'community_post';
}

export const adminInvestigationService = new AdminInvestigationService();
