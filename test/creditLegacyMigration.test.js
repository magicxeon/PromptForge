import assert from 'node:assert/strict';
import test from 'node:test';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CreditAccountRepository } from '../server/repositories/credits/CreditAccountRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DB = path.join(__dirname, `test_legacy_db_${Date.now()}.json`);

async function cleanup() {
  try { await fs.unlink(TEST_DB); } catch {}
}

test('CreditAccountRepository - Idempotent Legacy Database Migration (TC-005-017)', async t => {
  const legacyData = {
    users: {
      user_demo: { credits: 200, role: 'user', lifetimePurchasedCredits: 50 },
      bob: { credits: 50, role: 'user' }
    },
    creditLedger: [
      {
        id: 'led_1',
        username: 'user_demo',
        amount: -10,
        type: 'generation_charge',
        jobId: 'job_old_1'
      },
      {
        id: 'led_2',
        username: 'user_demo',
        amount: 10,
        type: 'recharge'
      }
    ]
  };

  await fs.writeFile(TEST_DB, JSON.stringify(legacyData, null, 2));

  const repo = new CreditAccountRepository({ databaseFile: TEST_DB });

  // Read raw triggers migration
  const account = await repo.getAccountByUserId('user_demo');
  assert.ok(account, 'user_demo account should be found');
  assert.equal(account.availableCredits, 200, 'Demo user legacy credits preserved');

  const fileContent = JSON.parse(await fs.readFile(TEST_DB, 'utf8'));
  assert.equal(fileContent.schemaVersion, 2, 'File schemaVersion updated to 2');
  assert.ok(Array.isArray(fileContent.accounts), 'accounts array created');
  assert.ok(Array.isArray(fileContent.ledgerEntries), 'ledgerEntries array created');

  const demoAccount = fileContent.accounts.find(a => a.username === 'user_demo' || a.userId === 'user_demo');
  assert.ok(demoAccount);
  assert.equal(demoAccount.availableCredits, 200);

  // Run second time to verify idempotency
  await repo.getAccountByUserId('bob');
  const secondContent = JSON.parse(await fs.readFile(TEST_DB, 'utf8'));
  assert.equal(secondContent.accounts.length, fileContent.accounts.length, 'Migration should not duplicate accounts on second run');

  await cleanup();
});
