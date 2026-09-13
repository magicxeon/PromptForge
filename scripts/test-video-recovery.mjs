import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const groups = {
  recovery: ['test/videoTaskRecovery.test.js', 'test/videoProviderTaskService.test.js', 'test/videoGenerationRoutes.test.js'],
  activity: ['test/generationJobCenter.test.js'],
  ui: ['src/features/generation/job-center'],
  produce: ['src/features/cinematic/components/CinematicProduceRuntime.test.tsx']
};
const group = process.argv[2];
if (!['all', ...Object.keys(groups)].includes(group) || process.argv.length !== 3) {
  console.error('Usage: node scripts/test-video-recovery.mjs <recovery|activity|ui|produce|all> (isolated tests only)');
  process.exitCode = 2;
} else {
  for (const name of group === 'all' ? Object.keys(groups) : [group]) {
    const ui = name === 'ui' || name === 'produce';
    const result = spawnSync(process.execPath, ui
      ? [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner', ...groups[name]]
      : ['--test', ...groups[name]], { cwd: ui ? path.join(root, 'web') : root, stdio: 'inherit', shell: false });
    if (result.error) console.error(result.error.message);
    if (result.status !== 0) { process.exitCode = result.status || 1; break; }
    if (name === 'recovery') {
      const lifecycle = spawnSync(process.execPath, ['--test', '--test-name-pattern=completed durable video|startup recovery settles|completed video with|recent video tasks|durable Video reservation',
        'test/videoGenerationApplicationService.test.js'], { cwd: root, stdio: 'inherit', shell: false });
      if (lifecycle.error) console.error(lifecycle.error.message);
      if (lifecycle.status !== 0) { process.exitCode = lifecycle.status || 1; break; }
    }
  }
}
