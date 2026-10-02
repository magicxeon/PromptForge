import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const groups = {
  'last-frame': ['test/cinematicLastFrame.test.js', 'test/cinematicApplicationService.test.js', 'test/cinematicStoryboardGenerationRoutes.test.js'],
  'take-eligibility': ['test/cinematicTakeEligibility.test.js', 'test/cinematicVideoReferencePlan.test.js', 'test/cinematicApplicationService.test.js'],
  'take-duration': ['test/cinematicVideoPacketCompiler.test.js', 'test/cinematicApplicationService.test.js', 'test/cinematicWhitePrevis.test.js'],
  'prompt-budget': ['test/generationPromptBudget.test.js', 'test/generationPromptRefinementEntryPoint.test.js', 'test/cinematicStoryboardPromptComposer.test.js', 'test/cinematicVideoPacketCompiler.test.js', 'test/storyboardKeyframeContractCompiler.test.js'],
  timing: ['test/cinematicVideoPacketCompiler.test.js', 'test/cinematicDataLineageService.test.js', 'test/cinematicApplicationService.test.js'],
  pilot: ['test/cinematicPilotPolicy.test.js', 'test/cinematicStoryPlanService.test.js', 'test/videoClipBundleService.test.js'],
  references: ['test/cinematicVideoReferencePlan.test.js', 'test/cinematicVideoPacketCompiler.test.js'],
  payload: ['test/modelArkSeedanceProvider.test.js', 'test/videoCapabilityRegistry.test.js'],
  flow: [
    'test/cinematicFirstFrameTransport.test.js', 'test/googleCloudProviderAssetStorage.test.js',
    'test/videoGenerationApplicationService.test.js', 'test/videoProviderTaskService.test.js'
  ],
  adjacent: [
    'test/cinematicApplicationService.test.js', 'test/cinematicVideoPacketCompiler.test.js',
    'test/videoPricingCalculator.test.js', 'test/videoGenerationRoutes.test.js',
    'test/cinematicTimelineCompiler.test.js', 'test/cinematicDataLineageService.test.js'
  ]
};
const legacyFullGroups = Object.keys(groups);
const confirmationUiGroups = {
  'rewamp-confirmation-profile': ['components/generation/useCreditConfirmation.test.tsx', 'components/layout/AccountMenu.test.tsx'],
  'rewamp-confirmation-authoring': ['features/cinematic/components/CinematicFullStoryWriter.test.tsx', 'features/cinematic/components/CinematicChapterWriter.test.tsx', 'features/cinematic/components/CinematicSceneOverview.test.tsx'],
  'rewamp-confirmation-media': ['components/generation/GenerationExperience.test.tsx', 'features/cinematic/components/CinematicProduceRuntime.test.tsx', 'features/playground/components/PlaygroundVideoWorkspace.test.tsx', 'features/cinematic/components/StoryboardShotDialog.test.tsx', 'features/cinematic/components/StoryboardGenerateAllDialog.test.tsx', 'features/generation/api/generationApi.test.ts']
};
const cast017UiGroups = {
  'rewamp-cast-navigation': ['features/cinematic/components/CinematicProjectNavigation.test.tsx',
    'features/cinematic/routes/CinematicStudioRoute.test.tsx', 'features/cinematic/components/CinematicFullStoryWriter.test.tsx'],
  'rewamp-cast-assets': ['features/cinematic/components/CinematicCharacterLooks.test.tsx', 'features/cinematic/components/CinematicMomeloLookImport.test.tsx'],
  'rewamp-bulk-consent': ['components/generation/useCreditConfirmation.test.tsx', 'features/cinematic/components/StoryboardGenerateAllDialog.test.tsx',
    'features/cinematic/components/CinematicChapterOutline.test.tsx', 'features/cinematic/components/CinematicFullStoryWriter.test.tsx',
    'features/cinematic/components/CinematicChapterWriter.test.tsx', 'features/cinematic/components/CinematicSceneOverview.test.tsx'],
  'rewamp-shot-frame-layout': ['features/cinematic/components/CinematicShotWriter.test.tsx']
};
groups['rewamp-cast-assets'] = ['test/cinematicLookReferences.test.js', 'test/characterLookService.test.js'];
groups['rewamp-cast-017'] = groups['rewamp-cast-assets'];
groups['rewamp-confirmation-profile'] = ['test/userPreferences.test.js'];
groups['rewamp-confirmation-016'] = groups['rewamp-confirmation-profile'];

