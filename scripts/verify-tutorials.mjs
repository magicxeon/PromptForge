import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const groups = {
  access: [['--test', 'test/learningCatalogRoutes.test.js']],
  catalog: [['--test', 'test/learningCatalogContract.test.js', 'test/learningCatalogPersistence.test.js']],
  ux: [['node_modules/vitest/vitest.mjs', 'run', '--root', 'web',
    'src/features/content-catalog/api/contentCatalogApi.test.ts',
    'src/features/content-catalog/routes/ContentCatalogRoute.test.tsx',
    'src/app/routeRegistry/routes.test.ts', 'src/features/community/routes/CommunityHomeRoute.test.tsx',
    'src/components/layout/SidebarNavigation.test.tsx']],
  types: [['node_modules/typescript/bin/tsc', '-p', 'web/tsconfig.app.json', '--incremental', 'false', '--pretty', 'false']],
  layout: [['scripts/verify-tutorials-layout.mjs']]
};
const args = process.argv.slice(2);
const selected = args.length === 1 && args[0] === '--all' ? Object.keys(groups)
  : args.length === 2 && args[0] === '--group' && Object.hasOwn(groups, args[1]) ? [args[1]] : null;
if (!selected) {
  console.error(`Usage: node scripts/verify-tutorials.mjs --group ${Object.keys(groups).join('|')} OR --all`);
  console.error('Media, commerce, analytics and finance gates are not implemented. This runner verifies draft Increment A only.');
  process.exit(2);
}
console.log('Tutorial/AI Cinema Increment A only: isolated draft tests; no live billing or application startup.');
for (const group of selected) for (const command of groups[group]) {
  console.log(`\n[${group}]`);
  const result = spawnSync(process.execPath, command, { cwd: root, stdio: 'inherit', windowsHide: true });
  if (result.error || result.status !== 0) {
    console.error(result.error || `Failed group: ${group}`);
    process.exit(result.status || 1);
  }
}
