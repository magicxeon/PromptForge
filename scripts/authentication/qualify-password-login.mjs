import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import http from 'node:http';
import { once } from 'node:events';
import express from 'express';
import { withDisposableAuthDatabase, createFakeClock } from './fixtures.mjs';
import { runMigrations } from '../../server/repositories/postgres/migrations.js';
import { identityMigrations } from '../../server/repositories/identity/identityMigrations.js';
import { securityAuditMigrations } from '../../server/repositories/audit/securityAuditMigrations.js';
import { identityOperationMigrations } from '../../server/repositories/identity/identityOperationMigrations.js';
import { identityChallengeMigrations } from '../../server/repositories/identity/identityChallengeMigrations.js';
import { identityEmailDeliveryMigrations } from '../../server/repositories/identity/identityEmailDeliveryMigrations.js';
import { identitySessionMigrations } from '../../server/repositories/identity/identitySessionMigrations.js';
import { identityActorMigrations } from '../../server/repositories/identity/identityActorMigrations.js';
import { identityEnrollmentMigrations } from '../../server/repositories/identity/identityEnrollmentMigrations.js';
import { identityPrimaryMigrations } from '../../server/repositories/identity/identityPrimaryMigrations.js';
import { PostgresIdentityRepository } from '../../server/repositories/identity/PostgresIdentityRepository.js';
import { PostgresIdentityChallengeRepository } from '../../server/repositories/identity/PostgresIdentityChallengeRepository.js';
import { PostgresIdentityContextRepository } from '../../server/repositories/identity/PostgresIdentityContextRepository.js';
import { PostgresIdentitySessionRepository } from '../../server/repositories/identity/PostgresIdentitySessionRepository.js';
import { PostgresIdentityPrimaryRepository } from '../../server/repositories/identity/PostgresIdentityPrimaryRepository.js';
import { PostgresSecurityAuditRepository } from '../../server/repositories/audit/PostgresSecurityAuditRepository.js';
import { IdentityContextService } from '../../server/domain/identity/IdentityContextService.js';
import { IdentitySessionService } from '../../server/domain/identity/IdentitySessionService.js';
import { IdentityPrimaryAuthenticationService } from '../../server/domain/identity/IdentityPrimaryAuthenticationService.js';
import { IdentityApplicationService } from '../../server/domain/identity/IdentityApplicationService.js';
import { IdentityPublicPolicyService } from '../../server/domain/identity/IdentityPublicPolicyService.js';
import { IdentityPasswordAdapter } from '../../server/domain/identity/adapters/IdentityPasswordAdapter.js';
import { IdentityCookies } from '../../server/domain/identity/adapters/identityCookies.js';
import { AuditService } from '../../server/domain/audit/AuditService.js';
import { registerAuthRoutes } from '../../server/app/routes/authRoutes.js';
import { registerIdentityRoutes } from '../../server/app/routes/identityRoutes.js';
import { createRealActorContextMiddleware } from '../../server/middleware/actorContextMiddleware.js';

