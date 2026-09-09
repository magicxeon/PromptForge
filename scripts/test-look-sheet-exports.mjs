import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const vitest = ['node_modules/vitest/vitest.mjs', 'run', '--root', 'web', '--config', 'vitest.config.ts', '--configLoader', 'runner'];
const groups = {
  definition: ['--test', 'test/lookSheetDefinition.test.js'],
  export: ['--test', 'test/mediaExport.test.js'],
  generation: ['--test', 'test/lookSheetGeneration.test.js', 'test/creditEstimateGenerationParity.test.js'],
  privacy: ['--test', 'test/lookSheetPreviewRoutes.test.js', 'test/mediaExport.test.js'],
  'compatibility-prompt': ['--test', 'test/reactGenerationModePromptParity.test.js', 'test/studioNaturalRealism.test.js', 'test/generationPromptRefinementEntryPoint.test.js'],
  'compatibility-profile': ['--test', 'test/characterLookService.test.js', 'test/characterProfileLifecycle.test.js'],
  'compatibility-credit': ['--test', 'test/creditReservationService.test.js'],
  'compatibility-billing': ['--test', 'test/creditGenerationBilling.test.js'],
  'compatibility-groups': ['--test', 'test/generationGroup.test.js'],
  'compatibility-ui': [...vitest, 'src/components/generation/GenerationResultSurface.test.tsx', 'src/components/generation/StudioGenerationWorkspace.test.tsx', 'src/features/generation/api/generationApi.test.ts', 'src/components/generation/EngineTargetPanel.test.tsx'],
  download: [...vitest, 'src/components/media/MediaExportButton.test.tsx'],
  privacy: ['--test', 'test/lookSheetPreviewRoutes.test.js', 'test/mediaExport.test.js'],
  'compatibility-prompt': ['--test', 'test/reactGenerationModePromptParity.test.js', 'test/studioNaturalRealism.test.js', 'test/generationPromptRefinementEntryPoint.test.js'],
  'compatibility-profile': ['--test', 'test/characterLookService.test.js', 'test/characterProfileLifecycle.test.js'],
  'compatibility-credit': ['--test', 'test/creditReservationService.test.js'],
  'compatibility-ui': [...vitest, 'src/components/generation/GenerationResultSurface.test.tsx', 'src/components/generation/StudioGenerationWorkspace.test.tsx', 'src/features/generation/api/generationApi.test.ts', 'src/components/generation/EngineTargetPanel.test.tsx'],
  download: [...vitest, 'src/components/media/MediaExportButton.test.tsx'],
  form: [...vitest, 'src/components/profiles/CharacterLookSheetForm.test.tsx'],
  comparison: [...vitest, 'src/features/comparisons/comparisonLayout.test.ts', 'src/components/comparisons/ComparisonWorkspace.test.tsx'],
  favicon: ['--test', 'test/momeloFavicon.test.js'],
  types: ['node_modules/typescript/bin/tsc', '-p', 'web/tsconfig.app.json', '--noEmit', '--incremental', 'false']
};
const dynamicGroups = {
  'dynamic-domain': ['--test', 'test/lookSheetDefinition.test.js', 'test/lookSheetGeneration.test.js', 'test/lookSheetEnhancement.test.js'],
  'dynamic-ui': [...vitest, 'src/components/generation/EngineTargetPanel.test.tsx', 'src/components/generation/engineTargetPanelHelpers.test.ts', 'src/components/profiles/CharacterLookSheetForm.test.tsx', 'src/features/profiles/components/LookSheetEnhancementPanel.test.tsx', 'src/components/generation/StudioGenerationWorkspace.test.tsx', 'src/features/generation/api/generationApi.test.ts', 'src/components/generation/GenerationResultSurface.test.tsx'],
  'dynamic-types': groups.types,
};
const editorialGroups = {
  'editorial-domain': dynamicGroups['dynamic-domain'],
  'editorial-export': groups.export,
  'editorial-schema': [...vitest, 'src/features/profiles/schemas/lookSheetDefinitionSchemas.test.ts'],
  'editorial-types': groups.types,
};
const enhancementGroups = {
  'enhancement-definition': groups.definition,
  ...Object.fromEntries(['pricing', 'prompt', 'lifecycle', 'recovery', 'privacy', 'integration', 'api', 'provider'].map(name =>
    [`enhancement-${name}`, ['--test', '--test-name-pattern', `^${name}:`, 'test/lookSheetEnhancement.test.js']])),
  'enhancement-ui': [...vitest, 'src/components/profiles/CharacterLookSheetForm.test.tsx', 'src/features/profiles/components/LookSheetEnhancementPanel.test.tsx'],
  'enhancement-compatibility': ['--test', 'test/lookSheetGeneration.test.js', 'test/lookSheetPreviewRoutes.test.js',
    'test/creditReservationService.test.js', 'test/creditGenerationBilling.test.js', 'test/studioNaturalRealism.test.js', 'test/generationPromptRefinementEntryPoint.test.js'],
  'enhancement-types': groups.types
};
const selected = process.argv[2] === 'all' ? Object.keys(groups)
  : process.argv[2] === 'editorial-all' ? Object.keys(editorialGroups)
  : process.argv[2] === 'dynamic-all' ? ['dynamic-domain', 'dynamic-ui', 'dynamic-types']
  : process.argv[2] === 'enhancement-all' ? Object.keys(enhancementGroups) : [process.argv[2]];
for (const name of selected) {
  const command = editorialGroups[name] || dynamicGroups[name] || enhancementGroups[name] || groups[name];
  if (!command) {
    console.error(`Select ${Object.keys(groups).join(', ')} or all. Unimplemented groups are not release evidence.`);
    process.exit(2);
  }
  console.log(`Checking ${name}`);
  const result = spawnSync(process.execPath, command, { cwd: root, stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status || 1);
}
