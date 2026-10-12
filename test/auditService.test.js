import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { AuditService } from '../server/domain/audit/AuditService.js';

test('legacy Audit record delegates unchanged JSON contract and request precedence', async () => {
  const calls = [];
  const service = new AuditService({
    auditRepository: {
      async appendEvent(...args) {
        calls.push(args);
        return { id: 'legacy' };
      },
    },
    ipHashSalt: 'fixture-salt',
  });
  const actor = { userId: 'legacy_actor', requestId: 'actor_request' };
  const event = { action: 'old_action', beforeSnapshot: { old: true } };
  assert.deepEqual(
    await service.record(event, actor, {
      requestId: 'request',
      headers: { 'x-forwarded-for': '127.0.0.2, 127.0.0.3' },
    }),
    { id: 'legacy' }
  );
  assert.deepEqual(calls[0], [
    {
      ...event,
      requestId: 'request',
      ipHash: createHash('sha256').update('fixture-salt:127.0.0.2').digest('hex'),
    },
    actor,
  ]);
  await service.record({ action: 'old_action', requestId: 'event_request', ipHash: 'existing' }, actor);
  assert.equal(calls[1][0].requestId, 'event_request');
  assert.equal(calls[1][0].ipHash, 'existing');
  assert.equal(service.hashIp(null), null);
});

test('new security method fails closed without SQL adapter or transaction and never uses legacy repository', async () => {
  let called = false;
  const service = new AuditService({
    auditRepository: {
      appendEvent() {
        called = true;
      },
    },
  });
  await assert.rejects(service.recordSecurityEvent({ password: 'private-fixture' }), (error) => {
    assert.equal(error.code, 'AUDIT_SECURITY_EVENT_REJECTED');
    assert.doesNotMatch(error.stack, /private-fixture/);
    return true;
  });
  assert.equal(called, false);
});

test('privileged status Audit helper rejects raw extra fields, self targets and missing live transaction', async () => {
  const service = new AuditService({
    securityFingerprintKey: Buffer.alloc(32, 7),
    securityFingerprintKeyVersion: 1,
  });
  const event = {
    eventId: 'status_fixture',
    occurredAt: '2026-10-11T00:00:00.000Z',
    targetAccountId: 'target_account',
    previousStatus: 'active',
    status: 'disabled',
    securityVersion: 2,
    reason: 'private fixture reason',
    operationKey: 'fixture_operation',
  };
  for (const input of [
    event,
    { ...event, targetAccountId: 'staff_account' },
    { ...event, password: 'private-fixture' },
  ]) {
    await assert.rejects(
      service.recordAccountStatusEvent(input, {
        actor: { type: 'account', accountId: 'staff_account' },
        peerAddress: '127.0.0.1',
      }),
      (error) => {
        assert.equal(error.code, 'AUDIT_SECURITY_EVENT_REJECTED');
        assert.doesNotMatch(error.stack, /private.fixture/);
        return true;
      }
    );
  }
});
