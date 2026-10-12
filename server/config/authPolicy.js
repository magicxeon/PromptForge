import fs from 'node:fs';
import path from 'node:path';

export const developmentFixtureId = 'usr_auth_local';
const disabledRuntime = Object.freeze({ enabled: false, authMode: 'session', host: '127.0.0.1', port: 6500 });
let qualifiedRuntime;
const configFailure = () => {
  throw Object.assign(new Error('Authentication development configuration is unavailable.'), {
    code: 'AUTH_DEVELOPMENT_CONFIGURATION_INVALID',
  });
};

// Bootstrap calls this before importing any application singleton. No credentials,
// arbitrary actor IDs, database URLs or caller-selected data roots qualify a target.
export function qualifyAuthRuntime(env, projectRoot) {
  const toggle = env.AUTH_DEV_BYPASS_ENABLED;
  if (toggle !== undefined && toggle !== 'true' && toggle !== 'false') configFailure();
  const port = Number(env.PORT ?? 6500);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) configFailure();
  if (toggle !== 'true') return Object.freeze({ ...disabledRuntime, port });
  if (env.NODE_ENV !== 'development' || (env.HOST && env.HOST !== '127.0.0.1')) configFailure();
  const root = path.join(path.resolve(projectRoot), '.local-auth-fixture');
  try {
    // Reparse points anywhere in the mutable tree could escape the designated
    // target after initial setup. Bound inspection; oversized targets need review.
    const pending = [root];
    let inspected = 0;
    while (pending.length) {
      const target = pending.pop();
      if (++inspected > 10000 || fs.lstatSync(target).isSymbolicLink() || fs.realpathSync(target) !== target)
        configFailure();
      if (fs.statSync(target).isDirectory())
        for (const name of fs.readdirSync(target)) pending.push(path.join(target, name));
    }
    for (const suffix of [
      '',
      'data',
      'outputs',
      'data/identity',
      'manifest.json',
      'data/identity/mockUsers.json',
    ]) {
      const target = path.join(root, suffix);
      if (fs.lstatSync(target).isSymbolicLink() || fs.realpathSync(target) !== target) configFailure();
    }
    if (
      fs.statSync(path.join(root, 'manifest.json')).size > 1024 ||
      fs.statSync(path.join(root, 'data/identity/mockUsers.json')).size > 8192
    )
      configFailure();
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
    if (
      Object.keys(manifest).sort().join(',') !== 'actorId,kind,version' ||
      manifest.version !== 1 ||
      manifest.kind !== 'isolated-auth-development' ||
      manifest.actorId !== developmentFixtureId
    )
      configFailure();
    const users = JSON.parse(fs.readFileSync(path.join(root, 'data/identity/mockUsers.json'), 'utf8'));
    if (!Array.isArray(users) || users.length !== 1 || !qualifiedDevelopmentActor(users[0])) configFailure();
  } catch {
    configFailure();
  }
  return Object.freeze({
    enabled: true,
    authMode: 'development_bypass',
    host: '127.0.0.1',
    port,
    root,
    dataRoot: path.join(root, 'data'),
    outputsRoot: path.join(root, 'outputs'),
    allowedHosts: Object.freeze([`127.0.0.1:${port}`]),
    allowedOrigins: Object.freeze([...new Set([`http://127.0.0.1:${port}`, 'http://127.0.0.1:5173'])]),
  });
}
export function qualifiedDevelopmentActor(user) {
  return (
    !!user &&
    user.id === developmentFixtureId &&
    user.username === developmentFixtureId &&
    user.status === 'active' &&
    user.role === 'user' &&
    user.fixtureDesignation === 'isolated-auth-development-v1' &&
    !user.activeCreatorProfileId &&
    (!user.roles || (Array.isArray(user.roles) && user.roles.length === 0)) &&
    (!user.featureFlags || (Array.isArray(user.featureFlags) && user.featureFlags.length === 0))
  );
}
export function initializeAuthRuntime(env, projectRoot) {
  if (qualifiedRuntime) configFailure();
  qualifiedRuntime = qualifyAuthRuntime(env, projectRoot);
  return qualifiedRuntime;
}
export function getAuthRuntime() {
  if (
    !qualifiedRuntime &&
    process.env.AUTH_DEV_BYPASS_ENABLED !== undefined &&
    process.env.AUTH_DEV_BYPASS_ENABLED !== 'false'
  )
    configFailure();
  return qualifiedRuntime ?? disabledRuntime;
}

// Frozen challenge/session policy from AUTH-011.
export const challengePolicy = Object.freeze({
  digits: 6,
  lifetimeMs: 300000,
  maximumFailures: 5,
  resendMs: 60000,
  maximumRateRows: 10000,
  cleanupBatch: 50,
});

export const sessionPolicy = Object.freeze({
  customer: Object.freeze({ idleMs: 86400000, absoluteMs: 604800000, cap: 10 }),
  remembered: Object.freeze({ idleMs: 604800000, absoluteMs: 2592000000, cap: 10 }),
  staff: Object.freeze({ idleMs: 1800000, absoluteMs: 43200000, cap: 3 }),
  contextMs: 300000,
  browserCap: 10000,
  contextsPerBrowser: 8,
  cleanupBatch: 50,
});

export const challengeRatePolicy = Object.freeze({
  send_target_hour: Object.freeze({ limit: 5, windowMs: 3600000 }),
  send_target_day: Object.freeze({ limit: 10, windowMs: 86400000 }),
  send_cooldown: Object.freeze({ limit: 1, windowMs: 60000 }),
  send_source_hour: Object.freeze({ limit: 20, windowMs: 3600000 }),
  send_global_hour: Object.freeze({ limit: 100, windowMs: 3600000 }),
  verify_target_short: Object.freeze({ limit: 10, windowMs: 900000 }),
  verify_target_hour: Object.freeze({ limit: 30, windowMs: 3600000 }),
  verify_account_short: Object.freeze({ limit: 10, windowMs: 900000 }),
  verify_account_hour: Object.freeze({ limit: 30, windowMs: 3600000 }),
  verify_source_short: Object.freeze({ limit: 60, windowMs: 900000 }),
  verify_source_hour: Object.freeze({ limit: 200, windowMs: 3600000 }),
  verify_global_hour: Object.freeze({ limit: 1000, windowMs: 3600000 }),
});

export const challengeContextPurposes = Object.freeze({
  registration: 'registration',
  login: 'login',
  password_reset: 'password_reset',
  email_change_new: 'email_change_new',
  link_email: 'link',
  reauthentication: 'reauthentication',
});
export const challengeNextActions = Object.freeze({
  registration: Object.freeze(['complete_registration', 'sign_in_existing', 'unavailable']),
  login: Object.freeze(['authenticate', 'mfa_required', 'offer_registration', 'unavailable']),
  password_reset: Object.freeze(['reset_password', 'unavailable']),
  email_change_new: Object.freeze(['confirm_email_change', 'unavailable']),
  link_email: Object.freeze(['complete_link', 'unavailable']),
  reauthentication: Object.freeze(['reauthenticated', 'mfa_required', 'unavailable']),
});
