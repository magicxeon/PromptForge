import crypto from 'crypto';
import { isDeepStrictEqual } from 'node:util';
import { templateRepo } from '../../repositories/templates/TemplateRepository.js';
import { templateVersionRepo } from '../../repositories/templates/TemplateVersionRepository.js';
import { templatePoseProxyRepository } from '../../repositories/template-pose-proxy/TemplatePoseProxyRepository.js';
import { creditApplicationService } from '../credits/CreditApplicationService.js';
import { templatePoseProxyPolicyService } from './TemplatePoseProxyPolicyService.js';
import { GenerativePoseProxyProcessor } from './GenerativePoseProxyProcessor.js';

export class TemplatePoseProxyService {
  constructor({
    providerRegistry,
    generationApplicationService,
    repository = templatePoseProxyRepository,
    templateRepository = templateRepo,
    versionRepository = templateVersionRepo,
    reservationService = creditApplicationService,
    policyService = templatePoseProxyPolicyService,
    onActivated = null
  }) {
    this.providerRegistry = providerRegistry;
    this.generationApplicationService = generationApplicationService;
    this.repository = repository;
    this.templateRepository = templateRepository;
    this.versionRepository = versionRepository;
    this.reservationService = reservationService;
    this.policyService = policyService;
    this.onActivated = typeof onActivated === 'function' ? onActivated : null;
    this.processor = new GenerativePoseProxyProcessor({
      providerRegistry,
      generationApplicationService
    });
  }

  async estimate({ templateId, templateVersionId = null, poseVariantId = 'default' }, actorContext) {
    const source = await this.resolveOwnedSource(templateId, templateVersionId, actorContext);
    const policy = this.policyService.getPolicy();
    const cacheKey = createCacheKey(source, poseVariantId, policy);
    const existing = await this.repository.findByCacheKey(cacheKey);
    if (existing) {
      const synchronized = await this.synchronize(existing);
      if (['processing', 'review_required', 'active'].includes(synchronized.status)) {
        return {
          cacheHit: true,
          estimatedCredits: 0,
          estimateId: null,
          proxy: this.toPublicReadiness(synchronized)
        };
      }
    }
    const estimate = await this.reservationService.estimate({
      userId: actorContext.userId,
      requestedProviderId: policy.providerId,
      requestedModelId: policy.modelId,
      resolution: policy.resolution,
      aspectRatio: policy.aspectRatio,
      referenceCount: policy.referenceCount,
      outputCount: policy.outputCount,
      routingMode: 'fixed',
      qualityTier: 'template_setup',
      generationMode: policy.operationPurpose
    });
    return {
      cacheHit: false,
      estimatedCredits: estimate.estimatedCredits,
      estimateId: estimate.estimateId,
      expiresAt: estimate.expiresAt,
      pricingPolicyVersion: estimate.pricingPolicyVersion,
      breakdown: estimate.breakdown
    };
  }

