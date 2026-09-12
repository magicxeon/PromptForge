import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const groups = {
  'inline-shot-domain': ['--test', '--test-name-pattern=Shot direction edits', 'test/cinematicApplicationService.test.js'],
  'inline-shot-ui': ['node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.config.ts', '--root', 'web', '--configLoader', 'runner',
    'src/features/cinematic/components/StoryboardShotDialog.test.tsx', 'src/features/cinematic/components/StoryboardSequenceBoard.test.tsx'],
  'image-look-ui': ['node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.config.ts', '--root', 'web', '--configLoader', 'runner',
    'src/components/generation/ReferenceSlotGrid.test.tsx', 'src/components/generation/GeneratedLookSourceField.test.tsx',
    'src/features/playground/components/PlaygroundImageCharacterPanel.test.tsx'],
  'approval-recovery': ['--test', 'test/cinematicStoryboardRecovery.test.js', 'test/cinematicStoryboardAssetService.test.js'],
  'open-sources': ['--test', '--test-name-pattern=open-source:|image age|original URL eligibility', 'test/trustedGeneratedSources.test.js'],
  'source-regression': ['--test', 'test/trustedGeneratedSources.test.js'],
  'open-picker': ['node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.config.ts', '--root', 'web', '--configLoader', 'runner',
    'src/components/generation/GeneratedLookSourceField.test.tsx',
    'src/features/cinematic/components/GeneratedCastDialog.test.tsx',
    'src/features/cinematic/components/StoryboardVideoCompatibilityNotice.test.tsx',
    'src/features/playground/components/TrustedVideoSources.test.tsx',
    'src/features/playground/components/videoReferenceSelection.test.ts'],
  direct: ['--test', 'test/directGeneratedCast.test.js', 'test/cinematicApplicationService.test.js', 'test/cinematicStoryboardGenerationRoutes.test.js'],
  domain: ['--test', 'test/generatedCastSheet.test.js', 'test/characterLookService.test.js', 'test/trustedGeneratedSources.test.js'],
  transport: ['--test', 'test/cinematicVideoReferencePlan.test.js', 'test/videoGenerationApplicationService.test.js', 'test/cinematicFirstFrameTransport.test.js'],
  ui: ['node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.config.ts', '--root', 'web', '--configLoader', 'runner',
    'src/features/cinematic/components/GeneratedCastDialog.test.tsx',
    'src/features/profiles/components/CharacterLookDialog.test.tsx',
    'src/components/generation/GeneratedLookSourceField.test.tsx',
    'src/features/playground/components/TrustedVideoSources.test.tsx'],
  types: ['node_modules/typescript/bin/tsc', '-p', 'web/tsconfig.app.json', '--noEmit', '--incremental', 'false'],
  binding: ['node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.config.ts', '--root', 'web', '--configLoader', 'runner',
    'src/features/cinematic/components/CinematicUxPrototype.test.tsx',
    'src/features/cinematic/components/CharacterPickerDialog.test.tsx',
    'src/features/cinematic/components/StoryboardShotDialog.test.tsx',
    'src/features/cinematic/components/StoryboardGenerateAllDialog.test.tsx'],
};
for (const name of process.argv[2] === 'all' ? Object.keys(groups) : [process.argv[2]]) {
  if (!groups[name]) { console.error(`Select ${Object.keys(groups).join(', ')} or all.`); process.exit(2); }
  console.log(`Checking ${name}`);
  const result = spawnSync(process.execPath, groups[name], { cwd: root, stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status || 1);
}
