import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { developmentFixtureId } from '../../server/config/authPolicy.js';

// Explicit one-time setup creates only a new, fixed, empty local target. It never
// copies live users, Credits, history, secrets or outputs and never overwrites.
export async function setupDevelopmentFixture(projectRoot) {
  const root = path.join(path.resolve(projectRoot), '.local-auth-fixture');
  await fs.mkdir(root); // Existing targets require inspection, never a reset.
  await fs.mkdir(path.join(root, 'data/identity'), { recursive: true });
  await fs.mkdir(path.join(root, 'outputs'));
  await fs.writeFile(
    path.join(root, 'data/identity/mockUsers.json'),
    JSON.stringify(
      [
        {
          id: developmentFixtureId,
          username: developmentFixtureId,
          displayName: 'Local development',
          role: 'user',
          status: 'active',
          fixtureDesignation: 'isolated-auth-development-v1',
          activeCreatorProfileId: null,
          featureFlags: [],
          preferences: { confirmCreditUsage: true },
        },
      ],
      null,
      2
    ),
    { flag: 'wx' }
  );
  await fs.writeFile(
    path.join(root, 'manifest.json'),
    JSON.stringify({ version: 1, kind: 'isolated-auth-development', actorId: developmentFixtureId }),
    { flag: 'wx' }
  );
  return root;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw new Error('No setup arguments are supported.');
  await setupDevelopmentFixture(fileURLToPath(new URL('../../', import.meta.url)));
  console.log(
    'Isolated development fixture created. Set NODE_ENV=development and AUTH_DEV_BYPASS_ENABLED=true, then restart.'
  );
}
