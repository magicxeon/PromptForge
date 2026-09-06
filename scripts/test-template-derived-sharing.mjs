import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const web = fileURLToPath(new URL('../web/', import.meta.url));
const resolve = value => fileURLToPath(new URL(value, import.meta.url));
const part = process.argv.find(arg => arg.startsWith('--part='))?.slice(7) || 'server';
function run(args, cwd = root) {
  const result = spawnSync(process.execPath, args, { cwd, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
const groups = {
  server() {
    for (const file of ['server/app/routes/communityShareRoutes.js', 'server/app/routes/sceneTemplateRoutes.js',
      'server/app/routes/templateRoutes.js', 'server/domain/community/CommunityShareService.js']) run(['--check', file]);
    run(['--test', 'test/templateDerivedSharing.test.js', 'test/communityGeneratedShare.test.js', 'test/sceneShareFlow.test.js']);
  },
  ui() { run([resolve('../node_modules/vitest/vitest.mjs'), 'run', 'src/components/community/ShareGeneratedDialog.test.tsx'], web); },
  compatibility() {
    run(['--test', 'test/templateInputPolicy.test.js', 'test/communityTemplateDetail.test.js', 'test/communityOwnershipPolicy.test.js']);
    run([resolve('../node_modules/vitest/vitest.mjs'), 'run', 'src/features/community/components/templates/TemplateCreationsPreview.test.tsx',
      'src/components/templates/SharedTemplateEditDialog.test.tsx'], web);
  },
  build() {
    run([resolve('../node_modules/typescript/bin/tsc'), '-b'], web);
    run([resolve('../node_modules/vite/bin/vite.js'), 'build'], web);
  },
  visual() { run(['scripts/verify-template-derived-sharing-layout.mjs']); }
};
if (part !== 'all' && !Object.hasOwn(groups, part)) throw new Error('Use --part=server|ui|compatibility|build|visual|all');
for (const name of part === 'all' ? Object.keys(groups) : [part]) {
  console.log(`[Derived sharing] ${name}`); groups[name]();
}
