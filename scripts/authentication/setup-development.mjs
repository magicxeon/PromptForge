import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { developmentFixtureId, developmentAdminFixtureId, qualifyAuthRuntime, qualifiedDevelopmentActor } from '../../server/config/authPolicy.js';
import { mutateJsonFile } from '../../server/repositories/json/jsonFileStore.js';

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
export async function setupDevelopmentAdminFixture(projectRoot) {
  const root = path.join(path.resolve(projectRoot), '.local-auth-fixture');
  try { await fs.lstat(root); }
  catch (error) { if (error.code !== 'ENOENT') throw error; await setupDevelopmentFixture(projectRoot); }
  qualifyAuthRuntime({ AUTH_DEV_BYPASS_ENABLED: 'true', NODE_ENV: 'development' }, projectRoot);
  await mutateJsonFile(path.join(root, 'data/identity/mockUsers.json'), [], users => {
    if (!Array.isArray(users) || !users.some(user => qualifiedDevelopmentActor(user))
      || users.length > 2 || users.some(user => !qualifiedDevelopmentActor(user, 'user', false)
        && !qualifiedDevelopmentActor(user, 'admin', false))) throw new Error('Development fixture is unavailable.');
    if (!users.some(user => user.id === developmentAdminFixtureId)) users.push({
      id: developmentAdminFixtureId, username: developmentAdminFixtureId,
      displayName: 'Local development admin', role: 'admin', status: 'active',
      fixtureDesignation: 'isolated-auth-development-admin-v1', activeCreatorProfileId: null,
      featureFlags: [], preferences: { confirmCreditUsage: true },
    });
  });
  return root;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length > 3 || process.argv[2] && process.argv[2] !== '--admin') throw new Error('Only --admin is supported.');
  const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
  if (process.argv[2] === '--admin') await setupDevelopmentAdminFixture(projectRoot);
  else await setupDevelopmentFixture(projectRoot);
  console.log(
    process.argv[2] === '--admin'
      ? 'Isolated admin fixture prepared. Set AUTH_DEV_BYPASS_ROLE=admin with local development bypass, then restart.'
      : 'Isolated development fixture created. Set NODE_ENV=development and AUTH_DEV_BYPASS_ENABLED=true, then restart.'
  );
}
