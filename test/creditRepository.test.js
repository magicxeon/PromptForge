import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { CreditAccountRepository } from '../server/repositories/credits/CreditAccountRepository.js';
import { CreditLedgerRepository } from '../server/repositories/credits/CreditLedgerRepository.js';
import { MockUserRepository } from '../server/repositories/identity/MockUserRepository.js';

async function createFixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'credit-repo-'));
  const usersFile = path.join(directory, 'users.json');
  const databaseFile = path.join(directory, 'database.json');

  await fs.writeFile(usersFile, JSON.stringify([
    { id: 'usr_alice', username: 'user_alice', role: 'user', status: 'active' },
    { id: 'usr_bob', username: 'user_bob', role: 'user', status: 'active' },
    { id: 'usr_admin', username: 'admin_demo', role: 'admin', status: 'active' }
  ]), 'utf8');

  await fs.writeFile(databaseFile, JSON.stringify({
    users: {
      user_alice: { credits: 10, role: 'user' },
      user_bob: { credits: 5, role: 'user' }
    },
    creditLedger: []
  }), 'utf8');

  const userRepository = new MockUserRepository({ usersFile });
  const accountRepo = new CreditAccountRepository({ databaseFile, userRepository });
  const ledgerRepo = new CreditLedgerRepository({ databaseFile, userRepository });
  return {
    directory,
    accountRepo,
    ledgerRepo,
    alice: { userId: 'usr_alice', username: 'user_alice', role: 'user' },
    bob: { userId: 'usr_bob', username: 'user_bob', role: 'user' },
    admin: { userId: 'usr_admin', username: 'admin_demo', role: 'admin' }
  };
}

test('CreditAccountRepository deducts credits and records ledger entries', async t => {
  const { directory, accountRepo, ledgerRepo, alice } = await createFixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const initial = await accountRepo.findByActor(alice);
  assert.equal(initial.availableCredits, 10);

  const updated = await accountRepo.updateBalance('usr_alice', -2, 'generation_charge', { jobId: 'job_test' }, alice);
  assert.equal(updated.availableCredits, 8);

  const ledgerPage = await ledgerRepo.findByUserId('usr_alice');
  assert.equal(ledgerPage.items.length, 1);
  assert.equal(ledgerPage.items[0].amountCredits, -2);
  assert.equal(ledgerPage.items[0].operationType, 'generation_charge');
});

test('CreditAccountRepository blocks cross-user and malformed mutations', async t => {
  const { directory, accountRepo, alice, admin } = await createFixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  await assert.rejects(
    accountRepo.updateBalance('usr_bob', -1, 'generation_charge', {}, alice),
    error => error.code === 'credit_account_forbidden'
  );
  await assert.rejects(
    accountRepo.updateBalance('usr_alice', 'not-a-number', 'generation_charge', {}, alice),
    error => error.code === 'invalid_credit_amount'
  );
  await assert.rejects(
    accountRepo.updateBalance('usr_alice', 1, 'generation_charge', {}, alice),
    error => error.code === 'invalid_credit_amount'
  );
  await assert.rejects(
    accountRepo.updateBalance('usr_alice', 5, 'recharge', {}, alice),
    error => error.code === 'credit_operation_forbidden'
  );
  await assert.rejects(
    accountRepo.updateBalance('usr_alice', 1, 'generation_refund', {}, alice),
    error => error.code === 'credit_operation_forbidden'
  );

  const recharged = await accountRepo.updateBalance('usr_bob', 2, 'recharge', {}, admin);
  assert.equal(recharged.availableCredits, 7);
});

test('CreditAccountRepository makes requestId mutations idempotent', async t => {
  const { directory, accountRepo, ledgerRepo, alice } = await createFixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const metadata = { jobId: 'job_once', requestId: 'req_once' };
  await accountRepo.updateBalance('usr_alice', -2, 'generation_charge', metadata, alice);
  const duplicate = await accountRepo.updateBalance('usr_alice', -2, 'generation_charge', metadata, alice);

  assert.equal(duplicate.availableCredits, 8);
  const ledgerPage = await ledgerRepo.findByUserId('usr_alice');
  assert.equal(ledgerPage.items.length, 1);
});
