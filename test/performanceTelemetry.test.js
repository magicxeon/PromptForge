import assert from 'node:assert/strict';
import test from 'node:test';
import { PerformanceTelemetry } from '../server/domain/observability/PerformanceTelemetry.js';

test('PerformanceTelemetry keeps bounded sanitized timing samples', () => {
  let now = 10;
  const telemetry = new PerformanceTelemetry({ capacity: 10, clock: () => now });
  const finish = telemetry.start('generation.submit', {
    requestId: 'req_1',
    rawPrompt: 'must not be retained'
  });
  now = 22.345;
  finish('ok', { jobId: 'job_1', privateReference: 'secret' });

  const [sample] = telemetry.snapshot();
  assert.deepEqual(sample, {
    operation: 'generation.submit',
    status: 'ok',
    durationMs: 12.35,
    requestId: 'req_1',
    correlationId: null,
    jobId: 'job_1',
    recordedAt: sample.recordedAt
  });
  assert.equal(JSON.stringify(sample).includes('secret'), false);
  assert.equal(JSON.stringify(sample).includes('must not be retained'), false);
});
