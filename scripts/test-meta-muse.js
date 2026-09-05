import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Offline-only: all provider transports in these suites are mocked.
const suites = [
  'test/metaMuseProvider.test.js',
  'test/providerRegistry.test.js',
  'test/creditPricingPolicy.test.js',
  'test/creditEstimateGenerationParity.test.js'
];
if (process.argv.length > 2) {
  console.error('Usage: node scripts/test-meta-muse.js (offline tests only; no live mode)');
  process.exitCode = 1;
} else {
  const result = spawnSync(process.execPath, ['--test', ...suites], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), stdio: 'inherit'
  });
  process.exitCode = result.status ?? 1;
}
