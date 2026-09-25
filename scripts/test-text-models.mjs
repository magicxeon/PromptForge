import { spawnSync } from 'node:child_process';

const groups = {
  policy: [
    'test/promptRefinementPolicy.test.js',
    'test/cinematicDirectedOpeningConfiguration.test.js',
    'test/cinematicStoryPlanPolicy.test.js',
    'test/cinematicWardrobeSuggestionService.test.js',
    'test/attributeLocalizationService.test.js'
  ],
  provider: ['test/openAITextProvider.test.js'],
  billing: ['test/lookSheetEnhancement.test.js']
};

const group = process.argv[2] || 'all';
if (group !== 'all' && !Object.hasOwn(groups, group)) {
  process.stderr.write('Usage: node scripts/test-text-models.mjs [policy|provider|billing|all]\n');
  process.exitCode = 2;
} else {
  const files = group === 'all' ? Object.values(groups).flat() : groups[group];
  const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
}
