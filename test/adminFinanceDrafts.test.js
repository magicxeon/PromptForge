import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { validateFinanceDraft } from '../server/domain/admin-configuration/financeDraftValidation.js';
import { AdminConfigurationService } from '../server/domain/admin-configuration/AdminConfigurationService.js';
import { AdminConfigurationRepository } from '../server/repositories/admin-configuration/AdminConfigurationRepository.js';

const actor = { userId: 'usr_admin', role: 'admin' };
const cost = () => ({ scope: 'finance_provider_cost', values: {
  baselineRevision: 'a'.repeat(64), modelKey: 'meta-muse/muse-image-1.0/image',
  providerId: 'meta-muse', modelId: 'muse-image-1.0', retailPolicyVersion: 'fixed-policy',
  versionLabel: 'Proposal', intendedEffectiveAt: '2026-10-01T00:00:00.000Z', announcedAt: '',
  reason: 'New published supplier rate', evidence: 'test-only source document',
  commandId: 'finance_test_12345', unitCostUsd: '0.000000015', unitQuantity: '1', billingMetric: 'returned_image', dimension: 'providerCostUsd'
} });

test('typed cost draft preserves sub-cent decimal, rejects unknown fields, invalid units/dates and negative cost', () => {
  assert.equal(validateFinanceDraft(cost()).valid, true);
  for (const override of [{ unitCostUsd: '-1' }, { unitCostUsd: '1e3' }, { apiKey: 'secret' },
    { intendedEffectiveAt: '2026-10-01' }, { billingMetric: 'guess' }, { reason: '' }]) {
    assert.equal(validateFinanceDraft({ ...cost(), values: { ...cost().values, ...override } }).valid, false);
  }
});

test('supplier agreement is a draft with account/service scope, not a balance or provider-wide billing toggle', () => {
  const values = { ...cost().values, billingAccountKey: 'supplier-A', fundingPoolKey: 'pool-shared', billingMode: 'hybrid', currency: 'USD' };
  delete values.unitCostUsd; delete values.unitQuantity; delete values.billingMetric; delete values.dimension;
  assert.equal(validateFinanceDraft({ scope: 'finance_supplier_agreement', values }).valid, true);
  assert.equal(validateFinanceDraft({ scope: 'finance_supplier_agreement', values: { ...values, balance: '100' } }).valid, false);
});

test('shared draft owner is idempotent, audited, hidden from Support and never publishes', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'mpf-finance-draft-'));
  try {
    const repository = new AdminConfigurationRepository({ revisionsFile: path.join(directory, 'revisions.json') });
    const audits = [];
    const service = new AdminConfigurationService({ repository, featurePolicy: { assertEnabled() {} }, audit: { record: record => audits.push(record) } });
    const original = await service.createDraft(cost(), actor);
    const replay = await service.createDraft(cost(), actor);
    assert.equal(original.id, replay.id);
    assert.equal(audits.length, 1);
    assert.equal((await service.list(actor)).revisions.length, 1);
    assert.equal((await service.list({ userId: 'usr_support', role: 'support' })).revisions.length, 0);
    await assert.rejects(service.createDraft(cost(), { userId: 'usr_support', role: 'support' }), { statusCode: 403 });
    assert.throws(() => service.publish(original.id, actor), { code: 'admin_configuration_publish_not_implemented' });
    assert.deepEqual((await repository.getState()).activeRevisionIds, {});
    await assert.rejects(service.createDraft({ ...cost(), values: { ...cost().values, unitCostUsd: '9' } }, actor), { code: 'configuration_command_conflict' });
  } finally { await rm(directory, { recursive: true, force: true }); }
});