  async prepare({
    templateId,
    templateVersionId = null,
    poseVariantId = 'default',
    estimateId,
    idempotencyKey
  }, actorContext) {
    const source = await this.resolveOwnedSource(templateId, templateVersionId, actorContext);
    const policy = this.policyService.getPolicy();
    const cacheKey = createCacheKey(source, poseVariantId, policy);
    const existing = await this.repository.findByCacheKey(cacheKey);
    if (existing && existing.status !== 'failed') {
      return this.toPublicReadiness(await this.synchronize(existing));
    }
    if (!estimateId || !idempotencyKey) {
      throw proxyError('template_pose_proxy_estimate_required', 'A locked setup estimate and idempotency key are required.');
    }
    if (existing?.status === 'failed') {
      await this.repository.update(existing.id, current => ({
        ...current,
        status: 'superseded',
        supersededAt: new Date().toISOString()
      }));
    }
    const token = crypto.createHash('sha256')
      .update(`${cacheKey}:${idempotencyKey}`)
      .digest('hex')
      .slice(0, 18);
    const now = new Date().toISOString();
    const record = await this.repository.createIfAbsent({
      id: `tpp_${token}`,
      schemaVersion: 1,
      templateId: source.template.id,
      templateVersionId: source.version.id,
      poseVariantId,
      status: 'pending',
      processorType: policy.processorType,
      providerId: policy.providerId,
      modelId: policy.modelId,
      processorPolicyVersion: policy.policyVersion,
      processorStrategyVersion: policy.processorStrategyVersion,
      outputRepresentation: policy.outputRepresentation,
      sourcePreviewAssetId: source.preview.imageAssetId || null,
      proxyAssetId: null,
      proxyImageUrl: null,
      sourceFingerprint: source.sourceFingerprint,
      cacheKey,
      confidenceSummary: null,
      qaDecision: 'pending',
      qaReasonCodes: [],
      operationId: `job_pose_proxy_${token}`,
      requestId: `req_pose_proxy_${token}`,
      correlationId: `corr_pose_proxy_${token}`,
      estimateId,
      idempotencyKey,
      createdByUserId: actorContext.userId,
      reviewedByUserId: null,
      createdAt: now,
      updatedAt: now,
      reviewedAt: null,
      activatedAt: null,
      supersededAt: null
    });
    if (!record.repositoryCreated) {
      return this.toPublicReadiness(await this.synchronize(record));
    }
    if (record.status !== 'pending') return this.toPublicReadiness(await this.synchronize(record));
    let reservation = null;
    try {
      const reservationResult = await this.reservationService.validateAndReserveForRequest({
        userId: actorContext.userId,
        estimateId,
        generationRequest: {
          requestId: record.requestId,
          requestedProviderId: policy.providerId,
          requestedModelId: policy.modelId,
          resolution: policy.resolution,
          aspectRatio: policy.aspectRatio,
          referenceCount: policy.referenceCount,
          outputCount: policy.outputCount,
          routingMode: 'fixed',
          qualityTier: 'template_setup',
          generationMode: policy.operationPurpose
        },
        metadata: {
          jobId: record.operationId,
          requestId: record.requestId,
          relatedTemplateId: templateId,
          operationPurpose: policy.operationPurpose,
          correlationId: record.correlationId,
          idempotencyKey
        }
      });
      reservation = reservationResult.reservation;
      await this.processor.enqueue({
        record,
        policy,
        sourceImageUrl: source.preview.imageUrl,
        sourceGenerationId: source.template.sourceGenerationId,
        actorContext,
        reservation
      });
      const updated = await this.repository.update(record.id, current => ({
        ...current,
        status: 'processing',
        reservationId: reservation.reservationId
      }));
      return this.toPublicReadiness(updated);
    } catch (error) {
      if (reservation) {
        await this.reservationService.refundForJob({
          userId: actorContext.userId,
          reservationId: reservation.reservationId,
          jobId: record.operationId,
          reasonCode: 'enqueue_failed',
          metadata: { operationPurpose: policy.operationPurpose }
        }).catch(() => {});
      }
      await this.repository.update(record.id, current => ({
        ...current,
        status: 'failed',
        qaReasonCodes: ['provider_or_enqueue_failed'],
        error: { code: error.code || 'template_pose_proxy_failed', message: error.message }
      }));
      throw error;
    }
  }

  async getReadiness(templateId, templateVersionId = null) {
    const template = await this.templateRepository.findById(templateId);
    if (!template) throw proxyError('template_not_found', 'Template not found.', 404);
    const versionId = templateVersionId || template.currentVersionId;
    await this.assertVersionBelongsToTemplate(versionId, template);
    const sourceVersionId = await this.preparationSourceVersionId(versionId);
    const policy = this.policyService.getPolicy();
    const records = await this.repository.readAll();
    const record = records
      .filter(item => item.templateVersionId === versionId
        || (item.templateVersionId === sourceVersionId && item.status === 'active'))
      .filter(item => item.status !== 'superseded' && recordMatchesPolicy(item, policy))
      .sort((left, right) => Date.parse(right.updatedAt || 0) - Date.parse(left.updatedAt || 0))[0];
    return record
      ? { ...this.toPublicReadiness(await this.synchronize(record)), templateVersionId: versionId }
      : this.toPublicReadiness(null, versionId);
  }

