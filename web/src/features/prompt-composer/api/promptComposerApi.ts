import { apiRequest } from '../../../lib/api/apiClient';
import { promptProposalResponseSchema } from '../schemas/promptComposerSchemas';

export function createPromptProposal(freeTextIdea: string) {
  return apiRequest('/api/prompt-composer/proposals', {
    method: 'POST',
    body: { freeTextIdea, generationMode: 'playground', language: 'auto' },
    schema: promptProposalResponseSchema
  });
}
