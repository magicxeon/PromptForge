import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const ui = ['node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.config.ts', '--root', 'web', '--configLoader', 'runner'];
const groups = {
  'source-retry': ['--test', 'test/trustedGeneratedSources.test.js', 'test/videoGenerationApplicationService.test.js'],
  'source-ui': [...ui, 'src/features/cinematic/components/CinematicProduceRuntime.test.tsx', 'src/features/cinematic/components/StoryboardVideoCompatibilityNotice.test.tsx'],
  actions: ['--test', 'test/cinematicStoryEnhancementService.test.js', 'test/openAITextProvider.test.js'],
  'actions-ui': [...ui, 'src/features/cinematic/components/StoryEnhanceDialog.test.tsx', 'src/features/cinematic/state/applyStoryEnhancement.test.ts'],
  picker: ['--test', 'test/trustedGeneratedSources.test.js', 'test/directGeneratedCast.test.js', 'test/videoGenerationRoutes.test.js'],
  'picker-ui': [...ui, 'src/components/generation/GeneratedLookSourceField.test.tsx', 'src/features/cinematic/components/GeneratedCastDialog.test.tsx', 'src/features/playground/components/TrustedVideoSources.test.tsx', 'src/features/cinematic/state/cinematicDraftStorage.test.ts'],
  config: ['--test', 'test/cinematicDirectedOpeningConfiguration.test.js', 'test/cinematicStoryEnhancementService.test.js', 'test/cinematicStoryPlanPolicy.test.js'],
  authoring: ['--test', 'test/cinematicStoryPlanService.test.js', 'test/storyboardKeyframeContractCompiler.test.js', 'test/cinematicVideoPacketCompiler.test.js', 'test/cinematicApplicationService.test.js'],
  references: ['--test', 'test/cinematicDirectedOpenings.test.js', 'test/referenceProcessingService.test.js', 'test/cinematicStoryboardGenerationRoutes.test.js', 'test/directGeneratedCast.test.js'],
  transport: ['--test', 'test/videoGenerationApplicationService.test.js', 'test/cinematicVideoReferencePlan.test.js', 'test/trustedGeneratedSources.test.js', 'test/cinematicFirstFrameTransport.test.js'],
  workflow: ['--test', 'test/creditEstimateGenerationParity.test.js', 'test/creditGenerationBilling.test.js', 'test/generationPromptRefinementEntryPoint.test.js', 'test/resolvedReferenceImages.test.js', 'test/cinematicStoryboardPromptComposer.test.js', 'test/cinematicFieldManifestService.test.js', 'test/cinematicPromptRecipePolicy.test.js'],
  ui: [...ui, 'src/features/cinematic/components/CinematicSetupForm.test.tsx', 'src/features/cinematic/components/StoryIntentChoices.test.tsx', 'src/features/cinematic/components/authoring/sceneDirectionProposal.test.ts', 'src/features/cinematic/components/CinematicUxPrototype.test.tsx', 'src/features/cinematic/components/StoryboardShotDialog.test.tsx', 'src/features/cinematic/components/StoryboardGenerateAllDialog.test.tsx', 'src/features/generation/api/generationApi.test.ts'],
  types: ['node_modules/typescript/bin/tsc', '-p', 'web/tsconfig.app.json', '--noEmit', '--incremental', 'false']
};
const selected = process.argv[2];
if (selected !== 'all' && !groups[selected]) { console.error(`Select ${Object.keys(groups).join(', ')} or all.`); process.exit(2); }
for (const name of selected === 'all' ? Object.keys(groups) : [selected]) {
  console.log(`Checking directed openings: ${name}`);
  const result = spawnSync(process.execPath, groups[name], { cwd: root, stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status || 1);
}
