import test from 'node:test';
import { identityActionMigrations } from '../../server/repositories/identity/identityActionMigrations.js';
import { PostgresIdentityActionRepository } from '../../server/repositories/identity/PostgresIdentityActionRepository.js';
import { PostgresIdentityResetRepository } from '../../server/repositories/identity/PostgresIdentityResetRepository.js';
import { IdentityActionService } from '../../server/domain/identity/IdentityActionService.js';
import { IdentityOperationService } from '../../server/domain/identity/IdentityOperationService.js';
import { IdentityResetService } from '../../server/domain/identity/IdentityResetService.js';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import http from 'node:http';
import { once } from 'node:events';
import express from 'express';
import { withDisposableAuthDatabase, createFakeClock, createFakeMail } from './fixtures.mjs';
import { runMigrations } from '../../server/repositories/postgres/migrations.js';
import { identityMigrations } from '../../server/repositories/identity/identityMigrations.js';
import { securityAuditMigrations } from '../../server/repositories/audit/securityAuditMigrations.js';
import { identityOperationMigrations } from '../../server/repositories/identity/identityOperationMigrations.js';
import { identityChallengeMigrations } from '../../server/repositories/identity/identityChallengeMigrations.js';
import { identityEmailDeliveryMigrations } from '../../server/repositories/identity/identityEmailDeliveryMigrations.js';
import { identitySessionMigrations } from '../../server/repositories/identity/identitySessionMigrations.js';
import { identityActorMigrations } from '../../server/repositories/identity/identityActorMigrations.js';
import { identityOtpLoginMigrations } from '../../server/repositories/identity/identityOtpLoginMigrations.js';
import { identityPrimaryMigrations } from '../../server/repositories/identity/identityPrimaryMigrations.js';
import { IdentityPrimaryAuthenticationService } from '../../server/domain/identity/IdentityPrimaryAuthenticationService.js';
import { PostgresIdentityPrimaryRepository } from '../../server/repositories/identity/PostgresIdentityPrimaryRepository.js';
import { identityEnrollmentMigrations } from '../../server/repositories/identity/identityEnrollmentMigrations.js';
import { PostgresIdentityRepository } from '../../server/repositories/identity/PostgresIdentityRepository.js';
import { PostgresIdentityOperationRepository } from '../../server/repositories/identity/PostgresIdentityOperationRepository.js';
import { PostgresIdentityChallengeRepository } from '../../server/repositories/identity/PostgresIdentityChallengeRepository.js';
import { PostgresIdentityContextRepository } from '../../server/repositories/identity/PostgresIdentityContextRepository.js';
import { PostgresIdentitySessionRepository } from '../../server/repositories/identity/PostgresIdentitySessionRepository.js';
import { PostgresIdentityEnrollmentRepository } from '../../server/repositories/identity/PostgresIdentityEnrollmentRepository.js';
import { PostgresIdentityEmailEventRepository } from '../../server/repositories/identity/PostgresIdentityEmailEventRepository.js';
import { PostgresSecurityAuditRepository } from '../../server/repositories/audit/PostgresSecurityAuditRepository.js';
import { IdentityContextService } from '../../server/domain/identity/IdentityContextService.js';
import { IdentitySessionService } from '../../server/domain/identity/IdentitySessionService.js';
import { IdentityChallengeService } from '../../server/domain/identity/IdentityChallengeService.js';
import { IdentityDeliveryService } from '../../server/domain/identity/IdentityDeliveryService.js';
import { IdentityEnrollmentService } from '../../server/domain/identity/IdentityEnrollmentService.js';
import { IdentityApplicationService } from '../../server/domain/identity/IdentityApplicationService.js';
import { IdentityPublicPolicyService } from '../../server/domain/identity/IdentityPublicPolicyService.js';
import { IdentityPasswordAdapter } from '../../server/domain/identity/adapters/IdentityPasswordAdapter.js';
import { IdentityCookies } from '../../server/domain/identity/adapters/identityCookies.js';
import { AuditService } from '../../server/domain/audit/AuditService.js';
import { registerAuthRoutes } from '../../server/app/routes/authRoutes.js';
import { registerIdentityRoutes } from '../../server/app/routes/identityRoutes.js';
import { createRealActorContextMiddleware } from '../../server/middleware/actorContextMiddleware.js';

