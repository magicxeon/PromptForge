import { readFileSync } from 'node:fs';
import { getProviderRegistry, getConfiguredSecret } from '../../providers/ProviderRegistry.js';
import { providerAvailabilityPolicyService } from '../admin-configuration/ProviderAvailabilityPolicyService.js';
import { speechError } from './SpeechRequestCompiler.js';
import { seedSpeechCredentials } from '../../providers/SeedSpeechProvider.js';
export function loadSpeechCatalog() {
  try {
    const load = name => JSON.parse(readFileSync(new URL(`../../config/voice-studio/${name}.v1.json`, import.meta.url), 'utf8'));
    const models = load('models'), voices = load('voices'), policy = load('policy');
    if ([models, voices, policy].some(item => item.schemaVersion !== 1) || !models.models.length || !voices.voices.length
      || new Set(models.models.map(item => item.id)).size !== models.models.length
      || new Set(voices.voices.map(item => item.id)).size !== voices.voices.length
      || !models.models.some(item => item.id === models.defaultModelId)
      || !['maxRows', 'maxTextLength', 'maxStyleLength', 'maxAudioBytes', 'maxDocuments', 'maxCharacters', 'maxTakes', 'maxTitleLength', 'maxTags', 'maxTagLength', 'maxPageSize', 'pageSize', 'maxConcurrentPerActor'].every(key => Number.isSafeInteger(policy[key]) && policy[key] > 0)
      || !Array.isArray(policy.inlineTags)) throw new Error('Invalid speech catalog');
    if (!['maxDesignLength', 'maxCustomVoices', 'maxDesignCandidates', 'maxProjectVoices', 'seedDraftLifetimeHours'].every(key => Number.isSafeInteger(policy[key]) && policy[key] > 0)
      || policy.maxProjectVoices > 200 || policy.maxDesignCandidates > policy.maxCustomVoices
      || !Array.isArray(policy.eventGroups) || !Array.isArray(policy.eventToolbarTags)
      || !policy.eventToolbarTags.every(tag => policy.inlineTags.includes(tag))
      || !policy.eventGroups.every(group => typeof group.id === 'string' && typeof group.labelKey === 'string' && Array.isArray(group.tags) && group.tags.every(tag => policy.inlineTags.includes(tag)))
      || new Set(policy.eventGroups.map(group => group.id)).size !== policy.eventGroups.length) throw new Error('Invalid voice design policy');
    const positive = value => Number.isSafeInteger(value) && value > 0;
    for (const model of models.models) if (!(model.adapterKey === 'gemini-speech' && model.providerId === 'gemini'
      && positive(model.limits?.inputTokens) && positive(model.limits?.outputTokens)
      || model.adapterKey === 'seed-speech' && model.providerId === 'byteplus-seed-speech'
      && typeof model.providerModelId === 'string' && positive(model.limits?.promptCharacters)
      && positive(model.limits?.referenceSeconds) && model.limits.referenceSeconds <= 30
      && Array.isArray(model.capabilities?.designSources) && model.capabilities.designSources.includes('description')
      && model.capabilities.designSources.includes('reference')
      && positive(model.limits?.originalSeconds) && model.limits.originalSeconds <= 120)
      || typeof model.id !== 'string' || !/^[a-z0-9._-]+$/.test(model.id) || typeof model.displayName !== 'string'
      || typeof model.enabled !== 'boolean' || !Array.isArray(model.capabilities?.languages) || !model.capabilities.languages.length) throw new Error('Invalid model');
    for (const voice of voices.voices) if (typeof voice.id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(voice.id)
      || typeof voice.displayName !== 'string' || !Array.isArray(voice.modelIds) || !voice.modelIds.length
      || !voice.modelIds.every(id => models.models.some(model => model.id === id))) throw new Error('Invalid voice');
    return { ...models, voices: voices.voices, policy };
  } catch { throw speechError('speech_catalog_unavailable', 503); }
}
export function assertSpeechAvailable(model) {
  const provider = model.adapterKey === 'seed-speech' ? seedSpeechCredentials : getProviderRegistry().getProvider(model.providerId);
  if (!provider || provider.enabled === false || !getConfiguredSecret(process.env, provider)) throw speechError('speech_provider_unavailable', 503);
  providerAvailabilityPolicyService.assertAvailable({ providerId: model.providerId, modelId: model.id, workflow: 'voice-studio.speech' });
}
