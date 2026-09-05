import { spawnSync } from 'node:child_process';

const nodeTests = [
  'test/providerControlRepository.test.js',
  'test/providerAvailabilityPolicy.test.js',
  'test/adminProviderControls.test.js',
  'test/providerRuntimeGenerationGate.test.js',
  'test/providerRuntimeMasterControl.test.js',
  'test/providerRegistry.test.js',
  'test/comparisonValidator.test.js',
  'test/fashionBlueprintPolicy.test.js',
  'test/videoCapabilityRegistry.test.js',
  'test/videoGenerationApplicationService.test.js',
  'test/generationPromptRefinementEntryPoint.test.js',
  'test/cinematicTextProviderRouter.test.js'
];

run(process.execPath, ['--test', ...nodeTests]);
const webTestArgs = [
  'run', 'test', '--workspace', 'web', '--',
  'src/features/admin/routes/AdminProvidersRoute.test.tsx'
];

if (process.platform === 'win32') {
  run(process.env.ComSpec || 'cmd.exe', [
    '/d', '/s', '/c',
    `npm.cmd ${webTestArgs.join(' ')}`
  ]);
} else {
  run('npm', webTestArgs);
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: process.cwd(), stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
