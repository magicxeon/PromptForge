import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { withDisposableAuthDatabase, createFakeClock, createFakeMail } from './fixtures.mjs';
import { runMigrations } from '../../server/repositories/postgres/migrations.js';
import { identityMigrations } from '../../server/repositories/identity/identityMigrations.js';
import { securityAuditMigrations } from '../../server/repositories/audit/securityAuditMigrations.js';
import { identityOperationMigrations } from '../../server/repositories/identity/identityOperationMigrations.js';
import { identityChallengeMigrations } from '../../server/repositories/identity/identityChallengeMigrations.js';
import { identityEmailDeliveryMigrations } from '../../server/repositories/identity/identityEmailDeliveryMigrations.js';
import { identitySessionMigrations } from '../../server/repositories/identity/identitySessionMigrations.js';
import { identityActorMigrations } from '../../server/repositories/identity/identityActorMigrations.js';
import { AuditService } from '../../server/domain/audit/AuditService.js';
import { PostgresSecurityAuditRepository } from '../../server/repositories/audit/PostgresSecurityAuditRepository.js';
import { createRealActorContextMiddleware } from '../../server/middleware/actorContextMiddleware.js';
import { PostgresIdentityRepository } from '../../server/repositories/identity/PostgresIdentityRepository.js';
import { PostgresIdentityContextRepository } from '../../server/repositories/identity/PostgresIdentityContextRepository.js';
import { PostgresIdentitySessionRepository } from '../../server/repositories/identity/PostgresIdentitySessionRepository.js';
import { PostgresIdentityOperationRepository } from '../../server/repositories/identity/PostgresIdentityOperationRepository.js';
import { PostgresIdentityEmailEventRepository } from '../../server/repositories/identity/PostgresIdentityEmailEventRepository.js';
import { IdentityContextService } from '../../server/domain/identity/IdentityContextService.js';
import { IdentitySessionService } from '../../server/domain/identity/IdentitySessionService.js';
import { IdentityDeliveryService } from '../../server/domain/identity/IdentityDeliveryService.js';
import { IdentityApplicationService } from '../../server/domain/identity/IdentityApplicationService.js';
import { IdentityPublicPolicyService } from '../../server/domain/identity/IdentityPublicPolicyService.js';
import { IdentityCookies } from '../../server/domain/identity/adapters/identityCookies.js';
import { registerAuthRoutes } from '../../server/app/routes/authRoutes.js';

