import crypto from 'crypto';

export const REFERENCE_PROCESSING_SCHEMA_VERSION = 1;

export const REFERENCE_ROLES = Object.freeze([
  'template_baseline',
  'character_reference',
  'face_reference',
  'outfit_front',
  'outfit_back',
  'style_reference',
  'pose_reference',
  'product_reference',
  'environment_reference'
]);

export const AUTHORITY_DOMAINS = Object.freeze([
  'identity',
  'body',
  'expression',
  'pose',
  'garment',
  'environment',
  'lighting',
  'composition',
  'renderingStyle'
]);

const ROLE_ALIASES = Object.freeze({
  template_baseline_reference: 'template_baseline',
  character_reference_a: 'character_reference',
  character_reference_b: 'character_reference',
  face_reference_a: 'face_reference',
  face_reference_b: 'face_reference',
  outfit_front_reference: 'outfit_front',
  outfit_back_reference: 'outfit_back'
});

export class ReferenceProcessingError extends Error {
  constructor(code, message, statusCode = 400, details = {}) {
    super(message);
    this.name = 'ReferenceProcessingError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details
      }
    };
  }
}

export function normalizeReferenceRole(value) {
  const role = String(value || '').trim();
  return ROLE_ALIASES[role] || role;
}

export function collectReferenceInputs(context = {}) {
  const enabled = context.imageReferences || {};
  const inputs = [];
  const add = (slotId, role, value, sourceKind, roleOptions = {}) => {
    if (typeof value !== 'string' || !value.trim()) return;
    inputs.push({
      slotId,
      role,
      value: value.trim(),
      source: {
        kind: sourceKind || inferSourceKind(value),
        id: referenceSourceId(value)
      },
      requestedScope: roleOptions.requestedScope || null,
      roleOptions
    });
  };

  add(
    'template_baseline',
    'template_baseline',
    context.templateBaselineReference,
    'template'
  );
  if (enabled.characterReference) {
    add('character_reference_a', 'character_reference', context.characterReferenceImageA, 'character', {
      outfitBehavior: context.characterReferenceOutfitBehavior || 'preserve'
    });
    add('character_reference_b', 'character_reference', context.characterReferenceImageB, 'character', {
      outfitBehavior: context.characterReferenceOutfitBehavior || 'preserve'
    });
  }
  if (enabled.faceMatch) {
    add('face_reference_a', 'face_reference', context.faceReferenceImageA);
    add('face_reference_b', 'face_reference', context.faceReferenceImageB);
  }
  if (enabled.outfitReference) {
    const outfitOptions = {
      requestedScope: context.outfitReferenceScope || null,
      overrides: context.outfitReferenceOverrides || {}
    };
    add('outfit_front', 'outfit_front', context.outfitReferenceImageFront, null, outfitOptions);
    add('outfit_back', 'outfit_back', context.outfitReferenceImageBack, null, outfitOptions);
  }
  if (enabled.styleMatch) {
    add('style_reference_a', 'style_reference', context.styleReferenceImageA);
    if (!enabled.poseMatch || context.generationSurface !== 'playground') {
      add('style_reference_b', 'style_reference', context.styleReferenceImageB);
    }
  }
  if (enabled.poseMatch) {
    add(
      'pose_reference_a',
      'pose_reference',
      enabled.styleMatch && context.generationSurface === 'playground'
        ? context.styleReferenceImageB
        : context.styleReferenceImageA
    );
    if (context.generationSurface !== 'playground') {
      add('pose_reference_b', 'pose_reference', context.styleReferenceImageB);
    }
  }
  return inputs;
}

export function stableFingerprint(value) {
  return crypto
    .createHash('sha256')
    .update(stableStringify(value))
    .digest('hex');
}

export function publicPlanLineage(result = {}) {
  return {
    schemaVersion: REFERENCE_PROCESSING_SCHEMA_VERSION,
    policyVersion: result.policyVersion || null,
    planFingerprint: result.planFingerprint || null,
    executionMode: result.providerPlan?.executionMode || 'single_stage',
    referenceCount: Number(result.providerPlan?.referenceCount || 0),
    dispatchRuleIds: [...(result.providerPlan?.dispatchRuleIds || [])],
    suppressedReferenceRoles: [
      ...(result.providerPlan?.suppressedReferenceRoles || [])
    ],
    references: Array.isArray(result.processedReferences)
      ? result.processedReferences.map(reference => ({
        role: reference.role,
        sourceAssetId: reference.sourceAssetId || null,
        derivativeAssetId: reference.derivativeAssetId || null,
        processorIds: [...(reference.processorIds || [])],
        processorVersions: { ...(reference.processorVersions || {}) },
        detectedScope: reference.detectedScope || null,
        warningCodes: [...(reference.warningCodes || [])]
      }))
      : []
  };
}

function inferSourceKind(value) {
  if (/^\/api\/(?:community\/)?character-profiles\//.test(value)
    || /^\/outputs\/character-profiles\//.test(value)) return 'character';
  if (/^\/outputs\/references\//.test(value)) return 'asset';
  if (/^\/outputs\/(?:job_|thumbnails\/)|^job_/.test(value)) return 'history';
  return 'asset';
}

function referenceSourceId(value) {
  const clean = String(value || '').replace(/[?#].*$/, '');
  return clean.split('/').filter(Boolean).at(-1) || stableFingerprint(clean).slice(0, 16);
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key =>
      `${JSON.stringify(key)}:${stableStringify(value[key])}`
    ).join(',')}}`;
  }
  return JSON.stringify(value);
}
