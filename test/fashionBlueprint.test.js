import assert from 'node:assert/strict';
import { promises as fs } from 'fs';
import path from 'path';
import test from 'node:test';
import { fileURLToPath } from 'url';
import { FashionBlueprintService } from '../server/domain/fashion-blueprint/FashionBlueprintService.js';
import { createFashionPlanHash } from '../server/domain/fashion-blueprint/FashionPlanHash.js';
import { CreditAccountRepository } from '../server/repositories/credits/CreditAccountRepository.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB = path.join(__dirname, `fashion-credit-${Date.now()}.json`);

test('Fashion plan resolves Simple routing and requires every outfit front', () => {
  const provider = {
    id: 'gemini',
    models: [{
      id: 'gemini-3.1-flash-lite-image',
      capabilities: { aspectRatios: ['6:8'], imageReferences: true, maxReferenceImages: 6 },
      defaults: { imageSize: '1K' }
    }]
  };
  const registry = {
    getPublicCatalog: () => ({ providers: [{ id: provider.id, models: provider.models }] }),
    resolveSelection: () => ({ provider, model: provider.models[0] }),
    validateRequest: () => {}
  };
  const service = new FashionBlueprintService({ providerRegistry: registry });
  const input = {
    templateId: 'post_1',
    characterProfileContext: { characterProfileId: 'char_1' },
    qualityTier: 'draft',
    productItems: [{
      key: 'shirt',
      references: {
        character_reference: '/outputs/casting.png',
      outfit_front: '/outputs/fashion-references/usr_fashion/shirt.png'
      }
    }]
  };
  const actor = { userId: 'usr_fashion' };
  const plan = service.resolvePlan(input, actor);
  assert.equal(plan.route.modelId, 'gemini-3.1-flash-lite-image');
  assert.equal(plan.productItems.length, 1);
  assert.equal(createFashionPlanHash(plan), createFashionPlanHash(service.resolvePlan(input, actor)));
  assert.throws(
    () => service.resolvePlan({ ...input, productItems: [{ key: 'shirt', references: {} }] }, actor),
    error => error.code === 'fashion_outfit_front_required'
  );
});

test('Fashion aggregate credit reservation is atomic and idempotent', async () => {
  await fs.writeFile(TEST_DB, JSON.stringify({
    schemaVersion: 2,
    accounts: [{ userId: 'usr_fashion', username: 'fashion', availableCredits: 100, reservedCredits: 0, status: 'active' }],
    estimates: [],
    reservations: [],
    ledgerEntries: []
  }));
  const repository = new CreditAccountRepository({ databaseFile: TEST_DB });
  const request = {
    userId: 'usr_fashion',
    planId: 'plan_1',
    quoteId: 'quote_1',
    idempotencyKey: 'fashion-plan-1',
    allocations: [
      { operationId: 'op_1', estimateId: 'est_1', requestId: 'req_1', jobId: 'job_1', amountCredits: 20 },
      { operationId: 'op_2', estimateId: 'est_2', requestId: 'req_2', jobId: 'job_2', amountCredits: 30 }
    ]
  };
  const first = await repository.reserveCreditPlan(request);
  assert.equal(first.account.availableCredits, 50);
  assert.equal(first.account.reservedCredits, 50);
  assert.equal(first.reservations.length, 2);
  const duplicate = await repository.reserveCreditPlan(request);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.account.availableCredits, 50);
  await assert.rejects(
    repository.reserveCreditPlan({
      ...request,
      idempotencyKey: 'fashion-plan-too-large',
      allocations: [{ ...request.allocations[0], operationId: 'op_3', amountCredits: 80 }]
    }),
    error => error.code === 'credit_insufficient'
  );
  const afterFailure = await repository.getAccountByUserId('usr_fashion');
  assert.equal(afterFailure.availableCredits, 50);
  assert.equal(afterFailure.reservedCredits, 50);
  await fs.unlink(TEST_DB).catch(() => {});
});
