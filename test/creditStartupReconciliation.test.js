import assert from 'node:assert/strict';
import test from 'node:test';
import { CreditReservationService } from '../server/domain/credits/CreditReservationService.js';

const reservation = {
  userId: 'usr_video',
  reservationId: 'rsv_video',
  jobId: 'videotask_video',
  status: 'reserved',
  createdAt: '2026-08-24T00:00:00.000Z',
  expiresAt: '2026-08-24T00:15:00.000Z',
  metadata: { capability: 'playground_video' }
};

test('startup reconciliation preserves a reservation owned by a durable Video task', async () => {
  const refunds = [];
  const service = createService(refunds);

  await service.reconcileStartupOrphanReservations({
    shouldPreserveReservation: async input => {
      assert.deepEqual(input, {
        userId: reservation.userId,
        reservationId: reservation.reservationId,
        jobId: reservation.jobId,
        metadata: reservation.metadata
      });
      return true;
    }
  });

  assert.deepEqual(refunds, []);
});

test('startup reconciliation refunds a reservation with no durable owner', async () => {
  const refunds = [];
  const service = createService(refunds);

  await service.reconcileStartupOrphanReservations({
    shouldPreserveReservation: async () => false
  });

  assert.equal(refunds.length, 1);
  assert.equal(refunds[0].reservationId, reservation.reservationId);
  assert.equal(refunds[0].reasonCode, 'job_missing_after_restart');
});

test('startup reconciliation fails closed when ownership cannot be checked', async () => {
  const refunds = [];
  const warnings = [];
  const service = createService(refunds);
  const originalWarn = console.warn;
  console.warn = (...parts) => warnings.push(parts.join(' '));

  try {
    await service.reconcileStartupOrphanReservations({
      shouldPreserveReservation: async () => { throw new Error('repository unavailable'); }
    });
  } finally {
    console.warn = originalWarn;
  }

  assert.deepEqual(refunds, []);
  assert.match(warnings.join('\n'), /preserving reservation/);
});

function createService(refunds) {
  return new CreditReservationService({
    pricingPolicyService: {},
    accountRepo: {
      async readRaw() { return { reservations: [structuredClone(reservation)] }; },
      async refundReservation(input) { refunds.push(input); return input; }
    }
  });
}
