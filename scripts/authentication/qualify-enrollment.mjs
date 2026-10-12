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

test('registration through HTTP and durable OTP produces one new qualified customer session', async (t) => {
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
      ].flatMap((m) => m(schema)),
      { mode: 'apply', schema }
    );
    const options = { database, schema },
      identity = new PostgresIdentityRepository(options),
      operationRepository = new PostgresIdentityOperationRepository(options),
      enrollmentRepository = new PostgresIdentityEnrollmentRepository(options);
    let enrollment,
      facade,
      auditFails = false,
      auditDelay = 0;
    const contexts = new IdentityContextService({
      repository: new PostgresIdentityContextRepository(options),
      browserKeys: ring(),
      csrfKeys: ring(),
      metadataKeys: ring(),
      targetResolver: (p) => enrollment.resolveTarget(p),
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
      verifyAuthentication: async () => {
        throw new Error('Login proof unavailable');
      },
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
      handlers: { registration: (p) => enrollment.recordVerification(p) },
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
      async function verified(email = `${randomUUID()}@example.invalid`, { rememberDevice = false } = {}) {
        const c = client();
        assert.equal((await c.request('/api/auth/config')).status, 200);
        const body = { purpose: 'registration', email, rememberDevice },
          key = randomUUID();
        const issued = await c.request('/api/auth/challenges', body, { 'idempotency-key': key });
        assert.equal(issued.status, 202, JSON.stringify(issued.body));
        const retry = await c.request('/api/auth/challenges', body, { 'idempotency-key': key });
        assert.equal(retry.body.challengeId, issued.body.challengeId);
        await delivery.process();
        const code = mail
          .messages()
          .filter((m) => m.to === email)
          .at(-1).code;
        const proof = await c.request(`/api/auth/challenges/${issued.body.challengeId}/verify`, { code });
        assert.equal(proof.status, 200, JSON.stringify(proof.body));
        assert.equal(proof.body.nextAction, 'complete_registration');
        return { ...c, email, contextId: proof.body.contextId, challengeId: issued.body.challengeId };
      }
      await t.test(
        'HTTP signup issues only HttpOnly committed cookies and SQL-derived customer actor',
        async () => {
          const c = await verified(undefined, { rememberDevice: true }),
            result = await c.request('/api/auth/register', registration);
          assert.equal(result.status, 200, JSON.stringify(result.body));
          assert.equal(result.body.nextAction, 'authenticated');
          assert.ok(result.headers['set-cookie'].every((v) => v.includes('HttpOnly')));
          assert.ok(!JSON.stringify(result.body).includes(c.jar.get(cookies.names.session)));
          const me = await c.request('/api/me');
          assert.equal(me.body.role, 'user');
          assert.equal(me.body.isMockActor, false);
          assert.equal(me.body.username, me.body.userId);
          assert.equal(await count('identity_accounts'), 1);
          assert.equal(await count('identity_sessions'), 1);
          assert.equal(await count('identity_legal_acceptances'), 1);
          assert.equal(await count('identity_password_credentials'), 0);
          assert.equal((await c.request('/api/auth/register', registration)).status, 403);
          assert.equal(await count('identity_accounts'), 1);
          const context = (
            await database.query(`SELECT purpose,account_id FROM ${s}.identity_contexts WHERE id=$1`, [
              c.contextId,
            ])
          ).rows[0];
          assert.deepEqual(context, { purpose: 'registration', account_id: null });
        }
      );
      await t.test(
        'consent and purpose/body substitution deny; optional screened password is hashed atomically',
        async () => {
          const c = await verified();
          assert.equal(
            (await c.request('/api/auth/register', { ...registration, termsAccepted: false })).status,
            403
          );
          assert.equal(
            (await c.request('/api/auth/register', { ...registration, accountId: 'forged' })).status,
            403
          );
          const password = 'fixture secure passphrase 2026';
          const result = await c.request('/api/auth/register', {
            ...registration,
            password,
            passwordConfirmation: password,
          });
          assert.equal(result.status, 200, JSON.stringify(result.body));
          const row = (await database.query(`SELECT protected_hash FROM ${s}.identity_password_credentials`))
            .rows[0];
          assert.notEqual(row.protected_hash, password);
          assert.equal(await passwords.verify(row.protected_hash, password), true);
        }
      );
      await t.test(
        'Audit failure rolls back activation/session/legal and retry keeps the original verified proof',
        async () => {
          const c = await verified(),
            before = await count('identity_accounts');
          auditFails = true;
          assert.equal((await c.request('/api/auth/register', registration)).status, 503);
          auditFails = false;
          assert.equal(await count('identity_accounts'), before);
          assert.equal(
            (
              await database.query(`SELECT status FROM ${s}.identity_enrollment_proofs WHERE context_id=$1`, [
                c.contextId,
              ])
            ).rows[0].status,
            'verified'
          );
          assert.equal((await c.request('/api/auth/register', registration)).status, 200);
          assert.equal(await count('identity_accounts'), before + 1);
        }
      );
      await t.test('concurrent original proof completion creates exactly one session/account', async () => {
        const c = await verified(),
          before = await count('identity_accounts');
        const results = await Promise.all([
          c.request('/api/auth/register', registration),
          c.request('/api/auth/register', registration),
        ]);
        assert.equal(results.filter((r) => r.status === 200).length, 1);
        assert.equal(await count('identity_accounts'), before + 1);
      });
      await t.test(
        'existing disabled email hands off without authentication, overwrite or credential changes',
        async () => {
          const existing = await verified(),
            created = await existing.request('/api/auth/register', registration);
          assert.equal(created.status, 200);
          const account = await identity.findAccountByEmail(existing.email);
          await identity.transaction((r) =>
            r.advanceSecurityVersion({
              accountId: account.id,
              expectedSecurityVersion: 1,
              status: 'disabled',
            })
          );
          clock.advance(61000);
          const c = await verified(existing.email),
            before = await count('identity_sessions');
          const result = await c.request('/api/auth/register', {
            ...registration,
            displayName: 'Must not overwrite',
          });
          assert.equal(result.body.nextAction, 'sign_in_existing');
          assert.ok(!c.jar.has(cookies.names.session));
          assert.equal(await count('identity_sessions'), before);
          assert.equal((await identity.findAccount(account.id)).displayName, registration.displayName);
        }
      );
      await t.test('fresh expiry after awaited Audit rolls all activation writes back', async () => {
        const c = await verified(),
          before = await count('identity_accounts');
        auditDelay = 300001;
        assert.equal((await c.request('/api/auth/register', registration)).status, 401);
        auditDelay = 0;
        assert.equal(await count('identity_accounts'), before);
      });
      await t.test(
        'two independently verified scopes racing one email create one account and hand off the loser',
        async () => {
          const email = `${randomUUID()}@example.invalid`,
            first = await verified(email);
          clock.advance(61000);
          const second = await verified(email),
            before = await count('identity_accounts');
          const results = await Promise.all([
            first.request('/api/auth/register', registration),
            second.request('/api/auth/register', registration),
          ]);
          assert.deepEqual(results.map((r) => r.body.nextAction).sort(), [
            'authenticated',
            'sign_in_existing',
          ]);
          assert.equal(await count('identity_accounts'), before + 1);
        }
      );
      await t.test(
        'foreign browser, changed consent and unqualified activation cannot mint sessions',
        async () => {
          const c = await verified(),
            foreign = client();
          await foreign.request('/api/auth/config');
          foreign.jar.set(cookies.names.flow, c.jar.get(cookies.names.flow));
          const before = await count('identity_accounts');
          assert.equal((await foreign.request('/api/auth/register', registration)).status, 401);
          assert.equal(
            (await c.request('/api/auth/register', { ...registration, termsVersion: 'old-version' })).status,
            403
          );
          const unavailable = new IdentityEnrollmentService({
            repository: enrollmentRepository,
            contexts,
            sessions,
            legal,
          });
          await assert.rejects(unavailable.complete({}, registration), { code: 'auth_service_unavailable' });
          assert.equal(await count('identity_accounts'), before);
        }
      );
      await t.test('unverified registration context cannot activate or reach password hashing',async()=>{
        const c=client();await c.request('/api/auth/config');
        const issued=await c.request('/api/auth/challenges',{purpose:'registration',email:`${randomUUID()}@example.invalid`},{'idempotency-key':randomUUID()});
        assert.equal(issued.status,202);
        const before=await count('identity_accounts'),original=enrollment.passwordAdapter;
        let hashed=false;enrollment.passwordAdapter={async hash(){hashed=true;throw new Error('Must not hash');}};
        try {assert.equal((await c.request('/api/auth/register',{...registration,password:'fixture passphrase 2026',passwordConfirmation:'fixture passphrase 2026'})).status,401);}
        finally {enrollment.passwordAdapter=original;}
        assert.equal(hashed,false);assert.equal(await count('identity_accounts'),before);
      });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
