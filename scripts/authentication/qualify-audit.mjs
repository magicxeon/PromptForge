// Explicit disposable PostgreSQL qualification, outside ordinary test discovery.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { AuditService } from '../../server/domain/audit/AuditService.js';
import { PostgresSecurityAuditRepository } from '../../server/repositories/audit/PostgresSecurityAuditRepository.js';
import { securityAuditMigrations } from '../../server/repositories/audit/securityAuditMigrations.js';
import { identityMigrations, identitySchema } from '../../server/repositories/identity/identityMigrations.js';
import { PostgresIdentityRepository } from '../../server/repositories/identity/PostgresIdentityRepository.js';
import { runMigrations } from '../../server/repositories/postgres/migrations.js';
import { withDisposableAuthDatabase } from './fixtures.mjs';

test('transactional Audit security events share Identity commit authority', { timeout: 45000 }, async t => {
  await withDisposableAuthDatabase(process.env, async ({ database, schema }) => {
    const s = identitySchema(schema);
    const repo = new PostgresIdentityRepository({ database, schema });
    const auditRepository = new PostgresSecurityAuditRepository({ schema });
    const key = Buffer.alloc(32, 17); // Isolated fixture key only.
    const options = { securityRepository: auditRepository, securityFingerprintKey: key, securityFingerprintKeyVersion: 1,
      auditRepository: { appendEvent() { throw new Error('legacy adapter must not be called'); } } };
    const service = new AuditService(options);
    const fp = value => createHmac('sha256', key).update(`fixture:${value}`).digest('hex');
    const actor = { type: 'account', accountId: 'audit_actor' };
    const event = (overrides = {}) => ({ eventId: randomUUID(), action: 'password_login', outcome: 'succeeded',
      occurredAt: '2026-10-10T00:00:00.000Z', requestFingerprint: fp('request'), targetFingerprint: fp('target'),
      targetAccountId: actor.accountId, metadata: { provider: 'email', remembered: false, attemptCount: 1 }, ...overrides });
    const context = tx => ({ transaction: tx, actor, peerAddress: '127.0.0.1' });
    const count = async () => (await database.query(`SELECT count(*)::int AS n FROM ${s}.audit_security_events`)).rows[0].n;
    await runMigrations(database, [...identityMigrations(schema), ...securityAuditMigrations(schema)], { mode: 'apply', schema });

    await t.test('Identity and Audit commit together, including disabled-account denial', async () => {
      await repo.transaction(async (r, tx) => {
        await r.createAccount({ id: actor.accountId, status: 'disabled', displayName: 'Fixture' });
        assert.deepEqual(await service.recordSecurityEvent(event({ eventId: 'initial', outcome: 'denied', metadata: { reason: 'disabled' } }), context(tx)), { eventId: 'initial', replayed: false });
      });
      assert.equal(await count(), 1);
      assert.equal((await repo.findAccount(actor.accountId)).status, 'disabled');
    });
    await t.test('failure after both writes rolls back account and event', async () => {
      await assert.rejects(repo.transaction(async (r, tx) => {
        await r.createAccount({ id: 'rollback_actor', status: 'active', displayName: 'Fixture' });
        await service.recordSecurityEvent(event({ eventId: 'rollback_event', targetAccountId: 'rollback_actor' }),
          { ...context(tx), actor: { type: 'account', accountId: 'rollback_actor' } });
        throw new Error('injected interruption');
      }), /injected interruption/);
      assert.equal(await repo.findAccount('rollback_actor'), null);
      assert.equal(await count(), 1);
    });
    await t.test('exact retry and concurrent dedup preserve original recorded time', async () => {
      const input = event({ eventId: 'dedup_event' });
      const results = await Promise.all([1, 2].map(() => database.transaction(tx => service.recordSecurityEvent(input, context(tx)))));
      assert.deepEqual(results.map(x => x.replayed).sort(), [false, true]);
      const original = (await database.query(`SELECT recorded_at, peer_fingerprint, peer_key_version FROM ${s}.audit_security_events WHERE event_id='dedup_event'`)).rows[0];
      const replay = { ...input, peerFingerprint: original.peer_fingerprint, peerKeyVersion: original.peer_key_version };
      assert.equal((await database.transaction(tx => service.recordSecurityEvent(replay, { transaction: tx, actor }))).replayed, true);
      assert.deepEqual((await database.query(`SELECT recorded_at FROM ${s}.audit_security_events WHERE event_id='dedup_event'`)).rows[0].recorded_at, original.recorded_at);
      for (const change of [{ outcome: 'failed' }, { occurredAt: '2026-10-10T00:00:01.000Z' }, { requestFingerprint: fp('other') }, { metadata: {} }]) {
        await assert.rejects(repo.transaction(async (r, tx) => {
          await r.createAccount({ id: 'conflict_actor', status: 'active', displayName: 'Fixture' });
          await service.recordSecurityEvent({ ...input, ...change }, context(tx));
        }), { code: 'AUDIT_SECURITY_EVENT_CONFLICT' });
        assert.equal(await repo.findAccount('conflict_actor'), null);
      }
      assert.equal(await count(), 2);
    });
    await t.test('concurrent changed-payload reuse has one commit and rolls back the losing Identity write', async () => {
      const input = event({ eventId: 'concurrent_conflict' });
      const results = await Promise.all(['succeeded', 'failed'].map(outcome => repo.transaction(async (r, tx) => {
        await r.createAccount({ id: `concurrent_${outcome}`, status: 'active', displayName: 'Fixture' });
        return service.recordSecurityEvent({ ...input, outcome }, context(tx));
      }).then(value => ({ value }), error => ({ error }))));
      assert.equal(results.filter(result => result.value).length, 1);
      assert.equal(results.find(result => result.error).error.code, 'AUDIT_SECURITY_EVENT_CONFLICT');
      assert.equal((await database.query(`SELECT count(*)::int AS n FROM ${s}.identity_accounts WHERE id IN ('concurrent_succeeded','concurrent_failed')`)).rows[0].n, 1);
      assert.equal(await count(), 3);
    });
    await t.test('preauth events claim no account and cross-actor targets are denied', async () => {
      const preauth = event({ eventId: 'preauth' });
      delete preauth.targetAccountId;
      await database.transaction(tx => service.recordSecurityEvent(preauth, { ...context(tx), actor: { type: 'system-security' } }));
      assert.equal((await database.query(`SELECT account_id FROM ${s}.audit_security_events WHERE event_id='preauth'`)).rows[0].account_id, null);
      for (const bad of [
        { input: event({ targetAccountId: 'different_actor' }), actor },
        { input: event(), actor: { type: 'system-security' } },
        { input: preauth, actor: { type: 'account', accountId: 'missing' } },
        { input: event({ targetAccountId: 'missing' }), actor: { type: 'account', accountId: 'missing' } },
        { input: preauth, actor: { type: 'system-security', accountId: actor.accountId } },
      ]) await assert.rejects(database.transaction(tx => service.recordSecurityEvent(bad.input, { ...context(tx), actor: bad.actor })), { code: 'AUDIT_SECURITY_EVENT_REJECTED' });
      assert.equal(await count(), 4);
    });
    await t.test('secrets, free text, unsupported fields, missing keys and forged or expired handles fail safely', async () => {
      const secret = 'private-password-email@example.invalid';
      const badInputs = [event({ password: secret }), event({ metadata: { reason: secret } }), event({ metadata: { token: secret } }),
        event({ metadata: { provider: { nested: secret } } }), event({ requestFingerprint: secret }), event({ action: secret }),
        event({ metadata: { attemptCount: -1 } }), event({ occurredAt: '2026-02-30T00:00:00.000Z' }), event({ peerKeyVersion: 1 })];
      for (const input of badInputs) await assert.rejects(database.transaction(tx => service.recordSecurityEvent(input, context(tx))), error => {
        assert.equal(error.code, 'AUDIT_SECURITY_EVENT_REJECTED');
        assert.doesNotMatch(error.stack + JSON.stringify(error), /private-password|example.invalid/);
        return true;
      });
      for (const overrides of [{ securityRepository: undefined }, { securityFingerprintKey: undefined }, { securityFingerprintKey: Buffer.alloc(4) }, { securityFingerprintKeyVersion: 0 }]) {
        await assert.rejects(database.transaction(tx => new AuditService({ ...options, ...overrides }).recordSecurityEvent(event(), context(tx))), { code: 'AUDIT_SECURITY_EVENT_REJECTED' });
      }
      let expired;
      await database.transaction(tx => { expired = tx; });
      for (const handle of [database, expired, { query: database.query }, null]) await assert.rejects(service.recordSecurityEvent(event(), context(handle)), { code: 'AUDIT_SECURITY_EVENT_REJECTED' });
      await assert.rejects(database.transaction(tx => service.recordSecurityEvent(event(), { ...context(tx), peerAddress: secret })), { code: 'AUDIT_SECURITY_EVENT_REJECTED' });
      assert.equal(await count(), 4);
    });
    await t.test('direct UPDATE DELETE TRUNCATE and account deletion cannot erase events', async () => {
      for (const sql of [`UPDATE ${s}.audit_security_events SET outcome='failed'`, `DELETE FROM ${s}.audit_security_events`, `TRUNCATE ${s}.audit_security_events`]) {
        await assert.rejects(database.transaction(tx => tx.query(sql)), { sqlState: '23514' });
      }
      await assert.rejects(database.transaction(tx => tx.query(`DELETE FROM ${s}.identity_accounts WHERE id=$1`, [actor.accountId])), { sqlState: '23503' });
      assert.equal(await count(), 4);
      assert.deepEqual((await runMigrations(database, [...identityMigrations(schema), ...securityAuditMigrations(schema)], { mode: 'apply', schema })).newlyApplied, []);
    });
  });
});
