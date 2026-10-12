import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import http from 'node:http';
import { once } from 'node:events';
import express from 'express';
import { withDisposableAuthDatabase, createFakeClock, createFakeMail } from './fixtures.mjs';
import { runMigrations } from '../../server/repositories/postgres/migrations.js';
import { migrations } from '../database/registry.mjs';
import { IdentityGoogleAdapter } from '../../server/domain/identity/adapters/IdentityGoogleAdapter.js';
import { IdentityGoogleService } from '../../server/domain/identity/IdentityGoogleService.js';
import { IdentityContextService } from '../../server/domain/identity/IdentityContextService.js';
import { IdentitySessionService } from '../../server/domain/identity/IdentitySessionService.js';
import { IdentityEnrollmentService } from '../../server/domain/identity/IdentityEnrollmentService.js';
import { IdentityActionService } from '../../server/domain/identity/IdentityActionService.js';
import { IdentityChallengeService } from '../../server/domain/identity/IdentityChallengeService.js';
import { IdentityDeliveryService } from '../../server/domain/identity/IdentityDeliveryService.js';
import { IdentityApplicationService } from '../../server/domain/identity/IdentityApplicationService.js';
import { IdentityPublicPolicyService } from '../../server/domain/identity/IdentityPublicPolicyService.js';
import { IdentityCookies } from '../../server/domain/identity/adapters/identityCookies.js';
import { PostgresIdentityRepository } from '../../server/repositories/identity/PostgresIdentityRepository.js';
import { PostgresIdentityOperationRepository } from '../../server/repositories/identity/PostgresIdentityOperationRepository.js';
import { PostgresIdentityContextRepository } from '../../server/repositories/identity/PostgresIdentityContextRepository.js';
import { PostgresIdentitySessionRepository } from '../../server/repositories/identity/PostgresIdentitySessionRepository.js';
import { PostgresIdentityEnrollmentRepository } from '../../server/repositories/identity/PostgresIdentityEnrollmentRepository.js';
import { PostgresIdentityActionRepository } from '../../server/repositories/identity/PostgresIdentityActionRepository.js';
import { PostgresIdentityChallengeRepository } from '../../server/repositories/identity/PostgresIdentityChallengeRepository.js';
import { PostgresIdentityEmailEventRepository } from '../../server/repositories/identity/PostgresIdentityEmailEventRepository.js';
import { PostgresIdentitySocialRepository } from '../../server/repositories/identity/PostgresIdentitySocialRepository.js';
import { PostgresSecurityAuditRepository } from '../../server/repositories/audit/PostgresSecurityAuditRepository.js';
import { AuditService } from '../../server/domain/audit/AuditService.js';
import { registerAuthRoutes } from '../../server/app/routes/authRoutes.js';
import { registerIdentityRoutes } from '../../server/app/routes/identityRoutes.js';
import { createRealActorContextMiddleware } from '../../server/middleware/actorContextMiddleware.js';

