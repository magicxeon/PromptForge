import assert from 'node:assert/strict';
import test from 'node:test';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CreditReservationService } from '../server/domain/credits/CreditReservationService.js';
import { CreditAccountRepository } from '../server/repositories/credits/CreditAccountRepository.js';
import { CreditDomainError } from '../server/domain/credits/creditErrors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DB = path.join(__dirname, `test_rsv_db_${Date.now()}.json`);

async function cleanup() {
  try { await fs.unlink(TEST_DB); } catch {}
}

test('CreditReservationService - Parity & Expiry Validation (TC-005-004..007)', async t => {
  const initialData = {
    schemaVersion: 2,
    accounts: [
      { userId: 'usr_bob', username: 'bob', availableCredits: 500, reservedCredits: 0, status: 'active' }
    ],
    estimates: [],
    reservations: [],
    ledgerEntries: []
  };
  await fs.writeFile(TEST_DB, JSON.stringify(initialData, null, 2));

  const accountRepo = new CreditAccountRepository({ databaseFile: TEST_DB });
  const service = new CreditReservationService({ accountRepo });

  // 1. Create Estimate
  const estimate = await service.estimate({
    requestedProviderId: 'gemini',
    requestedModelId: 'gemini-3.1-flash-lite-image',
    resolution: '1K',
    userId: 'usr_bob'
  });

  assert.equal(estimate.estimatedCredits, 45);

  // 2. Validate and Reserve
  const result = await service.validateAndReserveForRequest({
    userId: 'usr_bob',
    estimateId: estimate.estimateId,
    generationRequest: {
      requestedProviderId: 'gemini',
      requestedModelId: 'gemini-3.1-flash-lite-image',
      resolution: '1K',
      requestId: 'req_bob_1', routingMode: 'advanced', qualityTier: 'standard', generationMode: 'scene',
      quality: null, referenceCount: 0, outputCount: 1
    }
    , metadata: { jobId: 'job_bob_1' }
  });

  assert.equal(result.account.availableCredits, 455);
  assert.equal(result.account.reservedCredits, 45);

  // 3. Stale estimate parity mismatch
  await assert.rejects(
    async () => {
      await service.validateAndReserveForRequest({
        userId: 'usr_bob',
        estimateId: estimate.estimateId,
        estimate,
        generationRequest: {
          requestedProviderId: 'gemini',
          requestedModelId: 'gemini-3-pro-image', // Mismatched model!
          resolution: '1K',
          requestId: 'req_bob_2', routingMode: 'advanced', qualityTier: 'standard', generationMode: 'scene',
          quality: null, referenceCount: 0, outputCount: 1
        }
        , metadata: { jobId: 'job_bob_2' }
      });
    },
    err => err instanceof CreditDomainError && err.code === 'credit_estimate_stale'
  );

  // 4. Capture
  const capResult = await service.captureForJob({
    userId: 'usr_bob',
    reservationId: result.reservation.reservationId,
    jobId: 'job_bob_1'
  });
  assert.equal(capResult.account.availableCredits, 455);
  assert.equal(capResult.account.reservedCredits, 0);

  await cleanup();
});
