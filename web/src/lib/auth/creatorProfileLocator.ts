import { z } from 'zod';
import { apiRequest } from '../api/apiClient';

export const ownCreatorProfileLocatorSchema = z.object({
  id: z.string(),
  handle: z.string(),
  displayName: z.string()
}).passthrough();

export function getOwnCreatorProfileLocator() {
  return apiRequest('/api/community/creator-profiles/me', {
    schema: ownCreatorProfileLocatorSchema
  });
}
