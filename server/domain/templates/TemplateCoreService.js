import { assertActorContext, RepositoryContractError, VISIBILITY } from '../../repositories/repositoryContracts.js';
import { templateRepo } from '../../repositories/templates/TemplateRepository.js';
import { templateVersionRepo } from '../../repositories/templates/TemplateVersionRepository.js';
import { templateUseSessionRepo } from '../../repositories/templates/TemplateUseSessionRepository.js';
import { templateUsageEventRepo } from '../../repositories/templates/TemplateUsageEventRepository.js';
import {
  applyTemplateReplacements,
  createPublicTemplateProjection,
  normalizeTemplateInputSchema,
  normalizeTemplateKind,
  normalizeTemplatePricing,
  normalizeTemplatePromptVisibility,
  validateTemplateReplacements
} from './templateContracts.js';

export class TemplateCoreService {
  constructor({
    templateRepository = templateRepo,
    versionRepository = templateVersionRepo,
    sessionRepository = templateUseSessionRepo,
    usageEventRepository = templateUsageEventRepo,
    now = () => Date.now()
  } = {}) {
    this.templateRepository = templateRepository;
    this.versionRepository = versionRepository;
    this.sessionRepository = sessionRepository;
    this.usageEventRepository = usageEventRepository;
    this.now = now;
  }

  async publishFromGeneration(input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const executionSnapshot = input.executionSnapshot;
    if (!executionSnapshot || typeof executionSnapshot !== 'object') {
      throw new RepositoryContractError(
        'template_snapshot_required',
        'A Scene Template snapshot is required before publishing.'
      );
    }
    const promptVisibility = normalizeTemplatePromptVisibility(
      input.promptVisibility,
      executionSnapshot
    );
    const publicInputSchema = normalizeTemplateInputSchema(
      input.publicInputSchema,
      executionSnapshot
    );
    if (!publicInputSchema.inputs.some(item => item.replacementPolicy !== 'locked')) {
      throw new RepositoryContractError(
        'template_replaceable_input_required',
        'A reusable template must expose at least one replaceable input.'
      );
    }
    const pricing = normalizeTemplatePricing(input.pricing);
    const preview = {
      imageUrl: safeMediaPointer(input.preview?.imageUrl),
      thumbnailUrl: safeMediaPointer(input.preview?.thumbnailUrl || input.preview?.imageUrl),
      imageAssetId: input.preview?.imageAssetId || null,
      thumbnailAssetId: input.preview?.thumbnailAssetId || null,
      aspectRatio: input.preview?.aspectRatio || executionSnapshot.generationSettingsSnapshot?.aspectRatio || null
    };
    const existingTemplate = input.templateId
      ? await this.templateRepository.findById(input.templateId)
      : null;
    if (input.templateId && (!existingTemplate || existingTemplate.ownerUserId !== actor.userId)) {
      throw new RepositoryContractError('template_not_found', 'Template not found.', 404);
    }
    const template = existingTemplate || await this.templateRepository.create({
        kind: normalizeTemplateKind(input.kind),
        title: input.title,
        description: input.description,
        visibility: input.visibility || VISIBILITY.PUBLIC,
        pricing,
        preview,
        sourceGenerationId: input.sourceGenerationId,
        compatibility: input.compatibility || {}
      }, actor);
    const version = await this.versionRepository.create({
      templateId: template.id,
      executionSnapshot,
      publicInputSchema,
      promptVisibility,
      visibility: input.visibility || VISIBILITY.PUBLIC,
      compatibility: input.compatibility || {},
      preview,
      status: 'published'
    }, actor);
    const publishedTemplate = await this.templateRepository.publishVersion(
      template.id,
      version.id,
      actor,
      { visibility: input.visibility || VISIBILITY.PUBLIC, pricing, preview }
    );
    return { template: publishedTemplate, version };
  }

  async archiveTemplate(templateId, actorContext) {
    return this.templateRepository.archive(templateId, actorContext);
  }