test('Google owned HTTP and disposable SQL flow', async (t) => {
  await withDisposableAuthDatabase(process.env, async ({ database, schema }) => {
    const s = `"${schema}"`,
      options = { database, schema },
      clock = createFakeClock(Date.now()),
      ring = () => ({ current: 1, keys: { 1: randomBytes(32) } });
    await runMigrations(
      database,
      migrations.map((m) => ({ ...m, sql: m.sql.replaceAll('"public"', s) })),
      { mode: 'apply', schema }
    );
    const identity = new PostgresIdentityRepository(options),
      operationRepository = new PostgresIdentityOperationRepository(options);
    let enrollment,
      google,
      actions,
      facade,
      auditFails = false,
      providerDelay = 0,
      exchanges = 0;
    const contexts = new IdentityContextService({
      repository: new PostgresIdentityContextRepository(options),
      browserKeys: ring(),
      csrfKeys: ring(),
      metadataKeys: ring(),
      clock,
      targetResolver: (p) =>
        p.purpose === 'reauthentication'
          ? {
              purpose: p.purpose,
              targetId: p.target,
              accountId: p.actor.accountId,
              securityVersion: p.actor.securityVersion,
              canonicalEmail: 'fixture@example.invalid',
              deliveryEmail: 'fixture@example.invalid',
              action: { name: p.action, target: p.target, sessionId: p.actor.sessionId },
            }
          : enrollment.resolveTarget(p),
    });
    const realAudit = new AuditService({
      securityRepository: new PostgresSecurityAuditRepository({ schema }),
      securityFingerprintKey: randomBytes(32),
      securityFingerprintKeyVersion: 1,
    });
    const audit = {
      async recordSecurityEvent(...args) {
        if (auditFails) throw new Error('Injected Audit failure');
        return realAudit.recordSecurityEvent(...args);
      },
    };
    const sessions = new IdentitySessionService({
      repository: new PostgresIdentitySessionRepository(options),
      contexts,
      sessionKeys: ring(),
      clock,
      verifyAuthentication: (p) => google.verifyAuthentication(p),
      verifyEnrollment: (p) => enrollment.verifiedActivation(p),
      auditService: audit,
      peerProvider: () => facade.requestPeer(),
    });
    const legal = { approved: true, termsVersion: 'fixture-terms-v1', privacyVersion: 'fixture-privacy-v1' };
    enrollment = new IdentityEnrollmentService({
      repository: new PostgresIdentityEnrollmentRepository(options),
      contexts,
      sessions,
      legal,
      fixtureOnly: true,
    });
    actions = new IdentityActionService({
      repository: new PostgresIdentityActionRepository(options),
      contexts,
      sessions,
      verifyMethod: (p) => google.verifyMethod(p),
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
    const pair = await generateKeyPair('RS256'),
      jwk = { ...(await exportJWK(pair.publicKey)), kid: 'fixture-google', alg: 'RS256' },
      codes = new Map();
    const app = express(),
      server = http.createServer(app);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
      const port = server.address().port,
        origin = `http://127.0.0.1:${port}`;
      const adapter = new IdentityGoogleAdapter({
        clientId: 'fixture-client',
        clientSecret: 'fixture-secret',
        redirectUri: `${origin}/api/auth/social/google/callback`,
        fixtureOnly: true,
        clock,
        fetch: async (url, request) => {
          if (url.endsWith('/certs')) return new Response(JSON.stringify({ keys: [jwk] }));
          exchanges++;
          const params = new URLSearchParams(request.body),
            claim = codes.get(params.get('code'));
          assert.ok(claim);
          assert.equal(params.get('redirect_uri'), `${origin}/api/auth/social/google/callback`);
          assert.equal(request.redirect, 'error');
          assert.equal(
            createHash('sha256').update(params.get('code_verifier')).digest('base64url'),
            claim.challenge
          );
          const stored = (
            await database.query(`SELECT status FROM ${s}.identity_social_exchanges WHERE id=$1`, [
              claim.exchangeId,
            ])
          ).rows[0];
          assert.equal(stored.status, 'exchange_claimed');
          clock.advance(providerDelay);
          const jwt = await new SignJWT({
            nonce: claim.nonce,
            email: claim.email,
            email_verified: claim.emailVerified ?? true,
            ...(claim.trusted ? { hd: 'example.invalid' } : {}),
          })
            .setProtectedHeader({ alg: 'RS256', kid: 'fixture-google' })
            .setIssuer('https://accounts.google.com')
            .setAudience('fixture-client')
            .setSubject(claim.subject)
            .setIssuedAt(Math.floor(clock.now() / 1000))
            .setExpirationTime(Math.floor(clock.now() / 1000) + 300)
            .sign(pair.privateKey);
          return new Response(JSON.stringify({ id_token: jwt, access_token: 'never-retain-this' }));
        },
      });
      google = new IdentityGoogleService({
        repository: new PostgresIdentitySocialRepository(options),
        operationRepository,
        identityRepository: identity,
        contexts,
        sessions,
        actions,
        enrollment,
        adapter,
        stateKeys: ring(),
        protectedKeys: ring(),
        fingerprintKeys: ring(),
        receiptKeys: ring(),
        fixtureOnly: true,
      });
      enrollment.social = google;
      const cookies = new IdentityCookies({ mode: 'local', allowedOrigins: [origin], fixtureOnly: true });
      facade = new IdentityApplicationService({
        contexts,
        sessions,
        cookies,
        publicPolicy: new IdentityPublicPolicyService({ legal }),
        identityRepository: identity,
        enrollment,
        challenges,
        actions,
        google,
      });
      app.use(express.json({ limit: '32kb' }));
      app.use(createRealActorContextMiddleware({ identityApplicationService: facade }));
      registerAuthRoutes(app, { identityApplicationService: facade });
      registerIdentityRoutes(app, { identityApplicationService: facade });
      const client = () => {
        const jar = new Map();
        let csrf;
        const request = (path, body, headers = {}) =>
          new Promise((resolve, reject) => {
            const req = http.request(
              {
                host: '127.0.0.1',
                port,
                path,
                method: body === undefined ? 'GET' : 'POST',
                headers: {
                  origin,
                  cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '),
                  ...(csrf ? { 'x-csrf-token': csrf } : {}),
                  ...(body === undefined ? {} : { 'content-type': 'application/json' }),
                  ...headers,
                },
              },
              (res) => {
                let raw = '';
                res.on('data', (d) => (raw += d));
                res.on('end', () => {
                  for (const entry of res.headers['set-cookie'] ?? []) {
                    const [k, v] = entry.split(';')[0].split('=');
                    if (v) jar.set(k, v);
                    else jar.delete(k);
                  }
                  const result = raw.startsWith('{') ? JSON.parse(raw) : null;
                  if (result?.csrfToken) csrf = result.csrfToken;
                  resolve({ status: res.statusCode, body: result, headers: res.headers });
                });
              }
            );
            req.on('error', reject);
            req.end(body === undefined ? undefined : JSON.stringify(body));
          });
        return { jar, request };
      };
      const account = async () => {
        const id = randomUUID(),
          email = `${id}@example.invalid`,
          subject = randomUUID();
        await identity.transaction(async (r) => {
          await r.createAccount({ id, status: 'active', displayName: 'Google fixture' });
          await r.addEmailBinding({
            id,
            accountId: id,
            canonicalEmail: email,
            deliveryEmail: email,
            verifiedAt: new Date(clock.now()),
          });
        });
        await database.query(
          `INSERT INTO ${s}.identity_external_bindings(id,account_id,provider,issuer_scope,subject) VALUES($1,$1,'google','https://accounts.google.com',$2)`,
          [id, subject]
        );
        return { id, email, subject, trusted: true };
      };
      const start = async (
        claim = { subject: randomUUID(), email: `${randomUUID()}@example.invalid`, trusted: true },
        c = client(),
        intent = 'login'
      ) => {
        await c.request('/api/auth/config');
        const response = await c.request('/api/auth/social/google/start', {
          intent,
          ...(intent === 'login' ? { rememberDevice: true, returnPath: '/settings' } : {}),
        });
        assert.equal(response.status, 200, JSON.stringify(response.body));
        const url = new URL(response.body.authorizationUrl),
          code = randomUUID(),
          exchangeId = (
            await database.query(`SELECT id FROM ${s}.identity_social_exchanges WHERE operation_id=$1`, [
              response.body.operationId,
            ])
          ).rows[0].id;
        codes.set(code, {
          ...claim,
          nonce: url.searchParams.get('nonce'),
          challenge: url.searchParams.get('code_challenge'),
          exchangeId,
        });
        const path = `/api/auth/social/google/callback?code=${code}&state=${url.searchParams.get('state')}`;
        return {
          ...c,
          ...claim,
          exchangeId,
          path,
          callback: () => c.request(path),
          operationId: response.body.operationId,
        };
      };
      const registration = {
        displayName: 'Google Customer',
        termsAccepted: true,
        termsVersion: legal.termsVersion,
        privacyVersion: legal.privacyVersion,
      };
      const count = async (table) =>
        (await database.query(`SELECT count(*)::int AS n FROM ${s}.${table}`)).rows[0].n;
      await t.test(
        'known subject authenticates; result binds rotated session; callback cannot mint twice',
        async () => {
          const a = await account(),
            c = await start(a),
            before = await count('identity_sessions');
          const result = await c.callback();
          assert.equal(result.status, 303, JSON.stringify(result.body));
          assert.equal(result.headers.location, '/auth/callback?provider=google');
          assert.equal((await c.request('/api/auth/social/google/result')).body.nextAction, 'authenticated');
          assert.equal((await c.request('/api/me')).status, 200);
          assert.notEqual((await c.callback()).status, 303);
          assert.equal(await count('identity_sessions'), before + 1);
        }
      );
      await t.test(
        'authoritative new email is registration-only until explicit Terms activation',
        async () => {
          const c = await start(),
            before = await count('identity_accounts');
          assert.equal((await c.callback()).status, 303);
          assert.equal(
            (await c.request('/api/auth/social/google/result')).body.nextAction,
            'complete_registration'
          );
          assert.equal(await count('identity_accounts'), before);
          await c.request('/api/auth/config');
          const result = await c.request('/api/auth/register', registration);
          assert.equal(result.status, 200, JSON.stringify(result.body));
          assert.equal(result.body.nextAction, 'authenticated');
          assert.equal(
            (
              await database.query(
                `SELECT count(*)::int n FROM ${s}.identity_external_bindings WHERE subject=$1`,
                [c.subject]
              )
            ).rows[0].n,
            1
          );
        }
      );
      await t.test('provider email collision never links or logs in', async () => {
        const a = await account(),
          c = await start({ ...a, subject: randomUUID() }),
          before = await count('identity_sessions');
        assert.equal((await c.callback()).status, 303);
        assert.equal((await c.request('/api/auth/social/google/result')).body.nextAction, 'sign_in_existing');
        assert.equal(await count('identity_sessions'), before);
      });
      await t.test('untrusted email requires real registration OTP then binds original subject', async () => {
        const c = await start({ subject: randomUUID(), email: 'untrusted@example.invalid', trusted: false });
        assert.equal((await c.callback()).status, 303);
        assert.equal((await c.request('/api/auth/social/google/result')).body.nextAction, 'verify_email');
        await c.request('/api/auth/config');
        const email = `${randomUUID()}@example.invalid`;
        const issued = await c.request(
          '/api/auth/social/google/email',
          { email },
          { 'idempotency-key': randomUUID() }
        );
        assert.equal(issued.status, 202, JSON.stringify(issued.body));
        await delivery.process();
        const code = mail
          .messages()
          .filter((m) => m.to === email)
          .at(-1).code;
        assert.equal(
          (await c.request(`/api/auth/challenges/${issued.body.challengeId}/verify`, { code })).body
            .nextAction,
          'complete_registration'
        );
        const result = await c.request('/api/auth/register', registration);
        assert.equal(result.status, 200, JSON.stringify(result.body));
        assert.equal(
          (
            await database.query(
              `SELECT count(*)::int n FROM ${s}.identity_external_bindings WHERE subject=$1`,
              [c.subject]
            )
          ).rows[0].n,
          1
        );
      });
      await t.test('foreign browser and concurrent callbacks allow only one exchange', async () => {
        const c = await start(await account()),
          foreign = client();
        await foreign.request('/api/auth/config');
        const before = exchanges;
        assert.notEqual((await foreign.request(c.path)).status, 303);
        assert.equal(exchanges, before);
        const result = await Promise.all([c.callback(), c.callback()]);
        assert.equal(result.filter((r) => r.status === 303).length, 1);
        assert.equal(exchanges, before + 1);
      });
      await t.test('valid Google cancellation is a terminal fixed redirect with no token exchange', async () => {
        const c = await start(), url = new URL(c.path, origin), before = exchanges;
        url.searchParams.delete('code');
        url.searchParams.set('error', 'access_denied');
        const response = await c.request(url.pathname + url.search);
        assert.equal(response.status, 303);
        assert.equal(response.headers.location, '/auth/callback?provider=google');
        assert.equal(exchanges, before);
        assert.equal((await c.request('/api/auth/social/google/result')).body.nextAction, 'fresh_sign_in_required');
        assert.equal((await database.query(`SELECT status FROM ${s}.identity_social_exchanges WHERE id=$1`, [c.exchangeId])).rows[0].status, 'interrupted');
      });
      await t.test(
        'provider success plus Audit rollback interrupts state and issues no session',
        async () => {
          const c = await start(await account()),
            before = await count('identity_sessions');
          auditFails = true;
          try {
            assert.notEqual((await c.callback()).status, 303);
          } finally {
            auditFails = false;
          }
          assert.equal(await count('identity_sessions'), before);
          const row = (
            await database.query(
              `SELECT status,protected_verifier,nonce_digest FROM ${s}.identity_social_exchanges WHERE id=$1`,
              [c.exchangeId]
            )
          ).rows[0];
          assert.deepEqual(row, { status: 'interrupted', protected_verifier: null, nonce_digest: null });
          const n = exchanges;
          await c.callback();
          assert.equal(exchanges, n);
        }
      );
      await t.test(
        'expiry during provider exchange rolls back and MFA account never gets single-factor session',
        async () => {
          const c = await start(await account());
          providerDelay = 16000;
          try {
            assert.notEqual((await c.callback()).status, 303);
          } finally {
            providerDelay = 0;
          }
          const a = await account();
          await database.query(
            `INSERT INTO ${s}.identity_role_memberships(account_id,role) VALUES($1,'admin')`,
            [a.id]
          );
          const m = await start(a);
          assert.notEqual((await m.callback()).status, 303);
        }
      );
      await t.test(
        'Google reauthentication grants only original target, without minting a session',
        async () => {
          const a = await account(),
            c = await start(a);
          assert.equal((await c.callback()).status, 303);
          await c.request('/api/auth/config');
          const action = await c.request('/api/auth/action-contexts', {
            action: 'password_change',
            target: a.id,
          });
          assert.equal(action.status, 200, JSON.stringify(action.body));
          const reauth = await start(a, c, 'reauthentication'),
            before = await count('identity_sessions');
          const result = await reauth.callback();
          assert.equal(result.status, 303, JSON.stringify(result.body));
          assert.equal(
            (await c.request('/api/auth/social/google/result')).body.nextAction,
            'reauthenticated'
          );
          assert.equal(await count('identity_sessions'), before);
          const row = (
            await database.query(
              `SELECT assurance_method,assurance_proof_ref FROM ${s}.identity_context_metadata WHERE context_id=$1`,
              [action.body.contextId]
            )
          ).rows[0];
          assert.equal(row.assurance_method, 'google');
          assert.equal(row.assurance_proof_ref, reauth.exchangeId);
        }
      );
      await t.test(
        'reauth rejects another linked subject and account version revoked after initiation',
        async () => {
          const a = await account(),
            other = await account(),
            c = await start(a);
          assert.equal((await c.callback()).status, 303);
          await c.request('/api/auth/config');
          await c.request('/api/auth/action-contexts', { action: 'password_change', target: a.id });
          const wrong = await start(other, c, 'reauthentication');
          assert.notEqual((await wrong.callback()).status, 303);
          await c.request('/api/auth/config');
          await c.request('/api/auth/action-contexts', { action: 'password_change', target: a.id });
          const stale = await start(a, c, 'reauthentication'),
            before = exchanges;
          await identity.transaction((r) =>
            r.advanceSecurityVersion({ accountId: a.id, expectedSecurityVersion: 1 })
          );
          assert.notEqual((await stale.callback()).status, 303);
          assert.equal(exchanges, before);
        }
      );
      await t.test(
        'expired initiated state reconciles durably, erases secrets and never calls provider',
        async () => {
          const c = await start(),
            before = exchanges;
          clock.advance(300001);
          assert.notEqual((await c.callback()).status, 303);
          assert.equal(exchanges, before);
          await google.operations.reconcileSocial();
          const row = (
            await database.query(
              `SELECT status,protected_verifier,nonce_digest FROM ${s}.identity_social_exchanges WHERE id=$1`,
              [c.exchangeId]
            )
          ).rows[0];
          assert.deepEqual(row, { status: 'interrupted', protected_verifier: null, nonce_digest: null });
        }
      );
      await t.test(
        'state and encryption keys rotate independently; missing old material fails closed',
        async () => {
          const c = await start(await account());
          google.stateKeys.keys[2] = randomBytes(32);
          google.stateKeys.current = 2;
          assert.equal((await c.callback()).status, 303);
          const d = await start(await account()),
            saved = google.protectedKeys.keys[1];
          delete google.protectedKeys.keys[1];
          const before = exchanges;
          try {
            assert.notEqual((await d.callback()).status, 303);
            assert.equal(exchanges, before);
          } finally {
            google.protectedKeys.keys[1] = saved;
          }
        }
      );
    } finally {
      server.close();
      await once(server, 'close');
    }
  });
});
