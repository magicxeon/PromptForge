import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import tls from 'node:tls';
import dgram from 'node:dgram';
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import { installNetworkGuard } from '../../scripts/authentication/network-guard.mjs';
import { createFakeClock, createFakeMail, createFakeProvider, withDisposableAuthDatabase } from '../../scripts/authentication/fixtures.mjs';

const fixtureEnv = { MPF_TEST_DATABASE_DISPOSABLE: 'true', MPF_TEST_DATABASE_URL: 'postgresql://fixture:unused@127.0.0.1:5432/mpf_test_auth' };
const root = fileURLToPath(new URL('../../', import.meta.url));
const runner = fileURLToPath(new URL('../../scripts/verify-authentication.mjs', import.meta.url));

test('runner rejects missing, malformed, unknown, undelivered and incomplete aggregate selections', () => {
  for (const args of [[], ['--group'], ['--group', 'unknown'], ['--group', 'social'], ['--group', 'contracts', '--all'], ['--all']]) {
    const result = spawnSync(process.execPath, [runner, ...args], { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 5000 });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 2, args.join(' '));
    assert.doesNotMatch(result.stdout, /TAP version|# tests/);
    assert.match(result.stderr, /Usage:|aggregate incomplete/);
  }
});

test('persistence CLI rejects absent or unsafe targets without exposing credentials', () => {
  for (const env of [{}, { ...fixtureEnv, MPF_TEST_DATABASE_DISPOSABLE: 'false' },
    { ...fixtureEnv, MPF_TEST_DATABASE_URL: 'postgresql://fixture:sensitive@remote.invalid/mpf_test_auth' },
    { ...fixtureEnv, MPF_TEST_DATABASE_URL: 'postgresql://fixture:sensitive@127.0.0.1/production' }]) {
    const result = spawnSync(process.execPath, [runner, '--group', 'persistence'], {
      cwd: root, env: { ...env, SystemRoot: process.env.SystemRoot }, encoding: 'utf8', windowsHide: true, timeout: 5000,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /No connection attempted/);
    assert.doesNotMatch(result.stderr + result.stdout, /sensitive|TAP version/);
  }
});

test('invalid database fixtures fail before constructing a pool or calling work', async () => {
  let creations = 0;
  let calls = 0;
  const createDatabase = () => { creations++; throw new Error('must not construct'); };
  for (const env of [{}, { DATABASE_URL: fixtureEnv.MPF_TEST_DATABASE_URL },
    { ...fixtureEnv, MPF_TEST_DATABASE_DISPOSABLE: 'TRUE' },
    { ...fixtureEnv, MPF_TEST_DATABASE_URL: 'postgresql://a:b@localhost/mpf_test_auth' },
    { ...fixtureEnv, MPF_TEST_DATABASE_URL: 'postgresql://a:b@127.0.0.1/server/data/identity' },
    { ...fixtureEnv, MPF_TEST_DATABASE_URL: fixtureEnv.MPF_TEST_DATABASE_URL + '?options=unsafe' }]) {
    await assert.rejects(withDisposableAuthDatabase(env, () => { calls++; }, { createDatabase }), { code: 'DATABASE_CONFIG_INVALID' });
  }
  assert.equal(creations, 0);
  assert.equal(calls, 0);
});

test('fixture cleanup removes exactly its owned random schema after work failure and closes the pool', async () => {
  const queries = [];
  let closed = 0;
  let schema;
  const sentinel = new Error('injected work failure');
  await assert.rejects(withDisposableAuthDatabase(fixtureEnv, fixture => {
    schema = fixture.schema;
    assert.equal(fixture.fixtureId, schema);
    throw sentinel;
  }, { createDatabase: ({ env }) => {
    assert.equal(env.DATABASE_URL, fixtureEnv.MPF_TEST_DATABASE_URL);
    return { query: async sql => { queries.push(sql); }, close: async () => { closed++; } };
  } }), error => error === sentinel);
  assert.match(schema, /^mpf_test_auth_[a-f0-9]{32}$/);
  assert.deepEqual(queries, [`CREATE SCHEMA "${schema}"`, `DROP SCHEMA "${schema}" CASCADE`]);
  assert.equal(closed, 1);
});

test('fixture scope cannot be redirected to application runtime files or a caller-owned schema', async () => {
  for (const options of [{ root: 'server/data/identity' }, { schema: 'public' }, { dataPath: '../server/data' }]) {
    await assert.rejects(withDisposableAuthDatabase(fixtureEnv, () => assert.fail('must not run'), options), /overrides are forbidden/);
  }
});

test('failed create never drops an unowned schema; failed cleanup still closes the pool', async () => {
  for (const stage of ['create', 'drop']) {
    const queries = [];
    let closed = 0;
    await assert.rejects(withDisposableAuthDatabase(fixtureEnv, () => {}, { createDatabase: () => ({
      query: async sql => { queries.push(sql); if (sql.startsWith(stage.toUpperCase())) throw new Error('injected database failure'); },
      close: async () => { closed++; },
    }) }), /injected database failure/);
    assert.equal(queries.length, stage === 'create' ? 1 : 2);
    assert.equal(closed, 1);
  }
});

test('offline network guard denies fetch, HTTP, HTTPS, sockets, TLS, DNS and UDP before contact', async () => {
  const restore = installNetworkGuard();
  try {
    const denied = { code: 'AUTH_FIXTURE_NETWORK_DENIED' };
    await assert.rejects(fetch('https://example.invalid'), denied);
    for (const attempt of [() => http.get('http://127.0.0.1:1'), () => https.get('https://example.invalid'),
      () => net.connect({ host: '127.0.0.1', port: 1 }), () => tls.connect({ host: '127.0.0.1', port: 1 }),
      () => dgram.createSocket('udp4'), () => dns.lookup('example.invalid', () => {}),
      () => new dns.Resolver().resolve4('example.invalid', () => {}),
      () => new dns.promises.Resolver().resolve4('example.invalid'),
      () => dns.promises.resolve('example.invalid'), () => net.createServer().listen(0)]) assert.throws(attempt, denied);
  } finally { restore(); restore(); }
});

test('database network allowance validates configuration and still denies other endpoints and transports', async () => {
  assert.throws(() => installNetworkGuard({ databaseEnv: {} }), { code: 'DATABASE_CONFIG_INVALID' });
  const restore = installNetworkGuard({ databaseEnv: fixtureEnv });
  try {
    for (const options of [{ host: 'remote.invalid', port: 5432 }, { host: '127.0.0.1', port: 9999 }, { path: '/tmp/postgres.sock' }]) {
      assert.throws(() => net.connect(options), { code: 'AUTH_FIXTURE_NETWORK_DENIED' });
    }
    await assert.rejects(fetch('http://127.0.0.1:5432'), { code: 'AUTH_FIXTURE_NETWORK_DENIED' });
  } finally { restore(); }
});

test('fake clock, idempotent mailbox and single-use provider perform no network and isolate instances', async () => {
  const restore = installNetworkGuard();
  try {
    const clock = createFakeClock(1000);
    assert.equal(clock.advance(300000), 301000);
    assert.equal(clock.now(), 301000);
    assert.throws(() => clock.advance(-1), TypeError);
    assert.throws(() => clock.advance(Infinity), TypeError);
    const mail = createFakeMail();
    const message = { id: 'fixture_send_1', to: 'account@example.invalid', code: '001234' };
    mail.failNext();
    await assert.rejects(mail.send(message), /Injected/);
    await mail.send(message);
    await mail.send(message);
    assert.deepEqual(mail.messages(), [message]);
    mail.messages()[0].code = 'changed';
    assert.equal(mail.messages()[0].code, '001234');
    assert.deepEqual(createFakeMail().messages(), []);
    await assert.rejects(mail.send({ ...message, to: 'real@example.com' }), /example.invalid/);
    const provider = createFakeProvider();
    const claims = { subject: 'fixture_subject', email: 'account@example.invalid', emailVerified: true };
    const code = provider.issue(claims);
    await assert.rejects(createFakeProvider().exchange(code), /Unknown/);
    assert.deepEqual(await provider.exchange(code), claims);
    await assert.rejects(provider.exchange(code), /consumed/);
  } finally { restore(); }
});