  async getOwnerReadiness(templateId, templateVersionId, actorContext) {
    const template = await this.templateRepository.findById(templateId);
    if (!template || template.ownerUserId !== actorContext.userId) {
      throw proxyError('template_not_found', 'Template not found.', 404);
    }
    const versionId = templateVersionId || template.currentVersionId;
    await this.assertVersionBelongsToTemplate(versionId, template);
    const sourceVersionId = await this.preparationSourceVersionId(versionId);
    const policy = this.policyService.getPolicy();
    const records = await this.repository.readAll();
    const record = records
      .filter(item => (item.templateVersionId === versionId && item.status !== 'superseded')
        || (item.templateVersionId === sourceVersionId && item.status === 'active'))
      .filter(item => recordMatchesPolicy(item, policy))
      .sort((left, right) => Date.parse(right.updatedAt || 0) - Date.parse(left.updatedAt || 0))[0];
    const synchronized = record ? await this.synchronize(record) : null;
    return {
      ...this.toPublicReadiness(synchronized, versionId),
      templateVersionId: versionId,
      reviewImageUrl: ['review_required', 'active'].includes(synchronized?.status)
        ? synchronized.proxyImageUrl
        : null
    };
  }

  async requireActive(templateVersionId, poseVariantId = 'default') {
    const sourceVersionId = await this.preparationSourceVersionId(templateVersionId);
    const policy = this.policyService.getPolicy();
    const record = (await this.repository.readAll())
      .filter(item => [templateVersionId, sourceVersionId].includes(item.templateVersionId))
      .filter(item => item.poseVariantId === poseVariantId && item.status === 'active')
      .filter(item => recordMatchesPolicy(item, policy))
      .sort((left, right) => Date.parse(right.activatedAt || 0) - Date.parse(left.activatedAt || 0))[0];
    if (!record) {
      throw proxyError(
        'fashion_template_pose_proxy_required',
        'This Template is still preparing its reusable pose. Choose another Fashion-ready Template or ask the creator to finish setup.',
        409,
        { templateVersionId, poseVariantId }
      );
    }
    return record;
  }

  async preparationSourceVersionId(versionId) {
    const version = await this.versionRepository.findById(versionId);
    if (!version?.preparationSourceVersionId) return versionId;
    const source = await this.versionRepository.findById(version.preparationSourceVersionId);
    // Only policy-only versions may share an already approved preparation.
    return source && source.status === 'published' && version.status === 'published'
      && source.templateId === version.templateId && source.ownerUserId === version.ownerUserId
      && isDeepStrictEqual(source.executionSnapshot, version.executionSnapshot)
      && isDeepStrictEqual(source.preview, version.preview)
      ? source.id : versionId;
  }

  async assertVersionBelongsToTemplate(versionId, template) {
    const version = await this.versionRepository.findById(versionId);
    if (!version || version.templateId !== template.id || version.ownerUserId !== template.ownerUserId) {
      throw proxyError('template_version_not_found', 'Template version not found.', 404);
    }
  }

  async review({ templateId, proxyId, decision, reasonCodes = [] }, actorContext) {
    const template = await this.templateRepository.findById(templateId);
    const record = await this.repository.findById(proxyId);
    if (!template || !record || record.templateId !== templateId || template.ownerUserId !== actorContext.userId) {
      throw proxyError('template_pose_proxy_not_found', 'Template Pose Proxy not found.', 404);
    }
    const synchronized = await this.synchronize(record);
    if (!['review_required', 'active'].includes(synchronized.status)) {
      throw proxyError('template_pose_proxy_not_reviewable', 'Template Pose Proxy is not ready for review.', 409);
    }
    const approved = decision === 'approve';
    const now = new Date().toISOString();
    const updated = await this.repository.update(proxyId, current => ({
      ...current,
      status: approved ? 'active' : 'failed',
      qaDecision: approved ? 'manual_pass' : 'rejected',
      qaReasonCodes: Array.isArray(reasonCodes) ? reasonCodes.map(String) : [],
      reviewedByUserId: actorContext.userId,
      reviewedAt: now,
      activatedAt: approved ? now : null
    }));
    if (approved && this.onActivated) {
      await this.onActivated({
        templateId: updated.templateId,
        templateVersionId: updated.templateVersionId
      }, actorContext);
    }
    return this.toPublicReadiness(updated);
  }

