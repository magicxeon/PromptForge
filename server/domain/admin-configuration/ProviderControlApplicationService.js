import { getPromptRefinementPolicy } from '../../config/prompt-refinement-policy.js';
import { getCinematicStoryEnhancementPolicy } from '../../config/cinematic-story-enhancement-policy.js';
import { getCinematicStoryPlanPolicy } from '../../config/cinematic-story-plan-policy.js';
import { getCinematicWardrobeSuggestionPolicy } from '../../config/cinematic-wardrobe-suggestion-policy.js';
import { getAttributeLocalizationPolicy } from '../../config/attribute-localization-policy.js';
import { getProviderRegistry } from '../../providers/ProviderRegistry.js';
import { providerControlRepository } from '../../repositories/admin-configuration/ProviderControlRepository.js';
import { RepositoryContractError } from '../../repositories/repositoryContracts.js';
import { adminFeaturePolicyService } from '../admin/AdminFeaturePolicyService.js';
import { adminPolicyService } from '../admin/AdminPolicyService.js';
import { auditService } from '../audit/AuditService.js';
import { videoCapabilityRegistry } from '../generation/VideoCapabilityRegistry.js';
import {
  isKnownProviderWorkflow,
  providerAvailabilityPolicyService
} from './ProviderAvailabilityPolicyService.js';

const IMAGE_WORKFLOWS = Object.freeze([
  'playground.image',
  'comparison.image',
  'studio.face',
  'studio.character_sheet',
  'studio.scene',
  'fashion.image',
  'cinematic.storyboard_image',
  'internal.template_pose_proxy'
]);
const VIDEO_WORKFLOWS = Object.freeze(['playground.video', 'cinematic.produce_video']);

export class ProviderControlApplicationService {
  constructor({
    repository = providerControlRepository,
    availabilityPolicy = providerAvailabilityPolicyService,
    imageRegistry = getProviderRegistry(),
    videoRegistry = videoCapabilityRegistry,
    policy = adminPolicyService,
    featurePolicy = adminFeaturePolicyService,
    audit = auditService,
    environment = process.env,
    now = () => new Date().toISOString()
  } = {}) {
    this.repository = repository;
    this.availabilityPolicy = availabilityPolicy;
    this.imageRegistry = imageRegistry;
    this.videoRegistry = videoRegistry;
    this.policy = policy;
    this.featurePolicy = featurePolicy;
    this.audit = audit;
    this.environment = environment;
    this.now = now;
  }

  async list(actorContext) {
    const actor = this.policy.assertCanAccessBackoffice(actorContext);
    await this.availabilityPolicy.reload();
    return this.#buildInventory(actor);
  }

  async applyCommand(input, actorContext, request = null) {
    const actor = this.policy.assertCanManageProviderControls(actorContext);
    this.featurePolicy.assertEnabled('providerRuntimeControl', actorContext);
    const command = this.#normalizeCommand(input, actor);
    const sourceInventory = this.#collectSourceInventory();
    assertKnownTarget(command, sourceInventory);

    const result = await this.repository.applyCommand(command);
    this.availabilityPolicy.replaceSnapshot(result.state);
    if (!result.replayed) {
      await this.audit.record({
        action: 'provider_runtime_control_changed',
        targetType: `provider_control_${command.targetType}`,
        targetId: targetId(command),
        reason: command.reason,
        beforeSnapshot: result.event.previous,
        afterSnapshot: {
          enabled: command.enabled,
          providerId: command.providerId,
          modelId: command.modelId,
          workflow: command.workflow,
          version: result.state.version
        }
      }, actorContext, request);
    }
    return {
      ...this.#buildInventory(actor, sourceInventory),
      command: { ...result.event, replayed: result.replayed }
    };
  }

