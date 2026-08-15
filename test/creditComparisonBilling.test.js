import assert from 'node:assert/strict';
import test from 'node:test';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CreditReservationService } from '../server/domain/credits/CreditReservationService.js';
import { CreditAccountRepository } from '../server/repositories/credits/CreditAccountRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DB = path.join(__dirname, `test_comp_billing_db_${Date.now()}.json`);

async function cleanup() {
  try { await fs.unlink(TEST_DB); } catch {}
}

test('Credit Comparison Billing - Multi-Slot Independent Settlement (TC-005-014, TC-005-015)', async t => {
  const initialData = {
    schemaVersion: 2,
    accounts: [
      { userId: 'usr_demo', username: 'user_demo', availableCredits: 1000, reservedCredits: 0, status: 'active' }
    ],
    estimates: [],
    reservations: [],
    ledgerEntries: []
  };
  await fs.writeFile(TEST_DB, JSON.stringify(initialData, null, 2));

  const accountRepo = new CreditAccountRepository({ databaseFile: TEST_DB });
  const reservationService = new CreditReservationService({ accountRepo });

  // 3 Comparison Slots (Gemini Lite = 45, Grok = 30, Seedream = 50 -> Total 125)
  const createSlot = async (provider, model, requestId, jobId) => {
    const estimate = await reservationService.estimate({ userId: 'usr_demo', requestedProviderId: provider, requestedModelId: model, resolution: '1K' });
    return reservationService.validateAndReserveForRequest({ userId: 'usr_demo', estimateId: estimate.estimateId,
      generationRequest: { requestedProviderId: provider, requestedModelId: model, resolution: '1K', requestId, routingMode: 'advanced', qualityTier: 'standard', generationMode: 'scene', quality: null, referenceCount: 0, outputCount: 1 },
      metadata: { jobId } });
  };
  const slot1 = await createSlot('gemini', 'gemini-3.1-flash-lite-image', 'req_slot1', 'job_slot1');
  const slot2 = await createSlot('xai', 'grok-imagine-image', 'req_slot2', 'job_slot2');
  const slot3 = await createSlot('modelark', 'seedream-5-0-lite-260128', 'req_slot3', 'job_slot3');

  const reservedAccount = await accountRepo.getAccountByUserId('usr_demo');
  assert.equal(reservedAccount.availableCredits, 875); // 1000 - 45 - 30 - 50
  assert.equal(reservedAccount.reservedCredits, 125);

  // Slot 1 succeeds -> Capture
  await reservationService.captureForJob({ userId: 'usr_demo', reservationId: slot1.reservation.reservationId, jobId: 'job_slot1' });

  // Slot 2 fails -> Refund
  await reservationService.refundForJob({ userId: 'usr_demo', reservationId: slot2.reservation.reservationId, jobId: 'job_slot2', reasonCode: 'provider_error' });

  // Slot 3 succeeds -> Capture
  await reservationService.captureForJob({ userId: 'usr_demo', reservationId: slot3.reservation.reservationId, jobId: 'job_slot3' });

  const finalAccount = await accountRepo.getAccountByUserId('usr_demo');
  assert.equal(finalAccount.availableCredits, 905, 'Final balance should be 1000 - 45 (captured) - 50 (captured) + 30 (refunded) = 905');
  assert.equal(finalAccount.reservedCredits, 0);

  await cleanup();
});
