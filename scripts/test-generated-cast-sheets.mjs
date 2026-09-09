import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const groups = {
  domain: ['--test', 'test/generatedCastSheet.test.js', 'test/characterLookService.test.js', 'test/trustedGeneratedSources.test.js'],
  transport: ['--test', 'test/cinematicVideoReferencePlan.test.js', 'test/videoGenerationApplicationService.test.js', 'test/cinematicFirstFrameTransport.test.js'],
  ui: ['node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.config.ts', '--root', 'web', '--configLoader', 'runner',
    'src/features/profiles/components/CharacterLookDialog.test.tsx',
    'src/features/profiles/components/GeneratedLookSourceField.test.tsx',
    'src/features/playground/components/TrustedVideoSources.test.tsx'],
  types: ['node_modules/typescript/bin/tsc', '-p', 'web/tsconfig.app.json', '--noEmit', '--incremental', 'false'],
  binding: ['node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.config.ts', '--root', 'web', '--configLoader', 'runner',
    'src/features/cinematic/components/CinematicUxPrototype.test.tsx', '--testNamePattern', 'approved Look|new-Look|locked approved|wardrobe upload|AI wardrobe'],
};
for (const name of process.argv[2] === 'all' ? Object.keys(groups) : [process.argv[2]]) {
  if (!groups[name]) { console.error('Select domain, transport, ui, binding, types or all.'); process.exit(2); }
  console.log(`Checking ${name}`);
  const result = spawnSync(process.execPath, groups[name], { cwd: root, stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status || 1);
}
