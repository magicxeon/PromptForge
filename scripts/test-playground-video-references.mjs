import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const uiChecks = (...files) => [
  'node_modules/vitest/vitest.mjs', 'run', '--root', 'web', '--config',
  'vitest.config.ts', '--configLoader', 'runner', ...files
];
// Explicit fixture-only aggregate; browser/server checks stay separately selectable.
const offlineOptions = ['options-shared', 'options-playground', 'options-cinematic',
  'options-image', 'options-look-sheets', 'options-batch-comparison', 'options-fashion', 'options-locales', 'types'];
const groups = {
  'options-look-sheet-workspace': uiChecks(
    'src/components/generation/PlaygroundGenerationWorkspace.test.tsx',
    'src/components/generation/GenerationExperience.test.tsx',
    'src/components/generation/StudioGenerationWorkspace.test.tsx',
    'src/components/generation/GenerationEngineShell.test.tsx',
    'src/components/generation/EngineTargetPanelFrame.test.tsx',
    'src/components/profiles/CharacterLookSheetForm.test.tsx',
    'src/features/profiles/components/LookSheetEnhancementPanel.test.tsx'
  ),
  'options-shared': uiChecks(
    'src/components/generation/GenerationReferenceDisclosure.test.tsx',
    'src/components/generation/GenerationModelPicker.test.tsx',
    'src/components/generation/VideoEngineTargetPanel.test.tsx',
    'src/components/generation/EngineTargetPanel.test.tsx',
    'src/components/generation/engineTargetPanelHelpers.test.ts',
    'src/components/generation/EngineTargetPanelFrame.test.tsx'
  ),
  'options-playground': uiChecks(
    'src/features/playground/components/PlaygroundVideoWorkspace.test.tsx',
    'src/components/generation/PlaygroundGenerationWorkspace.test.tsx',
    'src/features/playground/components/videoModelSelection.test.ts',
    'src/features/playground/components/videoGenerationReadiness.test.ts'
  ),
  'options-cinematic': uiChecks(
    'src/features/cinematic/components/CinematicProduceRuntime.test.tsx',
    'src/features/cinematic/components/StoryboardShotDialog.test.tsx',
    'src/features/cinematic/components/StoryboardGenerateAllDialog.test.tsx',
    'src/features/cinematic/components/SceneEnvironmentControl.test.tsx'
  ),
  'options-image': uiChecks(
    'src/components/generation/EngineTargetPanel.test.tsx',
    'src/components/generation/GenerationExperience.test.tsx',
    'src/components/generation/StudioGenerationWorkspace.test.tsx',
    'src/components/generation/GenerationEngineShell.test.tsx',
    'src/components/generation/GenerationCommandRegion.test.tsx'
  ),
  'options-look-sheets': uiChecks(
    'src/components/profiles/CharacterLookSheetForm.test.tsx',
    'src/features/profiles/components/CharacterLookDialog.test.tsx',
    'src/features/profiles/components/LookSheetEnhancementPanel.test.tsx'
  ),
  'options-batch-comparison': uiChecks(
    'src/components/comparisons/ComparisonConfigurator.test.tsx',
    'src/features/cinematic/components/StoryboardGenerateAllDialog.test.tsx',
    'src/components/generation/useCreditConfirmation.test.tsx'
  ),
  'options-fashion': uiChecks(
    'src/components/generation/engineTargetPanelHelpers.test.ts',
    'src/features/fashion-blueprint/components/FashionProductionSurface.test.ts',
    'src/features/fashion-blueprint/components/FashionProductionSurface.render.test.tsx'
  ),
  'options-locales': ['scripts/validate-i18n-catalogs.js'],
  'options-visual': ['scripts/verify-generation-options-layout.mjs', ...process.argv.slice(3)],
  'options-workspace': uiChecks('src/components/generation/PlaygroundGenerationWorkspace.test.tsx'),
  'layout-image-workspace': ['scripts/verify-playground-video-references.mjs', '--image-workspace', ...process.argv.slice(3)],
  'layout-look-sheet-workspace': ['scripts/verify-playground-video-references.mjs', '--look-sheet', ...process.argv.slice(3)],
  'layout-max-references': ['scripts/verify-playground-video-references.mjs', '--max-references', ...process.argv.slice(3)],
  'composition-browse': ['--test', '--test-name-pattern=composition-browse:', 'test/playgroundVideoReferenceService.test.js'],
  'layout-composition': ['scripts/verify-playground-video-references.mjs', '--images', '--composition'],
  fallback: ['--test', '--test-name-pattern=fallback:', 'test/trustedGeneratedSources.test.js'],
  'named-images': ['--test', '--test-name-pattern=named-images:', 'test/playgroundVideoReferenceService.test.js', 'test/trustedGeneratedSources.test.js'],
  'named-looks': ['--test', '--test-name-pattern=named-looks:', 'test/playgroundVideoReferenceService.test.js', 'test/trustedGeneratedSources.test.js'],
  trusted: ['--test', 'test/trustedGeneratedSources.test.js', 'test/modelArkSeedreamProvider.test.js'],
  contract: [
    '--test',
    'test/playgroundVideoReferenceService.test.js',
    'test/cinematicFirstFrameTransport.test.js',
    'test/referenceAssetService.test.js',
  ],
  regression: [
    '--test',
    'test/generationJobCenter.test.js',
    'test/videoGenerationApplicationService.test.js',
    'test/videoCapabilityRegistry.test.js',
    'test/videoProviderTaskService.test.js',
    'test/videoGenerationRoutes.test.js',
    'test/characterLookService.test.js',
    'test/characterProfileLifecycle.test.js',
    'test/characterProfileSharing.test.js',
    'test/creditEstimateGenerationParity.test.js',
    'test/characterDestinationHandoff.test.js',
  ],
  ui: [
    'node_modules/vitest/vitest.mjs',
    'run',
    '--root',
    'web',
    '--config',
    'vitest.config.ts',
    '--configLoader',
    'runner',
    'src/features/playground/components/videoReferenceSelection.test.ts',
    'src/features/playground/components/TrustedVideoSources.test.tsx',
    'src/features/playground/components/GeneratedVideoImagePicker.test.tsx',
    'src/features/playground/components/videoModelSelection.test.ts',
    'src/features/playground/components/videoGenerationReadiness.test.ts',
    'src/features/playground/components/PlaygroundVideoSources.test.tsx',
    'src/features/playground/components/PlaygroundVideoWorkspace.test.tsx',
    'src/features/playground/components/PlaygroundImageCharacterPanel.test.tsx',
    'src/features/profiles/components/CharacterLibraryPicker.test.tsx',
    'src/features/profiles/components/CharacterLookDialog.test.tsx',
    'src/components/generation/VideoEngineTargetPanel.test.tsx',
    'src/features/generation/job-center/GenerationJobCenterIndicator.test.tsx',
  ],
  types: [
    'node_modules/typescript/bin/tsc',
    '-p',
    'web/tsconfig.app.json',
    '--noEmit',
    '--incremental',
    'false',
  ],
  layout: ['scripts/verify-playground-video-references.mjs'],
  'layout-images': ['scripts/verify-playground-video-references.mjs', '--images'],
  'layout-images-trusted': ['scripts/verify-playground-video-references.mjs', '--images', '--trusted'],
  'layout-named': ['scripts/verify-playground-video-references.mjs', '--named'],
  'layout-named-trusted': ['scripts/verify-playground-video-references.mjs', '--named', '--trusted'],
  'layout-trusted': ['scripts/verify-playground-video-references.mjs', '--trusted'],
  'layout-active': ['scripts/verify-playground-video-references.mjs', '--active'],
};
const selected = process.argv[2] === 'options-all' ? offlineOptions
  : process.argv[2] === 'all'
    ? ['fallback', 'named-images', 'named-looks', 'trusted', 'contract', 'regression', 'ui', 'types']
    : [process.argv[2]];
