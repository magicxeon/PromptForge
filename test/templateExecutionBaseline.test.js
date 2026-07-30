import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compileGenerationContext,
  createQueueOptions
} from '../server/domain/generation/generationRequestService.js';

test('Template execution counts and directs the canonical baseline before explicit replacements', () => {
  const { context, compiledPrompt } = compileGenerationContext({
    provider: 'gemini',
    submodel: 'gemini-3.1-flash-lite-image',
    generationMode: 'scene',
    generationSurface: 'studio',
    aspectRatio: '6:8',
    sceneBuilder: {
      authoringMode: 'manual',
      manualPromptText: 'Keep the published fashion composition.'
    },
    templateBaselineReference: '/outputs/job_template_source.jpg',
    authorizedTemplateReferenceJobIds: ['job_template_source'],
    imageReferences: { faceMatch: true },
    faceReferenceImageA: '/outputs/job_viewer_face.jpg'
  }, { userId: 'usr_viewer' });

  assert.equal(context.referenceCount, 2);
  assert.deepEqual(context.referenceRoleManifest, [{
    index: 1,
    roles: ['template_baseline_reference']
  }, {
    index: 2,
    roles: ['face_reference_a']
  }]);
  assert.match(compiledPrompt, /preserve the published template composition/i);
  assert.match(compiledPrompt, /change only inputs explicitly supplied/i);

  const queueOptions = createQueueOptions(context, {
    username: 'viewer',
    stream: false,
    modelConfig: { defaults: { resolution: '1K' } },
    providerConfigVersion: 'test'
  });
  assert.equal(queueOptions.templateBaselineReference, '/outputs/job_template_source.jpg');
  assert.deepEqual(
    queueOptions.authorizedTemplateReferenceJobIds,
    ['job_template_source']
  );
});