groups['rewamp-authoring-order'] = ['test/cinematicAuthoringContinuity.test.js', 'test/cinematicFullStory.test.js'];
groups['rewamp-authoring-media'] = ['test/characterLookService.test.js', 'test/cinematicVideoPacketCompiler.test.js', 'test/cinematicVideoReferencePlan.test.js'];
groups['rewamp-authoring-014'] = [...groups['rewamp-authoring-order'], ...groups['rewamp-authoring-media']];
groups['rewamp-flow-media'] = ['test/cinematicVideoReferencePlan.test.js', 'test/cinematicFullStory.test.js'];
groups['rewamp-flow-final'] = ['test/videoClipBundleService.test.js'];
groups['rewamp-flow-015'] = [...groups['rewamp-flow-media'], ...groups['rewamp-flow-final']];
const flowUiGroups = {
  'rewamp-flow-recovery': [
    'state/useCinematicTextRecovery.test.tsx', 'components/CinematicRecoveryNotice.test.tsx',
    'components/CinematicFullStoryWriter.test.tsx', 'components/CinematicChapterWriter.test.tsx',
    'components/CinematicSceneOverview.test.tsx', 'components/CinematicShotWriter.test.tsx'
  ],
  'rewamp-flow-media': ['components/CinematicPortableShot.test.tsx', 'components/authoring/ShotProductionReadiness.test.tsx',
    'components/CinematicProduceRuntime.test.tsx', 'routes/CinematicStudioRoute.test.tsx', 'components/storyboardGenerationAdapter.test.ts'],
  'rewamp-flow-final': ['components/CinematicChapterFinal.test.tsx']
};
groups['rewamp-config'] = [
  'test/cinematicRewampConfiguration.test.js',
  'test/cinematicDirectedOpeningConfiguration.test.js'
];
groups['rewamp-hierarchy'] = ['test/cinematicSeries.test.js', 'test/cinematicProjectRepository.test.js'];
groups['rewamp-story'] = ['test/cinematicProvisionalDossier.test.js', 'test/cinematicStoryEnhancementService.test.js', 'test/cinematicStoryPlanService.test.js', 'test/cinematicSimpleAuthoringService.test.js'];
groups['rewamp-revisions'] = ['test/cinematicRewampConfiguration.test.js', 'test/cinematicProjectRepository.test.js'];
groups['rewamp-assets'] = ['test/cinematicSceneEnvironment.test.js', 'test/cinematicVideoReferencePlan.test.js', 'test/referenceAssetService.test.js'];
groups['rewamp-preparation'] = [...new Set([...groups['prompt-budget'], ...groups.references, 'test/cinematicDialogueTiming.test.js'])];
groups['rewamp-production'] = [...new Set([...groups['take-eligibility'], ...groups['take-duration'], 'test/cinematicPreviousTakes.test.js'])];
groups['rewamp-final'] = ['test/cinematicTimelineCompiler.test.js', 'test/videoClipBundleService.test.js'];
groups['rewamp-migration'] = ['test/cinematicSeries.test.js', 'test/cinematicProjectRepository.test.js'];
groups['rewamp-projects'] = ['test/cinematicProjectRepository.test.js'];
groups['rewamp-project-rename'] = ['test/cinematicSeries.test.js', 'test/cinematicProjectRepository.test.js'];
groups['rewamp-new-project'] = [
  'test/cinematicRewampConfiguration.test.js',
  'test/cinematicDirectedOpeningConfiguration.test.js',
  'test/cinematicStoryEnhancementService.test.js',
  'test/cinematicSeries.test.js'
];
groups['rewamp-story-ui'] = ['test/cinematicSeries.test.js'];
groups['rewamp-full-story'] = ['test/cinematicFullStory.test.js', 'test/cinematicFullStoryService.test.js'];
groups['rewamp-story-import'] = ['test/cinematicStoryImport.test.js'];
groups['rewamp-chapter-outline'] = ['test/cinematicChapterOutline.test.js'];
groups['rewamp-chapters'] = ['test/cinematicSeries.test.js', 'test/cinematicFullStory.test.js'];
groups['rewamp-chapter-revisions'] = ['test/cinematicFullStory.test.js'];
groups['rewamp-chapter-proposals'] = ['test/cinematicFullStory.test.js'];
groups['rewamp-shared-characters'] = ['test/cinematicFullStory.test.js'];
groups['rewamp-scenes'] = ['test/cinematicSceneAuthoring.test.js', 'test/cinematicFullStory.test.js', 'test/cinematicFullStoryService.test.js'];
groups['rewamp-shots'] = ['test/cinematicShotAuthoring.test.js', 'test/cinematicFullStory.test.js', 'test/cinematicFullStoryService.test.js'];
groups['rewamp-writer'] = ['test/cinematicShotAuthoring.test.js', 'test/cinematicShotDocumentCompiler.test.js', 'test/cinematicFullStory.test.js'];
groups['rewamp-look-references'] = ['test/cinematicLookReferences.test.js', 'test/cinematicVideoReferencePlan.test.js', 'test/characterLookService.test.js'];
groups['rewamp-story-look-layout'] = ['test/cinematicWardrobeSuggestionService.test.js'];
groups['rewamp-look-template'] = ['test/characterLookService.test.js'];
groups['rewamp-visuals'] = [
  'test/cinematicSceneEnvironment.test.js',
  'test/cinematicFullStoryService.test.js',
  'test/cinematicShotDocumentCompiler.test.js',
  'test/cinematicApplicationService.test.js',
  'test/cinematicVideoPacketCompiler.test.js',
  'test/referenceProcessingService.test.js',
  'test/cinematicPromptRecipePolicy.test.js'
];
const rewampGroups = ['rewamp-project-rename', 'rewamp-chapter-outline', 'rewamp-scene-layout-revision', 'rewamp-cast-chapter-target', 'rewamp-story-import', 'rewamp-config', 'rewamp-hierarchy', 'rewamp-story', 'rewamp-revisions', 'rewamp-assets',
  'rewamp-preparation', 'rewamp-production', 'rewamp-final', 'rewamp-migration', 'rewamp-projects', 'rewamp-new-project', 'rewamp-story-ui', 'rewamp-full-story', 'rewamp-chapters',
  'rewamp-chapter-revisions', 'rewamp-chapter-proposals', 'rewamp-shared-characters', 'rewamp-scenes', 'rewamp-shots', 'rewamp-visuals', 'rewamp-writer', 'rewamp-look-references', 'rewamp-story-look-layout', 'rewamp-look-template'];