  async updatePublishedSettings(templateId, input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const current = await this.templateRepository.findById(templateId);
    if (!current || current.ownerUserId !== actor.userId || current.status !== 'published') {
      throw new RepositoryContractError('template_not_found', 'Template not found.', 404);
    }
    const currentVersion = await this.versionRepository.findById(current.currentVersionId);
    if (!currentVersion || currentVersion.templateId !== current.id) {
      throw new RepositoryContractError(
        'template_version_not_found',
        'Published template version not found.',
        404
      );
    }
    const promptVisibility = input.promptVisibility === undefined
      ? currentVersion.promptVisibility
      : normalizeTemplatePromptVisibility(input.promptVisibility, currentVersion.executionSnapshot);
    const pricing = input.accessCredits === undefined
      ? current.pricing
      : normalizeTemplatePricing({
        ...current.pricing,
        accessCredits: input.accessCredits
      });
    const visibility = input.visibility === undefined
      ? current.visibility
      : normalizeTemplateVisibility(input.visibility);
    const [template, version] = await Promise.all([
      this.templateRepository.updatePublishedSettings(templateId, { pricing, visibility }, actor),
      this.versionRepository.updatePublishedSettings(currentVersion.id, {
        promptVisibility,
        visibility
      }, actor)
    ]);
    return {
      template,
      version,
      sceneTemplateSnapshot: createPublicTemplateProjection(version)
    };
  }

  async listPublished(query = {}) {
    const templates = await this.templateRepository.listPublished(query);
    return Promise.all(templates.map(async template => {
      const version = await this.versionRepository.findById(template.currentVersionId);
      return this.toPublicTemplate(template, version);
    }));
  }

  async getPublicTemplate(templateId) {
    const template = await this.templateRepository.findById(templateId);
    if (!template
      || template.status !== 'published'
      || ![VISIBILITY.PUBLIC, VISIBILITY.UNLISTED].includes(template.visibility)) {
      throw new RepositoryContractError('template_not_found', 'Template not found.', 404);
    }
    const version = await this.versionRepository.findById(template.currentVersionId);
    if (!version || version.status !== 'published') {
      throw new RepositoryContractError('template_version_not_found', 'Published template version not found.', 404);
    }
    return { template, version };
  }

  async createUseSession({
    templateId,
    templateVersionId = null,
    sourceCommunityPostId = null
  }, actorContext) {
    const actor = assertActorContext(actorContext);
    const { template, version: currentVersion } = await this.getPublicTemplate(templateId);
    const version = templateVersionId
      ? await this.versionRepository.findById(templateVersionId)
      : currentVersion;
    if (!version || version.templateId !== template.id || version.status !== 'published') {
      throw new RepositoryContractError('template_version_not_found', 'Template version not found.', 404);
    }
    const session = await this.sessionRepository.create({
      templateId: template.id,
      templateVersionId: version.id,
      sourceCommunityPostId,
      pricingSnapshot: template.pricing,
      publicInputSchema: version.publicInputSchema
    }, actor);
    return {
      ...this.toPublicTemplate(template, version),
      useSession: {
        id: session.id,
        expiresAt: session.expiresAt,
        sourceCommunityPostId: session.sourceCommunityPostId
      },
      sceneTemplateSnapshot: createPublicTemplateProjection(version)
    };
  }

  async resolveSession(sessionId, actorContext, replacements = {}) {
    const resolved = await this.loadSession(sessionId, actorContext);
    const normalizedReplacements = validateTemplateReplacements(
      replacements,
      resolved.version.publicInputSchema
    );
    const baselineImageUrl = safeMediaPointer(
      resolved.version.preview?.imageUrl || resolved.template.preview?.imageUrl
    );
    const baselineSourceGenerationId = String(
      resolved.template.sourceGenerationId
      || resolved.version.executionSnapshot?.createdFromGenerationId
      || ''
    ).trim() || null;
    return {
      ...resolved,
      replacements: normalizedReplacements,
      replacementSummary: summarizeTemplateReplacements(
        normalizedReplacements,
        resolved.version.publicInputSchema
      ),
      executionSnapshot: applyTemplateReplacements(
        resolved.version.executionSnapshot,
        normalizedReplacements,
        resolved.version.publicInputSchema
      ),
      baselineReference: baselineImageUrl
        ? {
          imageUrl: baselineImageUrl,
          sourceGenerationId: baselineSourceGenerationId
        }
        : null
    };
  }

  async loadSession(sessionId, actorContext, { allowExpired = false } = {}) {
    const actor = assertActorContext(actorContext);
    const session = await this.sessionRepository.findByIdForActor(sessionId, actor.userId);
    if (!session || session.status !== 'active') {
      throw new RepositoryContractError('template_use_session_not_found', 'Template use session not found.', 404);
    }
    if (!allowExpired && Date.parse(session.expiresAt || '') <= this.now()) {
      throw new RepositoryContractError('template_use_session_expired', 'Template use session has expired.', 409);
    }
    const template = await this.templateRepository.findById(session.templateId);
    const version = await this.versionRepository.findById(session.templateVersionId);
    if (!template || !version || version.status !== 'published') {
      throw new RepositoryContractError('template_version_not_found', 'Template version not found.', 404);
    }
    return {
      session,
      template,
      version
    };
  }

