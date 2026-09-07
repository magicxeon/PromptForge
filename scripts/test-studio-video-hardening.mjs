import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const cwd = fileURLToPath(new URL('../', import.meta.url));
const groups = {
  realism: ['--test', 'test/studioNaturalRealism.test.js', 'test/promptRefinementService.test.js', 'test/characterSheetPersistence.test.js'],
  video: ['--test', 'test/videoGeneratedReferenceSelection.test.js', 'test/playgroundVideoReferenceService.test.js', 'test/trustedGeneratedSources.test.js', 'test/videoGenerationApplicationService.test.js'],
  ui: ['scripts/test-playground-video-references.mjs', 'ui'],
  types: ['scripts/test-playground-video-references.mjs', 'types'],
  hygiene: ['scripts/check-runtime-git-hygiene.mjs'],
  backup: ['scripts/test-daily-server-data-backup.mjs'],
};
const selected = process.argv[2] === 'all' ? Object.keys(groups) : [process.argv[2]];
for (const group of selected) {
  if (!groups[group]) { console.error(`Use ${Object.keys(groups).join('|')}|all`); process.exit(2); }
  const result = spawnSync(process.execPath, groups[group], { cwd, stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status || 1);
}
