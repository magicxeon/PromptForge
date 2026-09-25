import assert from 'node:assert/strict';
import test from 'node:test';
import { VideoRecoveryMonitor } from '../server/domain/generation/VideoRecoveryMonitor.js';

test('VideoRecoveryMonitor performs bounded session-independent sweeps without overlap', async () => {
  let callback = null;
  let cancelled = null;
  let release;
  let calls = 0;
  const gate = new Promise(resolve => { release = resolve; });
  const timer = { unrefCalled: false, unref() { this.unrefCalled = true; } };
  const monitor = new VideoRecoveryMonitor({
    intervalMs: 15_000,
    schedule(fn, milliseconds) {
      callback = fn;
      assert.equal(milliseconds, 15_000);
      return timer;
    },
    cancel(value) { cancelled = value; },
    async recover() { calls += 1; await gate; return []; }
  });
  assert.equal(monitor.start(), timer);
  assert.equal(timer.unrefCalled, true);
  callback();
  callback();
  await Promise.resolve();
  assert.equal(calls, 1);
  release();
  await monitor.inFlight;
  callback();
  await monitor.inFlight;
  assert.equal(calls, 2);
  monitor.stop();
  assert.equal(cancelled, timer);
});

test('VideoRecoveryMonitor contains sweep failures and remains reusable', async () => {
  const errors = [];
  let calls = 0;
  const monitor = new VideoRecoveryMonitor({
    recover: async () => {
      calls += 1;
      if (calls === 1) throw new Error('temporary');
      return ['done'];
    },
    onError: error => errors.push(error.message)
  });
  assert.deepEqual(await monitor.runOnce(), []);
  assert.deepEqual(errors, ['temporary']);
  assert.deepEqual(await monitor.runOnce(), ['done']);
});