  #buildInventory(actor, sourceInventory = this.#collectSourceInventory()) {
    const state = this.availabilityPolicy.getSnapshot();
    const exposure = this.featurePolicy.getExposure(actor).capabilities.providerRuntimeControl;
    const mutationAvailable = actor.role === 'admin' && exposure.enabled;
    return {
      schemaVersion: 1,
      version: state.version,
      updatedAt: state.updatedAt,
      mutationAvailable,
      mutationReason: mutationAvailable
        ? null
        : actor.role !== 'admin'
          ? 'Support access is read-only.'
          : exposure.reason,
      workflows: workflowCatalog(sourceInventory),
      providers: sourceInventory.providers.map(provider => presentProvider(provider, state, this.availabilityPolicy)),
      history: state.history.slice(0, 50)
    };
  }

  #collectSourceInventory() {
    const providers = new Map();
    addImageInventory(providers, this.imageRegistry.getAdminCatalog());
    addVideoInventory(providers, this.videoRegistry.getAdminCatalog(), this.environment);
    addTextInventory(providers, textPolicies(this.environment));
    return {
      providers: [...providers.values()]
        .map(provider => ({
          ...provider,
          mediaTypes: [...provider.mediaTypes].sort(),
          models: [...provider.models.values()]
            .map(model => ({ ...model, mediaTypes: [...model.mediaTypes].sort() }))
            .sort((a, b) => a.displayName.localeCompare(b.displayName))
        }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
    };
  }

  #normalizeCommand(input, actor) {
    const targetType = String(input?.targetType || '').trim();
    if (!['provider', 'model', 'workflow'].includes(targetType)) {
      throw contractError('provider_control_target_invalid', 'Provider control target is invalid.');
    }
    const providerId = String(input?.providerId || '').trim().toLowerCase();
    const modelId = targetType === 'provider' ? null : optionalString(input?.modelId);
    const workflow = targetType === 'workflow' ? optionalString(input?.workflow) : null;
    if (!providerId || (targetType !== 'provider' && !modelId)
      || (targetType === 'workflow' && (!workflow || !isKnownProviderWorkflow(workflow)))) {
      throw contractError('provider_control_target_invalid', 'Provider control target is incomplete or unknown.');
    }
    if (typeof input?.enabled !== 'boolean') {
      throw contractError('provider_control_enabled_invalid', 'Provider control enabled must be a boolean.');
    }
    const expectedVersion = Number(input?.expectedVersion);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
      throw contractError('provider_control_version_invalid', 'Provider control version is invalid.');
    }
    const reason = this.policy.requireReason(input?.reason, 'Provider control change');
    if (reason.length > 500) {
      throw contractError('provider_control_reason_invalid', 'Provider control reason must not exceed 500 characters.');
    }
    const commandId = optionalString(input?.commandId);
    if (!/^[a-zA-Z0-9:_-]{8,160}$/.test(commandId)) {
      throw contractError('provider_control_command_id_invalid', 'Provider control command ID is invalid.');
    }
    return {
      targetType,
      providerId,
      modelId,
      workflow,
      enabled: input.enabled,
      expectedVersion,
      reason,
      commandId,
      actorUserId: actor.userId,
      createdAt: this.now()
    };
  }
}

function addImageInventory(providers, catalog) {
  for (const sourceProvider of catalog.providers || []) {
    const provider = ensureProvider(providers, {
      providerId: sourceProvider.id,
      displayName: localizedName(sourceProvider.displayName, sourceProvider.id),
      configured: sourceProvider.configured,
      staticEnabled: sourceProvider.staticEnabled
    });
    provider.mediaTypes.add('image');
    for (const sourceModel of sourceProvider.models || []) {
      const workflows = supportedImageWorkflows(sourceModel);
      addModel(provider, {
        modelId: sourceModel.id,
        displayName: localizedName(sourceModel.displayName, sourceModel.id),
        mediaType: 'image',
        configured: sourceProvider.configured,
        staticEnabled: sourceProvider.staticEnabled && sourceModel.staticEnabled,
        routingEnabled: sourceModel.paidRoutingEnabled || sourceModel.testingRoutingEnabled,
        pricingStatus: sourceModel.pricingStatus,
        qualificationStatus: sourceModel.qualificationStatus,
        workflows: workflows.map(id => ({ id, staticEnabled: true }))
      });
    }
  }
}

function addVideoInventory(providers, catalog, environment) {
  for (const sourceModel of catalog.models || []) {
    const configured = videoProviderConfigured(sourceModel.providerId, environment);
    const provider = ensureProvider(providers, {
      providerId: sourceModel.providerId,
      displayName: sourceModel.providerId,
      configured,
      staticEnabled: true
    });
    provider.mediaTypes.add('video');
    addModel(provider, {
      modelId: sourceModel.modelId,
      displayName: sourceModel.displayName || sourceModel.modelId,
      mediaType: 'video',
      configured,
      staticEnabled: sourceModel.staticEnabled,
      routingEnabled: sourceModel.paidRoutingEnabled || (
        sourceModel.testingRoutingEnabled
        && (environment?.NODE_ENV || 'development') !== 'production'
        && environment?.VIDEO_PLAYGROUND_TESTING_ENABLED !== 'false'
      ),
      pricingStatus: sourceModel.pricingStatus,
      qualificationStatus: sourceModel.qualificationStatus,
      workflows: VIDEO_WORKFLOWS.map(id => ({ id, staticEnabled: true }))
    });
  }
}