const suite = process.argv[2] || 'help';
rewampGroups.push('rewamp-authoring-order', 'rewamp-authoring-media', 'rewamp-authoring-014');
rewampGroups.push(...Object.keys(flowUiGroups), 'rewamp-flow-015');
rewampGroups.push(...Object.keys(confirmationUiGroups), 'rewamp-confirmation-016');
rewampGroups.push(...Object.keys(cast017UiGroups), 'rewamp-cast-017');
rewampGroups.push('rewamp-brief-018');
if (suite === 'help' || suite === '--help') {
  console.log('Usage: node scripts/test-cinematic-video.js <last-frame|last-frame-ui|timing|timing-ui|take-duration|take-eligibility|prompt-budget|preview-selection|pilot|references|payload|flow|ui|full|rewamp-config|rewamp-hierarchy|rewamp-story|rewamp-revisions|rewamp-assets|rewamp-preparation|rewamp-production|rewamp-final|rewamp-migration|rewamp-projects|rewamp-new-project|rewamp-story-ui|rewamp-full-story|rewamp-chapters|rewamp-chapter-revisions|rewamp-chapter-proposals|rewamp-shared-characters|rewamp-scenes|rewamp-shots|rewamp-ui|rewamp-all>');
  console.log('last-frame / last-frame-ui: owned video derivative, Storyboard approval, disabled and preview controls');
  console.log('rewamp-story-import: Setup file import and Full Story Character extraction');
  console.log('rewamp-brief-018: Brief radio controls, import and Story/Characters navigation (UI only)');
  console.log('rewamp-cast-chapter-target: Character disclosure and Chapter target visibility (two UI files only)');
  console.log('rewamp-scene-layout-revision: Scene Cast layout and required Chapter revision instruction');
  console.log('rewamp-chapter-outline: outline proposal/approval, advisory economics and focused Full Story UI');
  console.log('rewamp-project-rename: Setup/Series title synchronization and library cache refresh only');
  console.log('rewamp-visuals: Scene Environment and Shot First Frame authoring UI only');
  console.log('rewamp-writer: Shot Cast/dialogue, editable Video Prompt, persistence and focused writer UI');
  console.log('rewamp-look-references: Character Looks, Scene bindings, reference provenance and style presets');
  console.log('rewamp-story-look-layout: wardrobe text model configuration and Full Story/Character presentation');
  console.log('rewamp-look-template: portrait Look template, pinned recipes/crops and legacy result adoption');
  console.log('timing / timing-ui: advisory action estimate and Generate button regressions only');
  console.log('payload: adapter payload and catalog; flow: source, storage, Credits and task lifecycle');
  console.log('references: dynamic Cast/Look authority and configured video prompt');
  console.log('ui: Produce controls/status/preview; full: all groups plus adjacent regressions');
  console.log('Mocked tests only. No live provider calls, build or browser sweep.');
  console.log('rewamp-confirmation-profile / rewamp-confirmation-authoring / rewamp-confirmation-media: task-016 slices; rewamp-confirmation-016: explicit aggregate');
  console.log('rewamp-cast-navigation / rewamp-cast-assets / rewamp-bulk-consent / rewamp-shot-frame-layout: task-017 slices; rewamp-cast-017: explicit deduplicated task-only aggregate');
  console.log('rewamp-authoring-order / rewamp-authoring-media: focused task-014 slices; rewamp-authoring-014: explicit task-only aggregate');
  console.log('rewamp-flow-recovery / rewamp-flow-media / rewamp-flow-final: focused task-015 slices; rewamp-flow-015: explicit task-only aggregate');
} else if (!['last-frame', 'last-frame-ui', 'timing', 'timing-ui', 'take-duration', 'take-eligibility', 'prompt-budget', 'preview-selection', 'pilot', 'references', 'payload', 'flow', 'ui', 'full', ...rewampGroups, 'rewamp-ui', 'rewamp-all'].includes(suite) || process.argv.length > 3) {
  console.error('Unknown suite. Use --help.');
  process.exitCode = 2;
} else {
  const startedAt = performance.now();
  const files = suite === 'full' ? [...new Set(legacyFullGroups.flatMap(group => groups[group]))]
    : suite === 'rewamp-all' ? [...new Set(rewampGroups.flatMap(group => groups[group] || []))]
      : groups[suite];
  const nameFilter = suite === 'rewamp-project-rename' ? ['--test-name-pattern=Project rename|groups Chapters']
    : suite === 'timing' ? ['--test-name-pattern=action duration estimate|without an approved immutable Storyboard source|stale Shot authority'] : [];
  if (files?.length) run('backend', ['--test', ...nameFilter, ...new Set(files)], root);
  if (!process.exitCode && ['rewamp-brief-018', 'rewamp-all'].includes(suite)) {
    run('brief-018-ui', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      'src/features/cinematic/components/CinematicNewProjectComposer.test.tsx',
      'src/features/cinematic/components/CinematicProjectNavigation.test.tsx',
      'src/features/cinematic/routes/CinematicStudioRoute.test.tsx',
      'src/features/cinematic/components/CinematicStoryFileImport.test.tsx'], path.join(root, 'web'));
  }
  const cast017UiFiles = ['rewamp-cast-017', 'rewamp-all'].includes(suite)
    ? [...new Set(Object.values(cast017UiGroups).flat())] : cast017UiGroups[suite];
  if (!process.exitCode && cast017UiFiles?.length) {
    run('cast-017-ui', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      ...cast017UiFiles.map(file => `src/${file}`)], path.join(root, 'web'));
  }
  const confirmationUiFiles = ['rewamp-confirmation-016', 'rewamp-all'].includes(suite)
    ? [...new Set(Object.values(confirmationUiGroups).flat())] : confirmationUiGroups[suite];
  if (!process.exitCode && confirmationUiFiles?.length) {
    run('confirmation-ui', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      ...confirmationUiFiles.map(file => `src/${file}`)], path.join(root, 'web'));
  }
  const flowUiFiles = ['rewamp-flow-015', 'rewamp-all'].includes(suite)
    ? [...new Set(Object.values(flowUiGroups).flat())] : flowUiGroups[suite];
  if (!process.exitCode && flowUiFiles?.length) {
    run('flow-hardening-ui', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      ...flowUiFiles.map(file => `src/features/cinematic/${file}`)], path.join(root, 'web'));
  }
  if (!process.exitCode && ['rewamp-authoring-order', 'rewamp-authoring-014'].includes(suite)) {
    run('authoring-order-ui', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      'src/features/cinematic/components/CinematicChapterWriter.test.tsx',
      'src/features/cinematic/components/CinematicSceneOverview.test.tsx'], path.join(root, 'web'));
  }
  if (!process.exitCode && ['rewamp-authoring-media', 'rewamp-authoring-014'].includes(suite)) {
    run('authoring-media-ui', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      'src/features/cinematic/components/CinematicShotWriter.test.tsx',
      'src/features/cinematic/components/CinematicPortableShot.test.tsx',
      'src/features/cinematic/components/CinematicNewProjectComposer.test.tsx'], path.join(root, 'web'));
  }
  if (!process.exitCode && ['rewamp-project-rename', 'rewamp-all'].includes(suite)) {
    run('project-rename-ui', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      'src/features/cinematic/routes/CinematicStudioRoute.test.tsx'], path.join(root, 'web'));
  }
  if (!process.exitCode && suite === 'rewamp-scene-layout-revision') {
    run('revision-validation', ['--test', '--test-name-pattern=Chapter revision requires|Full Story stays separate', 'test/cinematicFullStory.test.js'], root);
  }
  if (!process.exitCode && ['rewamp-chapter-outline', 'rewamp-all'].includes(suite)) {
    run('chapter-outline-ui', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      'src/features/cinematic/components/CinematicChapterOutline.test.tsx',
      'src/features/cinematic/components/CinematicFullStoryWriter.test.tsx'], path.join(root, 'web'));
  }
  if (!process.exitCode && ['rewamp-scene-layout-revision', 'rewamp-all'].includes(suite)) {
    run('scene-layout-revision-ui', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      'src/features/cinematic/components/CinematicSceneLooks.test.tsx',
      'src/features/cinematic/components/CinematicChapterWriter.test.tsx'], path.join(root, 'web'));
  }
  if (!process.exitCode && ['rewamp-cast-chapter-target', 'rewamp-all'].includes(suite)) {
    run('cast-chapter-target-ui', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      'src/features/cinematic/components/CinematicFullStoryWriter.test.tsx',
      'src/features/cinematic/components/CinematicChapterWriter.test.tsx'], path.join(root, 'web'));
  }
  if (!process.exitCode && ['rewamp-story-import', 'rewamp-all'].includes(suite)) {
    run('story-import-ui', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      'src/features/cinematic/routes/CinematicStudioRoute.test.tsx',
      'src/features/cinematic/components/CinematicStoryFileImport.test.tsx',
      'src/features/cinematic/components/CinematicNewProjectComposer.test.tsx',
      'src/features/cinematic/components/CinematicFullStoryWriter.test.tsx'], path.join(root, 'web'));
  }
  if (!process.exitCode && suite === 'rewamp-look-template') {
    run('look-template-ui', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      'src/features/profiles/components/CharacterLookDialog.test.tsx',
      'src/components/generation/EngineTargetPanel.test.tsx'], path.join(root, 'web'));
  }
  if (!process.exitCode && suite === 'rewamp-story-look-layout') {
    run('story-look-layout-ui', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      'src/features/cinematic/components/CinematicFullStoryWriter.test.tsx',
      'src/features/cinematic/components/CinematicCharacterLooks.test.tsx'], path.join(root, 'web'));
  }
  if (!process.exitCode && suite === 'rewamp-writer') {
    run('ui', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      'src/features/cinematic/components/CinematicShotWriter.test.tsx'], path.join(root, 'web'));
  }
  if (!process.exitCode && ['rewamp-look-references', 'rewamp-all'].includes(suite)) {
    run('look-references-ui', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      'src/features/cinematic/components/CinematicCharacterLooks.test.tsx',
      'src/features/cinematic/components/CinematicSceneLooks.test.tsx',
      'src/features/cinematic/components/CinematicSceneOverview.test.tsx',
      'src/features/cinematic/components/CinematicShotWriter.test.tsx',
      'src/features/cinematic/components/storyboardGenerationAdapter.test.ts',
      'src/features/cinematic/components/StoryboardShotDialog.test.tsx',
      'src/features/profiles/components/CharacterLookDialog.test.tsx'], path.join(root, 'web'));
  }
  if (!process.exitCode && suite === 'last-frame-ui') {
    run('ui', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      'src/features/cinematic/components/StoryboardShotDialog.test.tsx',
      'src/components/generation/ReferenceSlotGrid.test.tsx'], path.join(root, 'web'));
  }
  if (!process.exitCode && suite === 'timing-ui') {
    run('ui', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      'src/features/cinematic/components/CinematicProduceRuntime.test.tsx', '-t', 'action duration estimate'], path.join(root, 'web'));
  }
  if (!process.exitCode && suite === 'preview-selection') {
    run('ui', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      'src/features/cinematic/components/CinematicProduceRuntime.test.tsx'], path.join(root, 'web'));
  }
  if (!process.exitCode && ['ui', 'full'].includes(suite)) {
    run('ui', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      'src/features/cinematic/components/CinematicProduceRuntime.test.tsx',
      'src/features/cinematic/components/StoryboardSequenceBoard.test.tsx',
      'src/features/cinematic/components/authoring/DialogueSoundEditor.test.tsx',
      'src/features/cinematic/components/produce/VideoTakeList.test.tsx',
      'src/lib/api/apiClient.test.ts',
      'src/features/cinematic/components/StoryboardShotDialog.test.tsx',
      'src/features/cinematic/components/storyboardGenerationAdapter.test.ts',
      'src/features/cinematic/components/produce/produceReadModel.test.ts',
      'src/features/cinematic/schemas/cinematicCoreContracts.test.ts'], path.join(root, 'web'));
  }
  if (!process.exitCode && ['rewamp-ui', 'rewamp-all'].includes(suite)) {
    run('rewamp-ui', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      'src/features/cinematic/components/CinematicWorkspaceNavigation.test.tsx',
      'src/features/cinematic/components/CinematicProjectLibrary.test.tsx',
      'src/features/cinematic/components/CinematicNewProjectComposer.test.tsx',
      'src/features/cinematic/components/CinematicSetupForm.test.tsx',
      'src/features/cinematic/components/CinematicFullStoryWriter.test.tsx',
      'src/features/cinematic/components/CinematicChapterWriter.test.tsx',
      'src/features/cinematic/schemas/cinematicRewampContracts.test.ts',
      'src/features/cinematic/components/CinematicProduceRuntime.test.tsx',
      'src/features/cinematic/components/StoryIntentChoices.test.tsx'], path.join(root, 'web'));
  }
  if (!process.exitCode && suite === 'rewamp-projects') {
    run('rewamp-projects-ui', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      'src/features/cinematic/components/CinematicProjectLibrary.test.tsx',
      'src/features/cinematic/schemas/cinematicRewampContracts.test.ts'], path.join(root, 'web'));
  }
  if (!process.exitCode && suite === 'rewamp-new-project') {
    run('rewamp-new-project-ui', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      'src/features/cinematic/components/CinematicNewProjectComposer.test.tsx',
      'src/features/cinematic/components/CinematicSetupForm.test.tsx',
      'src/features/cinematic/schemas/cinematicRewampContracts.test.ts'], path.join(root, 'web'));
  }
  if (!process.exitCode && suite === 'rewamp-story-ui') {
    run('rewamp-story-ui', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      'src/features/cinematic/components/CinematicStoryWriter.test.tsx',
      'src/features/cinematic/schemas/cinematicRewampContracts.test.ts'], path.join(root, 'web'));
  }
  if (!process.exitCode && suite === 'rewamp-full-story') {
    run('rewamp-full-story-ui', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      'src/features/cinematic/components/CinematicFullStoryWriter.test.tsx',
      'src/features/cinematic/components/CinematicNewProjectComposer.test.tsx',
      'src/features/cinematic/components/CinematicProjectLibrary.test.tsx'], path.join(root, 'web'));
  }
  if (!process.exitCode && suite === 'rewamp-chapters') {
    run('rewamp-chapters-ui', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      'src/components/ui/Button.test.tsx',
      'src/features/cinematic/components/CinematicFullStoryWriter.test.tsx',
      'src/features/cinematic/components/CinematicChapterWriter.test.tsx'], path.join(root, 'web'));
  }
  if (!process.exitCode && suite === 'rewamp-scenes') {
    run('rewamp-scenes-ui', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      'src/features/cinematic/components/CinematicChapterWriter.test.tsx',
      'src/features/cinematic/components/CinematicSceneOverview.test.tsx'], path.join(root, 'web'));
  }
  if (!process.exitCode && ['rewamp-visuals', 'rewamp-all'].includes(suite)) {
    run('rewamp-visuals-ui', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      'src/features/cinematic/components/CinematicSceneOverview.test.tsx',
      'src/features/cinematic/components/SceneEnvironmentControl.test.tsx',
      'src/features/cinematic/components/CinematicShotWriter.test.tsx',
      'src/features/cinematic/components/StoryboardShotDialog.test.tsx'], path.join(root, 'web'));
  }
  if (!process.exitCode && suite === 'rewamp-shots') {
    run('rewamp-shots-ui', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      'src/features/cinematic/components/CinematicSceneOverview.test.tsx',
      'src/features/cinematic/components/CinematicShotWriter.test.tsx'], path.join(root, 'web'));
  }
  if (!process.exitCode && ['rewamp-chapter-revisions', 'rewamp-chapter-proposals', 'rewamp-shared-characters'].includes(suite)) {
    run(`${suite}-ui`, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--configLoader', 'runner',
      'src/features/cinematic/components/CinematicFullStoryWriter.test.tsx',
      'src/features/cinematic/components/CinematicChapterWriter.test.tsx',
      'src/features/cinematic/schemas/cinematicRewampContracts.test.ts'], path.join(root, 'web'));
  }
  console.log(`[cinematic-video:${suite}] ${process.exitCode ? 'FAILED' : 'PASSED'} in ${((performance.now() - startedAt) / 1000).toFixed(1)}s`);
}

function run(label, args, cwd) {
  console.log(`[cinematic-video] ${label}`);
  const result = spawnSync(process.execPath, args, { cwd, shell: false, stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exitCode = result.status || 1;
}
