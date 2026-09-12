import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const group = process.argv[2];
if (!['backend', 'ui', 'full'].includes(group) || process.argv.length > 3) {
  console.error('Usage: node scripts/test-cinematic-series.mjs <backend|ui|full>'); process.exitCode = 2;
} else {
  if (group !== 'ui') run(['--test', 'test/cinematicSeries.test.js'], root);
  if (!process.exitCode && group !== 'backend') run([path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
    'src/features/cinematic/components/SeriesWorkspaceControls.test.tsx', 'src/features/cinematic/components/CinematicSetupForm.test.tsx',
    'src/features/cinematic/routes/cinematicStageNavigation.test.ts', 'src/features/cinematic/schemas/cinematicCoreContracts.test.ts'], path.join(root, 'web'));
  if (!process.exitCode && group === 'full') run(['scripts/test-cinematic-video.js', 'full'], root);
}
function run(args, cwd) {
  const result = spawnSync(process.execPath, args, { cwd, stdio: 'inherit', shell: false });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exitCode = result.status || 1;
}
