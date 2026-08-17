import { apiRequest } from '../../../lib/api/apiClient';
import {
  attributeCatalogDraftSchema,
  attributeCatalogOverviewSchema,
  attributeDefinitionsResponseSchema
} from '../schemas/attributeCatalogSchemas';

export type AttributeDefinitionFilters = {
  category?: string;
  subcategory?: string;
  optionId?: string;
  search?: string;
  status?: 'enabled' | 'disabled' | '';
  presentationKind?: 'visual' | 'text' | '';
  draftId?: string;
  offset?: number;
  limit?: number;
};

export function listAttributeDefinitions(filters: AttributeDefinitionFilters, signal?: AbortSignal) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return apiRequest(`/api/admin/attribute-catalog/definitions?${params}`, {
    schema: attributeDefinitionsResponseSchema,
    signal
  });
}

export function getAttributeCatalogOverview(signal?: AbortSignal) {
  return apiRequest('/api/admin/attribute-catalog/overview', {
    schema: attributeCatalogOverviewSchema,
    signal
  });
}

export function createAttributeCatalogDraft(title: string) {
  return apiRequest('/api/admin/attribute-catalog/drafts', {
    method: 'POST',
    body: { title },
    schema: attributeCatalogDraftSchema
  });
}

export function getAttributeCatalogDraft(draftId: string, signal?: AbortSignal) {
  return apiRequest(`/api/admin/attribute-catalog/drafts/${encodeURIComponent(draftId)}`, {
    schema: attributeCatalogDraftSchema,
    signal
  });
}

export function saveAttributeCatalogOption(draftId: string, input: {
  expectedRevision: number;
  option: Record<string, unknown>;
}) {
  return apiRequest(`/api/admin/attribute-catalog/drafts/${encodeURIComponent(draftId)}/option`, {
    method: 'PUT',
    body: input,
    schema: attributeCatalogDraftSchema
  });
}
