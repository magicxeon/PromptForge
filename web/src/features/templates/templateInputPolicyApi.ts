import { z } from 'zod';
import { apiRequest } from '../../lib/api/apiClient';

export const templateInputPolicySchema = z.object({
  policyId: z.literal('character-outfit-v1'),
  supported: z.boolean(),
  characterAvailable: z.boolean(),
  outfitBackAvailable: z.boolean(),
  characterEnabled: z.boolean(),
  outfitBackEnabled: z.boolean(),
  removedFields: z.array(z.string()).default([])
});
const ownerPolicySchema = templateInputPolicySchema.extend({
  templateId: z.string(), templateVersionId: z.string()
});
export type TemplateInputPolicy = z.infer<typeof templateInputPolicySchema>;
export type TemplateInputOptions = Pick<TemplateInputPolicy, 'characterEnabled' | 'outfitBackEnabled'>;

export function getTemplateInputPolicy(templateId: string) {
  return apiRequest(`/api/templates/${encodeURIComponent(templateId)}/input-policy`, { schema: ownerPolicySchema });
}
