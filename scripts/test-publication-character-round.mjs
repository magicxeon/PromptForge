import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const web = fileURLToPath(new URL('../web/', import.meta.url));
const resolve = value => fileURLToPath(new URL(value, import.meta.url));
const part = process.argv[2];
function run(args, cwd = root) {
  const result = spawnSync(process.execPath, args, { cwd, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
const groups = {
  privacy() { run(['scripts/test-template-derived-sharing.mjs', '--part=server']); },
  'share-ui'() {
    run([resolve('../node_modules/vitest/vitest.mjs'), 'run',
      'src/components/community/ShareGeneratedDialog.test.tsx',
      'src/features/community/api/shareApi.test.ts'], web);
  },
  compatibility() { run(['scripts/test-template-derived-sharing.mjs', '--part=compatibility']); },
  discovery() {
    run([resolve('../node_modules/vitest/vitest.mjs'), 'run', 'src/features/community/routes/CommunityHomeRoute.test.tsx', 'src/features/community/hooks/useCommunityDiscoveryPosts.test.tsx'], web);
  },
  lineage() { run(['--test', 'test/characterProfileLifecycle.test.js', 'test/characterProfileSharing.test.js', 'test/characterDestinationHandoff.test.js', 'test/characterUsageAnalytics.test.js']); },
  identity() { run(['--test', 'test/characterIdentityAgeRange.test.js', 'test/characterIdentityRetention.test.js', 'test/playgroundReferenceRoles.test.js', 'test/promptRefinementService.test.js', 'test/generationPromptRefinementEntryPoint.test.js']); },
  'flow-ui'() {
    run([resolve('../node_modules/vitest/vitest.mjs'), 'run', 'src/features/scene-builder/routes/SceneBuilderTemplate.test.tsx',
      'src/features/scene-builder/templateCharacterPolicy.test.ts', 'src/features/profiles/routes/CharacterProfileRoute.test.tsx',
      'src/components/profiles/CharacterProfileHero.test.tsx'], web);
  },
  static() {
    run([resolve('../node_modules/typescript/bin/tsc'), '-b', '--pretty', 'false'], web);
    run(['scripts/validate-i18n-catalogs.js']);
  },
  layout() {
    run([resolve('../node_modules/vite/bin/vite.js'), 'build'], web);
    run(['scripts/verify-private-sharing-layout.mjs']);
    run(['scripts/verify-template-derived-sharing-layout.mjs']);
  },
  'layout-flow'() {
    run(['scripts/verify-template-scene-layout.mjs', '--locale=en']);
    run(['scripts/verify-template-scene-layout.mjs', '--locale=th']);
    for (const scope of ['scene', 'profile', 'feed']) run(['scripts/verify-publication-character-layout.mjs', scope]);
  }
};
if (part !== 'all' && !Object.hasOwn(groups, part)) {
  throw new Error(`Select ${Object.keys(groups).join('|')}|all. Other requirement groups are not implemented yet.`);
}
for (const name of part === 'all' ? Object.keys(groups) : [part]) {
  console.log(`[Publication / Character round] ${name}`);
  groups[name]();
}