test('reset-only password replacement through owned HTTP and PostgreSQL', async (t) => {
  await withDisposableAuthDatabase(process.env, async ({ database, schema }) => {
    const s = `"${schema}"`,
      clock = createFakeClock(Date.now()),
      ring = () => ({ current: 1, keys: { 1: randomBytes(32) } });
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
        identityOtpLoginMigrations,
        identityActionMigrations,
      ].flatMap((m) => m(schema)),
      { mode: 'apply', schema }
    );
    const options = { database, schema },
      identity = new PostgresIdentityRepository(options),
      operationRepository = new PostgresIdentityOperationRepository(options),
      enrollmentRepository = new PostgresIdentityEnrollmentRepository(options);
    let reset,
      actions,
      primary,
      screeningFails = false,
      afterHash,
      hashCalls = 0,
      enrollment,
      facade,
      auditFails = false,
      auditDelay = 0;
    const contexts = new IdentityContextService({
      repository: new PostgresIdentityContextRepository(options),
      browserKeys: ring(),
      csrfKeys: ring(),
      metadataKeys: ring(),
      targetResolver: (p) =>
        p.purpose === 'password_reset'
          ? reset.resolveTarget(p)
          : p.purpose === 'login'
            ? primary.resolveOtpTarget(p)
            : enrollment.resolveTarget(p),
      clock,
    });
    const realAudit = new AuditService({
      securityRepository: new PostgresSecurityAuditRepository({ schema }),
      securityFingerprintKey: randomBytes(32),
      securityFingerprintKeyVersion: 1,
    });
    const audit = {
      async recordSecurityEvent(...args) {
        if (auditFails) throw new Error('Injected Audit failure');
        const result = await realAudit.recordSecurityEvent(...args);
        clock.advance(auditDelay);
        return result;
      },
    };
    const sessions = new IdentitySessionService({
      repository: new PostgresIdentitySessionRepository(options),
      contexts,
      sessionKeys: ring(),
      verifyAuthentication: (p) => primary.verifyAuthentication(p),
      verifyEnrollment: (p) => enrollment.verifiedActivation(p),
      auditService: audit,
      peerProvider: () => facade.requestPeer(),
      clock,
    });
    const passwords = new IdentityPasswordAdapter({
      fixtureOnly: true,
      screening: {
        available: true,
        async check() {
          return { compromised: screeningFails };
        },
      },
    });
    await passwords.prepare();
    const legal = { approved: true, termsVersion: 'fixture-terms-v1', privacyVersion: 'fixture-privacy-v1' };
    enrollment = new IdentityEnrollmentService({
      repository: enrollmentRepository,
      contexts,
      sessions,
      passwordAdapter: passwords,
      legal,
      fixtureOnly: true,
    });
    primary = new IdentityPrimaryAuthenticationService({
      repository: new PostgresIdentityPrimaryRepository(options),
      rateRepository: new PostgresIdentityChallengeRepository(options),
      contexts,
      sessions,
      passwordAdapter: passwords,
      proofKeys: ring(),
      rateKeys: ring(),
      fixtureOnly: true,
      clock,
    });
    const mail = createFakeMail(),
      delivery = new IdentityDeliveryService({
        repository: operationRepository,
        eventRepository: new PostgresIdentityEmailEventRepository(options),
        keyring: ring(),
        recipientKeys: ring(),
        adapter: mail,
        clock,
        fixtureOnly: true,
      });

    const operations = new IdentityOperationService({
      repository: operationRepository,
      identityRepository: identity,
      auditService: audit,
      deliveryService: delivery,
      fingerprintKeys: ring(),
      receiptKeys: ring(),
      verifyProof: (p) => actions.verifyOperation(p),
      handlers: { password_reset: (p) => reset.mutate(p) },
      clock,
    });
    actions = new IdentityActionService({
      repository: new PostgresIdentityActionRepository(options),
      contexts,
      sessions,
      operations,
      verifyMethod: (p) => reset.verifyMethod(p),
      fixtureOnly: true,
    });
    const resetPasswords = {
      async hash(value) {
        hashCalls++;
        const hash = await passwords.hash(value);
        await afterHash?.();
        return hash;
      },
    };
    reset = new IdentityResetService({
      repository: new PostgresIdentityResetRepository(options),
      contexts,
      actions,
      operations,
      passwordAdapter: resetPasswords,
      fixtureOnly: true,
    });
    const oldPassword = 'Original fixture password 2026 ',
      newPassword = 'Replacement fixture password 2026 ',
      originalHash = await passwords.hash(oldPassword);
    const challenges = new IdentityChallengeService({
      repository: new PostgresIdentityChallengeRepository(options),
      operationRepository,
      identityRepository: identity,
      deliveryService: delivery,
      resolveBinding: (p) => contexts.resolveBinding(p),
      handlers: {
        registration: (p) => enrollment.recordVerification(p),
        login: (p) => primary.recordOtpVerification(p),
        password_reset: (p) => reset.recordVerification(p),
      },
      otpKeys: ring(),
      targetKeys: ring(),
      rateKeys: ring(),
      operationKeys: ring(),
      receiptKeys: ring(),
      clock,
    });
    const app = express(),
      server = http.createServer(app);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
      const port = server.address().port,
        origin = `http://127.0.0.1:${port}`,
        cookies = new IdentityCookies({ mode: 'local', allowedOrigins: [origin], fixtureOnly: true });
      facade = new IdentityApplicationService({
        contexts,
        sessions,
        cookies,
        publicPolicy: new IdentityPublicPolicyService({ legal }),
        identityRepository: identity,
        enrollment,
        challenges,
        primary,
        reset,
        actions,
      });
      app.use(express.json({ limit: '32kb' }));
      app.use(createRealActorContextMiddleware({ identityApplicationService: facade }));
      registerAuthRoutes(app, { identityApplicationService: facade });
      registerIdentityRoutes(app, { identityApplicationService: facade });
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
                  ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
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

      const count = async (table) =>
        (await database.query(`SELECT count(*)::int n FROM ${s}.${table}`)).rows[0].n;
      const account = async ({ password = true, status = 'active', mfa = false } = {}) => {
        const id = randomUUID(),
          email = `${id}@example.invalid`;
        await identity.transaction(async (r) => {
          await r.createAccount({ id, status, displayName: 'Reset fixture' });
          await r.addEmailBinding({
            id,
            accountId: id,
            canonicalEmail: email,
            deliveryEmail: email,
            verifiedAt: new Date(clock.now()),
          });
        });
        if (password)
          await database.query(
            `INSERT INTO ${s}.identity_password_credentials(account_id,protected_hash,algorithm,version) VALUES($1,$2,'argon2id',1)`,
            [id, originalHash]
          );
        if (mfa)
          await database.query(
            `INSERT INTO ${s}.identity_mfa_factors(id,account_id,protected_secret,key_version,confirmed_at,security_version) VALUES($1,$2,'fixture',1,$3,1)`,
            [randomUUID(), id, new Date(clock.now())]
          );
        return { id, email };
      };
      const guest = async () => {
        const c = client();
        await c.request('/api/auth/config');
        return c;
      };
      const issue = async (email = `${randomUUID()}@example.invalid`, purpose = 'password_reset') => {
        const c = await guest(),
          issued = await c.request(
            '/api/auth/challenges',
            { purpose, email },
            { 'idempotency-key': randomUUID() }
          );
        assert.equal(issued.status, 202, JSON.stringify(issued.body));
        await delivery.process();
        const code = mail
          .messages()
          .filter((m) => m.to === email)
          .at(-1).code;
        return {
          ...c,
          email,
          challengeId: issued.body.challengeId,
          verify: () => c.request(`/api/auth/challenges/${issued.body.challengeId}/verify`, { code }),
        };
      };
      const payload = { password: newPassword, passwordConfirmation: newPassword };
      const prepare = (c, key = randomUUID(), value = payload) =>
        c.request(
          '/api/auth/operations/prepare',
          { action: 'password_reset', payload: value },
          { 'idempotency-key': key }
        );
      const commit = (c, p, key, value = payload) =>
        c.request(
          '/api/auth/password/reset',
          { operationId: p.body.operationId, ...value },
          { 'idempotency-key': key }
        );
      const credential = async (a) =>
        (
          await database.query(
            `SELECT protected_hash FROM ${s}.identity_password_credentials WHERE account_id=$1`,
            [a.id]
          )
        ).rows[0]?.protected_hash;
      const assurance = async (c) =>
        (
          await database.query(
            `SELECT m.* FROM ${s}.identity_context_metadata m JOIN ${s}.identity_challenges p ON p.context_id=m.context_id WHERE p.id=$1`,
            [c.challengeId]
          )
        ).rows[0];
      await t.test(
        'reset atomically replaces existing password, revokes all sessions, records Audit/outbox and requires login',
        async () => {
          const a = await account(),
            oldClients = [await guest(), await guest()];
          for (const c of oldClients)
            assert.equal(
              (await c.request('/api/auth/login', { email: a.email, password: oldPassword })).status,
              200
            );
          const c = await issue(a.email);
          assert.equal((await c.verify()).body.nextAction, 'reset_password');
          const key = randomUUID(),
            p = await prepare(c, key);
          assert.equal(p.status, 200, JSON.stringify(p.body));
          assert.ok(!p.body.receiptSecret);
          const lostFlow = c.jar.get(cookies.names.flow),
            before = await count('identity_sessions'),
            result = await commit(c, p, key);
          assert.equal(result.status, 200, JSON.stringify(result.body));
          assert.equal(result.body.nextAction, 'sign_in');
          assert.equal(await count('identity_sessions'), before);
          assert.ok(c.jar.has(cookies.names.receipt));
          assert.ok(!c.jar.has(cookies.names.session));
          c.jar.set(cookies.names.flow, lostFlow); // Simulate losing the commit response and its clearing cookie.
          assert.equal(await passwords.verify(await credential(a), newPassword), true);
          assert.equal(await passwords.verify(await credential(a), oldPassword), false);
          for (const old of oldClients) {
            assert.equal((await old.request('/api/me/preferences')).status, 401);
            const guest = await old.request('/api/me');
            assert.equal(guest.status, 200);
            assert.equal(guest.body, null);
          }
          const lookup = await c.request(`/api/auth/operations/${p.body.operationId}`);
          assert.deepEqual(lookup.body, result.body);
          assert.equal(
            (await database.query(`SELECT security_version FROM ${s}.identity_accounts WHERE id=$1`, [a.id]))
              .rows[0].security_version,
            2
          );
          assert.equal(
            (
              await database.query(
                `SELECT count(*)::int n FROM ${s}.audit_security_events WHERE account_id=$1 AND action='password_reset'`,
                [a.id]
              )
            ).rows[0].n,
            1
          );
          mail.failNext();
          await delivery.process();
          assert.equal(
            (await c.request(`/api/auth/operations/${p.body.operationId}`)).body.status,
            'succeeded'
          );
          clock.advance(1001);
          await delivery.process();
          assert.ok(mail.messages().some((m) => m.to === a.email && m.kind === 'password_changed'));
          const login = await guest();
          assert.equal(
            (await login.request('/api/auth/login', { email: a.email, password: newPassword })).status,
            200
          );
          assert.notEqual((await commit(c, p, key)).status, 200);
          assert.equal((await c.request('/api/auth/logout', {})).status, 204);
          assert.notEqual((await c.request(`/api/auth/operations/${p.body.operationId}`)).status, 200);
        }
      );
      await t.test(
        'confirmation, policy and screening failures preserve the valid grant and can be corrected',
        async () => {
          const a = await account(),
            c = await issue(a.email);
          await c.verify();
          const key = randomUUID(),
            before = hashCalls;
          assert.equal(
            (await prepare(c, key, { password: newPassword, passwordConfirmation: 'different' })).status,
            400
          );
          assert.equal(hashCalls, before);
          assert.equal(
            (await prepare(c, key, { password: 'short', passwordConfirmation: 'short' })).status,
            400
          );
          screeningFails = true;
          assert.equal((await prepare(c, key)).status, 400);
          screeningFails = false;
          assert.equal((await assurance(c)).assurance_consumed_at, null);
          const p = await prepare(c, key);
          assert.equal(p.status, 200);
          assert.equal((await commit(c, p, key)).status, 200);
        }
      );
      await t.test(
        'unknown, passwordless, blocked and MFA accounts cannot get reset mutation or a session',
        async () => {
          const cases = [
              { email: 'unknown-reset@example.invalid' },
              await account({ password: false }),
              await account({ status: 'disabled' }),
              await account({ mfa: true }),
            ],
            before = await count('identity_sessions');
          for (const a of cases) {
            const c = await issue(a.email),
              v = await c.verify();
            assert.notEqual(v.body.nextAction, 'reset_password');
            assert.notEqual((await prepare(c)).status, 200);
          }
          assert.equal(await count('identity_sessions'), before);
          assert.equal(await credential(cases[1]), undefined);
        }
      );
      await t.test(
        'wrong-purpose and foreign browser cannot reset, and request-only options are rejected',
        async () => {
          const a = await account(),
            c = await issue(a.email, 'login');
          await c.verify();
          assert.notEqual((await prepare(c)).status, 200);
          const b = await account(),
            resetClient = await issue(b.email);
          await resetClient.verify();
          const foreign = await guest();
          foreign.jar.set(cookies.names.flow, resetClient.jar.get(cookies.names.flow));
          assert.notEqual((await prepare(foreign)).status, 200);
          const guestClient = await guest();
          assert.equal(
            (
              await guestClient.request(
                '/api/auth/challenges',
                { purpose: 'password_reset', email: b.email, rememberDevice: true },
                { 'idempotency-key': randomUUID() }
              )
            ).status,
            403
          );
        }
      );
      await t.test(
        'changed payload/key, Audit failure and concurrent commit leave at most one password transition',
        async () => {
          const a = await account(),
            c = await issue(a.email);
          await c.verify();
          const key = randomUUID(),
            p = await prepare(c, key);
          assert.equal(p.status, 200);
          const different = {
            password: 'Another replacement password 2026',
            passwordConfirmation: 'Another replacement password 2026',
          };
          assert.notEqual((await commit(c, p, key, different)).status, 200);
          assert.notEqual((await commit(c, p, randomUUID())).status, 200);
          assert.equal(await credential(a), originalHash);
          auditFails = true;
          assert.notEqual((await commit(c, p, key)).status, 200);
          auditFails = false;
          assert.equal((await assurance(c)).assurance_consumed_at, null);
          assert.equal(await credential(a), originalHash);
          const results = await Promise.all([commit(c, p, key), commit(c, p, key)]);
          assert.equal(results.filter((r) => r.status === 200).length, 1);
          assert.equal(
            (await database.query(`SELECT security_version FROM ${s}.identity_accounts WHERE id=$1`, [a.id]))
              .rows[0].security_version,
            2
          );
        }
      );
      await t.test(
        'revocation and expiry during external hash invalidate preparation or commit before replacement',
        async () => {
          const a = await account(),
            c = await issue(a.email);
          await c.verify();
          afterHash = async () => {
            await identity.transaction((r) =>
              r.advanceSecurityVersion({ accountId: a.id, expectedSecurityVersion: 1 })
            );
          };
          try {
            assert.notEqual((await prepare(c)).status, 200);
          } finally {
            afterHash = null;
          }
          assert.equal(await credential(a), originalHash);
          const b = await account(),
            other = await issue(b.email);
          await other.verify();
          const key = randomUUID(),
            p = await prepare(other, key);
          afterHash = async () => clock.advance(300001);
          try {
            assert.notEqual((await commit(other, p, key)).status, 200);
          } finally {
            afterHash = null;
          }
          assert.equal(await credential(b), originalHash);
        }
      );
      await t.test(
        'expired proof and grant Audit failure never leave a usable reset authorization',
        async () => {
          const a = await account(),
            c = await issue(a.email);
          auditFails = true;
          assert.notEqual((await c.verify()).status, 200);
          auditFails = false;
          assert.equal((await assurance(c)).assurance_proof_ref, null);
          assert.equal((await c.verify()).body.nextAction, 'reset_password');
          clock.advance(300001);
          assert.notEqual((await prepare(c)).status, 200);
        }
      );
      await t.test('all sibling reset grants are revoked by the winning reset', async () => {
        const a = await account(),
          first = await issue(a.email);
        await first.verify();
        clock.advance(60001);
        const second = await issue(a.email);
        assert.equal((await second.verify()).body.nextAction, 'reset_password');
        const key = randomUUID(),
          p = await prepare(first, key);
        assert.equal((await commit(first, p, key)).status, 200);
        assert.notEqual((await prepare(second)).status, 200);
        assert.equal(
          (
            await database.query(
              `SELECT count(*)::int n FROM ${s}.identity_contexts WHERE account_id=$1 AND purpose='password_reset' AND status='pending'`,
              [a.id]
            )
          ).rows[0].n,
          0
        );
      });
      await t.test(
        'notification enqueue failure rolls replacement, revocation and grant consumption back',
        async () => {
          const a = await account(),
            c = await issue(a.email);
          await c.verify();
          const key = randomUUID(),
            p = await prepare(c, key),
            enqueue = delivery.enqueue;
          delivery.enqueue = async () => {
            throw new Error('Fixture enqueue failure');
          };
          try {
            assert.notEqual((await commit(c, p, key)).status, 200);
          } finally {
            delivery.enqueue = enqueue;
          }
          assert.equal(await credential(a), originalHash);
          assert.equal((await assurance(c)).assurance_consumed_at, null);
          assert.equal(
            (await c.request(`/api/auth/operations/${p.body.operationId}`)).body.status,
            'pending'
          );
          assert.equal((await commit(c, p, key)).status, 200);
        }
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