function videoProviderConfigured(providerId, environment) {
  if (providerId === 'modelark') {
    return Boolean(environment?.['MODEL_ARK_API-KEY'] || environment?.MODEL_ARK_API || environment?.ARK_API_KEY);
  }
  if (providerId === 'gemini') return Boolean(environment?.GEMINI_API_KEY);
  return false;
}

function addTextInventory(providers, policies) {
  for (const entry of policies) {
    const provider = ensureProvider(providers, {
      providerId: entry.providerId,
      displayName: entry.providerId,
      configured: entry.configured,
      staticEnabled: entry.staticEnabled
    });
    provider.mediaTypes.add('ai_text');
    addModel(provider, {
      modelId: entry.modelId,
      displayName: entry.modelId,
      mediaType: 'ai_text',
      configured: entry.configured,
      staticEnabled: entry.staticEnabled,
      routingEnabled: entry.staticEnabled,
      pricingStatus: 'not_applicable',
      qualificationStatus: entry.configured ? 'configured' : 'unconfigured',
      workflows: [{ id: entry.workflow, staticEnabled: entry.staticEnabled }]
    });
  }
}

function ensureProvider(providers, input) {
  let provider = providers.get(input.providerId);
  if (!provider) {
    provider = {
      providerId: input.providerId,
      displayName: input.displayName,
      configured: input.configured === true,
      staticEnabled: input.staticEnabled !== false,
      mediaTypes: new Set(),
      models: new Map()
    };
    providers.set(input.providerId, provider);
  } else {
    provider.configured ||= input.configured === true;
    provider.staticEnabled ||= input.staticEnabled !== false;
  }
  return provider;
}

function addModel(provider, input) {
  let model = provider.models.get(input.modelId);
  if (!model) {
    model = {
      modelId: input.modelId,
      displayName: input.displayName,
      configured: input.configured === true,
      staticEnabled: input.staticEnabled !== false,
      routingEnabled: input.routingEnabled !== false,
      pricingStatus: input.pricingStatus || 'unknown',
      qualificationStatus: input.qualificationStatus || 'unknown',
      mediaTypes: new Set(),
      workflows: []
    };
    provider.models.set(input.modelId, model);
  } else {
    model.configured ||= input.configured === true;
    model.staticEnabled ||= input.staticEnabled !== false;
    model.routingEnabled ||= input.routingEnabled !== false;
  }
  model.mediaTypes.add(input.mediaType);
  for (const workflow of input.workflows) {
    const existing = model.workflows.find(item => item.id === workflow.id);
    if (existing) existing.staticEnabled ||= workflow.staticEnabled !== false;
    else model.workflows.push(workflow);
  }
  model.workflows.sort((a, b) => a.id.localeCompare(b.id));
}

function presentProvider(provider, state, policy) {
  const providerOverride = state.providers?.[provider.providerId]?.enabled ?? null;
  const providerDecision = policy.evaluate({ providerId: provider.providerId });
  const models = provider.models.map(model => presentModel(provider, model, state, policy));
  return {
    providerId: provider.providerId,
    displayName: provider.displayName,
    configured: provider.configured,
    staticEnabled: provider.staticEnabled,
    mediaTypes: provider.mediaTypes,
    masterOverride: providerOverride,
    runtimeEnabled: providerDecision.enabled,
    effectiveEnabled: provider.configured && provider.staticEnabled
      && providerDecision.enabled && models.some(model => model.effectiveEnabled),
    disabledScope: providerDecision.enabled ? null : providerDecision.scope,
    reason: providerDecision.reason,
    models
  };
}

function presentModel(provider, model, state, policy) {
  const key = `${provider.providerId}/${model.modelId}`;
  const modelOverride = state.models?.[key]?.enabled ?? null;
  const decision = policy.evaluate({ providerId: provider.providerId, modelId: model.modelId });
  const workflows = model.workflows.map(workflow => {
    const workflowKey = `${key}/${workflow.id}`;
    const workflowDecision = policy.evaluate({
      providerId: provider.providerId,
      modelId: model.modelId,
      workflow: workflow.id
    });
    const staticEnabled = workflow.staticEnabled !== false && model.staticEnabled;
    return {
      id: workflow.id,
      staticEnabled,
      override: state.workflows?.[workflowKey]?.enabled ?? null,
      runtimeEnabled: workflowDecision.enabled,
      effectiveEnabled: provider.configured && provider.staticEnabled && model.configured
        && model.routingEnabled && staticEnabled && workflowDecision.enabled,
      disabledScope: workflowDecision.enabled ? null : workflowDecision.scope,
      reason: workflowDecision.reason
    };
  });
  return {
    modelId: model.modelId,
    displayName: model.displayName,
    configured: model.configured,
    staticEnabled: model.staticEnabled,
    routingEnabled: model.routingEnabled,
    pricingStatus: model.pricingStatus,
    qualificationStatus: model.qualificationStatus,
    mediaTypes: model.mediaTypes,
    masterOverride: modelOverride,
    runtimeEnabled: decision.enabled,
    effectiveEnabled: workflows.some(workflow => workflow.effectiveEnabled),
    disabledScope: decision.enabled ? null : decision.scope,
    reason: decision.reason,
    workflows
  };
}

