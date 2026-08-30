import { getCinematicWardrobeSuggestionPolicy } from '../../config/cinematic-wardrobe-suggestion-policy.js';
import { loadPromptRecipe } from '../../config/prompt-recipes/loadPromptRecipe.js';
import { OpenAITextProvider } from '../../providers/OpenAITextProvider.js';

export class CinematicWardrobeSuggestionService {
  constructor({
    policyLoader = getCinematicWardrobeSuggestionPolicy,
    recipeLoader = () => loadPromptRecipe('cinematic/wardrobe-suggestion.v1.json'),
    providerFactory = policy => new OpenAITextProvider(policy.apiKey)
  } = {}) {
    this.policyLoader = policyLoader;
    this.recipeLoader = recipeLoader;
    this.providerFactory = providerFactory;
  }

  async suggest(context = {}) {
    const policy = this.policyLoader();
    if (!policy.enabled) {
      throw createError(
        policy.requestedEnabled ? 'cinematic_wardrobe_suggestion_provider_unavailable' : 'cinematic_wardrobe_suggestion_disabled',
        'Cinematic wardrobe suggestion is not enabled.',
        503
      );
    }
    const recipe = this.recipeLoader();
    if (!recipe.enabled) throw createError('cinematic_wardrobe_recipe_disabled', 'Wardrobe Prompt Recipe is disabled.', 503);
    const normalized = normalizeContext(context, recipe.limits || {});
    const result = await this.providerFactory(policy).suggestCinematicWardrobe({
      context: normalized,
      recipe,
      model: policy.model,
      reasoningEffort: policy.reasoningEffort,
      maxOutputTokens: policy.maxOutputTokens,
      timeoutMs: policy.timeoutMs
    });
    return normalizeResult(result, policy, recipe);
  }
}

function normalizeContext(input, limits) {
  const assignment = input.assignment || {};
  return {
    project: {
      title: bounded(input.project?.title, 160),
      durationSeconds: Math.max(1, Number(input.project?.durationSeconds || 30)),
      aspectRatio: bounded(input.project?.aspectRatio, 20),
      platform: bounded(input.project?.platform, 40),
      storyBrief: bounded(input.project?.storyBrief, 800),
      creativeDirection: bounded(input.project?.creativeDirection, limits.maximumDirectionCharacters || 1200)
    },
    character: {
      displayName: bounded(assignment.displayName, 100),
      storyRole: bounded(assignment.storyRole, 100),
      objective: bounded(assignment.objective, 300),
      personalityTraits: stringList(assignment.personalityTraits, 8, 80),
      emotionalBaseline: bounded(assignment.emotionalBaseline, 160),
      performanceDirection: bounded(assignment.performanceDirection, 500)
    },
    scenes: (Array.isArray(input.scenes) ? input.scenes : []).slice(0, limits.maximumScenes || 8).map(scene => ({
      id: bounded(scene?.id, 100),
      title: bounded(scene?.title, 160),
      setting: bounded(scene?.setting || scene?.environment, 300),
      action: bounded(scene?.objective || scene?.action, 300)
    }))
  };
}

function normalizeResult(result, policy, recipe) {
  const wardrobeDirection = bounded(result?.wardrobeDirection, 1200);
  if (!wardrobeDirection) throw createError('cinematic_wardrobe_suggestion_invalid_response', 'Wardrobe suggestion is incomplete.');
  return {
    lookName: bounded(result.lookName, 100) || 'Story-aligned Look',
    wardrobeDirection,
    garments: {
      upper: bounded(result.garments?.upper, 240),
      lower: bounded(result.garments?.lower, 240),
      outerwear: bounded(result.garments?.outerwear, 240),
      footwear: bounded(result.garments?.footwear, 240),
      accessories: stringList(result.garments?.accessories, 6, 120)
    },
    palette: stringList(result.palette, 6, 60),
    materials: stringList(result.materials, 8, 80),
    sceneScope: result.sceneScope === 'scene_specific' ? 'scene_specific' : 'film_wide',
    recommendedSceneIds: stringList(result.recommendedSceneIds, 12, 100),
    rationale: bounded(result.rationale, 600),
    movementConstraints: stringList(result.movementConstraints, 8, 180),
    continuityNotes: stringList(result.continuityNotes, 8, 180),
    warnings: stringList(result.warnings, 8, 180),
    provenance: {
      provider: policy.provider,
      model: policy.model,
      responseId: result.responseId || null,
      recipeId: recipe.id,
      recipeVersion: recipe.version,
      recipeFingerprint: recipe.fingerprint
    },
    billingStatus: 'qualification_no_charge'
  };
}

function stringList(value, maximumItems, maximumLength) {
  return (Array.isArray(value) ? value : []).slice(0, maximumItems).map(item => bounded(item, maximumLength)).filter(Boolean);
}

function bounded(value, maximum) {
  return String(value || '').trim().slice(0, maximum);
}

function createError(code, message, statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

export const cinematicWardrobeSuggestionService = new CinematicWardrobeSuggestionService();
