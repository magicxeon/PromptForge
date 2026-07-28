import { apiRequest } from '../../../lib/api/apiClient';
import {
  attributesBundleSchema,
  comparisonEstimateSchema,
  comparisonSubmitSchema,
  creditEstimateResponseSchema,
  generationSubmitSchema,
  jobStatusSchema,
  providerCatalogSchema,
  referenceUploadSchema
} from '../schemas/generationSchemas';
import type { ComparisonEstimate } from '../schemas/generationSchemas';

export type GenerationReferenceRole =
  | 'face_reference'
  | 'character_reference'
  | 'style_reference'
  | 'pose_reference'
  | 'outfit_front'
  | 'outfit_back';

export type GenerationRequestDraft = {
  provider: string;
  submodel: string;
  prompt: string;
  negativePrompt?: string;
  aspectRatio: string;
  imageResolution: string | null;
  outputCount: number;
  generationMode: 'playground' | 'headshot' | 'scene' | 'character-sheet' | 'fashion';
  generationSurface: 'playground' | 'studio' | 'fashion';
  references: Partial<Record<GenerationReferenceRole, string>>;
  selections?: Record<string, unknown>;
  sceneTemplateSnapshot?: Record<string, unknown> | null;
  characterProfileContext?: Record<string, unknown> | null;
  authoringMode?: 'guided' | 'manual';
  characterType?: 'reusable_model' | 'styled_character' | null;
};

export type ComparisonSlotInput = { id: string; provider: string; model: string };

export function getProviderCatalog() {
  return apiRequest('/api/providers', { schema: providerCatalogSchema });
}

export function getAttributesBundle() {
  return apiRequest('/api/attributes/bundle', { schema: attributesBundleSchema });
}

export function uploadGenerationReference(dataUrl: string, role: GenerationReferenceRole, sourceMode: string) {
  return apiRequest('/api/references', {
    method: 'POST',
    body: { dataUrl, role, sourceMode },
    schema: referenceUploadSchema
  });
}

export function estimateGeneration(draft: GenerationRequestDraft) {
  return apiRequest('/api/credits/estimate', {
    method: 'POST',
    body: pricingPayload(draft),
    schema: creditEstimateResponseSchema
  });
}

export function submitGeneration(draft: GenerationRequestDraft, estimateId: string) {
  const requestId = createRequestId('gen');
  return apiRequest('/api/generate', {
    method: 'POST',
    body: generationPayload(draft, { estimateId, requestId }),
    schema: generationSubmitSchema
  });
}

export function getJobStatus(jobId: string, signal?: AbortSignal) {
  return apiRequest(`/api/jobs/${encodeURIComponent(jobId)}`, {
    schema: jobStatusSchema,
    signal
  });
}

export function estimateComparison(draft: GenerationRequestDraft, slots: ComparisonSlotInput[]) {
  return apiRequest('/api/comparisons/estimate', {
    method: 'POST',
    body: {
      ...generationPayload(draft),
      slots
    },
    schema: comparisonEstimateSchema
  });
}

export function submitComparison(
  draft: GenerationRequestDraft,
  slots: ComparisonSlotInput[],
  estimate: ComparisonEstimate,
  name?: string
) {
  return apiRequest('/api/comparisons', {
    method: 'POST',
    body: {
      ...generationPayload(draft),
      name: name || `Comparison ${new Date().toLocaleDateString('en-CA')}`,
      slots,
      creditEstimates: estimate.slots.map(slot => ({
        slotId: slot.id,
        estimateId: slot.estimateId,
        estimatedCredit: slot.estimatedCredit,
        estimateExpiresAt: slot.estimateExpiresAt
      })),
      estimateToken: estimate.estimateToken,
      estimateExpiresAt: estimate.expiresAt,
      idempotencyKey: createRequestId('cmp')
    },
    schema: comparisonSubmitSchema
  });
}

export function generationPayload(
  draft: GenerationRequestDraft,
  request: { estimateId?: string; requestId?: string } = {}
) {
  const refs = draft.references;
  const manualPrompt = [draft.prompt, draft.negativePrompt ? `Avoid: ${draft.negativePrompt}` : '']
    .filter(Boolean)
    .join('\n\n');
  return {
    provider: draft.provider,
    submodel: draft.submodel,
    imageResolution: draft.imageResolution,
    aspectRatio: draft.aspectRatio,
    outputCount: draft.outputCount,
    mode: promptModeForGenerationMode(draft.generationMode),
    characterType: draft.characterType || null,
    generationMode: draft.generationMode,
    generationSurface: draft.generationSurface,
    template: 'portrait',
    selections: draft.selections || {},
    customColors: {},
    imageReferences: {
      faceMatch: Boolean(refs.face_reference),
      characterReference: Boolean(refs.character_reference),
      styleMatch: Boolean(refs.style_reference),
      poseMatch: Boolean(refs.pose_reference),
      outfitReference: Boolean(refs.outfit_front),
      characterOverrides: false
    },
    faceReferenceImageA: refs.face_reference || null,
    characterReferenceImageA: refs.character_reference || null,
    styleReferenceImageA: refs.style_reference || refs.pose_reference || null,
    styleReferenceImageB: refs.style_reference && refs.pose_reference ? refs.pose_reference : null,
    outfitReferenceImageFront: refs.outfit_front || null,
    outfitReferenceImageBack: refs.outfit_back || null,
    sceneBuilder: {
      authoringMode: draft.authoringMode === 'guided' ? 'guided' : 'manual',
      manualPromptText: draft.authoringMode === 'guided' ? '' : manualPrompt,
      lastGuidedPromptSnapshot: '',
      templateDraft: null
    },
    sceneTemplateSnapshot: draft.sceneTemplateSnapshot || null,
    characterProfileContext: draft.characterProfileContext || null,
    isGptSafe: false,
    routingMode: 'advanced',
    qualityTier: 'standard',
    estimateId: request.estimateId || null,
    requestId: request.requestId || null
  };
}

function promptModeForGenerationMode(
  generationMode: GenerationRequestDraft['generationMode']
) {
  if (generationMode === 'headshot') return 'headshot';
  if (generationMode === 'character-sheet') return 'character-sheet';
  return 'normal';
}

export function pricingPayload(draft: GenerationRequestDraft) {
  return {
    requestedProviderId: draft.provider,
    requestedModelId: draft.submodel,
    resolution: draft.imageResolution || '1K',
    aspectRatio: draft.aspectRatio,
    quality: null,
    referenceCount: Object.values(draft.references).filter(Boolean).length,
    outputCount: draft.outputCount,
    routingMode: 'advanced',
    qualityTier: 'standard',
    generationMode: draft.generationMode
  };
}

function createRequestId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
