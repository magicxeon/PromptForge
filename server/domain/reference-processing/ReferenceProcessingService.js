import {
  collectReferenceInputs,
  publicPlanLineage,
  ReferenceProcessingError,
  REFERENCE_PROCESSING_SCHEMA_VERSION,
  stableFingerprint
} from './referenceProcessingContracts.js';
import { ReferenceAuthorityPlanner } from './ReferenceAuthorityPlanner.js';
import { buildStructuredReferenceBrief } from './StructuredReferenceBrief.js';

export class ReferenceProcessingService {
  constructor({
    policyRegistry,
    processorRegistry
  }) {
    this.policyRegistry = policyRegistry;
    this.processorRegistry = processorRegistry;
    this.authorityPlanner = new ReferenceAuthorityPlanner({ policyRegistry });
  }

  async processContext(context, {
    actorContext,
    providerId,
    modelId,
    modelConfig = null
  }) {
    const inputs = collectReferenceInputs(context);
    const processedByValue = new Map();
    const processedReferences = [];
    const warnings = [];

    for (const input of inputs) {
      const roleConfig = this.policyRegistry.getRole(input.role);
      if (!roleConfig) {
        throw new ReferenceProcessingError(
          'reference_role_unsupported',
          `Reference role is not supported: ${input.role}`,
          400
        );
      }
      if (!roleConfig.allowedSourceKinds.includes(input.source.kind)) {
        throw new ReferenceProcessingError(
          'reference_role_unsupported',
          `${input.source.kind} references cannot be used as ${input.role}.`,
          400,
          { role: input.role, sourceKind: input.source.kind }
        );
      }
      let processed = processedByValue.get(input.value);
      if (!processed) {
        const castIndex = /^cinematic_cast_(\d+)$/.exec(input.slotId);
        // Approved Cast sheets keep original bytes; Generation already resolved their ownership and hash.
        processed = castIndex ? {
          sourceAssetId: null, derivativeAssetId: null, imageUrl: input.value,
          contentFingerprint: context.cinematicCastReferences[Number(castIndex[1])].contentHash,
          processorIds: [], processorVersions: {}, fallback: false
        } : await this.processorRegistry.process(input, {
          actorContext,
          policyVersion: this.policyRegistry.getPolicyVersion()
        });
        processedByValue.set(input.value, processed);
      }
      const scope = resolveScope(input, roleConfig);
      const warningCodes = [];
      if (processed.fallback) {
        warningCodes.push('reference_preprocessing_fallback');
        warnings.push({
          code: 'reference_preprocessing_fallback',
          severity: 'warning',
          role: input.role,
          message: 'The original authorized reference will be used without a new derivative.'
        });
      }
      processedReferences.push({
        slotId: input.slotId,
        role: input.role,
        sourceKind: input.source.kind,
        sourceAssetId: processed.sourceAssetId,
        derivativeAssetId: processed.derivativeAssetId,
        processedValue: processed.imageUrl,
        processorIds: [...processed.processorIds],
        processorVersions: { ...processed.processorVersions },
        detectedScope: scope,
        confidence: input.requestedScope ? 1 : null,
        preserveTraits: [...roleConfig.preserveTraits],
        suppressTraits: [...roleConfig.suppressTraits],
        contentFingerprint: processed.contentFingerprint,
        warningCodes
      });
    }

    const authority = this.authorityPlanner.createPlan({
      references: processedReferences,
      selections: context.selections,
      characterReferenceOutfitBehavior: context.characterReferenceOutfitBehavior,
      outfitReferenceOverrides: context.outfitReferenceOverrides
    });
    const orderedBeforeDispatchRules = orderAndDedupe(
      processedReferences,
      this.policyRegistry.getReferenceOrder(providerId, modelId)
    );
    const dispatch = applyDispatchRules(
      orderedBeforeDispatchRules,
      this.policyRegistry.getProviderDispatchRules(providerId, modelId),
      context
    );
    const ordered = dispatch.references;
    const castCount = context.cinematicCastReferences?.length || 0;
    if (castCount && (!Number.isFinite(modelConfig?.capabilities?.maxReferenceImages)
      || context.cinematicCastReferences.some((_, index) => !ordered.some(row => row.slots.includes(`cinematic_cast_${index}`))))) {
      throw new ReferenceProcessingError('reference_capacity_exceeded', 'This model cannot preserve every Cast reference.', 400);
    }
    const configuredMaxReferences = modelConfig?.capabilities?.maxReferenceImages;
    const maxReferences = configuredMaxReferences === undefined
      || configuredMaxReferences === null
      ? Infinity
      : Number(configuredMaxReferences);
    if (ordered.length > maxReferences) {
      throw new ReferenceProcessingError(
        'reference_capacity_exceeded',
        `The selected model supports up to ${maxReferences} unique reference images.`,
        400,
        { referenceCount: ordered.length, maxReferences }
      );
    }
    const directiveIds = [...new Set(ordered.flatMap(reference =>
      reference.roles.map(role => this.policyRegistry.getRole(role).directiveId)
    ))];
    directiveIds.push(...this.policyRegistry.getProviderDirectiveSuffixes(providerId, modelId));
    const compiledDirective = compileDirective(
      ordered,
      this.policyRegistry,
      context,
      providerId,
      modelId
    );
    const planFingerprint = stableFingerprint({
      schemaVersion: REFERENCE_PROCESSING_SCHEMA_VERSION,
      policyVersion: this.policyRegistry.getPolicyVersion(),
      providerId,
      modelId,
      references: ordered.map(reference => ({
        roles: reference.roles,
        contentFingerprint: reference.contentFingerprint,
        processedValue: reference.processedValue,
        scope: reference.detectedScope
      })),
      authorityFingerprint: authority.fingerprint,
      ...(castCount ? { castBindings: context.cinematicCastReferences.map(({ referenceValue, ...binding }) => binding) } : {})
    });
    const result = {
      schemaVersion: REFERENCE_PROCESSING_SCHEMA_VERSION,
      policyVersion: this.policyRegistry.getPolicyVersion(),
      planFingerprint,
      status: warnings.length ? 'accepted_with_warning' : 'accepted',
      authorityPlan: authority.authorityPlan,
      processedReferences,
      effectiveSelections: authority.effectiveSelections,
      publicAuthorityProjection: {
        schemaVersion: REFERENCE_PROCESSING_SCHEMA_VERSION,
        policyVersion: this.policyRegistry.getPolicyVersion(),
        planFingerprint,
        controlledGroups: authority.controlledGroups,
        suppressedSelections: authority.suppressedSelections,
        references: processedReferences.map(reference => ({
          slotId: reference.slotId,
          role: reference.role,
          intent: this.policyRegistry.getRole(reference.role).intent,
          preserveTraits: [...reference.preserveTraits],
          suppressTraits: [...reference.suppressTraits],
          detectedScope: reference.detectedScope,
          confidence: reference.confidence,
          status: reference.warningCodes.length ? 'warning' : 'accepted',
          warningCodes: [...reference.warningCodes]
        })),
        warnings: warnings.map(warning => ({
          code: warning.code,
          severity: warning.severity,
          role: warning.role
        }))
      },
      warnings,
      providerPlan: {
        orderedReferenceIds: ordered.map(reference => reference.referenceKey),
        orderedReferences: ordered.map(reference => ({
          referenceKey: reference.referenceKey,
          roles: [...reference.roles],
          slots: [...reference.slots]
        })),
        referenceCount: ordered.length,
        directiveIds,
        dispatchRuleIds: dispatch.appliedRuleIds,
        suppressedReferenceRoles: dispatch.suppressedRoles,
        executionMode: 'single_stage'
      },
      compiledDirective
    };
    applyProcessedValues(context, processedReferences);
    context.selections = result.effectiveSelections;
    context.referenceCount = result.providerPlan.referenceCount;
    context.referenceProcessing = result;
    context.referenceProcessingLineage = publicPlanLineage(result);
    context.referenceRoleManifest = ordered.map((reference, index) => ({
      index: index + 1,
      roles: [...reference.roles],
      ...(context.cinematicCastReferences?.length ? { castNames: reference.slots.flatMap(slot => {
        const match = /^cinematic_cast_(\d+)$/.exec(slot);
        return match ? [context.cinematicCastReferences[Number(match[1])].displayName] : [];
      }) } : {})
    }));
    return result;
  }

