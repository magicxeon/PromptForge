import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const groups = {
  export: ['node_modules/vitest/vitest.mjs', 'run', '--root', 'web', '--config', 'vitest.config.ts', '--configLoader', 'runner',
    'src/features/admin/components/financeReportExcel.test.ts', 'src/features/admin/components/FinanceReportExport.test.tsx'],
  inventory: ['--test', 'test/adminFinanceReports.test.js'],
  periods: ['--test', 'test/adminFinanceReports.test.js'],
  permissions: ['--test', 'test/adminFinancePermissions.test.js'],
  drafts: ['--test', 'test/adminFinanceDrafts.test.js'],
  pricing: ['--test', 'test/creditPricingPolicy.test.js', 'test/creditEstimateGenerationParity.test.js'],
  compatibility: ['--test', 'test/adminSafeMvp.test.js', 'test/creditComparisonBilling.test.js'],
  ui: ['node_modules/vitest/vitest.mjs', 'run', '--root', 'web', '--config', 'vitest.config.ts', '--configLoader', 'runner',
    'src/features/admin/routes/AdminFinanceRoute.test.tsx', 'src/features/admin/routes/AdminProvidersRoute.test.tsx',
    'src/features/admin/routes/AdminRoute.test.tsx', 'src/features/admin/routes/AdminControlPlaneRoute.test.tsx'],
  layout: ['scripts/verify-admin-finance-layout.mjs'],
  'export-layout': ['scripts/verify-admin-finance-layout.mjs', '--export-only'],
  types: ['node_modules/typescript/bin/tsc', '-p', 'web/tsconfig.app.json', '--noEmit', '--incremental', 'false']
};
const requested = process.argv[2];
const selected = requested === 'all' ? ['inventory', 'permissions', 'drafts', 'pricing', 'compatibility', 'ui', 'export', 'types'] : [requested];
for (const name of selected) {
  if (!groups[name]) {
    console.error(`Unknown or unimplemented group: ${name || '(missing)'}. Use ${Object.keys(groups).join(', ')}, all. Publication/schedule/cost/funding release gates remain pending FIN-008.`);
    process.exit(2);
  }
  console.log(`\n[Finance] ${name}`);
  const result = spawnSync(process.execPath, groups[name], { cwd: root, stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('Finance implemented-slice checks passed. This is not production financial certification.');
