import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const requireWeb = createRequire(new URL('../web/package.json', import.meta.url));

const groups = {
  text: ['--test', 'test/cinematicWritingBilling.test.js', 'test/creditApplicationService.test.js'],
  legacy: ['--test', 'test/cinematicStoryPlanService.test.js', 'test/cinematicStoryboardGenerationRoutes.test.js'],
  ledger: ['--test', 'test/creditRepository.test.js', 'test/creditStartupReconciliation.test.js'],
  video: ['scripts/test-byteplus-pricing.mjs', 'settlement'],
  pricing: ['scripts/test-byteplus-pricing.mjs', 'video'],
  admin: ['scripts/test-byteplus-pricing.mjs', 'admin'],
  finance: ['--test', 'test/adminFinanceReports.test.js'],
  tariffs: ['--test', 'test/lookSheetEnhancement.test.js', 'test/openAIImage25Cost.test.js',
    'test/openAIImage25.test.js'],
  ui: ['@vitest', 'run', '--root', 'web', '--configLoader', 'runner', '--no-cache',
    'src/features/cinematic/api/cinematicWritingApi.test.ts',
    'src/features/cinematic/api/cinematicWritingBilling.test.ts',
    'src/features/cinematic/components/CinematicWritingBillingConsent.test.tsx',
    'src/features/cinematic/components/CinematicFullStoryWriter.test.tsx',
    'src/features/cinematic/components/CinematicChapterOutline.test.tsx',
    'src/features/cinematic/components/CinematicChapterWriter.test.tsx',
    'src/features/cinematic/components/CinematicSceneOverview.test.tsx',
    'src/features/admin/components/AdminPricingConfiguration.test.tsx',
    'src/features/admin/schemas/adminPricingSchemas.test.ts',
    'src/features/admin/routes/AdminControlPlaneRoute.test.tsx',
    'src/components/generation/EngineTargetPanel.test.tsx'],
};
const selected = process.argv[2];
if (!selected || !(selected in groups || selected === 'all')) {
  console.error('Usage: node scripts/test-ai-credit-activation.mjs <text|legacy|ledger|video|pricing|admin|finance|tariffs|ui|all>');
  process.exit(2);
}
for (const group of selected === 'all' ? Object.keys(groups) : [selected]) {
  const args = groups[group].map(argument => argument === '@vitest' ? requireWeb.resolve('vitest/vitest.mjs') : argument);
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', cwd: new URL('..', import.meta.url) });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
