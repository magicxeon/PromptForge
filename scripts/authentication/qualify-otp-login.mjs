import test from 'node:test';
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

test('OTP Login and explicit registration exchange through HTTP', async (t) => {
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
      ].flatMap((m) => m(schema)),
      { mode: 'apply', schema }
    );
    const options = { database, schema },
      identity = new PostgresIdentityRepository(options),
      operationRepository = new PostgresIdentityOperationRepository(options),
      enrollmentRepository = new PostgresIdentityEnrollmentRepository(options);
    let primary,
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
        p.purpose === 'login' ? primary.resolveOtpTarget(p) : enrollment.resolveTarget(p),
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
          return { compromised: false };
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
    const challenges = new IdentityChallengeService({
      repository: new PostgresIdentityChallengeRepository(options),
      operationRepository,
      identityRepository: identity,
      deliveryService: delivery,
      resolveBinding: (p) => contexts.resolveBinding(p),
      handlers: {
        registration: (p) => enrollment.recordVerification(p),
        login: (p) => primary.recordOtpVerification(p),
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
      const registration = {
        displayName: 'Fixture Customer',
        termsAccepted: true,
        termsVersion: legal.termsVersion,
        privacyVersion: legal.privacyVersion,
      };
      const count = async (table) =>
        (await database.query(`SELECT count(*)::int AS n FROM ${s}.${table}`)).rows[0].n;

      const account = async (email = `${randomUUID()}@example.invalid`, status = 'active') => {
        const id = randomUUID();
        await identity.transaction(async (r) => {
          await r.createAccount({ id, status, displayName: 'OTP fixture' });
          await r.addEmailBinding({
            id,
            accountId: id,
            canonicalEmail: email,
            deliveryEmail: email,
            verifiedAt: new Date(clock.now()),
          });
        });
        return { id, email };
      };
      const issue = async (email = `${randomUUID()}@example.invalid`, purpose = 'login') => {
        const c = client();
        await c.request('/api/auth/config');
        const result = await c.request(
          '/api/auth/challenges',
          { email, purpose, rememberDevice: true, returnPath: '/settings' },
          { 'idempotency-key': randomUUID() }
        );
        assert.equal(result.status, 202, JSON.stringify(result.body));
        await delivery.process();
        const code = mail
          .messages()
          .filter((m) => m.to === email)
          .at(-1).code;
        return {
          ...c,
          email,
          challengeId: result.body.challengeId,
          verify: () => c.request(`/api/auth/challenges/${result.body.challengeId}/verify`, { code }),
        };
      };
      await t.test(
        'known passwordless account authenticates with session/Audit and no credential mutation',
        async () => {
          const a = await account(),
            c = await issue(a.email),
            r = await c.verify();
          assert.equal(r.status, 200, JSON.stringify(r.body));
          assert.equal(r.body.nextAction, 'authenticated');
          assert.equal(r.body.returnPath, '/settings');
          assert.ok(!('session' in r.body));
          assert.equal((await c.request('/api/me')).body.userId, a.id);
          assert.equal(await count('identity_password_credentials'), 0);
          const row = (
            await database.query(`SELECT method,remembered FROM ${s}.identity_sessions WHERE account_id=$1`, [
              a.id,
            ])
          ).rows[0];
          assert.deepEqual(row, { method: 'email_otp', remembered: true });
          assert.equal(
            (
              await database.query(
                `SELECT count(*)::int n FROM ${s}.audit_security_events WHERE account_id=$1 AND action IN ('session_create','otp_login')`,
                [a.id]
              )
            ).rows[0].n,
            2
          );
          assert.notEqual((await c.verify()).status, 200);
        }
      );
      await t.test(
        'unknown proof only offers; explicit exchange preserves original expiry and completes without another mail',
        async () => {
          const c = await issue(),
            before = await count('identity_accounts'),
            verified = await c.verify();
          assert.equal(verified.body.nextAction, 'offer_registration');
          assert.equal(await count('identity_accounts'), before);
          assert.notEqual((await c.request('/api/auth/register', registration)).status, 200);
          const oldFlow = c.jar.get(cookies.names.flow),
            messages = mail.messages().length,
            exchange = await c.request('/api/auth/enrollment-intents', {});
          assert.equal(exchange.status, 200, JSON.stringify(exchange.body));
          assert.equal(exchange.body.nextAction, 'complete_registration');
          assert.notEqual(c.jar.get(cookies.names.flow), oldFlow);
          const grant = (
            await database.query(
              `SELECT e.*,c.purpose,c.expires_at AS target_expiry,original.purpose AS original_purpose,original.expires_at AS original_expiry FROM ${s}.identity_enrollment_exchanges e JOIN ${s}.identity_contexts c ON c.id=e.target_context_id JOIN ${s}.identity_contexts original ON original.id=e.source_context_id WHERE e.target_context_id=$1`,
              [exchange.body.contextId]
            )
          ).rows[0];
          assert.equal(grant.purpose, 'registration');
          assert.equal(grant.original_purpose, 'login');
          assert.ok(+grant.target_expiry <= +grant.original_expiry);
          assert.notEqual((await c.request('/api/auth/enrollment-intents', {})).status, 200);
          const result = await c.request('/api/auth/register', registration);
          assert.equal(result.status, 200, JSON.stringify(result.body));
          assert.equal(result.body.nextAction, 'authenticated');
          assert.equal(await count('identity_accounts'), before + 1);
          assert.equal(mail.messages().length, messages);
        }
      );
      await t.test('Audit failure rolls code consumption and session back; same code retries', async () => {
        const a = await account(),
          c = await issue(a.email),
          before = await count('identity_sessions');
        auditFails = true;
        assert.notEqual((await c.verify()).status, 200);
        auditFails = false;
        assert.equal(await count('identity_sessions'), before);
        assert.equal(
          (await database.query(`SELECT status FROM ${s}.identity_challenges WHERE id=$1`, [c.challengeId]))
            .rows[0].status,
          'pending'
        );
        assert.equal((await c.verify()).status, 200);
      });
      await t.test('concurrent known-account redemption mints exactly one session', async () => {
        const a = await account(),
          c = await issue(a.email),
          before = await count('identity_sessions');
        const results = await Promise.all([c.verify(), c.verify()]);
        assert.equal(results.filter((r) => r.status === 200).length, 1);
        assert.equal(await count('identity_sessions'), before + 1);
      });
      await t.test(
        'foreign browser, body substitution and registration-purpose exchange cannot promote proof',
        async () => {
          const c = await issue();
          await c.verify();
          const foreign = client();
          await foreign.request('/api/auth/config');
          foreign.jar.set(cookies.names.flow, c.jar.get(cookies.names.flow));
          assert.notEqual((await foreign.request('/api/auth/enrollment-intents', {})).status, 200);
          assert.equal(
            (await c.request('/api/auth/enrollment-intents', { email: 'forged@example.invalid' })).status,
            403
          );
          const reg = await issue(undefined, 'registration');
          await reg.verify();
          assert.notEqual((await reg.request('/api/auth/enrollment-intents', {})).status, 200);
        }
      );
      await t.test(
        'concurrent intent exchange has one winner; newly existing email hands off without login',
        async () => {
          const c = await issue();
          await c.verify();
          const results = await Promise.all([
            c.request('/api/auth/enrollment-intents', {}),
            c.request('/api/auth/enrollment-intents', {}),
          ]);
          assert.equal(results.filter((r) => r.status === 200).length, 1);
          const other = await issue();
          await other.verify();
          await account(other.email);
          const before = await count('identity_sessions');
          const result = await other.request('/api/auth/enrollment-intents', {});
          assert.equal(result.body.nextAction, 'sign_in_existing');
          assert.equal(await count('identity_sessions'), before);
        }
      );
      await t.test('account created after exchange requires independent login at completion', async () => {
        const c = await issue();
        await c.verify();
        assert.equal((await c.request('/api/auth/enrollment-intents', {})).status, 200);
        await account(c.email);
        const before = await count('identity_sessions');
        assert.equal(
          (await c.request('/api/auth/register', registration)).body.nextAction,
          'sign_in_existing'
        );
        assert.equal(await count('identity_sessions'), before);
      });
      await t.test(
        'version revocation, required MFA and disabled account cannot gain workspace',
        async () => {
          const a = await account(),
            c = await issue(a.email);
          await identity.transaction((r) =>
            r.advanceSecurityVersion({ accountId: a.id, expectedSecurityVersion: 1 })
          );
          assert.notEqual((await c.verify()).status, 200);
          const b = await account();
          await database.query(
            `INSERT INTO ${s}.identity_role_memberships(account_id,role) VALUES($1,'admin')`,
            [b.id]
          );
          const staff = await issue(b.email);
          assert.notEqual((await staff.verify()).status, 200);
          const d = await account(undefined, 'disabled'),
            disabled = await issue(d.email);
          assert.equal((await disabled.verify()).body.nextAction, 'unavailable');
        }
      );
      await t.test('expiry during awaited Audit rolls back; expired offer cannot exchange', async () => {
        const a = await account(),
          c = await issue(a.email),
          before = await count('identity_sessions');
        auditDelay = 300001;
        assert.notEqual((await c.verify()).status, 200);
        auditDelay = 0;
        assert.equal(await count('identity_sessions'), before);
        const offer = await issue();
        await offer.verify();
        clock.advance(300001);
        assert.notEqual((await offer.request('/api/auth/enrollment-intents', {})).status, 200);
      });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
