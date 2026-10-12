import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { withDisposableAuthDatabase, createFakeClock, createFakeMail } from './fixtures.mjs';
import { runMigrations } from '../../server/repositories/postgres/migrations.js';
import { identityMigrations } from '../../server/repositories/identity/identityMigrations.js';
import { securityAuditMigrations } from '../../server/repositories/audit/securityAuditMigrations.js';
import { identityOperationMigrations } from '../../server/repositories/identity/identityOperationMigrations.js';
import { identityChallengeMigrations } from '../../server/repositories/identity/identityChallengeMigrations.js';
import { identityEmailDeliveryMigrations } from '../../server/repositories/identity/identityEmailDeliveryMigrations.js';
import { PostgresIdentityEmailEventRepository } from '../../server/repositories/identity/PostgresIdentityEmailEventRepository.js';
import { PostgresIdentityRepository } from '../../server/repositories/identity/PostgresIdentityRepository.js';
import { PostgresIdentityOperationRepository } from '../../server/repositories/identity/PostgresIdentityOperationRepository.js';
import { PostgresIdentityChallengeRepository } from '../../server/repositories/identity/PostgresIdentityChallengeRepository.js';
import { IdentityChallengeService } from '../../server/domain/identity/IdentityChallengeService.js';
import { IdentityDeliveryService } from '../../server/domain/identity/IdentityDeliveryService.js';
import { IdentityEmailEventService } from '../../server/domain/identity/IdentityEmailEventService.js';
import { challengeContextPurposes, challengeNextActions } from '../../server/config/authPolicy.js';

