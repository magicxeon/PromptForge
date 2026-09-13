import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const ui = files => ['node_modules/vitest/vitest.mjs', 'run', '--root', 'web', '--config', 'vitest.config.ts', '--configLoader', 'runner', ...files];
const groups = {
  takes: ['--test', 'test/cinematicPreviousTakes.test.js'],
  produce: ui(['src/features/cinematic/components/CinematicProduceRuntime.test.tsx']),
  sketch: ['--test', 'test/cinematicSketchProduction.test.js'],
  'sketch-quote': ['--test', '--test-name-pattern=composition:', 'test/videoGenerationApplicationService.test.js'],
  'photoreal-prompts': ['--test', 'test/cinematicStoryboardPromptComposer.test.js', 'test/cinematicStoryboardPromptPolicy.test.js', 'test/cinematicDirectedOpenings.test.js'],
  'photoreal-references': ['--test', 'test/cinematicSketchProduction.test.js', 'test/cinematicStoryboardAssetService.test.js'],
  'photoreal-quote': ['--test', '--test-name-pattern=composition:', 'test/videoGenerationApplicationService.test.js'],
  'photoreal-ui': ui(['src/features/cinematic/components/CinematicProduceRuntime.test.tsx', 'src/features/cinematic/components/StoryboardShotDialog.test.tsx']),
  'composition-quote': ui(['src/features/cinematic/schemas/cinematicSchemas.test.ts', 'src/features/cinematic/components/CinematicProduceRuntime.test.tsx', '-t', 'composition quote']),
  'workspace-ui': ui(['src/features/cinematic/components/StoryboardShotDialog.test.tsx', 'src/components/generation/GenerationResultSurface.test.tsx', 'src/components/generation/GenerationResultGrid.test.tsx', 'src/components/generation/StudioGenerationWorkspace.test.tsx', 'src/components/generation/PlaygroundGenerationWorkspace.test.tsx']),
  'workspace-layout': ['scripts/verify-storyboard-shot-workspace.mjs'],
  'photoreal-compatibility': ['--test', '--test-name-pattern=prompt budget|looks-only packet|Storyboard source approval|Shot direction edits', 'test/cinematicVideoPacketCompiler.test.js', 'test/cinematicApplicationService.test.js'],
  'still-policy': ['--test', 'test/cinematicStoryboardPromptPolicy.test.js', 'test/cinematicStoryboardPromptComposer.test.js', 'test/cinematicStoryboardAssetService.test.js'],
  preferences: ui(['src/features/playground/playgroundUiPreferences.test.ts']),
  setup: ui(['src/features/cinematic/components/CinematicSetupForm.test.tsx']),
  types: ['node_modules/typescript/bin/tsc', '-p', 'web/tsconfig.app.json', '--noEmit', '--incremental', 'false'],
  attachments: ['scripts/verify-playground-video-references.mjs', '--images', '--composition'],
  layout: ['scripts/verify-cinematic-simple-production.mjs']
};
const selected = process.argv[2] === 'workspace-all' ? ['photoreal-prompts', 'photoreal-references', 'photoreal-quote', 'composition-quote', 'workspace-ui', 'types', 'workspace-layout']
  : process.argv[2] === 'photoreal-all' ? ['photoreal-prompts', 'photoreal-references', 'photoreal-quote', 'composition-quote', 'photoreal-ui', 'photoreal-compatibility', 'types']
  : process.argv[2] === 'all' ? Object.keys(groups) : [process.argv[2]];
for (const group of selected) {
  if (!groups[group]) { console.error(`Use ${Object.keys(groups).join(', ')}, all`); process.exit(2); }
  const result = spawnSync(process.execPath, groups[group], { cwd: root, stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status || 1);
}