  async preview(payload, options) {
    const context = options.normalizeContext(payload, options.actorContext);
    const result = await this.processContext(context, options);
    return {
      status: result.status,
      policyVersion: result.policyVersion,
      planFingerprint: result.planFingerprint,
      publicAuthorityProjection: result.publicAuthorityProjection,
      effectiveSelections: result.effectiveSelections,
      providerPlan: {
        referenceCount: result.providerPlan.referenceCount,
        executionMode: result.providerPlan.executionMode
      }
    };
  }
}

function resolveScope(input, roleConfig) {
  if (!Array.isArray(roleConfig.scopeOptions) || !roleConfig.scopeOptions.length) return null;
  const requested = String(input.requestedScope || '').trim();
  if (requested && roleConfig.scopeOptions.includes(requested)) return requested;
  return roleConfig.defaultScope || roleConfig.scopeOptions[0];
}

function orderAndDedupe(references, order) {
  const rank = new Map(order.map((role, index) => [role, index]));
  const sorted = [...references].sort((a, b) =>
    (rank.get(a.role) ?? 999) - (rank.get(b.role) ?? 999)
  );
  const byFingerprint = new Map();
  for (const reference of sorted) {
    const existing = byFingerprint.get(reference.contentFingerprint);
    if (existing) {
      if (!existing.roles.includes(reference.role)) existing.roles.push(reference.role);
      existing.slots.push(reference.slotId);
      continue;
    }
    byFingerprint.set(reference.contentFingerprint, {
      referenceKey: reference.derivativeAssetId
        || reference.sourceAssetId
        || `ref_${reference.contentFingerprint.slice(0, 16)}`,
      processedValue: reference.processedValue,
      contentFingerprint: reference.contentFingerprint,
      detectedScope: reference.detectedScope,
      roles: [reference.role],
      slots: [reference.slotId]
    });
  }
  return [...byFingerprint.values()];
}

