import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const part = process.argv.find(arg => arg.startsWith('--part='))?.slice(7) || 'server';
const groups = {
  server: ['test/templateInputPolicy.test.js', 'test/templateCore.test.js', 'test/templatePoseProxyPolicy.test.js', 'test/communityGeneratedShare.test.js'],
  ui: ['src/components/community/ShareGeneratedDialog.test.tsx', 'src/components/templates/SharedTemplateEditDialog.test.tsx'],
  compatibility: ['src/features/scene-builder/routes/SceneBuilderTemplate.test.tsx', 'src/features/scene-builder/templateReferenceRequirements.test.ts', 'src/features/templates/templateSerializer.test.ts', 'src/features/community/routes/TemplateDetailRoute.test.tsx']
};
if (part !== 'all' && !Object.hasOwn(groups, part)) throw new Error('Use --part=server|ui|compatibility|all');
for (const name of part === 'all' ? Object.keys(groups) : [part]) {
  const server = name === 'server';
  if (server) {
    for (const route of ['sceneTemplateRoutes.js', 'templateRoutes.js', 'communityShareRoutes.js']) {
      const check = spawnSync(process.execPath, ['--check', fileURLToPath(new URL(`../server/app/routes/${route}`, import.meta.url))], { stdio: 'inherit' });
      if (check.error) throw check.error;
      if (check.status !== 0) process.exit(check.status || 1);
    }
  }
  const result = spawnSync(process.execPath, server ? ['--test', ...groups[name]]
    : [fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url)), 'run', ...groups[name]],
  { cwd: fileURLToPath(new URL(server ? '../' : '../web/', import.meta.url)), stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
