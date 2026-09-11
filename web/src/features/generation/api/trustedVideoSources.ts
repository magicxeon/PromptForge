import { z } from 'zod';
import { apiRequest } from '../../../lib/api/apiClient';

export const trustedVideoSourceSchema = z.object({
  id: z.string(), previewUrl: z.string(), modelId: z.string(), generationMode: z.string(),
  generatedAt: z.string().nullable(), expiresAt: z.string().nullable(),
  eligible: z.boolean(), reason: z.string().nullable(), policyVersion: z.string(),
  category: z.enum(['look-sheet', 'image']).optional(),
});
const pageSchema = z.object({
  items: z.array(trustedVideoSourceSchema), hasMore: z.boolean().default(false),
  nextCursor: z.string().nullable().optional(),
});
export type TrustedVideoSource = z.infer<typeof trustedVideoSourceSchema>;
export function listTrustedVideoSources(cursor?: string | null, category?: 'look-sheet') {
  return apiRequest(
    `/api/generation/video/trusted-sources?eligibleOnly=true${category ? `&category=${category}` : ''}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
    { schema: pageSchema, cache: 'no-store' },
  );
}
