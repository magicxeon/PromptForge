import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GeminiVeoProvider,
  buildGeminiVeoRequest,
  restoreGenerateVideosOperation
} from '../server/providers/GeminiVeoProvider.js';
import { resolveVideoProviderDebugEnabled } from '../server/providers/videoProviderDebug.js';

test('Veo request uses the source contract instead of deprecated top-level inputs', () => {
  const payload = buildGeminiVeoRequest({
    modelId: 'veo-3.1-lite-generate-preview',
    prompt: 'A controlled fashion walk.',
    referenceImage: 'data:image/png;base64,YWJj',
    aspectRatio: '9:16', resolution: '720p', durationSeconds: 8,
    audioMode: 'generated'
  });

  assert.equal(payload.model, 'veo-3.1-lite-generate-preview');
  assert.equal(payload.prompt, undefined);
  assert.equal(payload.image, undefined);
  assert.equal(payload.source.prompt, 'A controlled fashion walk.');
  assert.deepEqual(payload.source.image, { mimeType: 'image/png', imageBytes: 'YWJj' });
  assert.equal(payload.config.durationSeconds, 8);
  assert.equal(Object.hasOwn(payload.config, 'generateAudio'), false);
  assert.equal(Object.hasOwn(payload.config, 'personGeneration'), false);
});

test('Veo submit logs sanitized request and response diagnostics', async () => {
  const entries = [];
  let captured;
  const provider = new GeminiVeoProvider({
    client: {
      models: { generateVideos: async payload => { captured = payload; return { name: 'operations/veo-1', done: false }; } },
      operations: {}, files: {}
    },
    debugEnabled: true,
    logger: { info: (...parts) => entries.push(parts.join(' ')) }
  });

  const result = await provider.submit({
    modelId: 'veo-3.1-lite-generate-preview', operation: 'text_to_video',
    prompt: 'PRIVATE VIDEO PROMPT', aspectRatio: '9:16', resolution: '720p',
    durationSeconds: 4, audioMode: 'generated'
  });

  assert.ok(captured.source);
  assert.equal(captured.prompt, undefined);
  assert.equal(Object.hasOwn(captured.config, 'generateAudio'), false);
  assert.equal(Object.hasOwn(captured.config, 'personGeneration'), false);
  assert.equal(result.providerTaskId, 'operations/veo-1');
  assert.match(entries[0], /\[VideoProvider\]\[gemini\]\[Debug\]/);
  assert.match(entries[0], /"promptLength":20/);
  assert.match(entries[0], /"providerAudioControl":"native_audio_no_request_field"/);
  assert.match(entries[1], /"providerOperationId":"operations\/veo-1"/);
  assert.doesNotMatch(entries.join('\n'), /PRIVATE VIDEO PROMPT/);
});

test('Veo polling reconstructs an SDK operation from a persisted name', async () => {
  let receivedOperation;
  const provider = new GeminiVeoProvider({
    client: {
      models: {},
      operations: {
        getVideosOperation: async ({ operation }) => {
          receivedOperation = operation;
          return { name: operation.name, done: false };
        }
      },
      files: {}
    }
  });

  const result = await provider.poll('operations/veo-restored');
  assert.equal(result.providerStatus, 'provider_processing');
  assert.equal(receivedOperation.name, 'operations/veo-restored');
  assert.equal(typeof receivedOperation._fromAPIResponse, 'function');
  assert.equal(typeof restoreGenerateVideosOperation('operations/test')._fromAPIResponse, 'function');
});

test('Veo submit errors retain diagnostics without leaking prompt text', async () => {
  const entries = [];
  const provider = new GeminiVeoProvider({
    client: {
      models: { generateVideos: async () => { throw Object.assign(new Error('Model access denied'), { code: 'MODEL_NOT_OPEN', statusCode: 403, requestId: 'google-request-1' }); } },
      operations: {}, files: {}
    },
    debugEnabled: true,
    logger: { info: (...parts) => entries.push(parts.join(' ')) }
  });

  await assert.rejects(() => provider.submit({
    modelId: 'veo-3.1-lite-generate-preview', operation: 'text_to_video',
    prompt: 'PRIVATE VIDEO PROMPT', aspectRatio: '9:16', resolution: '720p',
    durationSeconds: 4, audioMode: 'generated'
  }), error => error.code === 'MODEL_NOT_OPEN');

  assert.match(entries.join('\n'), /"event":"submit_error"/);
  assert.match(entries.join('\n'), /"requestId":"google-request-1"/);
  assert.match(entries.join('\n'), /Model access denied/);
  assert.doesNotMatch(entries.join('\n'), /PRIVATE VIDEO PROMPT/);
});

test('master Video debug toggle enables every provider while aliases remain supported', () => {
  assert.equal(resolveVideoProviderDebugEnabled({ VIDEO_PROVIDER_DEBUG: 'true' }, 'GEMINI_VIDEO_DEBUG'), true);
  assert.equal(resolveVideoProviderDebugEnabled({ GEMINI_VIDEO_DEBUG: 'true' }, 'GEMINI_VIDEO_DEBUG'), true);
  assert.equal(resolveVideoProviderDebugEnabled({ VIDEO_PROVIDER_DEBUG: 'false' }, 'GEMINI_VIDEO_DEBUG'), false);
});
