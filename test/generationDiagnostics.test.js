import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSafeGenerationDiagnostic
} from '../server/domain/generation/generationDiagnostics.js';

test('generation diagnostics expose operational metadata without prompt or reference values', () => {
  const diagnostic = createSafeGenerationDiagnostic({
    id: 'job_123',
    provider: 'modelark',
    submodel: 'seedream-4-0-250828',
    prompt: 'private prompt',
    options: {
      generationMode: 'scene',
      generationSurface: 'playground',
      aspectRatio: '6:8',
      imageResolution: '2K',
      comparisonSetId: 'comparison_123',
      faceReferenceImageA: 'data:image/png;base64,PRIVATE',
      referenceRoleManifest: [{ role: 'face_reference', sourceId: 'asset_123' }],
      faceReferenceContext: { authorizationToken: 'secret-token' }
    }
  }, 'completed', {
    resolvedProviderSize: '1728x2304',
    returnedWidth: 1728,
    returnedHeight: 2304,
    durationSeconds: '8.4'
  });

  assert.deepEqual(diagnostic, {
    event: 'completed',
    jobId: 'job_123',
    comparisonSetId: 'comparison_123',
    provider: 'modelark',
    model: 'seedream-4-0-250828',
    generationMode: 'scene',
    generationSurface: 'playground',
    aspectRatio: '6:8',
    requestedResolution: '2K',
    resolvedProviderSize: '1728x2304',
    referenceCount: 1,
    returnedWidth: 1728,
    returnedHeight: 2304,
    durationSeconds: '8.4'
  });
  assert.equal(JSON.stringify(diagnostic).includes('private prompt'), false);
  assert.equal(JSON.stringify(diagnostic).includes('PRIVATE'), false);
  assert.equal(JSON.stringify(diagnostic).includes('secret-token'), false);
});
