import crypto from 'node:crypto';
import { resolveWritingPreferences } from '../../config/storyWritingSettings.js';
import { cinematicKeyframeConfigurationService } from './CinematicKeyframeConfigurationService.js';

export function sceneEnvironmentSources(scene) {
  if (scene.environmentSources) return scene.environmentSources;
  const source = scene.approvedEnvironmentSource;
  return source ? [{ ...source, location: source.location || scene.location || scene.title }] : [];
}

export function storeSceneEnvironmentSource(scene, source, input, select = true) {
  const sources = [...sceneEnvironmentSources(scene)];
  const index = sources.findIndex(item => item.assetId === source.assetId);
  const previous = sources[index] || source;
  const entry = { ...source, location: input.location?.trim() ?? previous.location ?? (scene.location || scene.title) };
  const description = (input.description ?? previous.description)?.trim();
  if (description) entry.description = description;
  else delete entry.description;
  if (index < 0) sources.push(entry);
  else sources[index] = entry;
  scene.environmentSources = sources;
  if (select || scene.approvedEnvironmentSource?.assetId === entry.assetId) scene.approvedEnvironmentSource = entry;
}

export function sceneEnvironmentContext(project, scene) {
  const policy = cinematicKeyframeConfigurationService.getCompilerConfiguration().providerPromptPolicy;
  const environmentPrompt = scene.environmentPrompt?.trim() || [scene.location, scene.time, scene.synopsis,
    scene.artDirection, scene.lighting, scene.weather].filter(value => typeof value === 'string' && value.trim()).join('\n');
  const treatment = scene.lighting?.trim();
  const preferences = resolveWritingPreferences(project.writingSettings,"environment",scene);
  const directions = [...preferences.skillInstructions, environmentPrompt,
    treatment && !environmentPrompt.includes(treatment)
      ? `Scene atmosphere (apply to the setting and light): ${treatment}` : ''
  ].filter(Boolean);
  const compiledPrompt = [policy.environmentInstruction, ...directions].filter(Boolean).join('\n\n');
  const looksheetPrompt = [policy.environmentLooksheetInstruction, ...directions].filter(Boolean).join('\n\n');
  return { projectId: project.id, projectVersion: project.version, sceneId: scene.id,
    sceneVersion: scene.version || 1, environmentPrompt, compiledPrompt, looksheetPrompt,
    promptFingerprint: crypto.createHash('sha256').update(compiledPrompt).digest('hex'),
    approvedSource: scene.approvedEnvironmentSource || null,
    referenceEnabled: scene.environmentReferenceEnabled !== false };
}

export function normalizeCinematicSceneReference(value) {
  if (value == null) return null;
  if (typeof value.assetId !== 'string' || !value.assetId.trim() || value.assetId.length > 160
    || !/^[a-f0-9]{64}$/.test(value.contentHash || '')) {
    throw Object.assign(new Error('Scene reference binding is invalid.'), { code: 'cinematic_scene_reference_invalid', statusCode: 400 });
  }
  return { assetId: value.assetId.trim(), contentHash: value.contentHash };
}
