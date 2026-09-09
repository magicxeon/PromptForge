import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const groups = {
  adapter: [['--test', '--test-name-pattern', '^adapter:', 'test/openAIImage25.test.js']],
  catalog: [['--test', 'test/providerRegistry.test.js', 'test/openAIStreamingConfig.test.js'],
    ['--test', '--test-name-pattern', '^catalog:', 'test/openAIImage25.test.js']],
  pricing: [['--test', 'test/creditPricingPolicy.test.js', 'test/creditReservationService.test.js', 'test/creditGenerationBilling.test.js', 'test/openAIImage25Cost.test.js'],
    ['--test', '--test-name-pattern', '^pricing:', 'test/openAIImage25.test.js'],
    ['--test', 'test/generationGroup.test.js', 'test/adminFinanceReports.test.js', 'test/adminFinanceDrafts.test.js']]
};
const selected = process.argv[2] === 'all' ? Object.keys(groups) : [process.argv[2]];
for (const name of selected) {
  if (!groups[name]) { console.error('Select adapter, catalog, pricing or all.'); process.exit(2); }
  for (const args of groups[name]) {
    const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
    if (result.error) console.error(result.error.message);
    if (result.status !== 0) process.exit(result.status || 1);
  }
}
