import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { GeminiOmniProvider, buildGeminiOmniRequest } from '../server/providers/GeminiOmniProvider.js';
import { VideoProviderAdapterRegistry } from '../server/providers/VideoProviderAdapterRegistry.js';

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    arrayBuffer: async () => new Uint8Array().buffer
  };
}

test('Omni request uses the Interactions text-to-video contract', () => {
  const payload = buildGeminiOmniRequest({
    modelId: 'gemini-omni-flash-preview',
    operation: 'text_to_video',
    prompt: 'One continuous shot.',
    aspectRatio: '9:16',
    durationSeconds: 8
  });

  assert.equal(payload.model, 'gemini-omni-flash-preview');
  assert.equal(payload.input, '[Total output duration: exactly 8 seconds.]\nOne continuous shot.');
  assert.deepEqual(payload.response_format, { type: 'video', aspect_ratio: '9:16', delivery: 'uri' });
  assert.equal(payload.generation_config.video_config.task, 'text_to_video');
  assert.equal(payload.background, true);
  assert.equal(payload.store, true);
});

test('Omni image-to-video request preserves the authorized image and task', () => {
  const payload = buildGeminiOmniRequest({
    modelId: 'gemini-omni-flash-preview',
    operation: 'image_to_video',
    prompt: 'Animate the approved frame.',
    aspectRatio: '16:9',
    durationSeconds: 6,
    referenceImage: 'data:image/jpeg;base64,YWJj'
  });

  assert.deepEqual(payload.input[0], { type: 'image', mime_type: 'image/jpeg', data: 'YWJj' });
  assert.equal(payload.input[1].text, '[Total output duration: exactly 6 seconds.]\nAnimate the approved frame.');
  assert.equal(payload.generation_config.video_config.task, 'image_to_video');
});

test('Omni submits an Interaction and materializes completed inline video on poll', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'omni-provider-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const requests = [];
  const provider = new GeminiOmniProvider({
    apiKey: 'secret',
    temporaryDirectory: directory,
    environment: {},
    fetchImpl: async (url, options = {}) => {
      requests.push({ url, options });
      if (options.method === 'POST') return jsonResponse({ id: 'v1_interaction', status: 'queued' });
      return jsonResponse({
        id: 'v1_interaction', status: 'completed',
        steps: [{ type: 'model_output', content: [{ type: 'video', mime_type: 'video/mp4', data: 'dmlkZW8=' }] }]
      });
    }
  });

  const submitted = await provider.submit({
    id: 'task_omni', modelId: 'gemini-omni-flash-preview', operation: 'text_to_video',
    prompt: 'PRIVATE VIDEO PROMPT', aspectRatio: '9:16'
  });
  const polled = await provider.poll(submitted.providerTaskId, {
    task: { id: 'task_omni', submittedRequest: { durationSeconds: 6, audioMode: 'generated' } }
  });

  assert.equal(submitted.providerTaskId, 'v1_interaction');
  assert.equal(polled.providerStatus, 'provider_succeeded');
  assert.equal(polled.usage.billingMetric, 'output_second');
  assert.equal(polled.usage.outputSeconds, 6);
  assert.equal((await fs.readFile(polled.output.filePath)).toString(), 'video');
  assert.match(requests[0].url, /\/v1beta\/interactions$/);
  assert.match(requests[1].url, /\/v1beta\/interactions\/v1_interaction$/);
});

test('Omni diagnostics do not reveal prompt, API key or inline media', async () => {
  const entries = [];
  const provider = new GeminiOmniProvider({
    apiKey: 'SECRET_API_KEY',
    debugEnabled: true,
    logger: { info: (...parts) => entries.push(parts.join(' ')) },
    fetchImpl: async () => jsonResponse({ id: 'v1_safe', status: 'queued' })
  });
  await provider.submit({
    modelId: 'gemini-omni-flash-preview', operation: 'text_to_video',
    prompt: 'PRIVATE VIDEO PROMPT', aspectRatio: '9:16'
  });
  const log = entries.join('\n');
  assert.doesNotMatch(log, /PRIVATE VIDEO PROMPT|SECRET_API_KEY/);
  assert.match(log, /promptFingerprint/);
});

test('video adapter registry selects a model adapter before the provider fallback', () => {
  const fallback = { submit() {}, poll() {} };
  const omni = { submit() {}, poll() {} };
  const registry = new VideoProviderAdapterRegistry({
    adapters: { gemini: fallback },
    modelAdapters: { 'gemini/gemini-omni-flash-preview': omni }
  });

  assert.equal(registry.resolve('gemini', 'gemini-omni-flash-preview'), omni);
  assert.equal(registry.resolve('gemini', 'veo-3.1-lite-generate-preview'), fallback);
});
