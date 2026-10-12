// Configuration is explicit and side-effect free: never load application .env here.
const loopbackHosts = new Set(['localhost', '127.0.0.1', '::1']);

function invalid() {
  const error = new Error('Invalid database configuration.');
  error.code = 'DATABASE_CONFIG_INVALID';
  return error;
}

function bounded(env, key, fallback, maximum) {
  const raw = env[key] ?? String(fallback);
  if (!/^\d+$/.test(String(raw))) throw invalid();
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) throw invalid();
  return value;
}

export function readDatabaseConfig(env = process.env) {
  try {
    if (typeof env.DATABASE_URL !== 'string' || env.DATABASE_URL.length > 8192) throw invalid();
    const url = new URL(env.DATABASE_URL);
    // No URL query options: pg's parser otherwise overrides explicit TLS and timeout policy.
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.search || url.hash) throw invalid();
    const host = url.hostname.replace(/^\[|\]$/g, '');
    const user = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    const database = decodeURIComponent(url.pathname.slice(1));
    if (!host || !user || !password || !database || /[\/\0]/.test(database)
      || /[\0]/.test(user + password) || host.startsWith('/')) throw invalid();
    const port = Number(url.port || 5432);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw invalid();
    const local = loopbackHosts.has(host);
    const tls = env.DATABASE_TLS ?? (local && env.NODE_ENV !== 'production' ? 'disable' : 'verify-full');
    if (!['disable', 'verify-full'].includes(tls) || (tls === 'disable' && (!local || env.NODE_ENV === 'production'))) throw invalid();
    if (env.DATABASE_CA_PEM !== undefined && (typeof env.DATABASE_CA_PEM !== 'string'
      || !env.DATABASE_CA_PEM.includes('-----BEGIN CERTIFICATE-----') || env.DATABASE_CA_PEM.length > 131072)) throw invalid();
    return Object.freeze({
      host, port, user, password, database,
      ssl: tls === 'disable' ? false : Object.freeze({ rejectUnauthorized: true,
        ...(env.DATABASE_CA_PEM ? { ca: env.DATABASE_CA_PEM } : {}) }),
      max: bounded(env, 'DATABASE_POOL_MAX', 10, 50),
      connectionTimeoutMillis: bounded(env, 'DATABASE_CONNECT_TIMEOUT_MS', 5000, 30000),
      idleTimeoutMillis: bounded(env, 'DATABASE_IDLE_TIMEOUT_MS', 30000, 300000),
      statement_timeout: bounded(env, 'DATABASE_STATEMENT_TIMEOUT_MS', 15000, 120000),
      lock_timeout: bounded(env, 'DATABASE_LOCK_TIMEOUT_MS', 5000, 30000),
      idle_in_transaction_session_timeout: bounded(env, 'DATABASE_TRANSACTION_IDLE_TIMEOUT_MS', 15000, 120000),
      application_name: 'modelpromptforge', client_encoding: 'UTF8',
      // Nonempty values prevent PGOPTIONS/PGSSLNEGOTIATION ambient overrides.
      options: '-c search_path=public', sslnegotiation: 'postgres',
      keepAlive: true, keepAliveInitialDelayMillis: 10000,
    });
  } catch { throw invalid(); }
}

export function readDisposableDatabaseConfig(env = process.env) {
  if (env.MPF_TEST_DATABASE_DISPOSABLE !== 'true') throw invalid();
  // No application DATABASE_URL fallback and no application dotenv imports.
  const config = readDatabaseConfig({ DATABASE_URL: env.MPF_TEST_DATABASE_URL, NODE_ENV: 'test' });
  if (!['127.0.0.1', '::1'].includes(config.host) || !/^mpf_test_[a-z0-9_]+$/.test(config.database)) throw invalid();
  return config;
}
