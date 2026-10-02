import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const groups = {
  image: ['test/creditPricingPolicy.test.js', 'test/modelArkSeedreamProvider.test.js'],
  video: ['test/videoPricingCalculator.test.js', 'test/videoCapabilityRegistry.test.js'],
  integration: ['test/creditEstimateGenerationParity.test.js', 'test/creditReservationService.test.js', 'test/adminFinanceReports.test.js'],
  settlement: ['test/videoActualCreditSettlement.test.js', 'test/creditRepository.test.js', 'test/videoGenerationApplicationService.test.js', 'test/videoProviderTaskService.test.js'],
  admin: ['test/adminPricingPublication.test.js', 'test/adminSafeMvp.test.js', 'test/adminFinanceDrafts.test.js', 'test/creditPricingPolicy.test.js'],
  frontend: ['src/features/admin/components/AdminPricingConfiguration.test.tsx', 'src/features/admin/schemas/adminPricingSchemas.test.ts', 'src/features/admin/routes/AdminControlPlaneRoute.test.tsx']
};
const group = process.argv[2] || 'image';
if (group !== 'all' && !Object.hasOwn(groups, group)) throw new Error('Choose image|video|integration|settlement|admin|frontend|all');
function run(args, cwd = fileURLToPath(new URL('../', import.meta.url))) {
  const result = spawnSync(process.execPath, args, { cwd, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
for (const name of group === 'all' ? Object.keys(groups) : [group]) {
  if (name === 'frontend') {
    run([fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url)), 'run', '--configLoader', 'runner', '--no-cache', ...groups.frontend], fileURLToPath(new URL('../web', import.meta.url)));
    continue;
  }
  if (['image', 'video', 'integration'].includes(name)) run(['--test', `--test-name-pattern=^${name}:`, 'test/byteplusPricingReconciliation.test.js']);
  run(['--test', ...groups[name]]);
}
