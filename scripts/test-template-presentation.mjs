import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const part = process.argv.find(value => value.startsWith('--part='))?.slice(7);
const web = path.join(root, 'web');
const tests = {
  'template-hero': ['src/features/community/components/templates/templateHeroSelection.test.ts', 'src/features/community/components/templates/TemplateGalleryHero.test.tsx'],
  'template-data': ['src/features/community/hooks/useTemplatePreviews.test.tsx', 'src/features/community/hooks/useTemplateDetail.test.tsx', 'src/features/admin/routes/AdminRoute.test.tsx'],
  'template-featured': ['src/features/community/components/templates/TemplateFeatured.test.tsx'],
  'template-catalog': ['src/features/community/components/templates/TemplateDiscoveryCard.test.tsx'],
  'photo-original': ['src/features/community/routes/TemplateDetailRoute.test.tsx', 'src/features/community/components/templates/TemplateDetailActions.test.tsx'],
  'photo-creations': ['src/components/community/EngagementBar.test.tsx', 'src/features/community/components/templates/TemplateCreationsPreview.test.tsx'],
  'character-display': ['src/features/profiles/characterDisplayImage.test.ts', 'src/components/media/DisplayMediaImage.test.tsx', 'src/features/profiles/components/characterDiscoveryModel.test.ts'],
  'character-consumers': ['src/features/profiles/components/CharacterLibraryPicker.test.tsx', 'src/components/generation/ReferenceSlotGrid.test.tsx', 'src/components/profiles/CharacterCard.test.tsx', 'src/features/profiles/characterPickerRecents.test.ts'],
  'provider-icons': ['src/components/generation/ProviderMark.test.tsx', 'src/features/community/components/CommunityProviderDirectory.test.tsx'],
  compatibility: ['src/features/templates/templateSerializer.test.ts', 'src/features/scene-builder/templateCharacterPolicy.test.ts', 'src/components/templates/SharedTemplateEditDialog.test.tsx', 'src/components/community/ShareGeneratedDialog.test.tsx', 'src/features/community/routes/CommunityHomeRoute.test.tsx', 'src/app/routeRegistry/routes.test.ts']
};
const serverTests = ['test/communityTemplateDetail.test.js', 'test/frontendRouteOwnership.test.js'];
const compatibilityServer = ['test/templateDerivedSharing.test.js', 'test/templateInputPolicy.test.js'];
const groups = Object.fromEntries(Object.entries(tests).map(([name, files]) => [name, () => {
  if (name === 'template-data') run(['--test', ...serverTests]);
  if (name === 'compatibility') run(['--test', ...compatibilityServer]);
  if (name === 'character-display') run(['--test', 'test/characterProfileSharing.test.js']);
  ui(files);
}]));
groups.build = () => {
  run([path.join(root, 'node_modules/typescript/bin/tsc'), '-b', '--pretty', 'false'], web);
  const files = [...new Set([...Object.values(tests).flat(), ...Object.values(tests).flat().map(file => file.replace('.test.', '.'))])].filter(file => fs.existsSync(path.join(web, file)));
  run([path.join(root, 'node_modules/eslint/bin/eslint.js'), ...files], web);
  run(['scripts/validate-i18n-catalogs.js']);
  run([path.join(root, 'node_modules/vite/bin/vite.js'), 'build'], web);
};
groups.visual = () => {
  const scope = process.argv.find(arg => arg.startsWith('--scope='))?.slice(8) || 'all';
  if (!['all', 'gallery', 'photo', 'character', 'icons'].includes(scope)) throw new Error('Unknown visual scope');
  const built = fs.statSync(path.join(web, 'dist/index.html')).mtimeMs;
  if (latestSource(path.join(web, 'src')) > built) throw new Error('Frontend build is stale; run --part=build before visual checks.');
  for (const item of scope === 'all' ? ['gallery', 'photo', 'character', 'icons'] : [scope]) {
    const flags = process.argv.filter(arg => arg.startsWith('--locale=') || arg.startsWith('--hero-creations=') || arg === '--stress');
    run(item === 'character' ? ['scripts/verify-template-scene-layout.mjs', ...flags] : ['scripts/verify-template-presentation-layout.mjs', `--scope=${item}`, ...flags]);
  }
};
groups.all = () => {
  run(['--test', ...serverTests, ...compatibilityServer, 'test/characterProfileSharing.test.js']);
  ui([...new Set(Object.values(tests).flat())]);
  groups.build();
  groups.visual();
};
function latestSource(directory) {
  return Math.max(0, ...fs.readdirSync(directory, { withFileTypes: true }).map(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? latestSource(file) : /\.(test|spec)\./.test(entry.name) ? 0 : fs.statSync(file).mtimeMs;
  }));
}
function ui(files) { run([fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url)), 'run', ...files], fileURLToPath(new URL('../web/', import.meta.url))); }
function run(args, cwd = root) {
  const started = Date.now();
  const result = spawnSync(process.execPath, args, { cwd, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
  console.log(`[Presentation] ${args.join(' ')}: ${Date.now() - started}ms`);
}
if (!part) console.log(`Use --part=${Object.keys(groups).join('|')}`);
else if (Object.hasOwn(groups, part)) groups[part]();
else throw new Error(`Unknown group: ${part}`);
