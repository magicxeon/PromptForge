import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { withDisposableAuthDatabase, createFakeClock } from './fixtures.mjs';
import { runMigrations } from '../../server/repositories/postgres/migrations.js';
import { securityAuditMigrations } from '../../server/repositories/audit/securityAuditMigrations.js';
import { PostgresSecurityAuditRepository } from '../../server/repositories/audit/PostgresSecurityAuditRepository.js';
import { AuditService } from '../../server/domain/audit/AuditService.js';
import { PostgresIdentityRepository } from '../../server/repositories/identity/PostgresIdentityRepository.js';
import { PostgresIdentityContextRepository } from '../../server/repositories/identity/PostgresIdentityContextRepository.js';
import { PostgresIdentitySessionRepository } from '../../server/repositories/identity/PostgresIdentitySessionRepository.js';
import { PostgresIdentityActionRepository } from '../../server/repositories/identity/PostgresIdentityActionRepository.js';
import { PostgresIdentityOperationRepository } from '../../server/repositories/identity/PostgresIdentityOperationRepository.js';
import { IdentityContextService } from '../../server/domain/identity/IdentityContextService.js';
import { IdentitySessionService } from '../../server/domain/identity/IdentitySessionService.js';
import { IdentityActionService } from '../../server/domain/identity/IdentityActionService.js';
import { IdentityOperationService } from '../../server/domain/identity/IdentityOperationService.js';
import { IdentityApplicationService } from '../../server/domain/identity/IdentityApplicationService.js';
import { IdentityCookies } from '../../server/domain/identity/adapters/identityCookies.js';
import { IdentityPublicPolicyService } from '../../server/domain/identity/IdentityPublicPolicyService.js';
import { registerAuthRoutes } from '../../server/app/routes/authRoutes.js';

