import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const part = process.argv.find(arg => arg.startsWith('--part='))?.slice(7) || 'cards';
const groups = {
  cards: ['src/features/profiles/components/CharacterDiscoveryCard.test.tsx',
    'src/features/profiles/components/characterDiscoveryModel.test.ts',
    'src/features/profiles/components/CharacterPortrait.test.tsx',
    'src/components/profiles/CharacterCard.test.tsx'],
  gallery: ['src/features/profiles/components/CharacterGalleryHero.test.tsx',
    'src/features/profiles/components/CharacterSpotlight.test.tsx',
    'src/features/profiles/routes/CharacterDirectoryRoute.test.tsx'],
  handoff: ['src/features/profiles/useCharacterHandoff.test.tsx',
    'src/features/profiles/components/CharacterCreateAction.test.tsx',
    'src/features/profiles/characterHandoffNavigation.test.ts',
    'src/features/profiles/routes/CharacterProfileRoute.test.tsx'],
  engagement: ['src/components/community/EngagementBar.test.tsx'],
  contracts: ['test/communityGalleryCharacterContracts.test.js', 'test/characterDestinationHandoff.test.js']
};
if (part !== 'all' && !Object.hasOwn(groups, part)) throw new Error('Use --part=cards|gallery|engagement|handoff|contracts|all');
for (const name of part === 'all' ? Object.keys(groups) : [part]) {
  console.log(`[Character Discovery] ${name}`);
  const server = name === 'contracts';
  const args = server ? ['--test', ...groups[name]]
    : [fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url)), 'run', ...groups[name]];
  const result = spawnSync(process.execPath, args, {
    cwd: server ? root : fileURLToPath(new URL('../web/', import.meta.url)), stdio: 'inherit', shell: false
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
