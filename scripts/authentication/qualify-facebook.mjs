import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID, createHmac } from 'node:crypto';
import http from 'node:http';
import { once } from 'node:events';
import express from 'express';
import { withDisposableAuthDatabase, createFakeClock, createFakeMail } from './fixtures.mjs';
import { runMigrations } from '../../server/repositories/postgres/migrations.js';
import { migrations } from '../database/registry.mjs';
import { IdentityFacebookEventService } from '../../server/domain/identity/IdentityFacebookEventService.js';
import { PostgresIdentityFacebookEventRepository } from '../../server/repositories/identity/PostgresIdentityFacebookEventRepository.js';
import { IdentityFacebookAdapter } from '../../server/domain/identity/adapters/IdentityFacebookAdapter.js';
import { IdentityFacebookService } from '../../server/domain/identity/IdentityFacebookService.js';
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

test('Facebook owned HTTP and disposable SQL flow', async (t) => {
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
      facebook,
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
      verifyAuthentication: (p) => facebook.verifyAuthentication(p),
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
      verifyMethod: (p) => facebook.verifyMethod(p),
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
    const codes = new Map(), tokens = new Map();
    const subject = () => randomBytes(8).readBigUInt64BE().toString();
    const app = express(),
      server = http.createServer(app);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
      const port = server.address().port,
        origin = `http://127.0.0.1:${port}`;
      const adapter = new IdentityFacebookAdapter({
        clientId: '123456',
        clientSecret: 'fixture-secret',
        redirectUri: `${origin}/api/auth/social/facebook/callback`,
        fixtureOnly: true,
        clock,
        fetch: async (url, request) => {
          const uri = new URL(url);
          assert.equal(request.redirect, 'error');
          if (uri.pathname.endsWith('/oauth/access_token')) {
            exchanges++;
            const claim = codes.get(uri.searchParams.get('code'));
            assert.ok(claim);
            assert.equal(uri.searchParams.get('redirect_uri'), `${origin}/api/auth/social/facebook/callback`);
            assert.equal(uri.searchParams.get('client_id'), '123456');
            const stored = (await database.query(`SELECT status FROM ${s}.identity_social_exchanges WHERE id=$1`, [claim.exchangeId])).rows[0];
            assert.equal(stored.status, 'exchange_claimed');
            clock.advance(providerDelay);
            const token = randomUUID();
            tokens.set(token, claim);
            return new Response(JSON.stringify({ access_token: token, expires_in: 300 }));
          }
          if (uri.pathname.endsWith('/debug_token')) {
            assert.equal(uri.searchParams.get('access_token'), '123456|fixture-secret');
            const claim = tokens.get(uri.searchParams.get('input_token'));
            assert.ok(claim);
            return new Response(JSON.stringify({ data: { app_id: '123456', type: 'USER', is_valid: true, user_id: claim.subject, expires_at: Math.floor(clock.now()/1000)+300, data_access_expires_at: Math.floor(clock.now()/1000)+300 } }));
          }
          assert.equal(uri.pathname, '/v26.0/me');
          const claim = tokens.get(request.headers.authorization.slice(7));
          assert.ok(claim);
          return new Response(JSON.stringify({ id: claim.subject }));
        },
      });
      facebook = new IdentityFacebookService({
        repository: new PostgresIdentitySocialRepository({ ...options, provider: 'facebook', issuer: 'https://www.facebook.com/123456' }),
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
      enrollment.social = facebook;
      facebook.events = new IdentityFacebookEventService({ repository: new PostgresIdentityFacebookEventRepository(options), adapter, sessions, receiptOrigin: `${origin}/`, fixtureOnly: true });
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
        facebook,
      });
      app.use(express.json({ limit: '32kb' }));
      app.use(express.urlencoded({ extended: false, limit: '32kb' }));
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
            req.end(body === undefined ? undefined : headers['content-type'] === 'application/x-www-form-urlencoded' ? new URLSearchParams(body).toString() : JSON.stringify(body));
          });
        return { jar, request };
      };
      const account = async () => {
        const id = randomUUID(),
          email = `${id}@example.invalid`,
          accountSubject = subject();
        await identity.transaction(async (r) => {
          await r.createAccount({ id, status: 'active', displayName: 'Facebook fixture' });
          await r.addEmailBinding({
            id,
            accountId: id,
            canonicalEmail: email,
            deliveryEmail: email,
            verifiedAt: new Date(clock.now()),
          });
        });
        await database.query(
          `INSERT INTO ${s}.identity_external_bindings(id,account_id,provider,issuer_scope,subject) VALUES($1,$1,'facebook','https://www.facebook.com/123456',$2)`,
          [id, accountSubject]
        );
        return { id, email, subject: accountSubject, trusted: true };
      };
      const start = async (
        claim = { subject: subject(), email: `${randomUUID()}@example.invalid`, trusted: true },
        c = client(),
        intent = 'login'
      ) => {
        await c.request('/api/auth/config');
        const response = await c.request('/api/auth/social/facebook/start', {
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
        const path = `/api/auth/social/facebook/callback?code=${code}&state=${url.searchParams.get('state')}`;
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
        displayName: 'Facebook Customer',
        termsAccepted: true,
        termsVersion: legal.termsVersion,
        privacyVersion: legal.privacyVersion,
      };
      const count = async (table) =>
        (await database.query(`SELECT count(*)::int AS n FROM ${s}.${table}`)).rows[0].n;
      const signedEvent = (subject, issuedAt = Math.floor(clock.now()/1000), secret = 'fixture-secret') => {
        const payload = Buffer.from(JSON.stringify({ algorithm: 'HMAC-SHA256', user_id: subject, issued_at: issuedAt })).toString('base64url');
        return `${createHmac('sha256', secret).update(payload).digest('base64url')}.${payload}`;
      };
      await t.test('pending exchange is immutable app-scoped before any provider call or claim', async () => {
        const c = await start(), before = exchanges;
        const pending = (await database.query(`SELECT e.digest,e.context_id,m.issuer_scope,m.issuer FROM ${s}.identity_social_exchanges e JOIN ${s}.identity_social_metadata m ON m.exchange_id=e.id WHERE e.id=$1`, [c.exchangeId])).rows[0];
        assert.equal(pending.issuer_scope, adapter.issuer);
        assert.equal(pending.issuer, null);
        const foreignRepository = new PostgresIdentitySocialRepository({ ...options, provider: 'facebook', issuer: 'https://www.facebook.com/987654' });
        await foreignRepository.transaction(async (r) => {
          assert.equal(await r.byState([pending.digest]), undefined);
          assert.equal(await r.exchange(c.exchangeId), undefined);
          assert.equal(await r.byContext(pending.context_id), undefined);
          await r.target(c.exchangeId, pending.context_id);
          await r.finish(c.exchangeId, 'verify_email');
          assert.equal(await r.consume(c.exchangeId, new Date(clock.now())), undefined);
        });
        const base = { ...facebook, identityRepository: identity,
          fingerprintKeys: facebook.operations.fingerprintKeys, receiptKeys: facebook.operations.receiptKeys };
        assert.throws(() => new IdentityFacebookService({ ...base, repository: foreignRepository, adapter }));
        const foreignAdapter = new IdentityFacebookAdapter({ clientId: '987654', clientSecret: 'foreign-fixture-secret',
          redirectUri: `${origin}/api/auth/social/facebook/callback`, fixtureOnly: true, clock,
          fetch: async () => { assert.fail('Foreign provider transport must never run.'); } });
        const foreignService = new IdentityFacebookService({ ...base, repository: foreignRepository, adapter: foreignAdapter });
        const proofs = { browserProof: c.jar.get(cookies.names.browser), contextProof: c.jar.get(cookies.names.flow) };
        await assert.rejects(foreignService.callback(proofs, { state: new URL(`${origin}${c.path}`).searchParams.get('state'), code: 'foreign' }));
        await assert.rejects(foreignService.result(proofs));
        await assert.rejects(foreignRepository.transaction(async (_, transaction) => {
          const bound = await contexts.readBound(proofs, transaction);
          return foreignService.verifyOperation({ context: bound.row, target: c.exchangeId, proof: proofs,
            payload: { provider: 'facebook', issuer: foreignAdapter.issuer, intent: 'login' }, transaction });
        }));
        const ownRow = await facebook.repository.transaction((r) => r.exchange(c.exchangeId));
        ownRow.browser_digest = (await contexts.readBound(proofs)).row.browser_digest;
        await facade.withRequestPeer('127.0.0.1', async () => {
          const claimInput = foreignService.input(ownRow, proofs);
          await assert.rejects(foreignService.operations.claimSocial(claimInput), { code: 'IDENTITY_OPERATION_REJECTED' });
        });
        await assert.rejects(database.query(`UPDATE ${s}.identity_social_metadata SET issuer_scope='https://www.facebook.com/987654' WHERE exchange_id=$1`, [c.exchangeId]), { code: 'DATABASE_OPERATION_FAILED', sqlState: '23514' });
        const unchanged = (await database.query(`SELECT e.status,m.target_context_id,m.next_action FROM ${s}.identity_social_exchanges e JOIN ${s}.identity_social_metadata m ON m.exchange_id=e.id WHERE e.id=$1`, [c.exchangeId])).rows[0];
        assert.deepEqual(unchanged, { status: 'initiated', target_context_id: null, next_action: null });
        assert.equal(exchanges, before);
        assert.equal((await c.callback()).status, 303);
      });
      await t.test(
        'known subject authenticates; result binds rotated session; callback cannot mint twice',
        async () => {
          const a = await account(),
            c = await start(a),
            before = await count('identity_sessions');
          const result = await c.callback();
          assert.equal(result.status, 303, JSON.stringify(result.body));
          assert.equal(result.headers.location, '/auth/callback?provider=facebook');
          assert.equal((await c.request('/api/auth/social/facebook/result')).body.nextAction, 'authenticated');
          assert.equal((await c.request('/api/me')).status, 200);
          assert.notEqual((await c.callback()).status, 303);
          assert.equal(await count('identity_sessions'), before + 1);
        }
      );
      await t.test('untrusted email requires real registration OTP then binds original subject', async () => {
        const c = await start({ subject: subject(), email: 'untrusted@example.invalid', trusted: false });
        assert.equal((await c.callback()).status, 303);
        assert.equal((await c.request('/api/auth/social/facebook/result')).body.nextAction, 'verify_email');
        await c.request('/api/auth/config');
        const email = `${randomUUID()}@example.invalid`;
        const issued = await c.request(
          '/api/auth/social/facebook/email',
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
      await t.test('valid provider cancellation is a terminal fixed redirect with no token exchange', async () => {
        const c = await start(), url = new URL(c.path, origin), before = exchanges;
        url.searchParams.delete('code');
        url.searchParams.set('error', 'access_denied');
        const response = await c.request(url.pathname + url.search);
        assert.equal(response.status, 303);
        assert.equal(response.headers.location, '/auth/callback?provider=facebook');
        assert.equal(exchanges, before);
        assert.equal((await c.request('/api/auth/social/facebook/result')).body.nextAction, 'fresh_sign_in_required');
        assert.equal((await database.query(`SELECT status FROM ${s}.identity_social_exchanges WHERE id=$1`, [c.exchangeId])).rows[0].status, 'interrupted');
      });
      await t.test('Facebook subject/email match cannot adopt a Google or existing local account', async () => {
        const a = await account(), other = await account();
        await database.query(`DELETE FROM ${s}.identity_external_bindings WHERE account_id=$1`, [a.id]);
        await database.query(`INSERT INTO ${s}.identity_external_bindings(id,account_id,provider,issuer_scope,subject) VALUES($1,$2,'google','https://accounts.google.com',$3)`, [randomUUID(), a.id, a.subject]);
        const c = await start(a);
        assert.equal((await c.callback()).status, 303);
        assert.equal((await c.request('/api/auth/social/facebook/result')).body.nextAction, 'verify_email');
        const googleScope = new PostgresIdentitySocialRepository(options);
        assert.equal(await googleScope.transaction((r) => r.exchange(c.exchangeId)), undefined);
        const fbScope = new PostgresIdentitySocialRepository({ ...options, provider: 'facebook', issuer: 'https://www.facebook.com/987654' });
        assert.equal(await fbScope.transaction((r) => r.exchange(c.exchangeId)), undefined);
        const issued = await c.request('/api/auth/social/facebook/email', { email: other.email }, { 'idempotency-key': randomUUID() });
        assert.equal(issued.status, 202);
        await delivery.process();
        const code = mail.messages().filter((m) => m.to === other.email).at(-1).code;
        const verified = await c.request(`/api/auth/challenges/${issued.body.challengeId}/verify`, { code });
        assert.equal(verified.body.nextAction, 'complete_registration');
        const before = await count('identity_accounts');
        const activation = await c.request('/api/auth/register', registration);
        assert.equal(activation.body.nextAction, 'sign_in_existing');
        assert.equal(await count('identity_accounts'), before);
        assert.equal((await database.query(`SELECT count(*)::int n FROM ${s}.identity_external_bindings WHERE provider='facebook' AND subject=$1`, [a.subject])).rows[0].n, 0);
      });
      await t.test('concurrent provider callback and signed revocation never leave usable revoked authority', async () => {
        const a = await account(), c = await start(a), provider = client();
        const results = await Promise.all([c.callback(), provider.request('/api/auth/social/facebook/deauthorization', { signed_request: signedEvent(a.subject) }, { 'content-type': 'application/x-www-form-urlencoded' })]);
        assert.equal(results[1].status, 200, JSON.stringify(results[1].body));
        assert.equal((await database.query(`SELECT security_version FROM ${s}.identity_accounts WHERE id=$1`, [a.id])).rows[0].security_version, 2);
        assert.equal((await database.query(`SELECT count(*)::int n FROM ${s}.identity_external_bindings WHERE provider='facebook' AND account_id=$1`, [a.id])).rows[0].n, 0);
        assert.equal((await database.query(`SELECT count(*)::int n FROM ${s}.identity_sessions WHERE account_id=$1 AND revoked_at IS NULL`, [a.id])).rows[0].n, 0);
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
        'Facebook reauthentication grants only original target, without minting a session',
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
            (await c.request('/api/auth/social/facebook/result')).body.nextAction,
            'reauthenticated'
          );
          assert.equal(await count('identity_sessions'), before);
          const row = (
            await database.query(
              `SELECT assurance_method,assurance_proof_ref FROM ${s}.identity_context_metadata WHERE context_id=$1`,
              [action.body.contextId]
            )
          ).rows[0];
          assert.equal(row.assurance_method, 'facebook');
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
          await facebook.operations.reconcileSocial();
          const row = (await database.query(`SELECT status,protected_verifier,nonce_digest FROM ${s}.identity_social_exchanges WHERE id=$1`, [c.exchangeId])).rows[0];
          assert.deepEqual(row, { status: 'interrupted', protected_verifier: null, nonce_digest: null });
        }
      );
      await t.test('signed deauthorization revokes exact owner authority once, and preserves product account', async () => {
        const a = await account(), other = await account(), c = await start(a), foreign = await start(other), provider = client();
        assert.equal((await c.callback()).status, 303);
        assert.equal((await foreign.callback()).status, 303);
        const request = { signed_request: signedEvent(a.subject) };
        const before = await count('audit_security_events');
        const results = await Promise.all([provider.request('/api/auth/social/facebook/deauthorization', request), provider.request('/api/auth/social/facebook/deauthorization', request)]);
        assert.ok(results.every((r) => r.status === 200), JSON.stringify(results));
        const owner = (await database.query(`SELECT status,security_version FROM ${s}.identity_accounts WHERE id=$1`, [a.id])).rows[0];
        assert.deepEqual(owner, { status: 'active', security_version: 2 });
        assert.equal((await database.query(`SELECT count(*)::int n FROM ${s}.identity_external_bindings WHERE account_id=$1`, [a.id])).rows[0].n, 0);
        assert.equal((await database.query(`SELECT count(*)::int n FROM ${s}.identity_sessions WHERE account_id=$1 AND revoked_at IS NULL`, [a.id])).rows[0].n, 0);
        assert.equal((await foreign.request('/api/me')).status, 200);
        assert.equal(await count('audit_security_events'), before + 1);
      });
      await t.test('forged/stale/future provider events do not revoke; Audit outage rolls back receipt and mutation', async () => {
        const a = await account(), c = await start(a);
        assert.equal((await c.callback()).status, 303);
        for (const value of [signedEvent(a.subject, Math.floor(clock.now()/1000), 'wrong-secret'), signedEvent(a.subject, Math.floor(clock.now()/1000)-301), signedEvent(a.subject, Math.floor(clock.now()/1000)+1)])
          assert.notEqual((await c.request('/api/auth/social/facebook/deauthorization', { signed_request: value })).status, 200);
        const request = { signed_request: signedEvent(a.subject) };
        auditFails = true;
        try { assert.notEqual((await c.request('/api/auth/social/facebook/deauthorization', request)).status, 200); }
        finally { auditFails = false; }
        assert.equal((await database.query(`SELECT security_version FROM ${s}.identity_accounts WHERE id=$1`, [a.id])).rows[0].security_version, 1);
        assert.equal((await c.request('/api/me')).status, 200);
        assert.equal((await c.request('/api/auth/social/facebook/deauthorization', request)).status, 200);
      });
      await t.test('deletion receipt is immutable and public-minimal; repeated callback does not renew or delete product account', async () => {
        const a = await account(), c = client(), request = { signed_request: signedEvent(a.subject) };
        await c.request('/api/auth/config');
        const first = await c.request('/api/auth/social/facebook/deletion', request);
        assert.equal(first.status, 200, JSON.stringify(first.body));
        assert.equal(new URL(first.body.url).origin, origin);
        assert.equal(new URL(first.body.url).pathname, '/auth/facebook/data-deletion');
        assert.equal((await database.query(`SELECT status FROM ${s}.identity_accounts WHERE id=$1`, [a.id])).rows[0].status, 'active');
        const receipt = (await database.query(`SELECT * FROM ${s}.identity_facebook_events WHERE confirmation_code=$1`, [first.body.confirmation_code])).rows[0];
        const originalClock = sessions.clock;
        sessions.clock = { now: () => clock.now() - 2000 };
        try {
          assert.notEqual((await c.request('/api/auth/social/facebook/deletion', request)).status, 200);
        } finally { sessions.clock = originalClock; }
        assert.equal((await database.query(`SELECT expires_at FROM ${s}.identity_facebook_events WHERE id=$1`, [receipt.id])).rows[0].expires_at.getTime(), receipt.expires_at.getTime());
        clock.advance(360000);
        const again = await c.request('/api/auth/social/facebook/deletion', request);
        assert.deepEqual(again.body, first.body);
        const status = await c.request(`/api/auth/social/facebook/deletion-status?confirmation_code=${first.body.confirmation_code}`);
        assert.deepEqual(status.body, { contractVersion: 1, status: 'received' });
        assert.equal((await c.request('/api/auth/social/facebook/deletion-status?confirmation_code=foreign')).status, 403);
        await assert.rejects(database.query(`UPDATE ${s}.identity_facebook_events SET expires_at=expires_at+interval '1 minute' WHERE id=$1`, [receipt.id]));
        clock.advance(86400000);
        assert.notEqual((await c.request('/api/auth/social/facebook/deletion', request)).status, 200);
        assert.equal((await c.request(`/api/auth/social/facebook/deletion-status?confirmation_code=${first.body.confirmation_code}`)).status, 403);
      });
      await t.test('signed deauth blocks old pending callback/enrollment; fresh authorization requires independent email proof', async () => {
        const provider = client(), claim = { subject: subject(), email: `${randomUUID()}@example.invalid` }, pending = await start(claim);
        const request = { signed_request: signedEvent(claim.subject) };
        assert.equal((await provider.request('/api/auth/social/facebook/deauthorization', request)).status, 200);
        assert.notEqual((await pending.callback()).status, 303);
        assert.equal((await database.query(`SELECT count(*)::int n FROM ${s}.identity_external_bindings WHERE subject=$1`, [claim.subject])).rows[0].n, 0);
        clock.advance(1);
        const fresh = await start(claim);
        assert.equal((await fresh.callback()).status, 303);
        const freshResult = await fresh.request('/api/auth/social/facebook/result');
        assert.equal(freshResult.body.nextAction, 'verify_email');
        assert.equal(freshResult.body.rememberDevice, true);
        const email = `${randomUUID()}@example.invalid`;
        const issued = await fresh.request('/api/auth/social/facebook/email', { email }, { 'idempotency-key': randomUUID() });
        assert.equal(issued.status, 202);
        await delivery.process();
        const code = mail.messages().filter((m) => m.to === email).at(-1).code;
        assert.equal((await fresh.request(`/api/auth/challenges/${issued.body.challengeId}/verify`, { code })).body.nextAction, 'complete_registration');
        // Different signed event after OTP invalidates the pending subject proof.
        clock.advance(1001);
        assert.equal((await provider.request('/api/auth/social/facebook/deauthorization', { signed_request: signedEvent(claim.subject) })).status, 200);
        const before = await count('identity_accounts');
        assert.notEqual((await fresh.request('/api/auth/register', registration)).status, 200);
        assert.equal(await count('identity_accounts'), before);
      });
      await t.test(
        'new expired initiated state also erases secrets',
        async () => {
          const c = await start(),
            before = exchanges;
          clock.advance(300001);
          assert.notEqual((await c.callback()).status, 303);
          assert.equal(exchanges, before);
          await facebook.operations.reconcileSocial();
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
          facebook.stateKeys.keys[2] = randomBytes(32);
          facebook.stateKeys.current = 2;
          assert.equal((await c.callback()).status, 303);
          const d = await start(await account()),
            saved = facebook.protectedKeys.keys[1];
          delete facebook.protectedKeys.keys[1];
          const before = exchanges;
          try {
            assert.notEqual((await d.callback()).status, 303);
            assert.equal(exchanges, before);
          } finally {
            facebook.protectedKeys.keys[1] = saved;
          }
        }
      );
    } finally {
      server.close();
      await once(server, 'close');
    }
  });
});
