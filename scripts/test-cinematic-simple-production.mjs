import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const ui = files => ['node_modules/vitest/vitest.mjs', 'run', '--root', 'web', '--config', 'vitest.config.ts', '--configLoader', 'runner', ...files];
const groups = {
  takes: ['--test', 'test/cinematicPreviousTakes.test.js'],
  produce: ui(['src/features/cinematic/components/CinematicProduceRuntime.test.tsx']),
  sketch: ['--test', 'test/cinematicSketchProduction.test.js'],
  'sketch-quote': ['--test', '--test-name-pattern=sketch:', 'test/videoGenerationApplicationService.test.js'],
  'still-policy': ['--test', 'test/cinematicStoryboardPromptPolicy.test.js', 'test/cinematicStoryboardPromptComposer.test.js', 'test/cinematicStoryboardAssetService.test.js'],
  preferences: ui(['src/features/playground/playgroundUiPreferences.test.ts']),
  setup: ui(['src/features/cinematic/components/CinematicSetupForm.test.tsx']),
  types: ['node_modules/typescript/bin/tsc', '-p', 'web/tsconfig.app.json', '--noEmit', '--incremental', 'false'],
  attachments: ['scripts/verify-playground-video-references.mjs', '--images', '--composition'],
  layout: ['scripts/verify-cinematic-simple-production.mjs']
};
const selected = process.argv[2] === 'all' ? Object.keys(groups) : [process.argv[2]];
for (const group of selected) {
  if (!groups[group]) { console.error(`Use ${Object.keys(groups).join(', ')}, all`); process.exit(2); }
  const result = spawnSync(process.execPath, groups[group], { cwd: root, stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status || 1);
}
