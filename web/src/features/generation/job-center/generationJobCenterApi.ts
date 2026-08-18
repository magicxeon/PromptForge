import { apiRequest } from '../../../lib/api/apiClient';
import { generationJobCenterSchema } from './generationJobCenterSchemas';

export function getGenerationJobCenter(limit = 12) {
  return apiRequest(`/api/generation/job-center?scope=all&limit=${encodeURIComponent(String(limit))}`, {
    schema: generationJobCenterSchema,
    cache: 'no-store'
  });
}

