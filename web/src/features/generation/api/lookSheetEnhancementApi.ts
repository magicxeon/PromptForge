import { z } from 'zod';
import { apiRequest } from '../../../lib/api/apiClient';
import { generationPayload, type GenerationRequestDraft } from './generationApi';

export const enhancementRecordSchema = z.object({
  id: z.string().max(100), status: z.enum(['quoted', 'accepted', 'dispatching', 'delivered', 'refund_pending', 'failed', 'succeeded', 'expired']),
  credits: z.number().int().positive(), expiresAt: z.string(), artifactExpiresAt: z.string(),
  errorCode: z.string().nullable(), prompt: z.string().max(40000).nullable(), originalPrompt: z.string().max(24000).nullable().optional()
});
export type EnhancementRecord = z.infer<typeof enhancementRecordSchema>;
export function quoteLookSheetEnhancement(draft: GenerationRequestDraft) {
  return apiRequest('/api/generation/look-sheet-enhancement/quote', { method: 'POST',
    body: generationPayload({ ...draft, lookSheetEnhancementId: null }), schema: enhancementRecordSchema });
}
export function executeLookSheetEnhancement(draft: GenerationRequestDraft, id: string) {
  return apiRequest('/api/generation/look-sheet-enhancement/execute', { method: 'POST',
    body: { ...generationPayload({ ...draft, lookSheetEnhancementId: null }), enhancementQuoteId: id }, schema: enhancementRecordSchema });
}
export function readLookSheetEnhancement(id: string) {
  return apiRequest(`/api/generation/look-sheet-enhancement/${encodeURIComponent(id)}`, { schema: enhancementRecordSchema });
}
