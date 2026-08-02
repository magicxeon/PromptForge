import { apiRequest } from '../../../lib/api/apiClient';
import {
  fashionAssetSchema,
  fashionReadyTemplateIndexSchema,
  fashionQuoteSchema,
  fashionRunListSchema,
  fashionRunSchema
} from '../schemas/fashionSchemas';

export type FashionPlanInput = {
  templateId: string;
  templateUseSessionId: string;
  characterProfileContext: Record<string, unknown>;
  productItems: Array<{
    key: string;
    clientKey: string;
    name: string;
    sku?: string;
    productType: string;
    outfitScope: 'full_look' | 'top_only' | 'bottom_only' | 'single_item';
    colorNotes?: string;
    integrityLevel: 'creative' | 'balanced' | 'strict';
    references: Record<string, FashionReferenceAsset | string | null | undefined>;
  }>;
  qualityTier: 'draft' | 'selling_quality' | 'premium_campaign';
  routingMode: 'simple' | 'advanced';
  requestedProviderId?: string;
  requestedModelId?: string;
  resolution?: string | null;
  aspectRatio: string;
  poseDirection: string;
  environmentDirection: string;
};

export type FashionReferenceAsset = {
  assetId: string | null;
  imageUrl: string;
  thumbnailUrl?: string | null;
};

export function uploadFashionReference(dataUrl: string, role: string) {
  return apiRequest('/api/fashion-blueprints/assets', {
    method: 'POST',
    body: { dataUrl, role },
    schema: fashionAssetSchema
  });
}

export async function listFashionReadyTemplateIds() {
  const response = await apiRequest('/api/templates?kind=scene_image&limit=50', {
    schema: fashionReadyTemplateIndexSchema
  });
  return response.items
    .filter(item => item.poseProxyReadiness.fashionCompatible)
    .map(item => item.id);
}

export function createFashionQuote(
  plan: FashionPlanInput,
  quotePurpose: 'full' | 'proof' | 'continuation' = 'full',
  approvedProofRunId?: string | null
) {
  return apiRequest('/api/fashion-blueprints/quotes', {
    method: 'POST',
    body: { plan, quotePurpose, approvedProofRunId },
    schema: fashionQuoteSchema
  });
}

export function createFashionRun(quoteId: string, plan: FashionPlanInput, idempotencyKey: string) {
  return apiRequest('/api/fashion-blueprints/runs', {
    method: 'POST',
    body: { quoteId, plan, idempotencyKey },
    schema: fashionRunSchema
  });
}

export function getFashionRun(runId: string, signal?: AbortSignal) {
  return apiRequest(`/api/fashion-blueprints/runs/${encodeURIComponent(runId)}`, {
    signal,
    schema: fashionRunSchema
  });
}

export function approveFashionProof(runId: string) {
  return apiRequest(
    `/api/fashion-blueprints/runs/${encodeURIComponent(runId)}/approve-proof`,
    {
      method: 'POST',
      body: {},
      schema: fashionRunSchema
    }
  );
}

export function listFashionRuns(signal?: AbortSignal) {
  return apiRequest('/api/fashion-blueprints/runs?limit=12', {
    signal,
    schema: fashionRunListSchema
  });
}