test('durable browser contexts, verified session transitions and owned transport fixtures', async (t) => {
  await withDisposableAuthDatabase(process.env, async ({ database, schema }) => {
    const s = `"${schema}"`,
      clock = createFakeClock(Date.now()),
      now = () => new Date(clock.now());
    await runMigrations(
      database,
      [
        ...identityMigrations(schema),
        ...securityAuditMigrations(schema),
        ...identityOperationMigrations(schema),
        ...identityChallengeMigrations(schema),
        ...identityEmailDeliveryMigrations(schema),
        ...identitySessionMigrations(schema),
        ...identityActorMigrations(schema),
      ],
      { mode: 'apply', schema }
    );
    await database.query(
      `CREATE TABLE ${s}.fixture_session_proofs(id text PRIMARY KEY,context_id text NOT NULL REFERENCES ${s}.identity_contexts(id),consumed boolean NOT NULL DEFAULT false)`
    );
    const ring = () => ({ current: 1, keys: { 1: randomBytes(32) } }),
      browserKeys = ring(),
      csrfKeys = ring(),
      metadataKeys = ring(),
      sessionKeys = ring();
    const identity = new PostgresIdentityRepository({ database, schema }),
      repository = new PostgresIdentitySessionRepository({
        database,
        schema,
      });
    const contextRepository = new PostgresIdentityContextRepository({
      database,
      schema,
    });
    const targetResolver = async (proposal) => {
      const account = await identity.findAccountByEmail(proposal.email);
      return {
        purpose: proposal.purpose ?? 'login',
        targetId: account?.id ?? 'pending-email',
        accountId: account?.id ?? null,
        securityVersion: account?.securityVersion ?? null,
        canonicalEmail: proposal.email,
        deliveryEmail: proposal.email,
        rememberDevice: proposal.rememberDevice ?? false,
        returnPath: '/',
      };
    };
    const contexts = new IdentityContextService({
      repository: contextRepository,
      browserKeys,
      csrfKeys,
      metadataKeys,
      targetResolver,
      clock,
    });
    const operationRepository = new PostgresIdentityOperationRepository({
      database,
      schema,
    });
    const deliveryService = new IdentityDeliveryService({
      repository: operationRepository,
      eventRepository: new PostgresIdentityEmailEventRepository({
        database,
        schema,
      }),
      keyring: ring(),
      recipientKeys: ring(),
      adapter: createFakeMail(),
      clock,
      fixtureOnly: true,
    });
    let proofFails = false,
      proofDelay = 0,
      mfaQualified = false;
    const verifyAuthentication = async ({ transaction, proofRef, context }) => {
      const proof = (
        await transaction.query(`SELECT * FROM ${s}.fixture_session_proofs WHERE id=$1 FOR UPDATE`, [
          proofRef,
        ])
      ).rows[0];
      if (proofFails || !proof || proof.consumed || proof.context_id !== context.id)
        throw new Error('Invalid fixture proof');
      await transaction.query(`UPDATE ${s}.fixture_session_proofs SET consumed=true WHERE id=$1`, [proofRef]);
      clock.advance(proofDelay);
      return {
        proofRef,
        contextId: context.id,
        accountId: context.account_id,
        securityVersion: context.security_version,
        method: 'email_otp',
        assurance: mfaQualified ? 'mfa' : 'single_factor',
        mfaQualified,
      };
    };
    let auditFails = false;
    const realAudit = new AuditService({
      securityRepository: new PostgresSecurityAuditRepository({ schema }),
      securityFingerprintKey: randomBytes(32),
      securityFingerprintKeyVersion: 1,
    });
    const auditService = {
      async recordSecurityEvent(...args) {
        if (auditFails) throw new Error('Fixture audit failure');
        return realAudit.recordSecurityEvent(...args);
      },
      async recordAccountStatusEvent(...args) {
        if (auditFails) throw new Error('Fixture audit failure');
        return realAudit.recordAccountStatusEvent(...args);
      },
    };
    const options = {
      repository,
      contexts,
      sessionKeys,
      verifyAuthentication,
      operationRepository,
      deliveryService,
      auditService,
      peerProvider: () => '127.0.0.1',
      clock,
    };
    const sessions = new IdentitySessionService(options),
      second = new IdentitySessionService({
        ...options,
        repository: new PostgresIdentitySessionRepository({
          database,
          schema,
        }),
      });
    const cookies = new IdentityCookies({
      mode: 'local',
      allowedOrigins: ['http://127.0.0.1:3000'],
      fixtureOnly: true,
    });
    const facade = new IdentityApplicationService({
      contexts,
      sessions,
      cookies,
      publicPolicy: new IdentityPublicPolicyService(),
      identityRepository: identity,
    });
    async function account() {
      const id = randomUUID(),
        email = `${id}@example.invalid`;
      await identity.transaction((r) => r.createAccount({ id, status: 'active', displayName: 'Fixture' }));
      await database.query(
        `INSERT INTO ${s}.identity_email_bindings(id,account_id,canonical_email,delivery_email,verified_at) VALUES($1,$1,$2,$2,$3)`,
        [id, email, now()]
      );
      return { id, email };
    }
    async function prepared(a, { rememberDevice = false, purpose = 'login' } = {}) {
      const browser = await contexts.bootstrap(),
        flow = await contexts.issue({
          browserProof: browser.secret,
          proposal: { email: a.email, rememberDevice, purpose },
        }),
        proofRef = randomUUID();
      await database.query(`INSERT INTO ${s}.fixture_session_proofs(id,context_id) VALUES($1,$2)`, [
        proofRef,
        flow.contextId,
      ]);
      return {
        proofRef,
        browserProof: browser.secret,
        contextProof: flow.contextProof,
        contextId: flow.contextId,
      };
    }
    const complete = (p, instance = sessions, extra = {}) =>
      repository.transaction((_, tx) =>
        instance.finishVerifiedAuthentication(tx, {
          proofRef: p.proofRef,
          browserProof: p.browserProof,
          contextProof: p.contextProof,
          ...extra,
        })
      );
    const header = (result) =>
      `${cookies.names.session}=${result.sessionSecret}; ${cookies.names.browser}=${result.browserSecret}`;
    const lookup = async (id) =>
      (await database.query(`SELECT * FROM ${s}.identity_sessions WHERE id=$1`, [id])).rows[0];

    await t.test(
      'encrypted durable context resolves on another instance and never grants session authority',
      async () => {
        const a = await account(),
          p = await prepared(a, { rememberDevice: true });
        const other = new IdentityContextService({
          repository: new PostgresIdentityContextRepository({
            database,
            schema,
          }),
          browserKeys,
          csrfKeys,
          metadataKeys,
          targetResolver,
          clock,
        });
        assert.equal((await other.resolveBinding(p)).canonicalEmail, a.email);
        assert.equal((await other.resolveBinding(p)).rememberDevice, true);
        const record = (
          await database.query(`SELECT * FROM ${s}.identity_context_metadata WHERE context_id=$1`, [
            p.contextId,
          ])
        ).rows[0];
        assert.ok(!record.protected_payload.includes(a.email));
        await assert.rejects(sessions.resolve(p.contextProof));
        await assert.rejects(
          other.resolveBinding({
            ...p,
            browserProof: randomBytes(32).toString('base64url'),
          })
        );
      }
    );
    await t.test(
      'one verified proof creates one rotated session across concurrent instances; failed verification rolls back',
      async () => {
        const a = await account(),
          p = await prepared(a);
        proofFails = true;
        await assert.rejects(complete(p));
        proofFails = false;
        assert.equal(
          (await database.query(`SELECT consumed FROM ${s}.fixture_session_proofs WHERE id=$1`, [p.proofRef]))
            .rows[0].consumed,
          false
        );
        const results = await Promise.allSettled([complete(p), complete(p, second)]),
          good = results.find((r) => r.status === 'fulfilled').value;
        assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
        assert.equal((await second.resolve(good.sessionSecret)).accountId, a.id);
        await assert.rejects(contexts.resolveBinding(p));
        await assert.rejects(complete(p));
        assert.equal((await lookup(good.sessionId)).remembered, false);
      }
    );
    await t.test(
      'remember and staff limits are server-bound; missing staff bootstrap denies even verified MFA',
      async () => {
        const a = await account(),
          p = await prepared(a, { rememberDevice: true }),
          remembered = await complete(p),
          r = await lookup(remembered.sessionId);
        assert.equal(+r.absolute_expires_at - +r.created_at, 2592000000);
        assert.equal(Number(r.idle_duration_ms), 604800000);
        const staff = await account();
        await database.query(
          `INSERT INTO ${s}.identity_role_memberships(account_id,role) VALUES($1,'admin')`,
          [staff.id]
        );
        const sp = await prepared(staff, { rememberDevice: true });
        await assert.rejects(complete(sp), { code: 'auth_mfa_required' });
        mfaQualified = true;
        await assert.rejects(complete(sp), { code: 'auth_mfa_required' });
        const qualified = new IdentitySessionService({
            ...options,
            staffBootstrapQualified: true,
          }),
          sr = await complete(sp, qualified);
        mfaQualified = false;
        const row = await lookup(sr.sessionId);
        assert.equal(row.remembered, false);
        assert.equal(+row.absolute_expires_at - +row.created_at, 43200000);
        await assert.rejects(complete(await prepared(a, { purpose: 'password_reset' })), {
          code: 'auth_service_unavailable',
        });
      }
    );
    await t.test(
      'read/list activity is inert, explicit activity is bounded, idle and absolute expiry deny',
      async () => {
        const a = await account(),
          result = await complete(await prepared(a)),
          before = await lookup(result.sessionId);
        clock.advance(3600000);
        await second.resolve(result.sessionSecret);
        await sessions.list(result.sessionSecret);
        assert.equal(+(await lookup(result.sessionId)).last_active_at, +before.last_active_at);
        await sessions.activity(result.sessionSecret);
        const touched = await lookup(result.sessionId);
        assert.equal(+touched.last_active_at, clock.now());
        clock.advance(86400001);
        await assert.rejects(second.resolve(result.sessionSecret));
        const absolute = await complete(await prepared(a, { rememberDevice: true }));
        clock.advance(2592000001);
        await assert.rejects(sessions.resolve(absolute.sessionSecret));
      }
    );
    await t.test(
      'activity crossing original idle expiry during the awaited SQL write rolls back extension',
      async () => {
        const a = await account(),
          result = await complete(await prepared(a)),
          original = await lookup(result.sessionId);
        clock.advance(+original.idle_expires_at - clock.now() - 1000);
        const delayedRepository = {
          bind(tx) { return repository.bind(tx); },
          transaction(work) {
            return repository.transaction((r, tx) =>
              work(
                {
                  ...r,
                  async touch(...args) {
                    await r.touch(...args);
                    clock.advance(2000);
                  },
                },
                tx
              )
            );
          },
        };
        const delayed = new IdentitySessionService({
          ...options,
          repository: delayedRepository,
        });
        await assert.rejects(delayed.activity(result.sessionSecret), {
          code: 'auth_session_expired',
        });
        const after = await lookup(result.sessionId);
        assert.equal(+after.idle_expires_at, +original.idle_expires_at);
        assert.equal(+after.last_active_at, +original.last_active_at);
        await assert.rejects(sessions.resolve(result.sessionSecret));
      }
    );
    await t.test(
      'caps evict deterministically and notify atomically; foreign list cursor and target disclose nothing',
      async () => {
        const a = await account(),
          issued = [];
        for (let n = 0; n < 9; n++) {
          issued.push(await complete(await prepared(a)));
          clock.advance(1);
        }
        const p1 = await prepared(a),
          p2 = await prepared(a);
        issued.push(...(await Promise.all([complete(p1), complete(p2, second)])));
        assert.ok((await lookup(issued[0].sessionId)).revoked_at);
        assert.equal(
          (
            await database.query(
              `SELECT count(*)::int AS n FROM ${s}.identity_notification_outbox WHERE purpose='security_notification'`
            )
          ).rows[0].n,
          1
        );
        const current = issued.at(-1),
          page = await sessions.list(current.sessionSecret, { limit: 2 });
        assert.equal(page.sessions.length, 2);
        assert.ok(page.nextCursor);
        assert.ok(!JSON.stringify(page).includes(current.sessionSecret));
        const other = await complete(await prepared(await account()));
        await assert.rejects(sessions.list(other.sessionSecret, { cursor: page.nextCursor }));
        await sessions.revoke({
          sessionProof: current.sessionSecret,
          browserProof: current.browserSecret,
          targetId: other.sessionId,
        });
        assert.ok(await second.resolve(other.sessionSecret));
        const failed = await prepared(a),
          before = (
            await database.query(
              `SELECT count(*)::int AS n FROM ${s}.identity_sessions WHERE account_id=$1 AND revoked_at IS NULL`,
              [a.id]
            )
          ).rows[0].n;
        const unavailable = new IdentitySessionService({
          ...options,
          deliveryService: {
            keyring: deliveryService.keyring,
            recipientKeys: deliveryService.recipientKeys,
            async enqueue() {
              throw new Error('Fixture outbox failure');
            },
          },
        });
        await assert.rejects(complete(failed, unavailable));
        assert.equal(
          (
            await database.query(
              `SELECT count(*)::int AS n FROM ${s}.identity_sessions WHERE account_id=$1 AND revoked_at IS NULL`,
              [a.id]
            )
          ).rows[0].n,
          before
        );
        assert.equal(
          (
            await database.query(`SELECT consumed FROM ${s}.fixture_session_proofs WHERE id=$1`, [
              failed.proofRef,
            ])
          ).rows[0].consumed,
          false
        );
      }
    );
    await t.test(
      'Origin/CSRF, logout retry tombstone, all-owner revocation and captured route errors',
      async () => {
        const a = await account(),
          first = await complete(await prepared(a)),
          other = await complete(await prepared(a));
        const cookieHeader = header(first),
          config = await facade.config(cookieHeader);
        const request = {
          cookieHeader,
          origin: 'http://127.0.0.1:3000',
          csrfToken: config.body.csrfToken,
        };
        await assert.rejects(facade.logout({ ...request, origin: 'https://attacker.invalid' }));
        await assert.rejects(facade.logout({ ...request, csrfToken: 'x' }));
        await facade.logout(request);
        await facade.logout(request);
        await assert.rejects(second.resolve(first.sessionSecret));
        assert.ok(await second.resolve(other.sessionSecret));
        const config2 = await facade.config(header(other));
        await facade.logout(
          {
            cookieHeader: header(other),
            origin: request.origin,
            csrfToken: config2.body.csrfToken,
          },
          { all: true }
        );
        await assert.rejects(sessions.resolve(other.sessionSecret));
        const routes = new Map(),
          app = Object.fromEntries(
            ['get', 'post', 'delete'].map((method) => [
              method,
              (path, handler) => routes.set(`${method} ${path}`, handler),
            ])
          );
        registerAuthRoutes(app, { identityApplicationService: facade });
        const headers = {},
          res = {
            status(n) {
              this.code = n;
              return this;
            },
            setHeader(k, v) {
              headers[k] = v;
            },
            json(body) {
              this.body = body;
            },
            end() {},
          };
        await routes.get('post /api/auth/logout')(
          {
            headers: { origin: 'http://127.0.0.1:3000' },
            body: { accountId: a.id },
          },
          res
        );
        assert.equal(res.code, 403);
        assert.equal(headers['Cache-Control'], 'no-store');
        assert.ok(!JSON.stringify(res.body).includes(a.id));
        await routes.get('get /api/auth/config')({ headers: {} }, res);
        assert.equal(res.code, 200);
        assert.ok(headers['Set-Cookie'][0].includes('HttpOnly'));
        assert.equal(res.body.methods.emailOtp, false);
      }
    );
    await t.test('fresh proof expiry and account version deny with atomic proof rollback', async () => {
      const a = await account(),
        p = await prepared(a);
      proofDelay = 300001;
      await assert.rejects(complete(p));
      proofDelay = 0;
      assert.equal(
        (await database.query(`SELECT consumed FROM ${s}.fixture_session_proofs WHERE id=$1`, [p.proofRef]))
          .rows[0].consumed,
        false
      );
      const p2 = await prepared(a);
      await identity.transaction((r) =>
        r.advanceSecurityVersion({
          accountId: a.id,
          expectedSecurityVersion: 1,
        })
      );
      await assert.rejects(complete(p2));
    });
    await t.test(
      'expiry during actual account lock wait rolls back proof and cannot mint a session',
      async () => {
        const a = await account(),
          p = await prepared(a);
        let release, ready;
        const gate = new Promise((resolve) => {
            release = resolve;
          }),
          locked = new Promise((resolve) => {
            ready = resolve;
          });
        const blocker = identity.transaction(async (r) => {
          await r.lockAccount(a.id, 1);
          ready();
          await gate;
        });
        await locked;
        const pending = assert.rejects(complete(p));
        let waiting = false;
        try {
          for (let n = 0; n < 50 && !waiting; n++) {
            waiting = (
              await database.query(
                `SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE $1) AS waiting`,
                [`%${schema}%identity_accounts%`]
              )
            ).rows[0].waiting;
            if (!waiting) await new Promise((resolve) => setTimeout(resolve, 10));
          }
          assert.equal(waiting, true);
          clock.advance(300001);
        } finally {
          release();
        }
        await blocker;
        await pending;
        assert.equal(
          (await database.query(`SELECT consumed FROM ${s}.fixture_session_proofs WHERE id=$1`, [p.proofRef]))
            .rows[0].consumed,
          false
        );
      }
    );
    await t.test(
      'concurrent cleanup skips locked browser and delayed context issuance fails after original expiry',
      async () => {
        const a = await account(),
          b = await contexts.bootstrap();
        let release, ready;
        const gate = new Promise((resolve) => {
            release = resolve;
          }),
          locked = new Promise((resolve) => {
            ready = resolve;
          });
        const blocker = contextRepository.transaction(async (r) => {
          await r.lockBrowser(b.browser.id);
          ready();
          await gate;
        });
        await locked;
        const pending = assert.rejects(
          contexts.issue({
            browserProof: b.secret,
            proposal: { email: a.email },
          })
        );
        let waiting = false;
        try {
          for (let n = 0; n < 50 && !waiting; n++) {
            waiting = (
              await database.query(
                `SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE $1) AS waiting`,
                [`%${schema}%identity_browsers%`]
              )
            ).rows[0].waiting;
            if (!waiting) await new Promise((resolve) => setTimeout(resolve, 10));
          }
          assert.equal(waiting, true);
          clock.advance(300001);
          await contexts.cleanup();
        } finally {
          release();
        }
        await blocker;
        await pending;
        await contexts.cleanup();
        assert.equal(
          (
            await database.query(
              `SELECT count(*)::int AS n FROM ${s}.identity_context_metadata WHERE browser_id=$1`,
              [b.browser.id]
            )
          ).rows[0].n,
          0
        );
      }
    );
    await t.test(
      'missing retained keys deny old proof and session; no account or remembered request override',
      async () => {
        const a = await account(),
          p = await prepared(a),
          result = await complete(p),
          next = await prepared(a);
        const changed = new IdentitySessionService({
          ...options,
          sessionKeys: { current: 2, keys: { 2: randomBytes(32) } },
        });
        await assert.rejects(changed.resolve(result.sessionSecret));
        const missing = new IdentityContextService({
          repository: contextRepository,
          browserKeys,
          csrfKeys,
          metadataKeys: { current: 2, keys: { 2: randomBytes(32) } },
          targetResolver,
          clock,
        });
        await assert.rejects(missing.resolveBinding(next));
        await assert.rejects(complete(next, sessions, { accountId: a.id, rememberDevice: true }));
        await assert.rejects(
          sessions.revoke({
            sessionProof: result.sessionSecret,
            browserProof: result.browserSecret,
            logout: true,
            all: true,
          })
        );
      }
    );
    await t.test(
      'eight metadata rows per browser and bounded expiry cleanup preserve historical context',
      async () => {
        const a = await account(),
          b = await contexts.bootstrap(),
          ids = [];
        for (let n = 0; n < 8; n++)
          ids.push(
            (
              await contexts.issue({
                browserProof: b.secret,
                proposal: { email: a.email },
              })
            ).contextId
          );
        await assert.rejects(
          contexts.issue({
            browserProof: b.secret,
            proposal: { email: a.email },
          }),
          {
            code: 'auth_service_unavailable',
          }
        );
        clock.advance(300001);
        const cleaned = await contexts.cleanup();
        assert.ok(cleaned.browsers <= 50);
        assert.equal(
          (
            await database.query(
              `SELECT count(*)::int AS n FROM ${s}.identity_contexts WHERE id=ANY($1::text[])`,
              [ids]
            )
          ).rows[0].n,
          8
        );
      }
    );
    await t.test('session Audit is atomic and unavailable Audit or peer cannot issue or revoke', async () => {
      const a = await account(),
        p = await prepared(a);
      await assert.rejects(complete(p, new IdentitySessionService({ ...options, auditService: null })), {
        code: 'auth_service_unavailable',
      });
      await assert.rejects(
        complete(
          p,
          new IdentitySessionService({
            ...options,
            peerProvider: () => undefined,
          })
        ),
        { code: 'auth_service_unavailable' }
      );
      auditFails = true;
      await assert.rejects(complete(p), /Fixture audit failure/);
      auditFails = false;
      assert.equal(
        (await database.query(`SELECT consumed FROM ${s}.fixture_session_proofs WHERE id=$1`, [p.proofRef]))
          .rows[0].consumed,
        false
      );
      const result = await complete(p);
      assert.equal(
        (
          await database.query(`SELECT account_id FROM ${s}.audit_security_events WHERE event_id=$1`, [
            `session_create_${result.sessionId}`,
          ])
        ).rows[0].account_id,
        a.id
      );
      auditFails = true;
      await assert.rejects(
        sessions.revoke({
          sessionProof: result.sessionSecret,
          browserProof: result.browserSecret,
          logout: true,
        }),
        /Fixture audit failure/
      );
      auditFails = false;
      assert.equal((await lookup(result.sessionId)).revoked_at, null);
      const revoke = {
        sessionProof: result.sessionSecret,
        browserProof: result.browserSecret,
        logout: true,
      };
      await sessions.revoke(revoke);
      await sessions.revoke(revoke);
      assert.equal(
        (
          await database.query(
            `SELECT count(*)::int AS n FROM ${s}.audit_security_events WHERE account_id=$1 AND action IN ('session_revoke','logout')`,
            [a.id]
          )
        ).rows[0].n,
        2
      );
    });
    await t.test(
      'real actor ignores mock selectors, preferences require minted current session and guests remain null',
      async () => {
        const a = await account(),
          result = await complete(await prepared(a));
        const middleware = createRealActorContextMiddleware({
          identityApplicationService: facade,
        });
        const req = {
          headers: {
            cookie: header(result),
            'x-mpf-user-id': 'admin',
            'x-forwarded-for': 'attacker.invalid',
          },
          query: { mpfUserId: 'admin', mpf_user_id: 'admin' },
          socket: { remoteAddress: '127.0.0.1' },
        };
        let called = false;
        await middleware(req, {}, () => {
          called = true;
          assert.equal(facade.requestPeer(), '127.0.0.1');
        });
        assert.equal(called, true);
        assert.equal(req.actorContext.username, a.id);
        assert.equal(req.actorContext.role, 'user');
        assert.equal(req.actorContext.isMockActor, false);
        assert.ok(!JSON.stringify(req.actorContext).includes(result.sessionSecret));
        assert.deepEqual(await facade.preferences(req.actorContext), {
          confirmCreditUsage: true,
        });
        assert.deepEqual(
          await facade.preferences(req.actorContext, {
            confirmCreditUsage: false,
          }),
          { confirmCreditUsage: false }
        );
        await assert.rejects(facade.preferences({ ...req.actorContext }, { confirmCreditUsage: true }));
        await assert.rejects(
          facade.preferences(req.actorContext, {
            confirmCreditUsage: 'false',
          })
        );
        assert.equal(await facade.resolveActor('', 'guest'), null);
        await identity.transaction((r) =>
          r.advanceSecurityVersion({
            accountId: a.id,
            expectedSecurityVersion: 1,
            status: 'disabled',
          })
        );
        await assert.rejects(facade.preferences(req.actorContext, { confirmCreditUsage: true }));
        await assert.rejects(facade.resolveActor(header(result), 'stale'));
      }
    );
    await t.test(
      'Admin status retains staff Audit actor, rollback and idempotency, reinstatement never restores old sessions',
      async () => {
        const admin = await account(),
          target = await account(),
          targetSession = await complete(await prepared(target));
        await database.query(
          `INSERT INTO ${s}.identity_role_memberships(account_id,role) VALUES($1,'admin')`,
          [admin.id]
        );
        const qualified = new IdentitySessionService({
          ...options,
          staffBootstrapQualified: true,
        });
        mfaQualified = true;
        const adminSession = await complete(await prepared(admin), qualified);
        mfaQualified = false;
        const adminFacade = new IdentityApplicationService({
          contexts,
          sessions: qualified,
          cookies,
          publicPolicy: new IdentityPublicPolicyService(),
          identityRepository: identity,
        });
        const actor = await adminFacade.resolveActor(header(adminSession), 'admin_request');
        await assert.rejects(facade.resolveActor(header(adminSession), 'unqualified'), {
          code: 'auth_mfa_required',
        });
        await assert.rejects(sessions.list(adminSession.sessionSecret), { code: 'auth_mfa_required' });
        await assert.rejects(sessions.activity(adminSession.sessionSecret), { code: 'auth_mfa_required' });
        await assert.rejects(sessions.revoke({
          sessionProof: adminSession.sessionSecret, browserProof: adminSession.browserSecret, all: true,
        }), { code: 'auth_mfa_required' });
        assert.equal((await lookup(adminSession.sessionId)).revoked_at, null);
        const input = {
          userId: target.id,
          status: 'suspended',
          expectedStatus: 'active',
          reason: 'Fixture private reason',
          idempotencyKey: randomUUID(),
        };
        auditFails = true;
        await assert.rejects(adminFacade.changeStatus(input, actor), /Fixture audit failure/);
        auditFails = false;
        assert.equal((await identity.findAccount(target.id)).securityVersion, 1);
        assert.equal((await lookup(targetSession.sessionId)).revoked_at, null);
        const result = await adminFacade.changeStatus(input, actor);
        assert.equal(result.user.securityVersion, 2);
        assert.equal((await adminFacade.changeStatus(input, actor)).duplicate, true);
        await assert.rejects(adminFacade.changeStatus({ ...input, status: 'disabled' }, actor));
        await assert.rejects(
          adminFacade.changeStatus({ ...input, userId: admin.id, idempotencyKey: randomUUID() }, actor)
        );
        const events = (
          await database.query(
            `SELECT * FROM ${s}.audit_security_events WHERE account_id=$1 AND action='account_status'`,
            [admin.id]
          )
        ).rows;
        assert.equal(events.length, 1);
        assert.ok(!JSON.stringify(events).includes(target.id));
        assert.ok(!JSON.stringify(events).includes(input.reason));
        await assert.rejects(sessions.resolve(targetSession.sessionSecret));
        await adminFacade.changeStatus(
          {
            ...input,
            status: 'active',
            expectedStatus: 'suspended',
            idempotencyKey: randomUUID(),
          },
          actor
        );
        await assert.rejects(sessions.resolve(targetSession.sessionSecret));
        assert.equal(
          (await sessions.resolve((await complete(await prepared(target))).sessionSecret)).securityVersion,
          3
        );
        const ordinary = await facade.resolveActor(
          header(await complete(await prepared(await account()))),
          'ordinary'
        );
        await assert.rejects(facade.changeStatus({ ...input, idempotencyKey: randomUUID() }, ordinary), {
          code: 'auth_forbidden',
        });
        await identity.transaction((r) => r.advanceSecurityVersion({
          accountId: target.id,
          expectedSecurityVersion: 3,
          status: 'closed',
        }));
        for (const status of ['active', 'suspended', 'disabled']) {
          await assert.rejects(adminFacade.changeStatus({
            ...input, status, expectedStatus: 'closed', idempotencyKey: randomUUID(),
          }, actor), { code: 'auth_forbidden' });
        }
        assert.equal((await identity.findAccount(target.id)).status, 'closed');
        assert.equal((await identity.findAccount(target.id)).securityVersion, 4);
      }
    );
    await t.test(
      'browser capacity counts retained rows and explicit cleanup removes only fifty',
      async () => {
        const retained = (await database.query(`SELECT count(*)::int AS n FROM ${s}.identity_browsers`))
          .rows[0].n;
        await database.query(
          `INSERT INTO ${s}.identity_browsers(id,digest,key_version,created_at,expires_at) SELECT 'capacity_'||i,md5(i::text)||md5('fixture_'||i),1,$1,$1::timestamptz+interval '5 minutes' FROM generate_series(1,$2::int) i`,
          [now(), 10000 - retained]
        );
        await assert.rejects(contexts.bootstrap(), {
          code: 'auth_service_unavailable',
        });
        clock.advance(300001);
        const cleaned = await contexts.cleanup();
        assert.equal(cleaned.browsers, 50);
        assert.equal(
          (await database.query(`SELECT count(*)::int AS n FROM ${s}.identity_browsers`)).rows[0].n,
          9950
        );
      }
    );
  });
});
