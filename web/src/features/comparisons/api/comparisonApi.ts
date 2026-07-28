import { apiRequest } from '../../../lib/api/apiClient';
import { z } from 'zod';
import {
  comparisonMutationSchema,
  comparisonPageSchema,
  comparisonSetSchema
} from '../schemas/comparisonSchemas';

const publishedComparisonSchema = z.object({
  id: z.string()
}).passthrough();

export function listComparisons(cursor?: string | null) {
  const query = new URLSearchParams({ limit: '18' });
  if (cursor) query.set('cursor', cursor);
  return apiRequest(`/api/comparisons?${query}`, { schema: comparisonPageSchema });
}

export function getComparison(setId: string, signal?: AbortSignal) {
  return apiRequest(`/api/comparisons/${encodeURIComponent(setId)}`, {
    schema: comparisonSetSchema,
    signal
  });
}

export function updateComparison(
  setId: string,
  input: { name?: string; description?: string }
) {
  return apiRequest(`/api/comparisons/${encodeURIComponent(setId)}`, {
    method: 'PATCH',
    body: input,
    schema: comparisonSetSchema
  });
}

export function setComparisonWinner(setId: string, jobId: string | null) {
  return apiRequest(`/api/comparisons/${encodeURIComponent(setId)}/winner`, {
    method: 'PATCH',
    body: { jobId },
    schema: comparisonSetSchema
  });
}

export function deleteComparison(setId: string) {
  return apiRequest(`/api/comparisons/${encodeURIComponent(setId)}`, {
    method: 'DELETE',
    schema: comparisonMutationSchema
  });
}

export function publishComparisonToCommunity(
  setId: string,
  input: {
    title: string;
    description: string;
    promptVisibility: 'full' | 'private';
  }
) {
  return apiRequest(`/api/community/comparisons/${encodeURIComponent(setId)}/publish`, {
    method: 'POST',
    body: input,
    schema: publishedComparisonSchema
  });
}
