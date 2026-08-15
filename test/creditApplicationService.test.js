import assert from 'node:assert/strict';
import test from 'node:test';
import { CreditApplicationService } from '../server/domain/credits/CreditApplicationService.js';

test('CreditApplicationService is the single facade over focused credit services', async () => {
  const calls = [];
  const service = new CreditApplicationService({
    reservationService: {
      pricingPolicyService: { getPolicyVersion: async () => 'pricing-v1' },
      estimate: async input => ({ estimateId: input.requestId }),
      validateAndReserveForRequest: async input => ({ reservation: input }),
      reservePlan: async input => input,
      captureForJob: async input => input,
      refundForJob: async input => input,
      reconcileStartupOrphanReservations: async () => calls.push('reconcile')
    },
    adjustmentService: { adjust: async input => input },
    accountRepository: {
      getAccountByUserId: async () => null,
      grantCredits: async input => ({ account: input })
    },
    ledgerRepository: { findByUserId: async userId => ({ items: [userId] }) }
  });

  assert.equal((await service.getAccount('usr_1')).availableCredits, 0);
  assert.deepEqual(await service.listLedger('usr_1'), { items: ['usr_1'] });
  assert.equal((await service.estimate({ requestId: 'est_1' })).estimateId, 'est_1');
  await service.reconcileStartupOrphanReservations();
  assert.deepEqual(calls, ['reconcile']);
});
