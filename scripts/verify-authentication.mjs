import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readDisposableDatabaseConfig } from '../server/config/database.js';

const groups = Object.freeze({
  contracts: [
    'test/authentication/harness.test.js',
    'test/authentication/operationSecrets.test.js',
    'test/authentication/challenges.test.js',
    'test/authentication/emailDelivery.test.js',
    'test/authentication/sessions.test.js',
    'test/auditService.test.js',
  ],
  persistence: [
    'scripts/authentication/qualify-persistence.mjs',
    'scripts/authentication/qualify-audit.mjs',
    'scripts/authentication/qualify-operations.mjs',
  ],
  challenges: [
    'scripts/authentication/qualify-challenges.mjs',
    'scripts/authentication/qualify-email-delivery.mjs',
  ],
  'sessions-authorization': ['scripts/authentication/qualify-sessions.mjs'],
  passwords: ['test/authentication/passwords.test.js', 'scripts/authentication/qualify-passwords.mjs'],
  'development-bypass': ['test/authentication/developmentBypass.test.js'],
  enrollment: ['scripts/authentication/qualify-enrollment.mjs'],
  'password-login': ['scripts/authentication/qualify-password-login.mjs'],
  'otp-login': ['scripts/authentication/qualify-otp-login.mjs'],
  actions: ['scripts/authentication/qualify-actions.mjs'],
  reset: ['scripts/authentication/qualify-reset.mjs'],
  google: ['test/authentication/google.test.js', 'scripts/authentication/qualify-google.mjs'],
  facebook: ['test/authentication/facebook.test.js', 'scripts/authentication/qualify-facebook.mjs'],
  runtime: ['test/authentication/runtime.test.js', 'scripts/authentication/qualify-runtime.mjs'],
  social: ['test/authentication/google.test.js', 'scripts/authentication/qualify-google.mjs', 'test/authentication/facebook.test.js', 'scripts/authentication/qualify-facebook.mjs'],
  cutover: ['test/authentication/bootstrap.test.js', 'test/mockActorContext.test.js', 'scripts/authentication/qualify-cutover.mjs'],
  'private-access': ['test/authentication/httpAccess.test.js', 'test/authentication/privateMedia.test.js', 'test/authentication/publicViewer.test.js', 'test/authentication/authorizedEventStream.test.js', 'test/cinematicStoryboardGenerationRoutes.test.js'],
  'login-integration': ['scripts/authentication/qualify-login-app.mjs'],
});
const pending = ['linking-recovery', 'mfa', 'ui', 'integration'];
const args = process.argv.slice(2);
const root = fileURLToPath(new URL('../', import.meta.url));
if (args.length === 1 && args[0] === '--login') {
  // Explicit scoped milestone aggregate. The broader AUTH-019 roadmap keeps
  // its separate, incomplete --all gate until account linking/MFA are delivered.
  try {
    readDisposableDatabaseConfig(process.env);
    for (const group of ['contracts', 'persistence', 'challenges', 'sessions-authorization', 'passwords', 'enrollment', 'password-login', 'otp-login', 'actions', 'reset', 'social', 'runtime', 'cutover', 'private-access', 'development-bypass', 'login-integration']) {
      const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--group', group], {
        cwd: root, env: process.env, stdio: 'inherit', windowsHide: true, timeout: 90000,
      });
      if (result.error || result.status !== 0) throw new Error(`Login group failed: ${group}`);
    }
    console.log('Login server milestone aggregate passed. Run the documented React checks separately. Live SMTP/OAuth and broader account-security UAT are separate.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
} else if (args.length === 1 && args[0] === '--all') {
  console.error(
    `Authentication aggregate incomplete; unsupported groups: ${pending.join(', ')}. No groups executed.`
  );
  process.exitCode = 2;
} else if (args.length !== 2 || args[0] !== '--group' || !Object.hasOwn(groups, args[1])) {
  console.error(
    `Usage: --group ${Object.keys(groups).join('|')} OR --login (scoped server aggregate) OR --all (full roadmap gate). Other planned groups are not implemented.`
  );
  process.exitCode = 2;
} else {
  const group = args[1];
  const needsDatabase = [
    'persistence',
    'challenges',
    'sessions-authorization',
    'enrollment',
    'password-login',
    'otp-login',
    'actions',
    'reset',
    'google',
    'facebook',
    'social',
    'runtime',
    'cutover',
    'login-integration',
  ].includes(group);
  try {
    if (needsDatabase) readDisposableDatabaseConfig(process.env);
    // Do not inherit application/provider secrets, PG overrides or NODE_OPTIONS.
    const env = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => /^(path|systemroot|windir|comspec|temp|tmp)$/i.test(key))
    );
    env.NODE_ENV = 'test';
    env.MPF_AUTH_FIXTURE_NETWORK = ['enrollment', 'password-login', 'otp-login', 'reset', 'google', 'facebook', 'social', 'runtime', 'cutover', 'login-integration'].includes(
      group
    )
      ? 'postgres-http'
      : needsDatabase
        ? 'postgres'
        : ['development-bypass', 'private-access'].includes(group)
          ? 'loopback-http'
          : 'offline';
    if (needsDatabase) {
      env.MPF_TEST_DATABASE_DISPOSABLE = 'true';
      env.MPF_TEST_DATABASE_URL = process.env.MPF_TEST_DATABASE_URL;
    }
    console.log(
      group === 'login-integration'
        ? '[login-integration] Actual application source, owned temporary files, disposable SQL and private SMTP; no deployment readiness or paid dispatch.'
        : group === 'cutover'
        ? '[cutover] Qualified bootstrap, mock retirement and isolated session admission; no live activation.'
        : group === 'private-access'
        ? '[private-access] Isolated owner/public/media/stream contracts; no full application startup.'
        : group === 'runtime'
        ? '[runtime] Canonical qualified source with disposable SQL and injected private transports; no deployment readiness or live calls.'
        : group === 'social'
        ? '[social] Google and Facebook isolated qualifications run sequentially; no live calls or runtime activation.'
        : group === 'facebook'
        ? '[facebook] Disposable PostgreSQL and owned HTTP; injected native Graph fixtures, no real Meta calls or runtime activation.'
        : group === 'google'
        ? '[google] Disposable PostgreSQL and owned HTTP; native signed fixture tokens, no real Google calls or runtime activation.'
        : group === 'reset'
          ? '[reset] Disposable PostgreSQL and owned HTTP; fake mail, no runtime activation.'
          : group === 'actions'
            ? '[actions] Disposable PostgreSQL and captured HTTP contracts; fixture method proofs only, no runtime activation.'
            : group === 'otp-login'
              ? '[otp-login] Disposable PostgreSQL and owned HTTP; fake mail, no runtime activation.'
              : group === 'password-login'
                ? '[password-login] Disposable PostgreSQL and owned loopback HTTP; qualified native fixture hashing, no runtime activation.'
                : group === 'enrollment'
                  ? '[enrollment] Disposable PostgreSQL and owned loopback HTTP; fake mail only, real activation unavailable.'
                  : group === 'development-bypass'
                    ? '[development-bypass] Isolated fixture and loopback HTTP only; no full application startup or provider calls.'
                    : group === 'sessions-authorization'
                      ? '[sessions-authorization] Disposable session/context and captured-handler fixtures; no runtime authentication activation.'
                      : group === 'passwords'
                        ? '[passwords] Offline primitive/native fixture qualification; full Login not activated.'
                        : group === 'challenges'
                          ? '[challenges] Fixture-only purpose-bound challenges and shared SQL admission; no HTTP or Login activation.'
                          : group === 'persistence'
                            ? '[persistence] Disposable harness, Identity and transactional Audit primitives; no Login/session domain qualification.'
                            : '[contracts] Authentication harness bootstrap only; no domain authentication qualification.'
    );
    const result = spawnSync(
      process.execPath,
      ['--import', './scripts/authentication/network-preload.mjs', '--test', '--test-concurrency=1', ...groups[group]],
      {
        cwd: root,
        env,
        stdio: 'inherit',
        windowsHide: true,
        timeout: 60000,
      }
    );
    if (result.error || result.status !== 0) {
      console.error('Authentication group failed or exceeded its 60-second process bound.');
      process.exitCode = 1;
    }
  } catch {
    console.error(
      'Persistence requires MPF_TEST_DATABASE_DISPOSABLE=true and MPF_TEST_DATABASE_URL with credentials, literal loopback host and mpf_test_ database name. No connection attempted.'
    );
    process.exitCode = 2;
  }
}
