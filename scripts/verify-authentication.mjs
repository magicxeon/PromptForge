import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readDisposableDatabaseConfig } from '../server/config/database.js';

const groups = Object.freeze({
  contracts: ['test/authentication/harness.test.js', 'test/authentication/operationSecrets.test.js', 'test/authentication/challenges.test.js', 'test/authentication/emailDelivery.test.js', 'test/auditService.test.js'],
  persistence: ['scripts/authentication/qualify-persistence.mjs', 'scripts/authentication/qualify-audit.mjs', 'scripts/authentication/qualify-operations.mjs'],
  challenges: ['scripts/authentication/qualify-challenges.mjs', 'scripts/authentication/qualify-email-delivery.mjs'],
});
const pending = ['passwords', 'social', 'linking-recovery', 'sessions-authorization', 'mfa', 'ui', 'integration', 'development-bypass'];
const args = process.argv.slice(2);
const root = fileURLToPath(new URL('../', import.meta.url));
if (args.length === 1 && args[0] === '--all') {
  console.error(`Authentication aggregate incomplete; unsupported groups: ${pending.join(', ')}. No groups executed.`);
  process.exitCode = 2;
} else if (args.length !== 2 || args[0] !== '--group' || !Object.hasOwn(groups, args[1])) {
  console.error('Usage: --group contracts|persistence|challenges OR --all. Other planned groups are not implemented.');
  process.exitCode = 2;
} else {
  const group = args[1];
  const needsDatabase = group === 'persistence' || group === 'challenges';
  try {
    if (needsDatabase) readDisposableDatabaseConfig(process.env);
    // Do not inherit application/provider secrets, PG overrides or NODE_OPTIONS.
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
      /^(path|systemroot|windir|comspec|temp|tmp)$/i.test(key)));
    env.NODE_ENV = 'test';
    env.MPF_AUTH_FIXTURE_NETWORK = needsDatabase ? 'postgres' : 'offline';
    if (needsDatabase) {
      env.MPF_TEST_DATABASE_DISPOSABLE = 'true';
      env.MPF_TEST_DATABASE_URL = process.env.MPF_TEST_DATABASE_URL;
    }
    console.log(group === 'challenges' ? '[challenges] Fixture-only purpose-bound challenges and shared SQL admission; no HTTP or Login activation.' : group === 'persistence'
      ? '[persistence] Disposable harness, Identity and transactional Audit primitives; no Login/session domain qualification.'
      : '[contracts] Authentication harness bootstrap only; no domain authentication qualification.');
    const result = spawnSync(process.execPath, ['--import', './scripts/authentication/network-preload.mjs', '--test', ...groups[group]], {
      cwd: root, env, stdio: 'inherit', windowsHide: true, timeout: 60000,
    });
    if (result.error || result.status !== 0) {
      console.error('Authentication group failed or exceeded its 60-second process bound.');
      process.exitCode = 1;
    }
  } catch {
    console.error('Persistence requires MPF_TEST_DATABASE_DISPOSABLE=true and MPF_TEST_DATABASE_URL with credentials, literal loopback host and mpf_test_ database name. No connection attempted.');
    process.exitCode = 2;
  }
}
