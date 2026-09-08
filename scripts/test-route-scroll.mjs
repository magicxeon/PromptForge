import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const group = process.argv[2] || 'unit';
const groups = {
  unit: { cwd: '../web/', args: [fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url)), 'run', 'src/components/layout/RouteScrollManager.test.tsx', 'src/components/layout/ContextBackLink.test.tsx', 'src/components/layout/AppShellRoutePolicy.test.ts'] },
  browser: { cwd: '../', args: ['scripts/verify-route-scroll.mjs'] }
};
if (group !== 'all' && !Object.hasOwn(groups, group)) throw new Error('Choose unit|browser|all');
for (const name of group === 'all' ? Object.keys(groups) : [group]) {
  const spec = groups[name];
  const result = spawnSync(process.execPath, spec.args, {
    cwd: fileURLToPath(new URL(spec.cwd, import.meta.url)), stdio: 'inherit', shell: false
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
