import { apiRequest } from '../../../lib/api/apiClient';
import {
  fashionAssetSchema,
  fashionQuoteSchema,
  fashionRunSchema
} from '../schemas/fashionSchemas';

export type FashionPlanInput = {
  templateId: string;
  templateUseSessionId: string;
  characterProfileContext: Record<string, unknown>;
  productItems: Array<{
    key: string;
    name: string;
    productType: string;
    references: Record<string, string | null | undefined>;
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

export function uploadFashionReference(dataUrl: string, role: string) {
  return apiRequest('/api/fashion-blueprints/assets', {
    method: 'POST',
    body: { dataUrl, role },
    schema: fashionAssetSchema
  });
}

export function createFashionQuote(plan: FashionPlanInput) {
  return apiRequest('/api/fashion-blueprints/quotes', {
    method: 'POST',
    body: plan,
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
