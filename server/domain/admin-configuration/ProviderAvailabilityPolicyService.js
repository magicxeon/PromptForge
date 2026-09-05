import { providerControlRepository } from '../../repositories/admin-configuration/ProviderControlRepository.js';

export const PROVIDER_WORKFLOWS = Object.freeze([
  'playground.image',
  'playground.video',
  'comparison.image',
  'studio.face',
  'studio.character_sheet',
  'studio.scene',
  'fashion.image',
  'cinematic.storyboard_image',
  'cinematic.produce_video',
  'internal.template_pose_proxy',
  'ai.prompt_refinement',
  'ai.story_enhancement',
  'ai.story_plan',
  'ai.scene_direction',
  'ai.wardrobe_suggestion',
  'ai.attribute_localization'
]);

const WORKFLOW_SET = new Set(PROVIDER_WORKFLOWS);

export class ProviderRuntimeDisabledError extends Error {
  constructor(decision) {
    super(disabledMessage(decision));
    this.name = 'ProviderRuntimeDisabledError';
    this.code = 'provider_runtime_disabled';
    this.statusCode = 409;
    this.details = {
      providerId: decision.providerId,
      modelId: decision.modelId || null,
      workflow: decision.workflow || null,
      scope: decision.scope,
      reason: decision.reason || null,
      disabledAt: decision.updatedAt || null
    };
  }
}

export class ProviderAvailabilityPolicyService {
  constructor({ repository = providerControlRepository, initialState = null } = {}) {
    this.repository = repository;
    this.state = initialState
      ? structuredClone(initialState)
      : repository.getStateSync?.() || emptyState();
  }

  getVersion() {
    return Number(this.state?.version || 0);
  }

  getSnapshot() {
    return structuredClone(this.state);
  }

  replaceSnapshot(state) {
    this.state = structuredClone(state || emptyState());
    return this.getSnapshot();
  }

  async reload() {
    return this.replaceSnapshot(await this.repository.getState());
  }

  evaluate({ providerId, modelId = null, workflow = null } = {}) {
    const provider = normalizeId(providerId);
    const model = normalizeOptional(modelId);
    const workflowId = normalizeOptional(workflow);
    const providerOverride = this.state.providers?.[provider];
    if (providerOverride?.enabled === false) {
      return disabledDecision('provider', provider, model, workflowId, providerOverride);
    }
    const modelOverride = model ? this.state.models?.[`${provider}/${model}`] : null;
    if (modelOverride?.enabled === false) {
      return disabledDecision('model', provider, model, workflowId, modelOverride);
    }
    const workflowOverride = model && workflowId
      ? this.state.workflows?.[`${provider}/${model}/${workflowId}`]
      : null;
    if (workflowOverride?.enabled === false) {
      return disabledDecision('workflow', provider, model, workflowId, workflowOverride);
    }
    return {
      enabled: true,
      scope: 'inherited',
      providerId: provider,
      modelId: model,
      workflow: workflowId,
      reason: null,
      updatedAt: null
    };
  }

  assertAvailable(input) {
    const decision = this.evaluate(input);
    if (!decision.enabled) throw new ProviderRuntimeDisabledError(decision);
    return decision;
  }
}

export function resolveImageProviderWorkflow({
  workflow = null,
  generationSurface = null,
  generationMode = null
} = {}) {
  const explicit = normalizeOptional(workflow);
  if (explicit) return explicit;
  const surface = normalizeOptional(generationSurface);
  const mode = normalizeOptional(generationMode);
  if (surface === 'playground') return 'playground.image';
  if (surface === 'fashion' || mode === 'fashion') return 'fashion.image';
  if (surface === 'cinematic') return 'cinematic.storyboard_image';
  if (surface === 'template_pose_proxy') return 'internal.template_pose_proxy';
  if (surface === 'studio' && mode === 'headshot') return 'studio.face';
  if (surface === 'studio' && mode === 'character-sheet') return 'studio.character_sheet';
  if (surface === 'studio' && mode === 'scene') return 'studio.scene';
  return null;
}

export function resolveVideoProviderWorkflow(workflowContext = null) {
  return workflowContext?.capability === 'cinematic'
    ? 'cinematic.produce_video'
    : 'playground.video';
}

export function isKnownProviderWorkflow(value) {
  return WORKFLOW_SET.has(String(value || '').trim());
}

function disabledDecision(scope, providerId, modelId, workflow, record) {
  return {
    enabled: false,
    scope,
    providerId,
    modelId,
    workflow,
    reason: record.reason || null,
    updatedAt: record.updatedAt || null
  };
}

function disabledMessage(decision) {
  const target = decision.scope === 'provider'
    ? `Provider "${decision.providerId}"`
    : decision.scope === 'model'
      ? `Model "${decision.providerId}/${decision.modelId}"`
      : `Model "${decision.providerId}/${decision.modelId}" for ${decision.workflow}`;
  return `${target} is disabled by an Admin runtime control.`;
}

function normalizeId(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeOptional(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function emptyState() {
  return {
    schemaVersion: 1,
    version: 0,
    updatedAt: null,
    providers: {},
    models: {},
    workflows: {},
    history: []
  };
}

export const providerAvailabilityPolicyService = new ProviderAvailabilityPolicyService();
