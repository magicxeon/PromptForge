import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const groups = {
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
const selected =
  process.argv[2] === 'all'
    ? ['fallback', 'named-images', 'named-looks', 'trusted', 'contract', 'regression', 'ui', 'types']
    : [process.argv[2]];
for (const group of selected) {
  if (!groups[group]) {
    console.error(`Use ${Object.keys(groups).join(', ')}, all`);
    process.exit(2);
  }
  const result = spawnSync(process.execPath, groups[group], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(
  'Playground reference checks passed. No paid provider qualification was performed.',
);
