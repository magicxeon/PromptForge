import assert from 'node:assert/strict';
import test from 'node:test';

test('Seedance multimodal images keep ordered reference_image roles and cannot mix frame modes', () => {
  const request = { modelId: 'dreamina-seedance-2-5-260628', prompt: 'One action.', durationSeconds: 6,
    referenceImages: [{ url: 'https://example.com/board.png', role: 'reference_image' },
      { url: 'https://example.com/look-a.png', role: 'reference_image' },
      { url: 'https://example.com/look-b.png', role: 'reference_image' }] };
  const payload = buildModelArkSeedancePayload(request);
  assert.deepEqual(payload.content.slice(1).map(item => item.role), Array(3).fill('reference_image'));
  assert.equal(payload.content[1].image_url.url, request.referenceImages[0].url);
  assert.equal(payload.ratio, '9:16');
  assert.throws(() => buildModelArkSeedancePayload({ ...request, referenceImage: 'https://example.com/first.png' }), { code: 'video_reference_roles_invalid' });
});
import {
  ModelArkSeedanceProvider,
  buildModelArkSeedancePayload,
  normalizeModelArkSeedanceTask,
  parseEnvironmentBoolean,
  resolveModelArkApiKey
} from '../server/providers/ModelArkSeedanceProvider.js';

test('Seedance first-frame payload inherits image ratio and keeps other video controls', () => {
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
  assert.equal('ratio' in payload, false);
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

test('Seedance accepts an active private Asset URI as the first frame', () => {
  const payload = buildModelArkSeedancePayload({
    modelId: 'dreamina-seedance-2-5-260628',
    prompt: 'Continue one restrained action from Image 1.',
    aspectRatio: '9:16', resolution: '480p', durationSeconds: 6, audioMode: 'none',
    referenceImage: 'asset://Asset-20260905-approved01'
  });

  assert.equal('ratio' in payload, false);
  assert.deepEqual(payload.content[1], {
    type: 'image_url',
    image_url: { url: 'asset://Asset-20260905-approved01' },
    role: 'first_frame'
  });
});

test('Seedance text-to-video payload keeps the selected ratio', () => {
  const payload = buildModelArkSeedancePayload({
    modelId: 'dreamina-seedance-2-5-260628',
    prompt: 'A restrained establishing shot.',
    aspectRatio: '9:16',
    resolution: '480p',
    durationSeconds: 6,
    audioMode: 'none'
  });

  assert.equal(payload.ratio, '9:16');
  assert.deepEqual(payload.content.map(item => item.type), ['text']);
});

test('Seedance first-last-frame payload inherits the first image ratio', () => {
  const payload = buildModelArkSeedancePayload({
    modelId: 'dreamina-seedance-2-5-260628',
    prompt: 'A restrained transition between two approved frames.',
    aspectRatio: '9:16',
    resolution: '480p',
    durationSeconds: 6,
    audioMode: 'none',
    referenceImage: 'https://example.com/first.png',
    lastFrameImage: 'https://example.com/last.png'
  });

  assert.equal('ratio' in payload, false);
  assert.deepEqual(payload.content.slice(1).map(item => item.role), [
    'first_frame',
    'last_frame'
  ]);
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
  }), error => error.code === 'video_provider_not_qualified');

  assert.equal(entries.length, 2);
  assert.match(entries[0], /"event":"request"/);
  assert.match(entries[0], /"model":"seedance-1-0-pro-fast-251015"/);
  assert.match(entries[1], /"providerCode":"ModelNotOpen"/);
  assert.match(entries[1], /"providerRequestId":"provider-request-1"/);
  assert.doesNotMatch(entries.join('\n'), /PRIVATE PROMPT CONTENT|private-test-key/);
});

test('Seedance preserves privacy rejection evidence without inferring an authorization requirement', async () => {
  const provider = new ModelArkSeedanceProvider({
    apiKey: 'private-test-key',
    fetchImpl: async () => jsonResponse({
      error: {
        code: 'InputImageSensitiveContentDetected.PrivacyInformation',
        message: "The request failed because the input image 'content[1]' may contain real person. Request id: provider-failed-123"
      }
    }, 400)
  });

  await assert.rejects(() => provider.submit({
    modelId: 'dreamina-seedance-2-0-mini-260615',
    prompt: 'A restrained camera move.', aspectRatio: '9:16',
    resolution: '720p', durationSeconds: 6, audioMode: 'none',
    referenceImage: 'data:image/png;base64,YWJj'
  }), error => error.code === 'video_provider_input_image_rejected'
    && error.providerCode === 'InputImageSensitiveContentDetected.PrivacyInformation'
    && error.providerRequestId === 'provider-failed-123'
    && error.retryable === false
    && error.providerBillableState === 'not_billable');
});