test('purpose-bound fixture challenges and durable shared admission', async (t) => {
  await withDisposableAuthDatabase(process.env, async ({ database, schema }) => {
    const s = `"${schema}"`;
    const migrations = [
      ...identityMigrations(schema),
      ...securityAuditMigrations(schema),
      ...identityOperationMigrations(schema),
      ...identityChallengeMigrations(schema),
      ...identityEmailDeliveryMigrations(schema),
    ];
    await runMigrations(database, migrations, { mode: 'apply', schema });
    const clock = createFakeClock(Date.now()),
      now = () => new Date(clock.now());
    const repository = new PostgresIdentityChallengeRepository({ database, schema });
    const operationRepository = new PostgresIdentityOperationRepository({ database, schema });
    const identityRepository = new PostgresIdentityRepository({ database, schema });
    const ring = () => ({ current: 1, keys: { 1: randomBytes(32) } });
    const otpKeys = ring(),
      targetKeys = ring(),
      rateKeys = ring(),
      operationKeys = ring(),
      receiptKeys = ring(),
      deliveryKeys = ring(),
      recipientKeys = ring();
    const eventRepository = new PostgresIdentityEmailEventRepository({ database, schema });
    const mail = createFakeMail();
    const deliveryService = new IdentityDeliveryService({
      repository: operationRepository,
      keyring: deliveryKeys,
      recipientKeys,
      eventRepository,
      adapter: mail,
      clock,
      fixtureOnly: true,
    });
    const bindings = new Map();
    let sequence = 0,
      handlerThrows = false,
      handlerDelay = 0,
      wrongResult = false,
      proofThrows = false,
      forgeBrowser = false;
    const resolveBinding = async ({ contextProof, browserProof }) => {
      if (proofThrows) throw new Error('Sensitive resolver detail must not escape.');
      const binding = bindings.get(contextProof);
      if (!binding || binding.browserProof !== browserProof) return null;
      return { ...binding, browserDigest: forgeBrowser ? 'f'.repeat(64) : binding.browserDigest };
    };
    const handlers = Object.fromEntries(
      Object.keys(challengeContextPurposes).map((purpose) => [
        purpose,
        async ({ challengeId, identity }) => {
          await identity.createAccount({
            id: `effect_${challengeId}`,
            status: 'active',
            displayName: 'Fixture effect',
          });
          clock.advance(handlerDelay);
          if (handlerThrows) throw new Error('Sensitive handler detail must not escape.');
          return { nextAction: wrongResult ? 'authenticate' : challengeNextActions[purpose][0] };
        },
      ])
    );
    const options = {
      repository,
      operationRepository,
      identityRepository,
      deliveryService,
      resolveBinding,
      handlers,
      otpKeys,
      targetKeys,
      rateKeys,
      operationKeys,
      receiptKeys,
      clock,
    };
    const service = new IdentityChallengeService(options);
    const second = new IdentityChallengeService({
      ...options,
      repository: new PostgresIdentityChallengeRepository({ database, schema }),
    });
    const resetWindow = () => clock.advance(86400001);
    async function binding({ email, accountId, purpose = 'login', targetId } = {}) {
      const n = ++sequence;
      const owner = accountId === null ? null : (accountId ?? `challenge_account_${n}`);
      if (owner && !(await identityRepository.findAccount(owner)))
        await identityRepository.transaction((r) =>
          r.createAccount({ id: owner, status: 'active', displayName: 'Fixture' })
        );
      const contextId = `challenge_context_${n}`,
        browserDigest = n.toString(16).padStart(64, '0');
      const b = {
        contextId,
        accountId: owner,
        securityVersion: owner ? 1 : null,
        purpose,
        targetId: targetId ?? owner ?? 'mailbox',
        browserDigest,
        canonicalEmail: email ?? `fixture${n}@example.invalid`,
        deliveryEmail: email ?? `fixture${n}@example.invalid`,
        browserProof: `browser-proof-${n}`,
      };
      await database.query(
        `INSERT INTO ${s}.identity_contexts(id,account_id,purpose,digest,key_version,browser_digest,security_version,target_binding,created_at,expires_at)
        VALUES($1,$2,$3,$4,1,$4,$5,$6,$7,$8)`,
        [
          contextId,
          owner,
          challengeContextPurposes[purpose],
          browserDigest,
          b.securityVersion,
          b.targetId,
          now(),
          new Date(clock.now() + 300000),
        ]
      );
      bindings.set(contextId, b);
      return b;
    }
    const input = (b) => ({
      contextProof: b.contextId,
      browserProof: b.browserProof,
      purpose: b.purpose,
      email: b.canonicalEmail,
      key: `issue_key_${b.contextId}`,
      sourceAddress: '127.0.0.1',
    });
    async function issue(b, instance = service) {
      return instance.issue(input(b));
    }
    async function code(challengeId) {
      await deliveryService.process();
      const row = (
        await database.query(
          `SELECT d.id FROM ${s}.identity_notification_outbox d JOIN ${s}.identity_challenges c ON c.issue_operation_id=d.operation_id WHERE c.id=$1`,
          [challengeId]
        )
      ).rows[0];
      return mail.messages().find((message) => message.id === row.id)?.code;
    }
    const verify = (b, p, value, instance = service) =>
      instance.verify({ ...input(b), challengeId: p.challengeId, code: value });
    const row = async (id) =>
      (await database.query(`SELECT * FROM ${s}.identity_challenges WHERE id=$1`, [id])).rows[0];
    const rateCount = async (purpose) =>
      (
        await database.query(
          `SELECT COALESCE(sum(count),0)::int AS n FROM ${s}.identity_rate_buckets WHERE purpose=$1 AND expires_at>$2`,
          [purpose, now()]
        )
      ).rows[0].n;

    await t.test(
      'issue and encrypted outbox are atomic; replay has no additional charge or plaintext result',
      async () => {
        const b = await binding(),
          p = await issue(b);
        assert.deepEqual(Object.keys(p).sort(), ['challengeId', 'expiresAt', 'resendAt']);
        const replay = await issue(b, second);
        assert.deepEqual(replay, p);
        assert.equal(await rateCount('send_global_hour'), 1);
        assert.equal(
          (
            await database.query(
              `SELECT count(*)::int AS n FROM ${s}.identity_notification_outbox WHERE challenge_id=$1`,
              [p.challengeId]
            )
          ).rows[0].n,
          1
        );
        const value = await code(p.challengeId);
        assert.match(value, /^\d{6}$/);
        assert.match((await row(p.challengeId)).digest, /^[a-f0-9]{64}$/);
        assert.notEqual((await row(p.challengeId)).digest, value);
        await assert.rejects(service.issue({ ...input(b), email: 'other@example.invalid' }), {
          code: 'IDENTITY_CHALLENGE_UNAVAILABLE',
        });
      }
    );
    await t.test(
      'pending or failed delivery cannot verify, then concurrent cross-instance consumption has one winner',
      async () => {
        resetWindow();
        const b = await binding(),
          p = await issue(b);
        await assert.rejects(verify(b, p, '000000'), { code: 'IDENTITY_CHALLENGE_UNAVAILABLE' });
        assert.equal((await row(p.challengeId)).attempts, 0);
        const value = await code(p.challengeId);
        const result = await Promise.allSettled([verify(b, p, value), verify(b, p, value, second)]);
        assert.equal(result.filter((r) => r.status === 'fulfilled').length, 1);
        assert.equal((await row(p.challengeId)).status, 'consumed');
        assert.ok(await identityRepository.findAccount(`effect_${p.challengeId}`));
        const failed = await binding(),
          fp = await issue(failed);
        await database.query(`UPDATE ${s}.identity_challenges SET delivery_status='failed' WHERE id=$1`, [
          fp.challengeId,
        ]);
        await assert.rejects(verify(failed, fp, '000000'), { code: 'IDENTITY_CHALLENGE_UNAVAILABLE' });
      }
    );
    await t.test(
      'foreign, malformed and wrong-purpose proof charges source only, including throwing resolver',
      async () => {
        resetWindow();
        const b = await binding(),
          p = await issue(b),
          value = await code(p.challengeId);
        for (const change of [
          { browserProof: 'foreign' },
          { challengeId: 'unknown' },
          { purpose: 'registration' },
          { code: 'x' },
        ]) {
          await assert.rejects(
            service.verify({ ...input(b), challengeId: p.challengeId, code: value, ...change })
          );
        }
        proofThrows = true;
        try {
          await assert.rejects(verify(b, p, value), (error) => !error.stack.includes('Sensitive resolver'));
        } finally {
          proofThrows = false;
        }
        forgeBrowser = true;
        try {
          await assert.rejects(verify(b, p, value));
        } finally {
          forgeBrowser = false;
        }
        assert.equal(await rateCount('verify_source_short'), 6);
        assert.equal(await rateCount('verify_target_short'), 0);
        assert.equal((await row(p.challengeId)).attempts, 0);
      }
    );
    await t.test(
      'five failures persist; new contexts and resend cannot reset target verification budget',
      async () => {
        resetWindow();
        const b = await binding(),
          p = await issue(b),
          value = await code(p.challengeId),
          wrong = value === '000000' ? '000001' : '000000';
        for (let n = 0; n < 5; n++) await assert.rejects(verify(b, p, wrong));
        assert.equal((await row(p.challengeId)).status, 'locked');
        assert.equal((await row(p.challengeId)).attempts, 5);
        clock.advance(60000);
        const next = await binding({ email: b.canonicalEmail, accountId: b.accountId }),
          np = await issue(next),
          nv = await code(np.challengeId);
        for (let n = 0; n < 5; n++)
          await assert.rejects(verify(next, np, nv === '000000' ? '000001' : '000000'));
        clock.advance(60000);
        const third = await binding({ email: b.canonicalEmail, accountId: b.accountId }),
          tp = await issue(third),
          tv = await code(tp.challengeId);
        await assert.rejects(verify(third, tp, tv), { code: 'IDENTITY_RATE_LIMITED' });
        assert.equal(await rateCount('verify_target_short'), 10);
        assert.equal((await identityRepository.findAccount(b.accountId)).status, 'active');
      }
    );
    await t.test(
      'global target cooldown spans contexts/purposes; supersession preserves other owner authority',
      async () => {
        resetWindow();
        const b = await binding(),
          p = await issue(b),
          value = await code(p.challengeId);
        const next = await binding({ email: b.canonicalEmail, accountId: b.accountId });
        await assert.rejects(issue(next), { code: 'IDENTITY_RATE_LIMITED' });
        const reset = await binding({
          email: b.canonicalEmail,
          accountId: b.accountId,
          purpose: 'password_reset',
        });
        await assert.rejects(issue(reset), { code: 'IDENTITY_RATE_LIMITED' });
        clock.advance(60000);
        const np = await issue(next);
        assert.equal((await row(p.challengeId)).status, 'superseded');
        await assert.rejects(verify(b, p, value));
        clock.advance(60000);
        const other = await binding({ email: b.canonicalEmail });
        await issue(other);
        assert.equal((await row(np.challengeId)).status, 'pending');
      }
    );
    await t.test(
      'purpose handler failure and wrong-purpose result roll back effects but retain admission',
      async () => {
        resetWindow();
        const b = await binding({ purpose: 'registration', accountId: null }),
          p = await issue(b),
          value = await code(p.challengeId);
        handlerThrows = true;
        try {
          await assert.rejects(verify(b, p, value), (error) => !error.stack.includes('Sensitive handler'));
        } finally {
          handlerThrows = false;
        }
        assert.equal((await row(p.challengeId)).status, 'pending');
        assert.equal(await identityRepository.findAccount(`effect_${p.challengeId}`), null);
        assert.equal(await rateCount('verify_target_short'), 1);
        wrongResult = true;
        try {
          await assert.rejects(verify(b, p, value));
        } finally {
          wrongResult = false;
        }
        assert.equal((await row(p.challengeId)).status, 'pending');
        assert.equal(await rateCount('verify_target_short'), 2);
        assert.deepEqual(await verify(b, p, value), { nextAction: 'complete_registration' });
      }
    );
    await t.test(
      'stale account version, expired proof and expiry during handler reject without effects',
      async () => {
        resetWindow();
        const b = await binding(),
          p = await issue(b),
          value = await code(p.challengeId);
        await identityRepository.transaction((r) =>
          r.advanceSecurityVersion({ accountId: b.accountId, expectedSecurityVersion: 1 })
        );
        await assert.rejects(verify(b, p, value));
        const exp = await binding(),
          ep = await issue(exp),
          ev = await code(ep.challengeId);
        clock.advance(300001);
        await assert.rejects(verify(exp, ep, ev));
        const late = await binding(),
          lp = await issue(late),
          lv = await code(lp.challengeId);
        handlerDelay = 300001;
        try {
          await assert.rejects(verify(late, lp, lv));
        } finally {
          handlerDelay = 0;
        }
        assert.equal(await identityRepository.findAccount(`effect_${lp.challengeId}`), null);
        assert.equal((await row(lp.challengeId)).status, 'pending');
      }
    );
    await t.test('expiry after an actual PostgreSQL challenge lock wait cannot consume proof', async () => {
      resetWindow();
      const b = await binding(),
        p = await issue(b),
        value = await code(p.challengeId);
      let locked, release;
      const ready = new Promise((resolve) => {
        locked = resolve;
      });
      const gate = new Promise((resolve) => {
        release = resolve;
      });
      const blocker = database.transaction(async (tx) => {
        await tx.query(`SELECT id FROM ${s}.identity_challenges WHERE id=$1 FOR UPDATE`, [p.challengeId]);
        locked();
        await gate;
      });
      await ready;
      const pending = assert.rejects(verify(b, p, value));
      let waiting = false;
      try {
        for (let n = 0; n < 50 && !waiting; n++) {
          waiting = (
            await database.query(
              `SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE $1) AS waiting`,
              [`%${schema}%identity_challenges%`]
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
      assert.equal((await row(p.challengeId)).status, 'pending');
      assert.equal(await identityRepository.findAccount(`effect_${p.challengeId}`), null);
    });
    await t.test(
      'issue failure rolls back send budgets and ciphertext; exact replay fingerprint is immutable',
      async () => {
        resetWindow();
        const b = await binding();
        const failing = new IdentityChallengeService({
          ...options,
          deliveryService: {
            ...deliveryService,
            keyring: deliveryKeys,
            recipientKeys,
            eventRepository,
            enqueue() {
              throw new Error('Injected delivery persistence failure.');
            },
          },
        });
        await assert.rejects(issue(b, failing));
        assert.equal(await rateCount('send_global_hour'), 0);
        const p = await issue(b);
        assert.equal(await rateCount('send_global_hour'), 1);
        const altered = await binding({ email: b.canonicalEmail, accountId: b.accountId });
        await assert.rejects(service.issue({ ...input(altered), key: input(b).key }), {
          code: 'IDENTITY_IDEMPOTENCY_CONFLICT',
        });
        assert.equal((await row(p.challengeId)).status, 'pending');
      }
    );
    await t.test(
      'active rate key rotation fails closed until old windows expire; old OTP keys remain necessary',
      async () => {
        resetWindow();
        const b = await binding(),
          p = await issue(b),
          value = await code(p.challengeId);
        const rotated = new IdentityChallengeService({
          ...options,
          rateKeys: { current: 2, keys: { 1: rateKeys.keys[1], 2: randomBytes(32) } },
        });
        await assert.rejects(verify(b, p, value, rotated), { code: 'IDENTITY_RATE_ROTATION_PENDING' });
        assert.equal(await rateCount('verify_source_short'), 0);
        const missing = new IdentityChallengeService({
          ...options,
          otpKeys: { current: 2, keys: { 2: randomBytes(32) } },
        });
        await assert.rejects(verify(b, p, value, missing), { code: 'IDENTITY_KEY_UNAVAILABLE' });
        assert.equal((await row(p.challengeId)).status, 'pending');
        assert.equal(await rateCount('verify_target_short'), 1);
        resetWindow();
        const fresh = await binding();
        assert.ok((await issue(fresh, rotated)).challengeId);
      }
    );
    await t.test(
      'parallel final source/global admission is one atomic winner and does not charge target for the loser',
      async () => {
        // Start with the original rate-key generation after the rotation case.
        resetWindow();
        const b = await binding(),
          p = await issue(b),
          value = await code(p.challengeId);
        const wrong = value === '000000' ? '000001' : '000000';
        await assert.rejects(verify(b, p, wrong));
        await database.query(
          `UPDATE ${s}.identity_rate_buckets SET count=CASE purpose
        WHEN 'verify_source_short' THEN 59 WHEN 'verify_source_hour' THEN 199 WHEN 'verify_global_hour' THEN 999
        WHEN 'verify_target_short' THEN 9 WHEN 'verify_target_hour' THEN 29 WHEN 'verify_account_short' THEN 9 WHEN 'verify_account_hour' THEN 29 ELSE count END
        WHERE purpose LIKE 'verify_%' AND expires_at>$1`,
          [now()]
        );
        const results = await Promise.allSettled([verify(b, p, value), verify(b, p, value, second)]);
        assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
        assert.equal(
          results.find((result) => result.status === 'rejected').reason.code,
          'IDENTITY_RATE_LIMITED'
        );
        assert.equal(await rateCount('verify_source_short'), 60);
        assert.equal(await rateCount('verify_source_hour'), 200);
        assert.equal(await rateCount('verify_global_hour'), 1000);
        assert.equal(await rateCount('verify_target_short'), 10);
        assert.equal(await rateCount('verify_account_hour'), 30);
      }
    );
    await t.test(
      'send hour/day and source/global caps reject atomically without another challenge',
      async () => {
        for (const [bucket, limit] of [
          ['send_target_hour', 5],
          ['send_target_day', 10],
          ['send_source_hour', 20],
          ['send_global_hour', 100],
        ]) {
          resetWindow();
          const b = await binding();
          await issue(b);
          clock.advance(60000);
          const next = await binding({ email: b.canonicalEmail, accountId: b.accountId });
          await database.query(
            `UPDATE ${s}.identity_rate_buckets SET count=$2 WHERE purpose=$1 AND expires_at>$3`,
            [bucket, limit, now()]
          );
          const countBefore = (
            await database.query(`SELECT count(*)::int AS n FROM ${s}.identity_challenges`)
          ).rows[0].n;
          const budgetBefore = await rateCount('send_global_hour');
          await assert.rejects(issue(next), { code: 'IDENTITY_RATE_LIMITED' });
          assert.equal(
            (await database.query(`SELECT count(*)::int AS n FROM ${s}.identity_challenges`)).rows[0].n,
            countBefore
          );
          assert.equal(await rateCount('send_global_hour'), budgetBefore);
        }
      }
    );
    await t.test(
      'window starts do not slide on admissions and expired windows reset rather than locking account',
      async () => {
        resetWindow();
        const b = await binding(),
          p = await issue(b),
          value = await code(p.challengeId),
          wrong = value === '000000' ? '000001' : '000000';
        await assert.rejects(verify(b, p, wrong));
        const first = (
          await database.query(
            `SELECT created_at,expires_at FROM ${s}.identity_rate_buckets WHERE purpose='verify_target_short' AND expires_at>$1`,
            [now()]
          )
        ).rows[0];
        clock.advance(1000);
        await assert.rejects(verify(b, p, wrong));
        const again = (
          await database.query(
            `SELECT created_at,expires_at FROM ${s}.identity_rate_buckets WHERE purpose='verify_target_short' AND expires_at>$1`,
            [now()]
          )
        ).rows[0];
        assert.deepEqual(again, first);
        clock.advance(900000);
        const fresh = await binding({ email: b.canonicalEmail, accountId: b.accountId }),
          fp = await issue(fresh),
          fv = await code(fp.challengeId);
        assert.deepEqual(await verify(fresh, fp, fv), { nextAction: 'authenticate' });
        assert.equal(await rateCount('verify_target_short'), 1);
      }
    );
    await t.test('replacement bounce never revives an old code or refunds resend admission', async () => {
      resetWindow();
      const b = await binding(),
        first = await issue(b),
        oldCode = await code(first.challengeId);
      clock.advance(60001);
      const replacement = await service.issue({ ...input(b), key: `replacement_key_${b.contextId}` });
      const outbox = (
        await database.query(`SELECT id FROM ${s}.identity_notification_outbox WHERE challenge_id=$1`, [
          replacement.challengeId,
        ])
      ).rows[0];
      const events = new IdentityEmailEventService({
        repository: eventRepository,
        providerScope: 'fixture',
        fixtureOnly: true,
        clock,
        verifyEvent: async (packet) => JSON.parse(packet.body),
      });
      const event = (type) => ({
        body: Buffer.from(
          JSON.stringify({
            eventId: `replacement_${type}`,
            deliveryId: outbox.id,
            type,
            occurredAt: now().toISOString(),
          })
        ),
      });
      await events.accept(event('bounce'));
      await events.accept(event('delivered'));
      assert.equal((await row(first.challengeId)).status, 'superseded');
      assert.equal((await row(replacement.challengeId)).delivery_status, 'failed');
      await assert.rejects(verify(b, first, oldCode));
      await assert.rejects(verify(b, replacement, '123456'));
      assert.equal(await rateCount('send_global_hour'), 2);
      await assert.rejects(service.issue({ ...input(b), key: `third_issue_key_${b.contextId}` }), {
        code: 'IDENTITY_RATE_LIMITED',
      });
      const before = mail.messages().length;
      await deliveryService.process();
      assert.equal(mail.messages().length, before);
    });
    await t.test(
      'rate capacity rejects live-row eviction and bounded cleanup removes at most fifty expired rows',
      async () => {
        // This table belongs to the random disposable fixture schema only.
        await database.query(`DELETE FROM ${s}.identity_rate_buckets`);
        await database.query(
          `INSERT INTO ${s}.identity_rate_buckets(digest,key_version,purpose,count,created_at,expires_at)
        SELECT md5(n::text)||md5('fixture'||n::text),1,'capacity_fixture',1,$1,$2 FROM generate_series(1,10000) n`,
          [now(), new Date(clock.now() + 86400000)]
        );
        const b = await binding();
        await assert.rejects(issue(b), { code: 'IDENTITY_RATE_CAPACITY' });
        assert.equal(
          (await database.query(`SELECT count(*)::int AS n FROM ${s}.identity_rate_buckets`)).rows[0].n,
          10000
        );
        resetWindow();
        await assert.rejects(service.verify({ ...input(b), challengeId: 'missing', code: 'bad' }));
        assert.equal(
          (await database.query(`SELECT count(*)::int AS n FROM ${s}.identity_rate_buckets`)).rows[0].n,
          9953
        );
      }
    );
  });
});
