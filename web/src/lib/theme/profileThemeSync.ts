import { z } from 'zod';
import { apiRequest } from '../api/apiClient';
import type { ResolvedTheme } from './themeContract';

const ownProfilePresentationSchema = z.object({
  recordVersion: z.number().int().positive(),
  presentation: z.record(z.string(), z.unknown()).default({})
}).passthrough();

export async function syncCreatorProfileTheme(profileTheme: ResolvedTheme) {
  const profile = await apiRequest('/api/community/creator-profiles/me', {
    schema: ownProfilePresentationSchema
  });

  return apiRequest('/api/community/creator-profiles/me/presentation', {
    method: 'PATCH',
    body: {
      recordVersion: profile.recordVersion,
      presentation: {
        ...profile.presentation,
        profileTheme
      }
    },
    schema: ownProfilePresentationSchema
  });
}