  async resolvePricing(sessionId, actorContext, outputCount = 1) {
    if (!sessionId) return null;
    const resolved = await this.loadSession(sessionId, actorContext);
    const unitCredits = Math.max(0, Number(resolved.session.pricingSnapshot?.accessCredits) || 0);
    const count = Math.max(1, Math.trunc(Number(outputCount) || 1));
    const baselineImageUrl = safeMediaPointer(
      resolved.version.preview?.imageUrl || resolved.template.preview?.imageUrl
    );
    return {
      templateId: resolved.template.id,
      templateVersionId: resolved.version.id,
      templateUseSessionId: resolved.session.id,
      sourceCommunityPostId: resolved.session.sourceCommunityPostId,
      creatorUserId: resolved.template.ownerUserId,
      creatorUsername: resolved.template.ownerUsername,
      executionReferenceCount: baselineImageUrl ? 1 : 0,
      unitCredits,
      totalCredits: unitCredits * count,
      creatorShareBps: Number(resolved.session.pricingSnapshot?.creatorShareBps) || 0,
      platformShareBps: Number(resolved.session.pricingSnapshot?.platformShareBps) || 10000
    };
  }

  async attachGeneration(sessionId, actorContext, jobId) {
    if (!sessionId) return null;
    const actor = assertActorContext(actorContext);
    const resolved = await this.loadSession(sessionId, actor);
    await this.sessionRepository.attachJob(sessionId, actor.userId, jobId);
    return resolved;
  }

  async recordSuccessfulUse({
    sessionId,
    jobId,
    pricingSnapshot,
    outputCount = 1,
    replacementSummary = []
  }, actorContext) {
    const actor = assertActorContext(actorContext);
    const resolved = await this.loadSession(sessionId, actor, { allowExpired: true });
    if (!resolved.session.generatedJobIds?.includes(jobId)) {
      throw new RepositoryContractError(
        'template_generation_not_attached',
        'The generated job is not attached to this Template use session.',
        409
      );
    }
    const templateCredits = Math.max(0, Number(pricingSnapshot?.breakdown?.templateUsageCredits) || 0);
    const creatorShareBps = Math.max(0, Number(resolved.session.pricingSnapshot?.creatorShareBps) || 0);
    const creatorEarningCredits = templateCredits * creatorShareBps / 10000;
    return this.usageEventRepository.append({
      templateId: resolved.template.id,
      templateVersionId: resolved.version.id,
      templateUseSessionId: sessionId,
      sourceCommunityPostId: resolved.session.sourceCommunityPostId,
      generatedJobId: jobId,
      outputCount,
      replacementSummary,
      pricingSnapshot,
      creatorUserId: resolved.template.ownerUserId,
      creatorUsername: resolved.template.ownerUsername,
      creatorEarningCredits,
      platformRevenueCredits: templateCredits - creatorEarningCredits
    }, actor);
  }

  toPublicTemplate(template, version) {
    return {
      id: template.id,
      kind: template.kind,
      title: template.title,
      description: template.description,
      ownerUsername: template.ownerUsername,
      currentVersionId: version?.id || template.currentVersionId,
      versionNumber: version?.versionNumber || null,
      preview: structuredClone(template.preview || {}),
      pricing: structuredClone(template.pricing || {}),
      compatibility: structuredClone(version?.compatibility || template.compatibility || {}),
      promptVisibility: version?.promptVisibility || 'full',
      publicInputSchema: structuredClone(version?.publicInputSchema || { schemaVersion: 1, inputs: [] }),
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    };
  }
}

export const templateCoreService = new TemplateCoreService();

function normalizeTemplateVisibility(value) {
  if ([VISIBILITY.PUBLIC, VISIBILITY.UNLISTED, VISIBILITY.PRIVATE].includes(value)) {
    return value;
  }
  throw new RepositoryContractError(
    'template_visibility_invalid',
    'Template visibility must be public, unlisted, or private.'
  );
}

function safeMediaPointer(value) {
  const pointer = String(value || '').trim();
  return /^(data:|blob:)/i.test(pointer) ? '' : pointer;
}

function summarizeTemplateReplacements(replacements, publicInputSchema) {
  const suppliedInputIds = new Set(Object.keys(replacements || {}));
  return (publicInputSchema?.inputs || [])
    .filter(input => input.replacementPolicy !== 'locked')
    .map(input => ({
      inputId: input.id,
      inputType: input.type,
      supplied: suppliedInputIds.has(input.id)
    }));
}
