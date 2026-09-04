import assert from 'node:assert/strict';
import test from 'node:test';
import { CinematicKeyframeConfigurationService } from '../server/domain/cinematic/CinematicKeyframeConfigurationService.js';

test('Cinematic keyframe configuration loads a stable validated fingerprint', () => {
  const first = new CinematicKeyframeConfigurationService();
  const second = new CinematicKeyframeConfigurationService();
  const configuration = first.getCompilerConfiguration();
  assert.equal(configuration.policy.contractVersion, 'cinematic-storyboard-keyframe-v2');
  assert.equal(configuration.captureProfile.id, 'photorealistic-cinematic');
  assert.equal(configuration.providerPromptPolicy.id, 'cinematic-storyboard-provider-prompt-policy');
  assert.equal(configuration.providerPromptPolicy.providerMaximumPromptCharacters.modelark, 4700);
  assert.equal(configuration.fingerprint, second.getCompilerConfiguration().fingerprint);
  assert.equal(
    configuration.providerPromptFingerprint,
    second.getCompilerConfiguration().providerPromptFingerprint
  );
  assert.match(configuration.providerPromptFingerprint, /^[a-f0-9]{16}$/);
});

test('provider prompt policy changes do not stale an approved visual keyframe', () => {
  const valid = new CinematicKeyframeConfigurationService().getCompilerConfiguration();
  const changed = new CinematicKeyframeConfigurationService({
    policy: valid.policy,
    budget: valid.budget,
    captureProfile: valid.captureProfile,
    providerPromptPolicy: {
      ...valid.providerPromptPolicy,
      version: valid.providerPromptPolicy.version + 1
    }
  }).getCompilerConfiguration();

  assert.equal(changed.fingerprint, valid.fingerprint);
  assert.notEqual(changed.providerPromptFingerprint, valid.providerPromptFingerprint);
});

test('Cinematic keyframe configuration rejects an incomplete prompt budget', () => {
  const valid = new CinematicKeyframeConfigurationService().getCompilerConfiguration();
  assert.throws(() => new CinematicKeyframeConfigurationService({
    policy: valid.policy,
    captureProfile: valid.captureProfile,
    budget: {
      ...valid.budget,
      sectionCharacterLimits: { ...valid.budget.sectionCharacterLimits, performance: 0 }
    }
  }), /prompt budget for performance/i);
});

test('Cinematic keyframe configuration rejects provider blocks that can exceed the final budget', () => {
  const valid = new CinematicKeyframeConfigurationService().getCompilerConfiguration();
  assert.throws(() => new CinematicKeyframeConfigurationService({
    policy: valid.policy,
    budget: valid.budget,
    captureProfile: valid.captureProfile,
    providerPromptPolicy: {
      ...valid.providerPromptPolicy,
      blockCharacterLimits: {
        ...valid.providerPromptPolicy.blockCharacterLimits,
        referenceAuthority: 2000
      }
    }
  }), /block limits exceed a provider maximum/i);
});