test('password Login uses committed rate admission, durable proof and post-commit HTTP cookies', async (t) => {
  await withDisposableAuthDatabase(process.env, async ({ database, schema }) => {
    const s = `"${schema}"`,
      clock = createFakeClock(Date.now()),
      ring = () => ({ current: 1, keys: { 1: randomBytes(32) } }),
      options = { database, schema };
    await runMigrations(
      database,
      [
        identityMigrations,
        securityAuditMigrations,
        identityOperationMigrations,
        identityChallengeMigrations,
        identityEmailDeliveryMigrations,
        identitySessionMigrations,
        identityActorMigrations,
        identityEnrollmentMigrations,
        identityPrimaryMigrations,
      ].flatMap((m) => m(schema)),
      { mode: 'apply', schema }
    );
    let primary,
      facade,
      secondaryFacade,
      auditFails = false,
      afterVerify,
      verifyCount = 0,
      hashInputs = [];
    const identity = new PostgresIdentityRepository(options),
      repository = new PostgresIdentityPrimaryRepository(options);
    const contexts = new IdentityContextService({
      repository: new PostgresIdentityContextRepository(options),
      browserKeys: ring(),
      csrfKeys: ring(),
      metadataKeys: ring(),
      targetResolver: (p) => primary.resolveTarget(p),
      clock,
    });
    const native = new IdentityPasswordAdapter({
      fixtureOnly: true,
      screening: {
        available: true,
        async check() {
          return { compromised: false };
        },
      },
    });
    await native.prepare();
    const password = 'Fixture untrimmed passphrase 2026 ',
      hash = await native.hash(password);
    const passwordAdapter = {
      async verify(encoded, value) {
        verifyCount++;
        hashInputs.push(encoded);
        const result = await native.verify(encoded, value);
        await afterVerify?.();
        return result;
      },
    };
    const audit = new AuditService({
      securityRepository: new PostgresSecurityAuditRepository({ schema }),
      securityFingerprintKey: randomBytes(32),
      securityFingerprintKeyVersion: 1,
    });
    const sessions = new IdentitySessionService({
      repository: new PostgresIdentitySessionRepository(options),
      contexts,
      sessionKeys: ring(),
      verifyAuthentication: (p) => primary.verifyAuthentication(p),
      auditService: {
        async recordSecurityEvent(...args) {
          if (auditFails) throw new Error('Injected Audit failure');
          return audit.recordSecurityEvent(...args);
        },
      },
      peerProvider: () => facade.requestPeer() ?? secondaryFacade?.requestPeer(),
      clock,
    });
    const primaryOptions = {
      repository,
      rateRepository: new PostgresIdentityChallengeRepository(options),
      contexts,
      sessions,
      passwordAdapter,
      proofKeys: ring(),
      rateKeys: ring(),
      fixtureOnly: true,
      clock,
    };
    primary = new IdentityPrimaryAuthenticationService(primaryOptions);
    const secondary = new IdentityPrimaryAuthenticationService({
      ...primaryOptions,
      repository: new PostgresIdentityPrimaryRepository(options),
      rateRepository: new PostgresIdentityChallengeRepository(options),
    });
    const app = express(),
      server = http.createServer(app);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
      const port = server.address().port,
        origin = `http://127.0.0.1:${port}`,
        cookies = new IdentityCookies({ mode: 'local', allowedOrigins: [origin], fixtureOnly: true });
      const compose = (instance) =>
        new IdentityApplicationService({
          contexts,
          sessions,
          cookies,
          identityRepository: identity,
          publicPolicy: new IdentityPublicPolicyService(),
          primary: instance,
        });
      facade = compose(primary);
      secondaryFacade = compose(secondary);
      app.use(express.json({ limit: '32kb' }));
      const other = express.Router();
      other.use(createRealActorContextMiddleware({ identityApplicationService: secondaryFacade }));
      registerAuthRoutes(other, { identityApplicationService: secondaryFacade });
      app.use('/second', other);
      app.use(createRealActorContextMiddleware({ identityApplicationService: facade }));
      registerAuthRoutes(app, { identityApplicationService: facade });
      registerIdentityRoutes(app, { identityApplicationService: facade });
      const count = async (table) =>
        (await database.query(`SELECT count(*)::int AS n FROM ${s}.${table}`)).rows[0].n;
      const account = async ({ status = 'active', credential = true, legacy = false, role } = {}) => {
        const id = randomUUID(),
          email = `${id}@example.invalid`;
        await identity.transaction(async (r) => {
          await r.createAccount({ id, status, displayName: 'Password fixture' });
          await r.addEmailBinding({
            id,
            accountId: id,
            canonicalEmail: email,
            deliveryEmail: email,
            verifiedAt: new Date(clock.now()),
          });
        });
        if (credential)
          await database.query(
            `INSERT INTO ${s}.identity_password_credentials(account_id,protected_hash,algorithm,version) VALUES($1,$2,$3,1)`,
            [id, legacy ? 'legacy-unqualified' : hash, legacy ? 'legacy' : 'argon2id']
          );
        if (role)
          await database.query(`INSERT INTO ${s}.identity_role_memberships(account_id,role) VALUES($1,$2)`, [
            id,
            role,
          ]);
        return { id, email };
      };
      const client = () => {
        const jar = new Map();
        let csrf;
        const request = (route, body, extra = {}) =>
          new Promise((resolve, reject) => {
            const req = http.request(
              {
                host: '127.0.0.1',
                port,
                path: route,
                method: body === undefined ? 'GET' : 'POST',
                headers: {
                  origin,
                  cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '),
                  ...(csrf ? { 'x-csrf-token': csrf } : {}),
                  ...(body === undefined ? {} : { 'content-type': 'application/json' }),
                  ...extra,
                },
              },
              (res) => {
                let raw = '';
                res.on('data', (d) => (raw += d));
                res.on('end', () => {
                  for (const cookie of res.headers['set-cookie'] ?? []) {
                    const [k, v] = cookie.split(';')[0].split('=');
                    if (v) jar.set(k, v);
                    else jar.delete(k);
                  }
                  const result = raw ? JSON.parse(raw) : null;
                  if (result?.csrfToken) csrf = result.csrfToken;
                  resolve({ status: res.statusCode, body: result, headers: res.headers });
                });
              }
            );
            req.on('error', reject);
            req.end(body === undefined ? undefined : JSON.stringify(body));
          });
        return { request, jar };
      };
      const guest = async () => {
        const c = client();
        assert.equal((await c.request('/api/auth/config')).status, 200);
        return c;
      };
      const login = (c, a, extra = {}) =>
        c.request('/api/auth/login', { email: a.email, password, ...extra });
      await t.test(
        'actual HTTP password success rotates cookies and derives actor and remembered lifetime from SQL',
        async () => {
          const a = await account(),
            c = await guest(),
            old = c.jar.get(cookies.names.browser),
            result = await login(c, a, { rememberDevice: true, returnPath: '/settings' });
          assert.equal(result.status, 200, JSON.stringify(result.body));
          assert.deepEqual(result.body, {
            contractVersion: 1,
            nextAction: 'authenticated',
            returnPath: '/settings',
          });
          assert.notEqual(c.jar.get(cookies.names.browser), old);
          assert.ok(result.headers['set-cookie'].every((v) => v.includes('HttpOnly')));
          const me = await c.request('/api/me');
          assert.equal(me.body.userId, a.id);
          assert.equal(me.body.authProvider, 'password');
          assert.equal(me.body.role, 'user');
          const row = (
            await database.query(`SELECT * FROM ${s}.identity_sessions WHERE account_id=$1`, [a.id])
          ).rows[0];
          assert.equal(row.remembered, true);
          assert.equal(+row.absolute_expires_at - +row.created_at, 2592000000);
          assert.equal(
            (
              await database.query(
                `SELECT count(*)::int AS n FROM ${s}.audit_security_events WHERE account_id=$1 AND action IN ('password_login','session_create')`,
                [a.id]
              )
            ).rows[0].n,
            2
          );
        }
      );
      await t.test(
        'unknown, malformed, wrong, absent, inactive and unsupported hashes share one generic denial and dummy work',
        async () => {
          const valid = await account(),
            absent = await account({ credential: false }),
            disabled = await account({ status: 'disabled' }),
            legacy = await account({ legacy: true });
          const cases = [
            { email: 'absent@example.invalid', password },
            { email: 'bad/email', password },
            { email: valid.email, password: password.trim() },
            { email: absent.email, password },
            { email: disabled.email, password },
            { email: legacy.email, password },
          ];
          const before = verifyCount;
          hashInputs = [];
          for (const body of cases) {
            const c = await guest(),
              r = await c.request('/api/auth/login', body);
            assert.equal(r.status, 401);
            assert.equal(r.body.code, 'auth_invalid_credentials');
            assert.ok(!r.headers['set-cookie']);
          }
          assert.equal(verifyCount - before, cases.length);
          assert.equal(hashInputs.filter((value) => value === undefined).length, 5);
        }
      );
      await t.test(
        'CSRF and body authority injection are rejected before expensive verification',
        async () => {
          const a = await account(),
            c = await guest(),
            before = verifyCount;
          assert.equal(
            (await c.request('/api/auth/login', { email: a.email, password }, { 'x-csrf-token': 'forged' }))
              .status,
            403
          );
          assert.equal((await login(c, a, { accountId: a.id })).status, 403);
          assert.equal(verifyCount, before);
        }
      );
      await t.test(
        'committed target budget survives rejected passwords and caps concurrent instance hashing',
        async () => {
          const a = await account();
          for (let n = 0; n < 9; n++) {
            const c = await guest();
            assert.equal(
              (
                await c.request(n % 2 ? '/second/api/auth/login' : '/api/auth/login', {
                  email: a.email,
                  password: 'wrong',
                })
              ).status,
              401
            );
          }
          const first = await guest(),
            second = await guest();
          const results = await Promise.all([
            first.request('/api/auth/login', { email: a.email, password: 'wrong' }),
            second.request('/second/api/auth/login', { email: a.email, password: 'wrong' }),
          ]);
          assert.deepEqual(results.map((r) => r.status).sort(), [401, 429]);
          const before = verifyCount,
            c = await guest();
          assert.equal((await login(c, a)).status, 429);
          assert.equal(verifyCount, before);
          clock.advance(900001);
          assert.equal((await login(await guest(), a)).status, 200);
        }
      );
      await t.test('concurrent correct attempts from one browser mint only one session', async () => {
        const a = await account(),
          c = await guest(),
          before = await count('identity_sessions');
        const results = await Promise.all([login(c, a), login(c, a)]);
        assert.deepEqual(results.map((r) => r.status).sort(), [200, 401]);
        assert.equal(await count('identity_sessions'), before + 1);
      });
      await t.test('Audit failure rolls session and proof back, but admission remains charged', async () => {
        const a = await account(),
          c = await guest(),
          before = await count('identity_sessions');
        auditFails = true;
        assert.equal((await login(c, a)).status, 503);
        auditFails = false;
        assert.equal(await count('identity_sessions'), before);
        assert.equal(
          (
            await database.query(
              `SELECT count(*)::int AS n FROM ${s}.identity_primary_proofs WHERE account_id=$1`,
              [a.id]
            )
          ).rows[0].n,
          0
        );
        assert.equal((await login(c, a)).status, 200);
        assert.equal(await count('identity_sessions'), before + 1);
      });
      await t.test('credential/version change during external hash invalidates the old result', async () => {
        const a = await account(),
          c = await guest(),
          before = await count('identity_sessions');
        afterVerify = async () => {
          await identity.transaction((r) =>
            r.advanceSecurityVersion({ accountId: a.id, expectedSecurityVersion: 1, status: 'disabled' })
          );
        };
        try {
          assert.equal((await login(c, a)).status, 401);
        } finally {
          afterVerify = null;
        }
        assert.equal(await count('identity_sessions'), before);
        const b = await account(),
          fresh = await guest();
        afterVerify = async () => {
          await database.query(
            `UPDATE ${s}.identity_password_credentials SET protected_hash=$2 WHERE account_id=$1`,
            [b.id, await native.hash('Different fixture passphrase 2026')]
          );
        };
        try {
          assert.equal((await login(fresh, b)).status, 401);
        } finally {
          afterVerify = null;
        }
        assert.equal(await count('identity_sessions'), before);
      });
      await t.test('browser expiry during hash cannot mint or rotate a session', async () => {
        const a = await account(),
          c = await guest(),
          before = await count('identity_sessions');
        afterVerify = async () => clock.advance(300001);
        try {
          assert.equal((await login(c, a)).status, 401);
        } finally {
          afterVerify = null;
        }
        assert.equal(await count('identity_sessions'), before);
      });
      await t.test('staff single factor cannot become workspace authority', async () => {
        const a = await account({ role: 'admin' }),
          before = await count('identity_sessions');
        const result = await login(await guest(), a);
        assert.equal(result.status, 401);
        assert.equal(result.body.code, 'auth_invalid_credentials');
        assert.equal(await count('identity_sessions'), before);
      });
      await t.test('confirmed customer MFA cannot be bypassed by a correct password', async () => {
        const a = await account(),
          before = await count('identity_sessions');
        await database.query(
          `INSERT INTO ${s}.identity_mfa_factors(id,account_id,protected_secret,key_version,confirmed_at,security_version) VALUES($1,$2,'fixture-protected',1,$3,1)`,
          [randomUUID(), a.id, new Date(clock.now())]
        );
        const result = await login(await guest(), a);
        assert.equal(result.status, 401);
        assert.equal(result.body.code, 'auth_invalid_credentials');
        assert.equal(await count('identity_sessions'), before);
      });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
