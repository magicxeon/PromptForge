import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const vitest = ['node_modules/vitest/vitest.mjs', 'run', '--root', 'web', '--config', 'vitest.config.ts', '--configLoader', 'runner'];
const groups = {
  danger: [...vitest, 'src/features/profiles/components/DeleteCharacterDialog.test.tsx', 'src/features/profiles/routes/CharacterProfileRoute.test.tsx', 'src/components/profiles/CharacterFeaturedImagePicker.test.tsx'],
  media: [...vitest, 'src/components/media/MediaCard.test.tsx', 'src/components/media/MediaStage.test.tsx', 'src/components/media/HorizontalMediaCarousel.test.tsx', 'src/features/community/routes/CommunityHomeRoute.test.tsx'],
  types: ['node_modules/typescript/bin/tsc', '-p', 'web/tsconfig.app.json', '--noEmit', '--incremental', 'false']
};
const selected = process.argv[2];
const layouts = Object.fromEntries(['featured', 'works', 'creator', 'related'].map(name => [`layout-${name}`, ['scripts/verify-profile-public-work.mjs', name]]));
const commands = { ...groups, ...layouts };
if (!['all', 'layout-all'].includes(selected) && !Object.hasOwn(commands, selected)) throw new Error(`Select ${Object.keys(commands).join('|')}|all|layout-all`);
const names = selected === 'all' ? Object.keys(groups) : selected === 'layout-all' ? Object.keys(layouts) : [selected];
for (const name of names) {
  const result = spawnSync(process.execPath, commands[name], { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