function applyDispatchRules(references, rules, context) {
  const availableRoles = new Set(references.flatMap(reference => reference.roles));
  const appliedRuleIds = [];
  const suppressedRoles = new Set();
  for (const rule of rules || []) {
    const surfaces = rule.when?.generationSurfaces || [];
    const allRoles = rule.when?.allRoles || [];
    const anyRoles = rule.when?.anyRoles || [];
    const surfaceMatches = !surfaces.length
      || surfaces.includes(context.generationSurface);
    const allMatch = allRoles.every(role => availableRoles.has(role));
    const anyMatch = !anyRoles.length
      || anyRoles.some(role => availableRoles.has(role));
    if (!surfaceMatches || !allMatch || !anyMatch) continue;
    appliedRuleIds.push(rule.id);
    rule.suppressRoles.forEach(role => suppressedRoles.add(role));
  }
  return {
    references: references.filter(reference =>
      !reference.roles.every(role => suppressedRoles.has(role))
    ),
    appliedRuleIds,
    suppressedRoles: [...suppressedRoles]
  };
}

function compileDirective(
  orderedReferences,
  registry,
  context,
  providerId,
  modelId
) {
  if (!orderedReferences.length) return '';
  const structuredBrief = buildStructuredReferenceBrief({
    orderedReferences,
    config: registry.getProviderStructuredBrief(providerId, modelId),
    context
  });
  if (structuredBrief) {
    return [
      'Follow this structured reference authority contract exactly.',
      JSON.stringify(structuredBrief, null, 2),
      'The detailed destination direction follows this JSON contract.'
    ].join('\n');
  }
  const entries = orderedReferences.map((reference, index) => {
    const roleText = reference.roles.map(role => {
      const config = registry.getRole(role);
      const directive = registry.getDirective(config.directiveId);
      const sections = [directive.base];
      if (role.startsWith('outfit_') && context.templateBaselineReference) {
        if (directive.replaceTemplateGarment) sections.push(directive.replaceTemplateGarment);
      }
      if (role === 'character_reference') {
        sections.push(context.characterReferenceOutfitBehavior === 'preserve'
          ? 'Preserve the source character outfit.'
          : 'Do not copy the source character outfit; follow the destination garment authority.');
      }
      return `${role}: ${sections.join(' ')}`;
    }).join(' ');
    return `Reference image ${index + 1}: ${roleText}`;
  });
  return [
    'Interpret each reference only within its declared authority boundary.',
    ...entries,
    'When incidental source content conflicts with the destination or another higher-authority role, suppress the incidental content.'
  ].join(' ');
}

function applyProcessedValues(context, references) {
  const slots = Object.fromEntries(references.map(reference => [
    reference.slotId,
    reference.processedValue
  ]));
  context.templateBaselineReference = slots.template_baseline || context.templateBaselineReference;
  context.characterReferenceImageA = slots.character_reference_a || context.characterReferenceImageA;
  context.characterReferenceImageB = slots.character_reference_b || context.characterReferenceImageB;
  context.faceReferenceImageA = slots.face_reference_a || context.faceReferenceImageA;
  context.faceReferenceImageB = slots.face_reference_b || context.faceReferenceImageB;
  context.outfitReferenceImageFront = slots.outfit_front || context.outfitReferenceImageFront;
  context.outfitReferenceImageBack = slots.outfit_back || context.outfitReferenceImageBack;
  if (context.generationSurface === 'playground'
    && context.imageReferences?.styleMatch
    && context.imageReferences?.poseMatch) {
    context.styleReferenceImageA = slots.style_reference_a || context.styleReferenceImageA;
    context.styleReferenceImageB = slots.pose_reference_a || context.styleReferenceImageB;
  } else {
    context.styleReferenceImageA = slots.style_reference_a
      || slots.pose_reference_a
      || context.styleReferenceImageA;
    context.styleReferenceImageB = slots.style_reference_b
      || slots.pose_reference_b
      || context.styleReferenceImageB;
  }
}
