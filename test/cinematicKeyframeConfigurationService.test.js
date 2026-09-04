import assert from 'node:assert/strict';
import test from 'node:test';
import { CinematicKeyframeConfigurationService } from '../server/domain/cinematic/CinematicKeyframeConfigurationService.js';

test('Cinematic keyframe configuration loads a stable validated fingerprint', () => {
  const first = new CinematicKeyframeConfigurationService();
  const second = new CinematicKeyframeConfigurationService();
  const configuration = first.getCompilerConfiguration();
  assert.equal(configuration.policy.contractVersion, 'cinematic-storyboard-keyframe-v2');
  assert.equal(configuration.captureProfile.id, 'photorealistic-cinematic');
  assert.equal(configuration.fingerprint, second.getCompilerConfiguration().fingerprint);
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
