import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const web = fileURLToPath(new URL('../web/', import.meta.url));
const resolve = value => fileURLToPath(new URL(value, import.meta.url));
function run(args, cwd = root) {
  const result = spawnSync(process.execPath, args, { cwd, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
const groups = {
  display() { run(['--test', 'test/characterProfileLifecycle.test.js', 'test/characterProfileSharing.test.js']); },
  delete() { run(['--test', 'test/characterProfileDeletion.test.js', 'test/characterDestinationHandoff.test.js', 'test/characterUsageAnalytics.test.js', 'test/characterLookService.test.js']); },
  cover() { run(['--test', 'test/characterProfileCoverSelection.test.js', 'test/characterProfileSharing.test.js']); },
  ui() { run([resolve('../node_modules/vitest/vitest.mjs'), 'run', 'src/features/profiles/routes/CharacterProfileRoute.test.tsx', 'src/features/profiles/components/DeleteCharacterDialog.test.tsx', 'src/components/profiles/CharacterProfileHero.test.tsx', 'src/components/profiles/CharacterFeaturedImagePicker.test.tsx'], web); },
  static() {
    run([resolve('../node_modules/typescript/bin/tsc'), '-b', '--pretty', 'false'], web);
    run(['scripts/validate-i18n-catalogs.js']);
  },
  layout() { run(['scripts/verify-publication-character-layout.mjs', 'profile']); }
};
const part = process.argv[2];
if (part !== 'all' && !Object.hasOwn(groups, part)) throw new Error(`Select ${Object.keys(groups).join('|')}|all`);
for (const name of part === 'all' ? Object.keys(groups) : [part]) {
  console.log(`[Character maintenance] ${name}`);
  groups[name]();
}
