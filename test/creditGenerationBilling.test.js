import assert from 'node:assert/strict';
import test from 'node:test';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CreditReservationService } from '../server/domain/credits/CreditReservationService.js';
import { CreditAccountRepository } from '../server/repositories/credits/CreditAccountRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DB = path.join(__dirname, `test_gen_billing_db_${Date.now()}.json`);

async function cleanup() {
  try { await fs.unlink(TEST_DB); } catch {}
}

test('Credit Generation Billing Lifecycle - Success Capture & Failure Refund (TC-005-003, TC-005-004, TC-005-013)', async t => {
  const initialData = {
    schemaVersion: 2,
    accounts: [
      { userId: 'usr_bob', username: 'bob', availableCredits: 200, reservedCredits: 0, status: 'active' },
      { userId: 'usr_alice', username: 'alice', availableCredits: 500, reservedCredits: 0, status: 'active' }
    ],
    estimates: [],
    reservations: [],
    ledgerEntries: []
  };
  await fs.writeFile(TEST_DB, JSON.stringify(initialData, null, 2));

  const accountRepo = new CreditAccountRepository({ databaseFile: TEST_DB });
  const reservationService = new CreditReservationService({ accountRepo });

  // TC-005-013: Bob remixes Alice template -> Bob pays, Alice balance unchanged
  const estimate = await reservationService.estimate({ userId: 'usr_bob', requestedProviderId: 'xai', requestedModelId: 'grok-imagine-image', resolution: '1K' });
  const resResult = await reservationService.validateAndReserveForRequest({
    userId: 'usr_bob',
    estimateId: estimate.estimateId,
    generationRequest: {
      requestedProviderId: 'xai',
      requestedModelId: 'grok-imagine-image',
      resolution: '1K',
      requestId: 'req_bob_remix', routingMode: 'advanced', qualityTier: 'standard', generationMode: 'scene', quality: null, referenceCount: 0, outputCount: 1
    },
    metadata: { relatedTemplateId: 'tmpl_alice_01', jobId: 'job_failed_1' }
  });

  const bobAcc = await accountRepo.getAccountByUserId('usr_bob');
  const aliceAcc = await accountRepo.getAccountByUserId('usr_alice');

  assert.equal(bobAcc.availableCredits, 170, 'Bob balance should decrease by 30 credits');
  assert.equal(bobAcc.reservedCredits, 30);
  assert.equal(aliceAcc.availableCredits, 500, 'Alice balance must remain unchanged');

  // Technical failure refund (TC-005-004)
  const refundResult = await reservationService.refundForJob({
    userId: 'usr_bob',
    reservationId: resResult.reservation.reservationId,
    jobId: 'job_failed_1',
    reasonCode: 'provider_timeout'
  });

  assert.equal(refundResult.account.availableCredits, 200, 'Refund should restore Bob balance');
  assert.equal(refundResult.account.reservedCredits, 0);

  await cleanup();
});
