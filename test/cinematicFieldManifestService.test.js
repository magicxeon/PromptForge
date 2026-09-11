import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CinematicFieldManifestService,
  cinematicFieldManifestService
} from '../server/domain/cinematic/CinematicFieldManifestService.js';

test('Cinematic field manifest exposes versioned Simple, Advanced and system projections', () => {
  const manifest = cinematicFieldManifestService.getPublicManifest();
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.id, 'cinematic-authoring-field-manifest');
  assert.match(manifest.fingerprint, /^[a-f0-9]{16}$/);
  assert.ok(manifest.fields.some(field => field.path === 'scene.storyChange' && field.visibility === 'simple'));
  assert.ok(manifest.fields.some(field => field.path === 'shot.cameraMovement' && field.visibility === 'advanced'));
  assert.ok(manifest.fields.some(field => field.path === 'cast.characterProfileVersionId' && field.visibility === 'system'));
  const originalVisibility = manifest.fields[0].visibility;
  manifest.fields[0].visibility = originalVisibility === 'advanced' ? 'simple' : 'advanced';
  assert.equal(cinematicFieldManifestService.getPublicManifest().fields[0].visibility, originalVisibility);
});

test('Cinematic field manifest resolves transitive stale dependencies deterministically', () => {
  const direct = cinematicFieldManifestService.getDependents('scene.emotionalEnd', { transitive: false });
  assert.deepEqual(new Set(direct), new Set(['shot.emotionalTarget', 'shot.performanceCue']));
  const transitive = cinematicFieldManifestService.getDependents('plan.emotionalArc');
  assert.ok(transitive.includes('scene.emotionalEnd'));
  assert.ok(transitive.includes('shot.emotionalTarget'));
  assert.deepEqual(cinematicFieldManifestService.getDependents('unknown.path'), []);
});

test('Cinematic field manifest rejects unknown paths and dependency cycles', () => {
  const manifest = baseManifest();
  assert.throws(() => new CinematicFieldManifestService({
    manifest,
    dependencies: dependencyConfig([{ source: 'scene.title', targets: ['shot.unknown'] }]),
    readinessPolicy: readinessConfig(['scene.title'])
  }), /unknown target/);
  assert.throws(() => new CinematicFieldManifestService({
    manifest,
    dependencies: dependencyConfig([
      { source: 'scene.title', targets: ['shot.title'] },
      { source: 'shot.title', targets: ['scene.title'] }
    ]),
    readinessPolicy: readinessConfig(['scene.title'])
  }), /dependency cycle/);
});

function baseManifest() {
  return {
    schemaVersion: 1, id: 'test-manifest', version: 1,
    fields: [field('scene.title'), field('shot.title')]
  };
}

function field(path) {
  return {
    path, group: 'test', visibility: 'simple', requirement: 'required',
    authorities: ['user'], consumers: ['storyboard'], localizationKey: `test.${path}`
  };
}

function dependencyConfig(dependencies) {
  return { schemaVersion: 1, id: 'test-dependencies', version: 1, dependencies };
}

function readinessConfig(requiredPaths) {
  return { schemaVersion: 1, id: 'test-readiness', version: 1, stages: { scene: { requiredPaths } } };
}
