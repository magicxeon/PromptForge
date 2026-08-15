import { apiRequest } from '../../../lib/api/apiClient';
import {
  collectionListSchema,
  collectionMutationSchema,
  collectionSchema
} from '../schemas/collectionSchemas';
import { z } from 'zod';

const publishedCollectionSchema = z.object({
  id: z.string()
}).passthrough();

export function listCollections() {
  return apiRequest('/api/collections', { schema: collectionListSchema });
}

export function getCollection(collectionId: string) {
  return apiRequest(`/api/collections/${encodeURIComponent(collectionId)}`, {
    schema: collectionSchema
  });
}

export function createCollection(input: { name: string; description?: string }) {
  return apiRequest('/api/collections', {
    method: 'POST',
    body: input,
    schema: collectionSchema
  });
}

export function updateCollection(
  collectionId: string,
  input: { name?: string; description?: string; story?: string }
) {
  return apiRequest(`/api/collections/${encodeURIComponent(collectionId)}`, {
    method: 'PATCH',
    body: input,
    schema: collectionSchema
  });
}

export function deleteCollection(collectionId: string) {
  return apiRequest(`/api/collections/${encodeURIComponent(collectionId)}`, {
    method: 'DELETE',
    schema: collectionMutationSchema
  });
}

export function setDefaultCollection(collectionId: string) {
  return apiRequest(`/api/collections/${encodeURIComponent(collectionId)}/default`, {
    method: 'PUT',
    schema: collectionMutationSchema
  });
}

export function addImageToCollection(collectionId: string, jobId: string) {
  return apiRequest(`/api/collections/${encodeURIComponent(collectionId)}/images`, {
    method: 'POST',
    body: { jobIds: [jobId] },
    schema: collectionMutationSchema
  });
}

export function removeImageFromCollection(collectionId: string, jobId: string) {
  return apiRequest(
    `/api/collections/${encodeURIComponent(collectionId)}/images/${encodeURIComponent(jobId)}`,
    { method: 'DELETE', schema: collectionMutationSchema }
  );
}

export function publishCollectionToCommunity(
  collectionId: string,
  input: { title: string; description: string }
) {
  return apiRequest(`/api/community/collections/${encodeURIComponent(collectionId)}/publish`, {
    method: 'POST',
    body: input,
    schema: publishedCollectionSchema
  });
}