test('action-bound durable assurance, atomic operations and minimal reconciliation', async (t) => {
  await withDisposableAuthDatabase(process.env, async ({ database, schema }) => {
    const s = `"${schema}"`,
      clock = createFakeClock(Date.now()),
      now = () => new Date(clock.now()),
      options = { database, schema },
      ring = () => ({ current: 1, keys: { 1: randomBytes(32) } });
    const migrations = [];
    for (const name of [
      'identityMigrations',
      'identityOperationMigrations',
      'identityChallengeMigrations',
      'identityEmailDeliveryMigrations',
      'identitySessionMigrations',
      'identityActorMigrations',
      'identityEnrollmentMigrations',
      'identityPrimaryMigrations',
      'identityOtpLoginMigrations',
      'identityActionMigrations',
    ]) {
      const m = await import(`../../server/repositories/identity/${name}.js`);
      migrations.push(...m[name](schema));
    }
    migrations.push(...securityAuditMigrations(schema));
    await runMigrations(
      database,
      migrations.sort((a, b) => a.id.localeCompare(b.id)),
      { mode: 'apply', schema }
    );
    await database.query(
      `CREATE TABLE ${s}.fixture_method_proofs(id text PRIMARY KEY,context_id text NOT NULL REFERENCES ${s}.identity_contexts(id),method text NOT NULL DEFAULT 'password',assurance text NOT NULL DEFAULT 'single_factor',qualified boolean NOT NULL DEFAULT false,consumed boolean NOT NULL DEFAULT false)`
    );
    const identity = new PostgresIdentityRepository(options),
      actionRepository = new PostgresIdentityActionRepository(options),
      operationRepository = new PostgresIdentityOperationRepository(options),
      sessionRepository = new PostgresIdentitySessionRepository(options);
    let actions,
      auditFails = false,
      handlerFails = false,
      handlerDelay = 0,
      verifierDelay = 0,
      proofLifetime = 300000;
    const contexts = new IdentityContextService({
      repository: new PostgresIdentityContextRepository(options),
      browserKeys: ring(),
      csrfKeys: ring(),
      metadataKeys: ring(),
      clock,
      targetResolver: async (proposal, { transaction }) => {
        const id = proposal.actor?.accountId ?? proposal.accountId,
          db = transaction ?? database,
          a = (await db.query(`SELECT security_version FROM ${s}.identity_accounts WHERE id=$1`, [id]))
            .rows[0],
          e = (
            await db.query(`SELECT canonical_email FROM ${s}.identity_email_bindings WHERE account_id=$1`, [
              id,
            ])
          ).rows[0];
        if (proposal.target && proposal.target !== id) throw new Error('Foreign fixture target');
        return {
          purpose: proposal.purpose,
          targetId: id,
          accountId: id,
          securityVersion: a.security_version,
          canonicalEmail: e.canonical_email,
          deliveryEmail: e.canonical_email,
          returnPath: '/',
          ...(proposal.action
            ? { action: { name: proposal.action, target: id, sessionId: proposal.actor?.sessionId ?? null } }
            : {}),
        };
      },
    });
    const realAudit = new AuditService({
      securityRepository: new PostgresSecurityAuditRepository({ schema }),
      securityFingerprintKey: randomBytes(32),
      securityFingerprintKeyVersion: 1,
    });
    const auditService = {
      async recordSecurityEvent(...args) {
        if (auditFails) throw new Error('Fixture Audit failure');
        return realAudit.recordSecurityEvent(...args);
      },
    };
    const consumeProof = async (tx, proofRef, context) => {
      const row = (
        await tx.query(`SELECT * FROM ${s}.fixture_method_proofs WHERE id=$1 FOR UPDATE`, [proofRef])
      ).rows[0];
      if (!row || row.consumed || row.context_id !== context.id)
        throw new Error('Fixture durable proof unavailable');
      await tx.query(`UPDATE ${s}.fixture_method_proofs SET consumed=true WHERE id=$1`, [proofRef]);
      return row;
    };
    const sessions = new IdentitySessionService({
      repository: sessionRepository,
      contexts,
      sessionKeys: ring(),
      clock,
      auditService,
      peerProvider: () => '127.0.0.1',
      verifyAuthentication: async ({ transaction, proofRef, context }) => {
        await consumeProof(transaction, proofRef, context);
        return {
          proofRef,
          contextId: context.id,
          accountId: context.account_id,
          securityVersion: context.security_version,
          method: 'password',
          assurance: 'single_factor',
        };
      },
    });
    const handler = async ({ input, identity: bound }) => {
      await bound.advanceSecurityVersion({
        accountId: input.accountId,
        expectedSecurityVersion: input.securityVersion,
      });
      clock.advance(handlerDelay);
      if (handlerFails) throw new Error('Fixture handler failure');
      return {
        nextAction: 'sign_in',
        accountId: input.accountId,
        audit: { action: input.action, targetAccountId: input.accountId, targetFingerprint: 'a'.repeat(64) },
      };
    };
    const operations = new IdentityOperationService({
      repository: operationRepository,
      identityRepository: identity,
      auditService,
      fingerprintKeys: ring(),
      receiptKeys: ring(),
      clock,
      verifyProof: (p) => actions.verifyOperation(p),
      handlers: { password_change: handler, password_reset: handler },
    });
    const verifyMethod = async ({ transaction, proofRef, context, metadata }) => {
      const p = await consumeProof(transaction, proofRef, context),
        verifiedAt = now();
      clock.advance(verifierDelay);
      return {
        proofRef,
        contextId: context.id,
        accountId: context.account_id,
        securityVersion: context.security_version,
        action: metadata.action.name,
        target: metadata.action.target,
        method: p.method,
        assurance: p.assurance,
        mfaQualified: p.qualified,
        verifiedAt,
        expiresAt: new Date(Math.min(+context.expires_at, +verifiedAt + proofLifetime)),
      };
    };
    actions = new IdentityActionService({
      repository: actionRepository,
      contexts,
      sessions,
      operations,
      verifyMethod,
      fixtureOnly: true,
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
      actions,
      publicPolicy: new IdentityPublicPolicyService(),
    });
    const addProof = async (contextId) => {
      const id = randomUUID();
      await database.query(`INSERT INTO ${s}.fixture_method_proofs(id,context_id) VALUES($1,$2)`, [
        id,
        contextId,
      ]);
      return id;
    };
    async function account(password = true) {
      const id = randomUUID(),
        email = `${id}@example.invalid`;
      await identity.transaction(async (r) => {
        await r.createAccount({ id, status: 'active', displayName: 'Action fixture' });
        await r.addEmailBinding({
          id,
          accountId: id,
          canonicalEmail: email,
          deliveryEmail: email,
          verifiedAt: now(),
        });
      });
      if (password)
        await database.query(
          `INSERT INTO ${s}.identity_password_credentials(account_id,protected_hash,algorithm,version) VALUES($1,'fixture-existing-credential','argon2id',1)`,
          [id]
        );
      return { id, email };
    }
    async function fixture() {
      const a = await account(),
        b = await contexts.bootstrap(),
        flow = await contexts.issue({
          browserProof: b.secret,
          proposal: { purpose: 'login', accountId: a.id },
        }),
        proofRef = await addProof(flow.contextId);
      const session = await sessionRepository.transaction((_, tx) =>
        sessions.finishVerifiedAuthentication(tx, {
          proofRef,
          contextProof: flow.contextProof,
          browserProof: b.secret,
        })
      );
      const base = { sessionProof: session.sessionSecret, browserProof: session.browserSecret };
      const action = await actions.issue(base, { action: 'password_change', target: a.id });
      return {
        a,
        session,
        flow: action,
        proofs: { ...base, contextProof: action.contextProof },
        proofRef: await addProof(action.contextId),
        input: {
          action: 'password_change',
          target: a.id,
          key: randomUUID(),
          payload: { fixtureValue: 'same-final-payload' },
        },
      };
    }
    const grant = (f) => actions.grant(f.proofs, f.proofRef),
      prepare = (f) => actions.prepare(f.proofs, f.input),
      commit = (f, p) => actions.commit(f.proofs, { ...f.input, operationId: p.operationId });
    const metadata = async (f) =>
      (
        await database.query(`SELECT * FROM ${s}.identity_context_metadata WHERE context_id=$1`, [
          f.flow.contextId,
        ])
      ).rows[0];
    await t.test(
      'grant, prepare and exact commit consume once; revoked session retains only minimal receipt',
      async () => {
        const f = await fixture();
        await grant(f);
        const p = await prepare(f);
        assert.equal((await metadata(f)).assurance_consumed_at, null);
        assert.equal((await actions.lookup(f.proofs, p.operationId)).status, 'pending');
        assert.equal((await commit(f, p)).status, 'succeeded');
        assert.ok((await metadata(f)).assurance_consumed_at);
        await assert.rejects(sessions.resolve(f.proofs.sessionProof));
        const result = await actions.lookup(f.proofs, p.operationId, p.receiptSecret);
        assert.deepEqual(result, {
          contractVersion: 1,
          operationId: p.operationId,
          status: 'succeeded',
          nextAction: 'sign_in',
        });
        await assert.rejects(commit(f, p));
        await assert.rejects(sessions.resolve(p.receiptSecret));
        const browser = await contexts.browser(f.proofs.browserProof);
        await contexts.repository.transaction((r) => r.logoutBrowser(browser.id, now()));
        await assert.rejects(actions.lookup(f.proofs, p.operationId, p.receiptSecret));
      }
    );
    await t.test(
      'foreign target/browser/session/proof and changed final payload cannot authorize',
      async () => {
        const f = await fixture(),
          other = await fixture();
        await assert.rejects(actions.grant(f.proofs, other.proofRef));
        await grant(f);
        const p = await prepare(f);
        await assert.rejects(actions.prepare(f.proofs, { ...f.input, target: other.a.id }));
        await assert.rejects(
          actions.commit(f.proofs, { ...f.input, payload: { changed: true }, operationId: p.operationId })
        );
        await assert.rejects(
          actions.prepare({ ...f.proofs, sessionProof: other.proofs.sessionProof }, f.input)
        );
        await assert.rejects(actions.lookup(other.proofs, p.operationId, p.receiptSecret));
        assert.equal((await metadata(f)).assurance_consumed_at, null);
      }
    );
    await t.test(
      'grant Audit and mutation failures roll back proof consumption and allow bounded retry',
      async () => {
        const f = await fixture();
        auditFails = true;
        await assert.rejects(grant(f));
        auditFails = false;
        assert.equal((await metadata(f)).assurance_proof_ref, null);
        await grant(f);
        const p = await prepare(f);
        handlerFails = true;
        await assert.rejects(commit(f, p));
        handlerFails = false;
        assert.equal((await metadata(f)).assurance_consumed_at, null);
        assert.equal((await identity.findAccount(f.a.id)).securityVersion, 1);
        auditFails = true;
        await assert.rejects(commit(f, p));
        auditFails = false;
        assert.equal((await metadata(f)).assurance_consumed_at, null);
        assert.equal((await commit(f, p)).status, 'succeeded');
      }
    );
    await t.test(
      'concurrent commits have one winner and receipt replacements retain first expiry',
      async () => {
        const f = await fixture();
        await grant(f);
        const p = await prepare(f),
          second = await prepare(f),
          third = await prepare(f);
        assert.equal(+p.expiresAt, +third.expiresAt);
        await assert.rejects(prepare(f));
        await assert.rejects(actions.lookup(f.proofs, p.operationId, second.receiptSecret));
        const outcomes = await Promise.allSettled([commit(f, third), commit(f, third)]);
        assert.equal(outcomes.filter((r) => r.status === 'fulfilled').length, 1);
        assert.equal(
          (await actions.lookup(f.proofs, p.operationId, third.receiptSecret)).status,
          'succeeded'
        );
      }
    );
    await t.test('reset requires actual existing credential and never grants a normal session', async () => {
      for (const hasPassword of [false, true]) {
        const a = await account(hasPassword),
          b = await contexts.bootstrap(),
          flow = await contexts.issue({
            browserProof: b.secret,
            proposal: { purpose: 'password_reset', accountId: a.id, action: 'password_reset', target: a.id },
          }),
          proofRef = await addProof(flow.contextId),
          proofs = { contextProof: flow.contextProof, browserProof: b.secret };
        if (!hasPassword) await assert.rejects(actions.grant(proofs, proofRef));
        else {
          await actions.grant(proofs, proofRef);
          const input = {
              action: 'password_reset',
              target: a.id,
              key: randomUUID(),
              payload: { fixture: true },
            },
            p = await actions.prepare(proofs, input);
          assert.equal(
            (await actions.commit(proofs, { ...input, operationId: p.operationId })).status,
            'succeeded'
          );
          await assert.rejects(sessions.resolve(flow.contextProof));
        }
      }
    });
    await t.test('strong proof qualification and original session expiry cannot be bypassed', async () => {
      const f = await fixture();
      await database.query(`UPDATE ${s}.fixture_method_proofs SET assurance='mfa',method='mfa' WHERE id=$1`, [
        f.proofRef,
      ]);
      await assert.rejects(grant(f));
      await database.query(`UPDATE ${s}.fixture_method_proofs SET qualified=true WHERE id=$1`, [f.proofRef]);
      await grant(f);
      const g = await fixture();
      await database.query(`UPDATE ${s}.identity_sessions SET revoked_at=$2 WHERE id=$1`, [
        g.session.sessionId,
        now(),
      ]);
      await assert.rejects(grant(g));
    });
    await t.test('expiry during proof verification and mutation rolls back at fresh boundaries', async () => {
      const f = await fixture();
      verifierDelay = 300001;
      await assert.rejects(grant(f));
      verifierDelay = 0;
      assert.equal((await metadata(f)).assurance_proof_ref, null);
      const g = await fixture();
      proofLifetime = 1000;
      await grant(g);
      proofLifetime = 300000;
      const p = await prepare(g);
      handlerDelay = 1001;
      await assert.rejects(commit(g, p));
      handlerDelay = 0;
      assert.equal((await identity.findAccount(g.a.id)).securityVersion, 1);
      assert.equal((await metadata(g)).assurance_consumed_at, null);
    });
    await t.test(
      'required MFA denies weak reset proof and permits only qualified stronger evidence',
      async () => {
        const a = await account(),
          b = await contexts.bootstrap();
        await database.query(
          `INSERT INTO ${s}.identity_mfa_factors(id,account_id,protected_secret,key_version,confirmed_at,security_version) VALUES($1,$2,'fixture-only',1,$3,1)`,
          [randomUUID(), a.id, now()]
        );
        const flow = await contexts.issue({
            browserProof: b.secret,
            proposal: { purpose: 'password_reset', accountId: a.id, action: 'password_reset', target: a.id },
          }),
          proofRef = await addProof(flow.contextId),
          proofs = { contextProof: flow.contextProof, browserProof: b.secret };
        await assert.rejects(actions.grant(proofs, proofRef));
        await database.query(
          `UPDATE ${s}.fixture_method_proofs SET method='mfa',assurance='mfa',qualified=true WHERE id=$1`,
          [proofRef]
        );
        assert.equal((await actions.grant(proofs, proofRef)).nextAction, 'reauthenticated');
      }
    );
    await t.test('SQL action/target and granted proof remain immutable', async () => {
      const f = await fixture();
      await grant(f);
      await assert.rejects(
        database.query(
          `UPDATE ${s}.identity_context_metadata SET action_target='foreign' WHERE context_id=$1`,
          [f.flow.contextId]
        )
      );
      await assert.rejects(
        database.query(
          `UPDATE ${s}.identity_context_metadata SET assurance_verified_at=assurance_verified_at+interval '1 second' WHERE context_id=$1`,
          [f.flow.contextId]
        )
      );
      await assert.rejects(grant(f));
    });
    await t.test('initiating session original idle expiry bounds a delayed mutation', async () => {
      const f = await fixture();
      clock.advance(86400000 - 1000);
      const b = await contexts.bootstrap(),
        base = { sessionProof: f.proofs.sessionProof, browserProof: b.secret },
        flow = await actions.issue(base, { action: 'password_change', target: f.a.id });
      const g = {
        ...f,
        flow,
        proofs: { ...base, contextProof: flow.contextProof },
        proofRef: await addProof(flow.contextId),
      };
      await grant(g);
      const p = await prepare(g);
      handlerDelay = 1001;
      await assert.rejects(commit(g, p));
      handlerDelay = 0;
      assert.equal((await identity.findAccount(f.a.id)).securityVersion, 1);
    });
    await t.test(
      'captured HTTP prepare exposes handle with separate HttpOnly receipt, lookup is minimal',
      async () => {
        const f = await fixture();
        await grant(f);
        const browser = await contexts.browser(f.proofs.browserProof),
          scope = await sessions.scope(f.proofs.sessionProof),
          csrf = contexts.csrf(browser, scope),
          cookieHeader = `${cookies.names.session}=${f.proofs.sessionProof}; ${cookies.names.browser}=${f.proofs.browserProof}; ${cookies.names.flow}=${f.proofs.contextProof}`;
        const request = { cookieHeader, origin: 'http://127.0.0.1:3000', csrfToken: csrf };
        const p = await facade.prepareOperation(
          request,
          { action: f.input.action, target: f.input.target, payload: f.input.payload },
          f.input.key
        );
        assert.ok(p.cookies[0].includes('HttpOnly'));
        assert.equal(p.body.receiptSecret, undefined);
        const receipt = p.cookies[0].split(';')[0],
          lookup = await facade.lookupOperation(`${cookieHeader}; ${receipt}`, p.body.operationId);
        assert.equal(lookup.body.status, 'pending');
        assert.deepEqual(Object.keys(lookup.body).sort(), [
          'contractVersion',
          'nextAction',
          'operationId',
          'status',
        ]);
        const registered = [];
        registerAuthRoutes(
          {
            get: (p) => registered.push(p),
            post: (p) => registered.push(p),
            delete: (p) => registered.push(p),
          },
          { identityApplicationService: facade }
        );
        assert.ok(registered.includes('/api/auth/operations/:id'));
        assert.ok(registered.includes('/api/auth/reauthentication'));
        assert.equal(cookies.clear().length, 4);
      }
    );
  });
});
