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
import { PostgresIdentityOperationRepository } from '../../server/repositories/identity/PostgresIdentityOperationRepository.js';
import { PostgresIdentityEmailEventRepository } from '../../server/repositories/identity/PostgresIdentityEmailEventRepository.js';
import { IdentityDeliveryService } from '../../server/domain/identity/IdentityDeliveryService.js';
import { IdentityEmailEventService } from '../../server/domain/identity/IdentityEmailEventService.js';
import { recipientDigests } from '../../server/domain/identity/adapters/identityEmailMetadata.js';

test('fixture delivery callbacks, bounded suppression and metadata retention', async (t) => {
  await withDisposableAuthDatabase(process.env, async ({ database, schema }) => {
    const s = `"${schema}"`;
    await runMigrations(
      database,
      [
        ...identityMigrations(schema),
        ...securityAuditMigrations(schema),
        ...identityOperationMigrations(schema),
        ...identityChallengeMigrations(schema),
        ...identityEmailDeliveryMigrations(schema),
      ],
      { mode: 'apply', schema }
    );
    const clock = createFakeClock(Date.now()),
      now = () => new Date(clock.now());
    const repository = new PostgresIdentityOperationRepository({ database, schema });
    const eventRepository = new PostgresIdentityEmailEventRepository({ database, schema });
    const ring = () => ({ current: 1, keys: { 1: randomBytes(32) } }),
      keyring = ring(),
      recipientKeys = ring();
    const mail = createFakeMail();
    const delivery = new IdentityDeliveryService({
      repository,
      eventRepository,
      keyring,
      recipientKeys,
      adapter: mail,
      clock,
      fixtureOnly: true,
    });
    const verifyEvent = async (packet) => {
      if (packet.authorization !== 'verified-fixture') throw new Error('Unauthorized');
      return JSON.parse(packet.body);
    };
    const service = new IdentityEmailEventService({
      repository: eventRepository,
      verifyEvent,
      providerScope: 'fixture',
      clock,
      fixtureOnly: true,
    });
    let sequence = 0;
    const row = async (id) =>
      (await database.query(`SELECT * FROM ${s}.identity_notification_outbox WHERE id=$1`, [id])).rows[0];
    const count = async (table) =>
      (await database.query(`SELECT count(*)::int AS n FROM ${s}.${table}`)).rows[0].n;
    async function issue(email = 'mail@example.invalid', sender = delivery, lifetime = 300000) {
      const n = ++sequence,
        context = `mail_context_${n}`,
        op = `mail_operation_${n}`,
        digest = n.toString(16).padStart(64, '0'),
        expires = new Date(+now() + lifetime);
      await database.query(
        `INSERT INTO ${s}.identity_contexts(id,purpose,digest,key_version,browser_digest,created_at,expires_at) VALUES($1,'login',$2,1,$2,$3,$4)`,
        [context, digest, now(), expires]
      );
      return repository.transaction(async (r) => {
        await r.insertOperation({
          id: op,
          contextId: context,
          action: 'fixture_mail',
          key: `fixture_mail_key_${n}`,
          fingerprint: digest,
          keyVersion: 1,
          now: now(),
          expiresAt: expires,
        });
        await r.finish(op, { nextAction: 'sign_in' });
        return sender.enqueue(
          r,
          { id: op, expires_at: expires },
          {
            purpose: 'security_notification',
            proofExpiresAt: expires,
            payload: { to: email, kind: 'password_changed' },
          }
        );
      });
    }
    const packet = (id, type = 'bounce', eventId = `mail_event_${++sequence}`) => ({
      authorization: 'verified-fixture',
      body: Buffer.from(JSON.stringify({ eventId, deliveryId: id, type, occurredAt: now().toISOString() })),
    });
    const reset = async () => {
      clock.advance(86400001);
      await service.cleanup();
    };

    await t.test(
      'authentication precedes persistence, exact concurrent duplicates converge and conflicts reject',
      async () => {
        const id = await issue(),
          p = packet(id);
        await assert.rejects(service.accept({ ...p, authorization: 'untrusted' }));
        await assert.rejects(service.accept({ ...p, body: Buffer.alloc(32769) }));
        await assert.rejects(service.accept(packet('unknown_delivery')));
        assert.equal(await count('identity_email_events'), 0);
        const results = await Promise.all([service.accept(p), service.accept(p)]);
        assert.equal(results.filter((r) => r.replayed).length, 1);
        assert.equal(await count('identity_email_events'), 1);
        const changed = JSON.parse(p.body);
        changed.type = 'delivered';
        await assert.rejects(service.accept({ ...p, body: Buffer.from(JSON.stringify(changed)) }), {
          code: 'IDENTITY_EMAIL_EVENT_CONFLICT',
        });
        assert.equal((await row(id)).status, 'failed');
        assert.equal((await row(id)).protected_payload, null);
      }
    );
    await t.test(
      'callbacks survive ciphertext erasure, delivery never removes suppression and sends are blocked',
      async () => {
        await reset();
        const id = await issue('after-send@example.invalid');
        await delivery.process();
        assert.equal((await row(id)).status, 'sent');
        assert.equal((await row(id)).protected_payload, null);
        await service.accept(packet(id, 'complaint'));
        const before = (await database.query(`SELECT * FROM ${s}.identity_email_suppressions`)).rows[0];
        clock.advance(1000);
        await service.accept(packet(id, 'delivered'));
        const after = (await database.query(`SELECT * FROM ${s}.identity_email_suppressions`)).rows[0];
        assert.equal(+after.expires_at, +before.expires_at);
        const blocked = await issue('after-send@example.invalid'),
          sent = mail.messages().length;
        await delivery.process();
        assert.equal(mail.messages().length, sent);
        assert.equal((await row(blocked)).status, 'failed');
      }
    );
    await t.test(
      'final dispatch snapshot rejects a callback committed during an earlier suppression lookup',
      async () => {
        for (const callbackTarget of ['current', 'older']) {
          await reset();
          const email = `dispatch-${callbackTarget}@example.invalid`;
          let older;
          if (callbackTarget === 'older') {
            older = await issue(email);
            await delivery.claimAndSend();
            assert.equal((await row(older)).status, 'sent');
          }
          const current = await issue(email),
            before = mail.messages().length;
          let lookups = 0;
          const delayedEvents = {
            async isSuppressed(...args) {
              const earlier = await eventRepository.isSuppressed(...args);
              assert.equal(earlier, false);
              lookups++;
              await service.accept(packet(older ?? current));
              return earlier;
            },
          };
          const sender = new IdentityDeliveryService({
            repository,
            eventRepository: delayedEvents,
            keyring,
            recipientKeys,
            adapter: mail,
            clock,
            fixtureOnly: true,
          });
          await sender.claimAndSend();
          assert.equal(lookups, 1);
          assert.equal(mail.messages().length, before);
          assert.equal((await row(current)).status, 'failed');
        }
      }
    );
    await t.test(
      'final SQL snapshot observes suppression committed while waiting for its outbox lock',
      async () => {
        await reset();
        const email = 'lock-dispatch@example.invalid';
        const older = await issue(email);
        await delivery.claimAndSend();
        const current = await issue(email),
          item = await repository.transaction((r) => r.claim(now()));
        assert.equal(item.id, current);
        let release, ready;
        const gate = new Promise((resolve) => {
            release = resolve;
          }),
          locked = new Promise((resolve) => {
            ready = resolve;
          });
        const blocker = repository.transaction(async (r) => {
          await r.eligible(item);
          ready();
          await gate;
        });
        await locked;
        const pending = repository.transaction((r) =>
          r.eligible(item, recipientDigests(recipientKeys, email))
        );
        let waiting = false;
        try {
          for (let n = 0; n < 50 && !waiting; n++) {
            waiting = (
              await database.query(
                `SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE $1) AS waiting`,
                [`%${schema}%identity_notification_outbox%`]
              )
            ).rows[0].waiting;
            if (!waiting) await new Promise((resolve) => setTimeout(resolve, 10));
          }
          assert.equal(waiting, true);
          await service.accept(packet(older));
        } finally {
          release();
        }
        await blocker;
        const snapshot = await pending;
        assert.ok(snapshot.suppressionExpiresAt > now());
        await repository.transaction((r) => r.acknowledge(item, 'failed', now));
      }
    );
    await t.test(
      'sibling timeout during suppression wait quarantines the already claimed second send',
      async () => {
        await reset();
        await issue('timeout-first@example.invalid', delivery, 1100);
        await issue('timeout-second@example.invalid');
        let started,
          aborted,
          settle,
          calls = 0,
          lookups = 0;
        const startedGate = new Promise((resolve) => {
            started = resolve;
          }),
          abortedGate = new Promise((resolve) => {
            aborted = resolve;
          });
        const adapter = {
          send(_message, { signal }) {
            calls++;
            if (calls > 1) return Promise.resolve();
            signal.addEventListener('abort', aborted, { once: true });
            started();
            return new Promise((resolve) => {
              settle = resolve;
            });
          },
        };
        const delayedEvents = {
          async isSuppressed(...args) {
            const earlier = await eventRepository.isSuppressed(...args);
            if (++lookups === 2) await abortedGate;
            return earlier;
          },
        };
        const sender = new IdentityDeliveryService({
          repository,
          eventRepository: delayedEvents,
          keyring,
          recipientKeys,
          adapter,
          clock,
          fixtureOnly: true,
        });
        const first = sender.claimAndSend();
        await startedGate;
        await Promise.all([first, sender.claimAndSend()]);
        assert.equal(calls, 1);
        assert.equal(await sender.claimAndSend(), false);
        settle();
        await Promise.resolve();
        await Promise.resolve();
        clock.advance(1001);
        await sender.claimAndSend();
        assert.equal(calls, 2);
      }
    );
    await t.test(
      'recipient rotation correlates both callback orders without extending the first window',
      async () => {
        await reset();
        const oldA = await issue('rotate-a@example.invalid'),
          oldB = await issue('rotate-b@example.invalid');
        recipientKeys.keys[2] = randomBytes(32);
        recipientKeys.current = 2;
        const newA = await issue('rotate-a@example.invalid'),
          newB = await issue('rotate-b@example.invalid');
        await service.accept(packet(oldA));
        await service.accept(packet(newB));
        const before = (
          await database.query(
            `SELECT recipient_digest,expires_at FROM ${s}.identity_email_suppressions ORDER BY recipient_digest`
          )
        ).rows;
        clock.advance(1000);
        await service.accept(packet(newA));
        await service.accept(packet(oldB));
        assert.deepEqual(
          (
            await database.query(
              `SELECT recipient_digest,expires_at FROM ${s}.identity_email_suppressions ORDER BY recipient_digest`
            )
          ).rows,
          before
        );
        assert.equal(await count('identity_email_suppression_aliases'), 4);
        for (const email of ['rotate-a@example.invalid', 'rotate-b@example.invalid'])
          assert.equal(await eventRepository.isSuppressed(recipientDigests(recipientKeys, email), now), true);
      }
    );
    await t.test('dropping any live callback key fails closed even before its first bounce', async () => {
      await reset();
      const id = await issue('unbounced@example.invalid');
      const missing = { current: 3, keys: { 3: randomBytes(32) } };
      const sender = new IdentityDeliveryService({
        repository,
        eventRepository,
        keyring,
        recipientKeys: missing,
        adapter: mail,
        clock,
        fixtureOnly: true,
      });
      await assert.rejects(issue('new-target@example.invalid', sender), {
        code: 'IDENTITY_DELIVERY_UNAVAILABLE',
      });
      assert.equal(
        await eventRepository.isSuppressed(recipientDigests(missing, 'unrelated@example.invalid'), now),
        true
      );
      assert.equal((await row(id)).status, 'pending');
      const many = {
        current: 1,
        keys: Object.fromEntries(Array.from({ length: 9 }, (_, i) => [i + 1, randomBytes(32)])),
      };
      assert.throws(
        () =>
          new IdentityDeliveryService({
            repository,
            eventRepository,
            keyring,
            recipientKeys: many,
            adapter: mail,
            clock,
            fixtureOnly: true,
          })
      );
    });
    await t.test(
      'MAX expiry stays closed when an earlier matching suppression expires during query',
      async () => {
        await reset();
        const first = await issue('mixed@example.invalid');
        await service.accept(packet(first));
        clock.advance(2000);
        const second = await issue('missing-key@example.invalid');
        await service.accept(packet(second));
        const keys = { current: 2, keys: { 2: recipientKeys.keys[2] } };
        const wrapper = new PostgresIdentityEmailEventRepository({
          schema,
          database: {
            async query(...args) {
              const result = await database.query(...args);
              clock.advance(86400000 - 1000);
              return result;
            },
          },
        });
        assert.equal(await wrapper.isSuppressed(recipientDigests(keys, 'mixed@example.invalid'), now), true);
      }
    );
    await t.test('expired group rejects a fresh bounce until explicit bounded cleanup', async () => {
      await reset();
      const email = 'expired-group@example.invalid';
      const first = await issue(email);
      await service.accept(packet(first));
      clock.advance(86400001);
      const second = await issue(email);
      await assert.rejects(service.accept(packet(second)), { code: 'IDENTITY_EMAIL_EVENT_REJECTED' });
      assert.equal((await row(second)).status, 'pending');
      await service.cleanup();
      await service.accept(packet(second));
      assert.equal((await row(second)).status, 'failed');
    });
    await t.test('SQL rejects partial metadata, malformed aliases and metadata revival', async () => {
      await reset();
      const id = await issue(),
        source = await row(id);
      for (const column of ['template_purpose', 'callback_expires_at']) {
        await assert.rejects(
          database.query(
            `INSERT INTO ${s}.identity_notification_outbox SELECT (jsonb_populate_record(NULL::${s}.identity_notification_outbox,to_jsonb(d)||jsonb_build_object('id',$2::text,'delivery_key',$2::text,'${column}',NULL))).* FROM ${s}.identity_notification_outbox d WHERE id=$1`,
            [id, `bad_metadata_${column}`]
          ),
          { sqlState: '23514' }
        );
      }
      await assert.rejects(
        database.query(`UPDATE ${s}.identity_notification_outbox SET recipient_aliases='[]' WHERE id=$1`, [
          id,
        ]),
        { sqlState: '23514' }
      );
      clock.advance(86400001);
      await service.cleanup();
      assert.equal((await row(id)).recipient_aliases, null);
      await assert.rejects(
        database.query(
          `UPDATE ${s}.identity_notification_outbox SET recipient_digest=$2,recipient_key_version=$3,template_purpose=$4,locale=$5,recipient_aliases=$6 WHERE id=$1`,
          [
            id,
            source.recipient_digest,
            source.recipient_key_version,
            source.template_purpose,
            source.locale,
            JSON.stringify(source.recipient_aliases),
          ]
        ),
        { sqlState: '23514' }
      );
    });
    await t.test(
      'event cap and suppression cap reject atomically; cleanup removes at most fifty per category',
      async () => {
        await reset();
        const id = await issue('capacity@example.invalid');
        await database.query(
          `INSERT INTO ${s}.identity_email_events SELECT 'capacity','capacity_'||i,$1,'delivered',$2,repeat('a',64),$2,$2::timestamptz+interval '24 hours' FROM generate_series(1,10000) i`,
          [id, now()]
        );
        await assert.rejects(service.accept(packet(id)), { code: 'IDENTITY_EMAIL_EVENT_CAPACITY' });
        assert.equal((await row(id)).status, 'pending');
        await database.query(`DELETE FROM ${s}.identity_email_events`);
        await database.query(
          `INSERT INTO ${s}.identity_email_suppressions SELECT lpad(to_hex(i),64,'0'),1,$1,$1::timestamptz+interval '24 hours' FROM generate_series(1,10000) i`,
          [now()]
        );
        await assert.rejects(service.accept(packet(id)), { code: 'IDENTITY_EMAIL_EVENT_CAPACITY' });
        assert.equal(await count('identity_email_events'), 0);
        clock.advance(86400001);
        const cleaned = await service.cleanup();
        assert.equal(cleaned.suppressions, 50);
        assert.ok(cleaned.events <= 50 && cleaned.metadata <= 50);
        assert.equal(await count('identity_email_suppressions'), 9950);
      }
    );
  });
});