test('Seedance 2.5 sends a GCS signed first-frame URL unchanged without logging its signature', async () => {
  const signedUrl = 'https://storage.googleapis.com/private/frame.png?X-Goog-Signature=SECRET';
  const entries = [];
  let body;
  const provider = new ModelArkSeedanceProvider({
    apiKey: 'test', debugEnabled: true,
    logger: { info: (...parts) => entries.push(parts.join(' ')) },
    fetchImpl: async (_url, init) => {
      body = JSON.parse(init.body);
      return jsonResponse({ id: 'task_gcs', message: `Source received: ${signedUrl}` });
    }
  });
  await provider.submit({ modelId: 'dreamina-seedance-2-5-260628', prompt: 'Continue the frame.',
    resolution: '480p', durationSeconds: 6, audioMode: 'none', referenceImage: signedUrl });
  assert.equal(body.content[1].image_url.url, signedUrl);
  assert.equal(body.content[1].role, 'first_frame');
  assert.equal('ratio' in body, false);
  assert.match(entries.join('\n'), /"referenceTransports":\["url"\]/);
  assert.doesNotMatch(entries.join('\n'), /SECRET|storage.googleapis.com/);
});

test('Seedance transport diagnostics include the nested fetch cause safely', async () => {
  const entries = [];
  const transportError = new TypeError('fetch failed', {
    cause: Object.assign(new Error('connect ETIMEDOUT 101.47.10.100:443'), {
      code: 'ETIMEDOUT', errno: -4039, syscall: 'connect',
      address: '101.47.10.100', port: 443
    })
  });
  const provider = new ModelArkSeedanceProvider({
    apiKey: 'private-test-key',
    debugEnabled: true,
    logger: { info: (...parts) => entries.push(parts.join(' ')) },
    fetchImpl: async () => { throw transportError; }
  });

  await assert.rejects(() => provider.submit({
    modelId: 'seedance-1-0-pro-fast-251015',
    prompt: 'PRIVATE PROMPT CONTENT', aspectRatio: '9:16',
    resolution: '480p', durationSeconds: 6, audioMode: 'none'
  }), error => error.code === 'video_provider_timeout');

  const log = entries.join('\n');
  assert.match(log, /"causeCode":"ETIMEDOUT"/);
  assert.match(log, /"causeSyscall":"connect"/);
  assert.match(log, /"causeAddress":"101.47.10.100"/);
  assert.match(log, /"causePort":443/);
  assert.doesNotMatch(log, /PRIVATE PROMPT CONTENT|private-test-key/);
});

test('Seedance ambiguous submit response never claims the provider request was not billable', async () => {
  const provider = new ModelArkSeedanceProvider({
    apiKey: 'private-test-key',
    fetchImpl: async () => jsonResponse({ message: 'Upstream unavailable.' }, 503)
  });
  await assert.rejects(() => provider.submit({
    modelId: 'seedance-1-0-pro-fast-251015',
    prompt: 'A restrained camera move.', aspectRatio: '9:16',
    resolution: '480p', durationSeconds: 6, audioMode: 'none'
  }), error => error.retryable === true && error.providerBillableState === 'unknown');
});

test('Seedance debug toggle only accepts explicit true', () => {
  assert.equal(parseEnvironmentBoolean('true'), true);
  assert.equal(parseEnvironmentBoolean(' TRUE '), true);
  assert.equal(parseEnvironmentBoolean('false'), false);
  assert.equal(parseEnvironmentBoolean('1'), false);
});

test('Seedance preflight fails locally before transport when configuration is unsafe', async () => {
  let requests = 0;
  const missingCredential = new ModelArkSeedanceProvider({
    apiKey: '',
    fetchImpl: async () => { requests += 1; return jsonResponse({}); }
  });
  assert.throws(
    () => missingCredential.preflight({ modelId: 'seedance-1-0-pro-fast-251015' }),
    error => error.code === 'video_provider_credentials_missing' && error.providerBillableState === 'not_billable'
  );
  const insecureEndpoint = new ModelArkSeedanceProvider({
    apiKey: 'test-key', baseUrl: 'http://modelark.example/api/v3',
    fetchImpl: async () => { requests += 1; return jsonResponse({}); }
  });
  assert.throws(
    () => insecureEndpoint.preflight({ modelId: 'seedance-1-0-pro-fast-251015' }),
    error => error.code === 'video_provider_endpoint_invalid'
  );
  assert.equal(requests, 0);
});

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return structuredClone(payload); }
  };
}
