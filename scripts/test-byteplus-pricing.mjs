import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const groups = {
  image: ['test/creditPricingPolicy.test.js', 'test/modelArkSeedreamProvider.test.js'],
  video: ['test/videoPricingCalculator.test.js', 'test/videoCapabilityRegistry.test.js'],
  integration: ['test/creditEstimateGenerationParity.test.js', 'test/creditReservationService.test.js', 'test/adminFinanceReports.test.js']
};
const group = process.argv[2] || 'image';
if (group !== 'all' && !Object.hasOwn(groups, group)) throw new Error('Choose image|video|integration|all');
function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: fileURLToPath(new URL('../', import.meta.url)), stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
for (const name of group === 'all' ? Object.keys(groups) : [group]) {
  run(['--test', `--test-name-pattern=^${name}:`, 'test/byteplusPricingReconciliation.test.js']);
  run(['--test', ...groups[name]]);
}