function supportedImageWorkflows(model) {
  const surfaces = new Set(model.allowedGenerationSurfaces || []);
  const modes = new Set(model.allowedGenerationModes || []);
  const surfaceAllowed = value => surfaces.size === 0 || surfaces.has(value);
  const modeAllowed = value => modes.size === 0 || modes.has(value);
  return IMAGE_WORKFLOWS.filter(workflow => {
    if (workflow === 'playground.image') return surfaceAllowed('playground') && modeAllowed('playground');
    if (workflow === 'studio.face') return surfaceAllowed('studio') && modeAllowed('headshot');
    if (workflow === 'studio.character_sheet') return surfaceAllowed('studio') && modeAllowed('character-sheet');
    if (workflow === 'studio.scene') return surfaceAllowed('studio') && modeAllowed('scene');
    if (workflow === 'fashion.image') return surfaceAllowed('fashion') && modeAllowed('fashion');
    if (workflow === 'cinematic.storyboard_image') return surfaceAllowed('cinematic');
    return true;
  });
}

function textPolicies(environment) {
  const refinement = getPromptRefinementPolicy(environment);
  const enhancement = getCinematicStoryEnhancementPolicy(environment);
  const storyPlan = getCinematicStoryPlanPolicy(environment);
  const wardrobe = getCinematicWardrobeSuggestionPolicy(environment);
  const localization = getAttributeLocalizationPolicy(environment);
  return [
    textPolicy(refinement, 'ai.prompt_refinement'),
    textPolicy(enhancement, 'ai.story_enhancement'),
    textPolicy(storyPlan, 'ai.story_plan'),
    textPolicy(storyPlan, 'ai.scene_direction'),
    textPolicy(storyPlan.fallback, 'ai.story_plan'),
    textPolicy(storyPlan.fallback, 'ai.scene_direction'),
    textPolicy(wardrobe, 'ai.wardrobe_suggestion'),
    textPolicy(localization, 'ai.attribute_localization')
  ];
}

function textPolicy(policy, workflow) {
  return {
    providerId: policy.provider,
    modelId: policy.model,
    workflow,
    configured: Boolean(policy.apiKey),
    staticEnabled: policy.requestedEnabled === true
  };
}

function workflowCatalog(inventory) {
  const inUse = new Set();
  for (const provider of inventory.providers) {
    for (const model of provider.models) {
      for (const workflow of model.workflows) inUse.add(workflow.id);
    }
  }
  return [...inUse].sort().map(id => ({ id, mediaType: workflowMediaType(id) }));
}

function workflowMediaType(id) {
  if (id.startsWith('ai.')) return 'ai_text';
  if (id.endsWith('.video') || id === 'cinematic.produce_video') return 'video';
  return 'image';
}

function assertKnownTarget(command, inventory) {
  const provider = inventory.providers.find(item => item.providerId === command.providerId);
  if (!provider) throw contractError('provider_control_target_unknown', 'Provider control target was not found.');
  if (command.targetType === 'provider') return;
  const model = provider.models.find(item => item.modelId === command.modelId);
  if (!model) throw contractError('provider_control_target_unknown', 'Provider model control target was not found.');
  if (command.targetType === 'workflow' && !model.workflows.some(item => item.id === command.workflow)) {
    throw contractError('provider_control_target_unknown', 'Provider workflow control target was not found.');
  }
}

function localizedName(value, fallback) {
  if (typeof value === 'string') return value;
  return String(value?.en || value?.th || fallback);
}

function optionalString(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function targetId(command) {
  return [command.providerId, command.modelId, command.workflow].filter(Boolean).join('/');
}

function contractError(code, message, statusCode = 400) {
  return new RepositoryContractError(code, message, statusCode);
}

export const providerControlApplicationService = new ProviderControlApplicationService();
