import test from 'node:test';
import assert from 'node:assert/strict';
import { cpus, platform, arch } from 'node:os';
import { performance } from 'node:perf_hooks';
import { IdentityPasswordAdapter, passwordHashPolicy } from '../../server/domain/identity/adapters/IdentityPasswordAdapter.js';

test('native hash cost baseline for this workspace; no runtime activation', async () => {
  const adapter = new IdentityPasswordAdapter({ fixtureOnly: true,
    screening: { available: true, check: async () => ({ compromised: false }) } });
  await adapter.prepare();
  const samples = [];
  for (let index = 0; index < 7; index++) {
    const start = performance.now();
    const hash = await adapter.hash('isolated benchmark fixture password');
    assert.equal(await adapter.verify(hash, 'isolated benchmark fixture password'), true);
    samples.push(performance.now()-start);
  }
  samples.sort((a,b) => a-b);
  console.log(JSON.stringify({ fixtureOnly: true, runtime: process.version, platform: platform(), arch: arch(),
    cpu: cpus()[0]?.model, samples: samples.length, roundTripMedianMs: Math.round(samples[3]),
    roundTripP95Ms: Math.round(samples[6]), maximumNativeJobs: passwordHashPolicy.maximumConcurrentJobs,
    maximumArgonMemoryMiB: passwordHashPolicy.memoryCost/1024*passwordHashPolicy.maximumConcurrentJobs }));
  assert.equal(adapter.available, false);
});
