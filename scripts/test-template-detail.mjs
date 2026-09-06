import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const part = process.argv.find(arg => arg.startsWith('--part='))?.slice(7) || 'server';
const groups = {
  server: ['test/communityTemplateDetail.test.js', 'test/frontendRouteOwnership.test.js'],
  ui: ['src/features/community/routes/TemplateDetailRoute.test.tsx', 'src/features/community/components/templates/TemplateCreationsPreview.test.tsx', 'src/features/community/components/templates/TemplateDiscoveryCard.test.tsx', 'src/features/community/hooks/useTemplateDetail.test.tsx'],
  compatibility: ['src/app/routeRegistry/routes.test.ts', 'src/components/community/EngagementBar.test.tsx', 'src/components/templates/SharedTemplateEditDialog.test.tsx', 'src/components/profiles/ProfileTemplateMosaic.test.tsx']
};
if (part !== 'all' && !Object.hasOwn(groups, part)) throw new Error('Use --part=server|ui|compatibility|all');
for (const name of part === 'all' ? Object.keys(groups) : [part]) {
  console.log(`[Template Detail] ${name}`);
  const server = name === 'server';
  const result = spawnSync(process.execPath, server ? ['--test', ...groups[name]] : [fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url)), 'run', ...groups[name]], {
    cwd: server ? root : fileURLToPath(new URL('../web/', import.meta.url)), stdio: 'inherit', shell: false
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
