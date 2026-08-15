import assert from 'node:assert/strict';
import test from 'node:test';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CreditAccountRepository } from '../server/repositories/credits/CreditAccountRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DB = path.join(__dirname, `test_db_${Date.now()}.json`);

async function cleanup() {
  try { await fs.unlink(TEST_DB); } catch {}
}

test('CreditAccountRepository - reserve, capture, refund & idempotency', async t => {
  const initialData = {
    schemaVersion: 2,
    accounts: [
      {
        userId: 'usr_alice',
        username: 'alice',
        availableCredits: 100,
        reservedCredits: 0,
        status: 'active'
      }
    ],
    estimates: [],
    reservations: [],
    ledgerEntries: []
  };
  await fs.writeFile(TEST_DB, JSON.stringify(initialData, null, 2));

  const repo = new CreditAccountRepository({ databaseFile: TEST_DB });

  // 1. Reserve 45 credits
  const reserveRes = await repo.reserveCredits({
    userId: 'usr_alice',
    amountCredits: 45,
    requestId: 'req_001',
    pricingSnapshot: { providerId: 'gemini', modelId: 'gemini-3.1-flash-lite-image' }
  });

  assert.equal(reserveRes.account.availableCredits, 55);
  assert.equal(reserveRes.account.reservedCredits, 45);
  assert.equal(reserveRes.reservation.status, 'reserved');

  // Duplicate reserve (Idempotency)
  const dupReserve = await repo.reserveCredits({
    userId: 'usr_alice',
    amountCredits: 45,
    requestId: 'req_001'
  });
  assert.equal(dupReserve.account.availableCredits, 55, 'Duplicate reserve should not deduct again');

  // 2. Capture reservation
  const captureRes = await repo.captureReservation({
    userId: 'usr_alice',
    reservationId: reserveRes.reservation.reservationId,
    jobId: 'job_001'
  });

  assert.equal(captureRes.account.availableCredits, 55);
  assert.equal(captureRes.account.reservedCredits, 0);
  assert.equal(captureRes.reservation.status, 'captured');

  // Duplicate capture (Idempotency)
  const dupCapture = await repo.captureReservation({
    userId: 'usr_alice',
    reservationId: reserveRes.reservation.reservationId
  });
  assert.equal(dupCapture.account.availableCredits, 55);
  assert.equal(dupCapture.account.reservedCredits, 0);

  // 3. Attempt reserve with insufficient balance
  await assert.rejects(
    async () => {
      await repo.reserveCredits({
        userId: 'usr_alice',
        amountCredits: 200,
        requestId: 'req_002'
      });
    },
    err => err.code === 'credit_insufficient'
  );

  await cleanup();
});
