import { createStructuredPromptProposal } from './PromptComposerMapper.js';

export class PromptComposerService {
  async compose({ freeTextIdea, generationMode, language }, { actorContext, attributesBundle }) {
    if (!actorContext?.userId) {
      const error = new Error('An active user is required to compose a prompt proposal.');
      error.code = 'actor_context_required';
      error.statusCode = 401;
      throw error;
    }
    return createStructuredPromptProposal({ freeTextIdea, generationMode, language }, attributesBundle);
  }
}

export const promptComposerService = new PromptComposerService();
