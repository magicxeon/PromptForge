import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Offline gates only. Prerequisites: repository Node dependencies; UI also requires web's Vitest setup.
// No server, build, worker restart, live Project writes or provider generation is started here.
const root = fileURLToPath(new URL('../', import.meta.url));
const uiFiles = [
  'src/features/cinematic/components/SimpleStoryboardWorkspace.test.tsx',
  'src/features/cinematic/components/StoryboardShotDialog.test.tsx',
  'src/features/cinematic/components/CinematicProduceRuntime.test.tsx',
  'src/components/generation/GenerationResultSurface.test.tsx',
  'src/components/generation/StudioGenerationWorkspace.test.tsx',
  'src/components/generation/ReferenceSlotGrid.test.tsx'
];
const requestFiles = [
  'src/features/cinematic/components/StoryboardGenerateAllDialog.test.tsx',
  'src/features/generation/api/generationApi.test.ts',
  'src/features/cinematic/schemas/cinematicSchemas.test.ts'
];
const navigationFiles = [
  'src/features/cinematic/components/CinematicUxPrototype.test.tsx',
  'src/features/cinematic/routes/cinematicStageNavigation.test.ts'
];
const reactGroups = { ui: uiFiles, requests: requestFiles, navigation: navigationFiles,
  'environment-ui': ['src/features/cinematic/components/SceneEnvironmentControl.test.tsx'] };
const groups = {
  treatments: [['--test', 'test/cinematicWhitePrevis.test.js', 'test/cinematicStoryboardPromptPolicy.test.js']],
  'lead-in': [['--test', 'test/cinematicWhitePrevis.test.js', 'test/videoDurationReconciliation.test.js', 'test/cinematicTimelineCompiler.test.js'],
    ['--test', '--test-name-pattern=cinematic workflow context|cinematic quote reconciles|video quote delegates', 'test/videoGenerationApplicationService.test.js']],
  environment: [['--test', 'test/cinematicSceneEnvironment.test.js', 'test/referenceProcessingService.test.js']],
  manual: [['--test', 'test/cinematicManualStoryboard.test.js']],
  prompts: [
    ['--test', '--test-name-pattern=manual video timeline|video face authority|video packet|prompt budget|Look reference strategy|looks-only packet|action duration|video prompt|video mapping|composition:|immutable server-derived',
      'test/cinematicVideoPacketCompiler.test.js', 'test/cinematicSketchProduction.test.js'],
    ['--test', 'test/cinematicStoryboardPromptComposer.test.js', 'test/cinematicStoryboardPromptPolicy.test.js']
  ],
  ...Object.fromEntries(Object.entries(reactGroups).map(([name, files]) => [name, [
    ['node_modules/vitest/vitest.mjs', 'run', '--root', 'web', '--config', 'vitest.config.ts', '--configLoader', 'runner', ...files]
  ]]))
};
const requested = process.argv[2];
if (process.argv.length !== 3 || ![...Object.keys(groups), 'aggregate', 'all'].includes(requested)) {
  console.error(`Usage: node scripts/test-cinematic-manual-storyboard.mjs <${Object.keys(groups).join('|')}|aggregate|all>`);
  process.exitCode = 2;
} else {
  const selected = ['aggregate', 'all'].includes(requested) ? Object.keys(groups) : [requested];
  for (const group of selected) {
    console.log(`Cinematic manual storyboard: ${group}`);
    const files = reactGroups[group] ? reactGroups[group].map(file => path.join('web', file))
      : groups[group].flat().filter(argument => argument.endsWith('.test.js'));
    const missing = files.filter(file => !existsSync(path.join(root, file)));
    if (missing.length) {
      console.error(`Missing required ${group} tests: ${missing.join(', ')}`);
      process.exitCode = 1;
      break;
    }
    for (const args of groups[group]) {
      const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit', shell: false });
      if (result.error) console.error(result.error.message);
      if (result.status !== 0) {
        process.exitCode = result.status || 1;
        break;
      }
    }
    if (process.exitCode) break;
  }
}
