import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cinematicProductionAssets,
  cinematicWorkflowPolicy,
  getPublicCinematicRewampConfiguration,
  resolveCinematicRewampExposure,
  validateCinematicProductionAssets,
  validateCinematicWorkflowPolicy
} from '../server/config/cinematicRewampConfiguration.js';
import { cinematicFieldManifestService } from '../server/domain/cinematic/CinematicFieldManifestService.js';

test('Cinematic Rewamp policy exposes bounded safe configuration through the canonical manifest', () => {
  const manifest = cinematicFieldManifestService.getPublicManifest();
  assert.equal(manifest.rewamp.enabled, false);
  assert.equal(manifest.rewamp.workflow.authoring.storyRevisionHistoryLimit, 10);
  assert.equal(manifest.rewamp.workflow.authoring.generatedShotMaximumPerScene, 20);
  assert.equal(manifest.rewamp.workflow.authoring.shotDocumentMaximumCharacters, 12000);
  assert.deepEqual(manifest.rewamp.workflow.projectCreation.formats, ['short-film', 'mini-series']);
  assert.equal(manifest.rewamp.workflow.projectCreation.defaultFormat, 'mini-series');
  assert.deepEqual(manifest.rewamp.workflow.projectCreation.aspectRatios, ['9:16', '16:9', '1:1']);
  assert.deepEqual(manifest.rewamp.workflow.projectCreation.chapterDurationsSeconds, [20, 30, 45, 60, 90, 120]);
  assert.equal(manifest.rewamp.workflow.projectCreation.defaultChapterCount, 1);
  assert.equal(manifest.rewamp.workflow.projectCreation.maximumChapterCount, 24);
  assert.equal(manifest.rewamp.workflow.projectCreation.maximumSeasonCount, 8);
  assert.equal(manifest.rewamp.workflow.dialogue.defaultTargetRatio, 0.6);
  assert.equal(manifest.rewamp.productionAssets.expressionSheet.slots.length, 12);
  assert.deepEqual(manifest.rewamp.productionAssets.referencePriority, cinematicProductionAssets.referencePriority);
  assert.deepEqual(manifest.rewamp.workflow, cinematicWorkflowPolicy);
  assert.match(manifest.rewamp.fingerprint, /^[a-f0-9]{16}$/);
  assert.equal('apiKey' in manifest.rewamp, false);
});

test('Rewamp exposure accepts explicit boolean values and rejects ambiguous input', () => {
  assert.equal(resolveCinematicRewampExposure({}), false);
  assert.equal(resolveCinematicRewampExposure({ CINEMATIC_REWAMP_ENABLED: 'true' }), true);
  assert.equal(getPublicCinematicRewampConfiguration({ CINEMATIC_REWAMP_ENABLED: 'false' }).enabled, false);
  assert.throws(() => resolveCinematicRewampExposure({ CINEMATIC_REWAMP_ENABLED: 'yes' }));
});

test('Rewamp policies fail closed for invalid history, expression cells and reference priority', () => {
  const workflow = structuredClone(cinematicWorkflowPolicy);
  workflow.authoring.storyRevisionHistoryLimit = 0;
  assert.throws(() => validateCinematicWorkflowPolicy(workflow));
  const excessiveDuration = structuredClone(cinematicWorkflowPolicy);
  excessiveDuration.projectCreation.chapterDurationsSeconds[5] = 121;
  assert.throws(() => validateCinematicWorkflowPolicy(excessiveDuration));
  const duplicateCell = structuredClone(cinematicProductionAssets);
  duplicateCell.expressionSheet.slots[1].column = 0;
  assert.throws(() => validateCinematicProductionAssets(duplicateCell));
  const missingAuthority = structuredClone(cinematicProductionAssets);
  missingAuthority.referencePriority.pop();
  assert.throws(() => validateCinematicProductionAssets(missingAuthority));
});