for (const group of selected) {
  if (!groups[group]) {
    console.error(`Use ${Object.keys(groups).join(', ')}, options-all (offline), all`);
    process.exit(2);
  }
  if (group === 'options-locales') {
    const manifest = JSON.parse(await readFile(path.join(root, 'client/i18n/manifest.json'), 'utf8'));
    const required = ['chooseModel', 'searchModels', 'noModels', 'modelUnavailable', 'more', 'locked',
      'audio.none', 'audio.generated', 'maximumCredits', 'selectionChanged', 'referenceRejected', 'editReferences'];
    for (const locale of manifest.locales.filter(item => item.enabled !== false)) {
      const catalog = JSON.parse(await readFile(path.join(root, `client/i18n/locales/${locale.code}/playground.json`), 'utf8'));
      for (const key of required) assert.ok(typeof catalog[`playground.options.${key}`] === 'string'
        && catalog[`playground.options.${key}`].trim(), `${locale.code}: missing generation option ${key}`);
      assert.match(catalog['playground.options.maximumCredits'], /\{count\}/);
      assert.match(catalog['playground.options.selectionChanged'], /\{fields\}/);
    }
  }
  const result = spawnSync(process.execPath, groups[group], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(
  `Checks passed: ${selected.join(', ')}. No paid provider qualification was performed.`,
);
if (process.argv[2] === 'options-all') console.log('Offline fixture checks only; run options-visual separately. Full-screen UAT remains separate.');
