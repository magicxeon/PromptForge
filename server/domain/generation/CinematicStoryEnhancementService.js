import crypto from 'node:crypto';
import { getCinematicStoryEnhancementPolicy } from '../../config/cinematic-story-enhancement-policy.js';
import { OpenAITextProvider } from '../../providers/OpenAITextProvider.js';

export class CinematicStoryEnhancementService {
  constructor({
    policyLoader = getCinematicStoryEnhancementPolicy,
    providerFactory = policy => new OpenAITextProvider(policy.apiKey)
  } = {}) {
    this.policyLoader = policyLoader;
    this.providerFactory = providerFactory;
  }

  async enhance(input = {}) {
    const policy = this.policyLoader();
    if (!policy.enabled) {
      const error = new Error('Cinematic story enhancement is not enabled.');
      error.code = policy.requestedEnabled
        ? 'cinematic_story_enhancement_provider_unavailable'
        : 'cinematic_story_enhancement_disabled';
      error.statusCode = 503;
      throw error;
    }
    const story = normalizeInput(input);
    const result = await this.providerFactory(policy).enhanceCinematicStory({
      story,
      model: policy.model,
      reasoningEffort: policy.reasoningEffort,
      maxOutputTokens: policy.maxOutputTokens,
      timeoutMs: policy.timeoutMs
    });
    return normalizeResult(result, policy);
  }
}

function normalizeInput(input) {
  const storyBrief = String(input.storyBrief || '').trim();
  if (!storyBrief || storyBrief.length > 600) {
    throw createError('cinematic_story_brief_invalid', 'Story brief is required and must not exceed 600 characters.');
  }
  return {
    storyBrief,
    creativeDirection: String(input.creativeDirection || '').trim().slice(0, 800),
    platform: String(input.platform || 'tiktok'),
    durationSeconds: Number(input.durationSeconds || 30),
    genre: String(input.genre || 'drama'),
    audienceFeeling: String(input.audienceFeeling || 'moved'),
    pacing: String(input.pacing || 'balanced'),
    endingIntent: String(input.endingIntent || 'resolved'),
    castPlanningMode: String(input.castPlanningMode || 'ai-recommended')
  };
}

function normalizeResult(result, policy) {
  const enhancedStoryBrief = String(result?.enhancedStoryBrief || '').trim();
  const creativeDirection = String(result?.creativeDirection || '').trim();
  if (!enhancedStoryBrief || enhancedStoryBrief.length > 600 || creativeDirection.length > 800) {
    throw createError('cinematic_story_enhancement_invalid_response', 'Story enhancement response exceeds the supported limits.');
  }
  const recommendedRoles = (result.recommendedRoles || []).slice(0, 4).map((role, index) => ({
    id: `role_${slug(role.label) || index + 1}_${crypto.randomBytes(2).toString('hex')}`,
    label: String(role.label || `Role ${index + 1}`).trim().slice(0, 80),
    importance: role.importance === 'optional' ? 'optional' : 'required',
    storyFunction: String(role.storyFunction || '').trim().slice(0, 240),
    relationshipHint: String(role.relationshipHint || '').trim().slice(0, 160),
    objective: String(role.objective || '').trim().slice(0, 240),
    emotionalArc: String(role.emotionalArc || '').trim().slice(0, 240),
    personalityTraits: (role.personalityTraits || []).slice(0, 6).map(value => String(value).trim().slice(0, 80)).filter(Boolean),
    performanceDirection: String(role.performanceDirection || '').trim().slice(0, 320)
  }));
  if (!recommendedRoles.length) throw createError('cinematic_story_enhancement_invalid_response', 'Story enhancement did not recommend any story roles.');
  return {
    enhancementId: `cineenh_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    enhancedStoryBrief,
    creativeDirection,
    premise: String(result.premise || '').trim(),
    conflict: String(result.conflict || '').trim(),
    emotionalArc: String(result.emotionalArc || '').trim(),
    ending: String(result.ending || '').trim(),
    candidateScenes: (result.candidateScenes || []).slice(0, 5).map(value => String(value).trim()).filter(Boolean),
    recommendedRoles,
    warnings: (result.warnings || []).slice(0, 8).map(value => String(value).trim()).filter(Boolean),
    provenance: { provider: policy.provider, model: policy.model, responseId: result.responseId || null },
    billingStatus: 'qualification_no_charge'
  };
}

function slug(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32);
}

function createError(code, message) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = 400;
  return error;
}

export const cinematicStoryEnhancementService = new CinematicStoryEnhancementService();
