import crypto from 'node:crypto';
import { normalizeStoryIntent, storyAuthoringConfiguration, storyCountryStyleGuidance } from '../../config/cinematicStoryConfiguration.js';
import { getCinematicStoryEnhancementPolicy } from '../../config/cinematic-story-enhancement-policy.js';
import { OpenAITextProvider } from '../../providers/OpenAITextProvider.js';
import { providerAvailabilityPolicyService } from '../admin-configuration/ProviderAvailabilityPolicyService.js';

export class CinematicStoryEnhancementService {
  constructor({
    policyLoader = getCinematicStoryEnhancementPolicy,
    providerFactory = policy => new OpenAITextProvider(policy.apiKey),
    availabilityPolicy = providerAvailabilityPolicyService
  } = {}) {
    this.policyLoader = policyLoader;
    this.providerFactory = providerFactory;
    this.availabilityPolicy = availabilityPolicy;
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
    this.availabilityPolicy.assertAvailable({
      providerId: policy.provider,
      modelId: policy.model,
      workflow: 'ai.story_enhancement'
    });
    const result = await this.providerFactory(policy).enhanceCinematicStory({
      story,
      model: policy.model,
      reasoningEffort: policy.reasoningEffort,
      maxOutputTokens: policy.maxOutputTokens,
      timeoutMs: policy.timeoutMs
    });
    return normalizeResult(result, policy, story);
  }
}

function normalizeInput(input) {
  const purpose = input.purpose ?? 'story';
  if (!['story', 'roles'].includes(purpose)) throw createError('cinematic_story_purpose_invalid', 'Select a supported story operation.');
  const storyBrief = String(input.storyBrief || '').trim();
  if (!storyBrief || storyBrief.length > storyAuthoringConfiguration.limits.storyBrief) {
    throw createError('cinematic_story_brief_invalid', `Story brief is required and must not exceed ${storyAuthoringConfiguration.limits.storyBrief} characters.`);
  }
  const creativeDirection = String(input.creativeDirection || '').trim();
  if (creativeDirection.length > storyAuthoringConfiguration.limits.creativeDirection) throw createError('cinematic_creative_direction_invalid', 'Creative direction exceeds the configured limit.');
  return {
    purpose,
    existingRolePlan: (Array.isArray(input.storyRoleSlots) ? input.storyRoleSlots : []).slice(0, 4).map(role => ({
      label: String(role?.label || '').slice(0, 80),
      importance: role?.importance === 'optional' ? 'optional' : 'required',
      storyFunction: String(role?.storyFunction || '').slice(0, 240),
      relationshipHint: String(role?.relationshipHint || '').slice(0, 160)
    })),
    storyBrief,
    creativeDirection,
    platform: String(input.platform || 'tiktok'),
    durationSeconds: Number(input.durationSeconds || 30),
    ...normalizeStoryIntent(input),
    storyCountryStyleGuidance: storyCountryStyleGuidance(input),
    endingIntent: String(input.endingIntent || 'resolved'),
    castPlanningMode: String(input.castPlanningMode || 'ai-recommended')
  };
}

function normalizeResult(result, policy, story) {
  const enhancedStoryBrief = story.purpose === 'roles' ? story.storyBrief : String(result?.enhancedStoryBrief || '').trim();
  const creativeDirection = story.purpose === 'roles' ? story.creativeDirection : String(result?.creativeDirection || '').trim();
  if (!enhancedStoryBrief || enhancedStoryBrief.length > storyAuthoringConfiguration.limits.storyBrief || creativeDirection.length > storyAuthoringConfiguration.limits.creativeDirection) {
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
  if (story.purpose === 'roles' && !recommendedRoles.length) throw createError('cinematic_story_enhancement_invalid_response', 'Role analysis did not recommend any story roles.');
  return {
    purpose: story.purpose,
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
