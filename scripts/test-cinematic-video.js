import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const groups = {
  references: ['test/cinematicVideoReferencePlan.test.js', 'test/cinematicVideoPacketCompiler.test.js'],
  payload: ['test/modelArkSeedanceProvider.test.js', 'test/videoCapabilityRegistry.test.js'],
  flow: [
    'test/cinematicFirstFrameTransport.test.js', 'test/googleCloudProviderAssetStorage.test.js',
    'test/videoGenerationApplicationService.test.js', 'test/videoProviderTaskService.test.js'
  ],
  adjacent: [
    'test/cinematicApplicationService.test.js', 'test/cinematicVideoPacketCompiler.test.js',
    'test/videoPricingCalculator.test.js', 'test/videoGenerationRoutes.test.js',
    'test/cinematicTimelineCompiler.test.js', 'test/cinematicDataLineageService.test.js'
  ]
};
const suite = process.argv[2] || 'help';
if (suite === 'help' || suite === '--help') {
  console.log('Usage: node scripts/test-cinematic-video.js <references|payload|flow|ui|full>');
  console.log('payload: adapter payload and catalog; flow: source, storage, Credits and task lifecycle');
  console.log('references: dynamic Cast/Look authority and configured video prompt');
  console.log('ui: Produce controls/status/preview; full: all groups plus adjacent regressions');
  console.log('Mocked tests only. No live provider calls, build or browser sweep.');
} else if (!['references', 'payload', 'flow', 'ui', 'full'].includes(suite) || process.argv.length > 3) {
  console.error('Unknown suite. Use --help.');
  process.exitCode = 2;
} else {
  const startedAt = performance.now();
  const files = suite === 'full' ? [...new Set(Object.values(groups).flat())] : groups[suite];
  if (files) run('backend', ['--test', ...files], root);
  if (!process.exitCode && ['ui', 'full'].includes(suite)) {
    run('ui', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      'src/features/cinematic/components/CinematicProduceRuntime.test.tsx',
      'src/features/cinematic/components/StoryboardShotDialog.test.tsx',
      'src/features/cinematic/components/storyboardGenerationAdapter.test.ts',
      'src/features/cinematic/components/produce/produceReadModel.test.ts',
      'src/features/cinematic/schemas/cinematicCoreContracts.test.ts'], path.join(root, 'web'));
  }
  console.log(`[cinematic-video:${suite}] ${process.exitCode ? 'FAILED' : 'PASSED'} in ${((performance.now() - startedAt) / 1000).toFixed(1)}s`);
}

function run(label, args, cwd) {
  console.log(`[cinematic-video] ${label}`);
  const result = spawnSync(process.execPath, args, { cwd, shell: false, stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exitCode = result.status || 1;
}
