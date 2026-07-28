import { z } from 'zod';
import { apiRequest } from '../../../lib/api/apiClient';
import { collectionsSchema, historyItemSchema, historyPageSchema } from '../schemas/historySchemas';

export function listHistory(cursor?: string | null, collectionId = 'all') {
  const query = new URLSearchParams({ limit: '24', collectionId });
  if (cursor) query.set('cursor', cursor);
  return apiRequest(`/api/history?${query}`, { schema: historyPageSchema });
}

export function getHistoryItem(jobId: string) {
  return apiRequest(`/api/history/${encodeURIComponent(jobId)}`, { schema: historyItemSchema });
}

export function deleteHistoryItem(jobId: string) {
  return apiRequest(`/api/history/${encodeURIComponent(jobId)}`, {
    method: 'DELETE',
    schema: z.object({ success: z.boolean() })
  });
}

export function listCollections() {
  return apiRequest('/api/collections', { schema: collectionsSchema });
}