  async synchronize(record) {
    if (!record || !['processing', 'pending'].includes(record.status)) return record;
    const status = await this.generationApplicationService.getJobStatus(
      record.operationId
    );
    if (!status || ['queued', 'processing'].includes(status.status)) return record;
    if (status.status === 'completed' && status.result?.imageUrl) {
      return this.repository.update(record.id, current => ({
        ...current,
        status: 'review_required',
        proxyImageUrl: status.result.imageUrl,
        confidenceSummary: { automaticChecks: 'pending_manual_visual_review' },
        qaDecision: 'pending'
      }));
    }
    return this.repository.update(record.id, current => ({
      ...current,
      status: 'failed',
      qaReasonCodes: ['generation_failed'],
      error: status.error || null
    }));
  }

  async resolveOwnedSource(templateId, templateVersionId, actorContext) {
    const template = await this.templateRepository.findById(templateId);
    if (!template || template.ownerUserId !== actorContext.userId) {
      throw proxyError('template_not_found', 'Template not found.', 404);
    }
    const version = await this.versionRepository.findById(templateVersionId || template.currentVersionId);
    if (!version || version.templateId !== template.id) {
      throw proxyError('template_version_not_found', 'Template version not found.', 404);
    }
    const preview = {
      ...(template.preview || {}),
      ...(version.preview || {})
    };
    if (!preview.imageUrl) {
      throw proxyError('template_pose_proxy_source_required', 'Template preview image is required before reusable pose preparation.', 409);
    }
    return {
      template,
      version,
      preview,
      sourceFingerprint: crypto.createHash('sha256')
        .update(JSON.stringify([version.id, preview.imageAssetId || preview.imageUrl]))
        .digest('hex')
    };
  }

  toPublicReadiness(record, templateVersionId = null) {
    return {
      status: record?.status || 'not_prepared',
      fashionCompatible: record?.status === 'active',
      templateVersionId: record?.templateVersionId || templateVersionId,
      poseVariantId: record?.poseVariantId || 'default',
      proxyId: record?.id || null,
      qaDecision: record?.qaDecision || 'pending',
      qaReasonCodes: record?.qaReasonCodes || [],
      operationId: record?.operationId || null,
      correlationId: record?.correlationId || null,
      processorPolicyVersion: record?.processorPolicyVersion || this.policyService.getPolicy().policyVersion,
      processorStrategyVersion: record?.processorStrategyVersion || this.policyService.getPolicy().processorStrategyVersion,
      outputRepresentation: record?.outputRepresentation || 'matte_mannequin'
    };
  }
}

function createCacheKey(source, poseVariantId, policy) {
  return crypto.createHash('sha256').update(JSON.stringify([
    source.version.id,
    poseVariantId,
    source.sourceFingerprint,
    policy.processorType,
    policy.providerId,
    policy.modelId,
    policy.processorStrategyVersion,
    policy.resolution,
    policy.aspectRatio
  ])).digest('hex');
}

function recordMatchesPolicy(record, policy) {
  return record?.providerId === policy.providerId
    && record?.modelId === policy.modelId
    && record?.processorPolicyVersion === policy.policyVersion
    && record?.processorStrategyVersion === policy.processorStrategyVersion
    && (record?.outputRepresentation || 'matte_mannequin')
      === policy.outputRepresentation;
}

function proxyError(code, message, statusCode = 400, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  error.details = details;
  return error;
}
