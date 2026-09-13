import crypto from 'node:crypto';
import { cinematicKeyframeConfigurationService } from './CinematicKeyframeConfigurationService.js';

export function sceneEnvironmentContext(project, scene) {
  const policy = cinematicKeyframeConfigurationService.getCompilerConfiguration().providerPromptPolicy;
  const environmentPrompt = scene.environmentPrompt ?? [scene.location, scene.time,
    scene.artDirection, scene.lighting, scene.weather].filter(value => typeof value === 'string' && value.trim()).join('\n');
  const compiledPrompt = `${policy.environmentInstruction}\n\n${environmentPrompt}`;
  return { projectId: project.id, projectVersion: project.version, sceneId: scene.id,
    sceneVersion: scene.version || 1, environmentPrompt, compiledPrompt,
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
