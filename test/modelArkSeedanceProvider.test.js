import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ModelArkSeedanceProvider,
  buildModelArkSeedancePayload,
  normalizeModelArkSeedanceTask,
  parseEnvironmentBoolean,
  resolveModelArkApiKey
} from '../server/providers/ModelArkSeedanceProvider.js';

test('Seedance payload uses explicit video controls and first-frame content', () => {
  const payload = buildModelArkSeedancePayload({
    modelId: 'dreamina-seedance-2-5-260628',
    prompt: 'A restrained fashion walk with a slow camera push.',
    aspectRatio: '9:16',
    resolution: '720p',
    durationSeconds: 8,
    audioMode: 'generated',
    referenceImage: 'data:image/png;base64,YWJj',
    cameraFixed: true,
    returnLastFrame: true
  });
  assert.equal(payload.model, 'dreamina-seedance-2-5-260628');
  assert.equal(payload.ratio, '9:16');
  assert.equal(payload.resolution, '720p');
  assert.equal(payload.duration, 8);
  assert.equal(payload.generate_audio, true);
  assert.equal(payload.camera_fixed, true);
  assert.equal(payload.return_last_frame, true);
  assert.deepEqual(payload.content[1], {
    type: 'image_url',
    image_url: { url: 'data:image/png;base64,YWJj' },
    role: 'first_frame'
  });
});

test('Seedance provider submits through the shared ModelArk base URL and credential', async () => {
  let captured = null;
  const provider = new ModelArkSeedanceProvider({
    apiKey: 'test-key',
    baseUrl: 'https://modelark.example/api/v3/',
    fetchImpl: async (url, init) => {
      captured = { url, init };
      return jsonResponse({ id: 'task_seedance_1', status: 'queued' });
    }
  });
  const result = await provider.submit({
    modelId: 'seedance-1-0-pro-fast-251015', prompt: 'Fashion walk.',
    aspectRatio: '9:16', resolution: '720p', durationSeconds: 4, audioMode: 'none'
  });
  assert.equal(captured.url, 'https://modelark.example/api/v3/contents/generations/tasks');
  assert.equal(captured.init.headers.Authorization, 'Bearer test-key');
  assert.equal(JSON.parse(captured.init.body).watermark, false);
  assert.equal(result.providerTaskId, 'task_seedance_1');
});

test('Seedance terminal response preserves provider completion-token evidence', () => {
  const result = normalizeModelArkSeedanceTask({
    status: 'succeeded',
    content: { video_url: 'https://cdn.example/result.mov', width: 720, height: 1280 },
    usage: { completion_tokens: 456789 }
  }, {
    task: { submittedRequest: { durationSeconds: 8, audioMode: 'generated' } }
  });
  assert.equal(result.providerStatus, 'provider_succeeded');
  assert.equal(result.output.mimeType, 'video/quicktime');
  assert.equal(result.output.durationSeconds, 8);
  assert.equal(result.usage.billingMetric, 'completion_token');
  assert.equal(result.usage.completionTokens, 456789);
});

test('Seedance success without usage remains explicit for reconciliation', () => {
  const result = normalizeModelArkSeedanceTask({
    status: 'completed',
    output: { video_url: 'https://cdn.example/result.mp4' }
  });
  assert.equal(result.providerStatus, 'provider_succeeded');
  assert.equal(result.usage, null);
});

test('Seedance credentials use the same aliases as Seedream', () => {
  assert.equal(resolveModelArkApiKey({ 'MODEL_ARK_API-KEY': 'primary', MODEL_ARK_API: 'secondary', ARK_API_KEY: 'third' }), 'primary');
  assert.equal(resolveModelArkApiKey({ MODEL_ARK_API: 'secondary', ARK_API_KEY: 'third' }), 'secondary');
  assert.equal(resolveModelArkApiKey({ ARK_API_KEY: 'third' }), 'third');
});

test('Seedance debug logging exposes diagnostics without prompts or credentials', async () => {
  const entries = [];
  const provider = new ModelArkSeedanceProvider({
    apiKey: 'private-test-key',
    debugEnabled: true,
    logger: { info: (...parts) => entries.push(parts.join(' ')) },
    fetchImpl: async () => jsonResponse({
      code: 'ModelNotOpen',
      message: 'The requested model is not open.',
      request_id: 'provider-request-1'
    }, 400)
  });

  await assert.rejects(() => provider.submit({
    modelId: 'seedance-1-0-pro-fast-251015',
    prompt: 'PRIVATE PROMPT CONTENT',
    aspectRatio: '9:16',
    resolution: '480p',
    durationSeconds: 6,
    audioMode: 'none'
  }), error => error.code === 'ModelNotOpen');

  assert.equal(entries.length, 2);
  assert.match(entries[0], /"event":"request"/);
  assert.match(entries[0], /"model":"seedance-1-0-pro-fast-251015"/);
  assert.match(entries[1], /"providerCode":"ModelNotOpen"/);
  assert.match(entries[1], /"providerRequestId":"provider-request-1"/);
  assert.doesNotMatch(entries.join('\n'), /PRIVATE PROMPT CONTENT|private-test-key/);
});

test('Seedance debug toggle only accepts explicit true', () => {
  assert.equal(parseEnvironmentBoolean('true'), true);
  assert.equal(parseEnvironmentBoolean(' TRUE '), true);
  assert.equal(parseEnvironmentBoolean('false'), false);
  assert.equal(parseEnvironmentBoolean('1'), false);
});

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return structuredClone(payload); }
  };
}
