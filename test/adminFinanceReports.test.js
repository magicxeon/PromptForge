import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildFinanceReport, periodOf } from '../server/domain/finance/FinanceReportService.js';
import { buildFinanceInventory } from '../server/domain/finance/FinanceInventoryService.js';
import { CreditAccountRepository } from '../server/repositories/credits/CreditAccountRepository.js';

const now = '2026-09-07T12:00:00.000Z';
const event = (id, date, amount = 15, operation = 'capture') => ({ ledgerEntryId: id,
  operationType: operation, createdAt: date, amountCredits: amount, providerId: 'meta-muse', modelId: 'muse-image-1.0' });

test('periods use Bangkok calendar boundaries and never equate Credits to cash/cost/profit', () => {
  assert.equal(periodOf('2025-12-31T17:00:00.000Z'), '2026-01');
  const source = { available: true, entries: [event('a', '2025-12-31T17:00:00.000Z'),
    event('b', '2026-02-01T00:00:00.000Z', 20, 'refund')] };
  const result = buildFinanceReport(source, { year: 2026 }, now);
  assert.equal(result.periods.length, 12);
  assert.equal(result.totals.capturedCredits, 15);
  assert.equal(result.totals.returnedCredits, 20);
  assert.equal(result.periods[2].capturedCredits, 0);
  assert.equal(result.periods[10].capturedCredits, null);
  for (const row of result.periods) for (const key of ['cashReceived', 'supplierPayments', 'usageCost', 'profit', 'closingBalance']) assert.equal(row[key], null);
});

test('duplicates, invalid evidence, missing sources and future snapshots are not silently trusted', () => {
  const a = event('a', '2026-01-01T00:00:00.000Z');
  assert.equal(buildFinanceReport({ available: true, entries: [a, a] }, {}, now).totals.capturedCredits, 15);
  const conflict = buildFinanceReport({ available: true, entries: [a, { ...a, amountCredits: 99 }] }, {}, now);
  assert.equal(conflict.invalidCount, 1);
  assert.equal(conflict.totals.capturedCredits, null);
  assert.equal(buildFinanceReport({ available: false, entries: [] }, {}, now).totals.capturedCredits, null);
  for (const malformed of [{ ...a, providerId: { secret: 'PRIVATE' } }, { ...a, ledgerEntryId: 99 }, null]) {
    const report = buildFinanceReport({ available: true, entries: [malformed] }, {}, now);
    assert.equal(report.invalidCount, 1);
    assert.equal(report.events.length, 0);
  }
  const futureNumeric = { ...a, createdAt: Date.parse('2026-09-30T00:00:00.000Z') };
  assert.equal(buildFinanceReport({ available: true, entries: [futureNumeric] }, {}, now).events.length, 0);
  for (const query of [{ year: 2027 }, { month: 13 }, { page: -1 }, { asOf: '2027-01-01T00:00:00.000Z' }]) {
    assert.throws(() => buildFinanceReport({ available: true, entries: [] }, query, now));
  }
});

test('one pinned snapshot reconciles provider/month filters and paginated details', () => {
  const source = { available: true, entries: Array.from({ length: 55 }, (_, n) => event(`e${n}`, '2026-01-01T00:00:00.000Z')) };
  const first = buildFinanceReport(source, { month: 1, providerId: 'meta-muse' }, now);
  const second = buildFinanceReport(source, { month: 1, page: 2, asOf: first.asOf, revision: first.revision }, now);
  assert.equal(first.events.length, 50);
  assert.equal(second.events.length, 5);
  assert.equal(first.totals.capturedCredits, 55 * 15);
  assert.equal(new Set([...first.events, ...second.events].map(row => row.ledgerEntryId)).size, 55);
  assert.throws(() => buildFinanceReport({ ...source, entries: [] }, { revision: first.revision }, now), { code: 'finance_snapshot_changed' });
});

test('inventory preserves decimals, rate-only models, missing text rates and fixed retail tables', () => {
  const result = buildFinanceInventory({ version: 0, providers: [{ providerId: 'p', displayName: 'P', models: [
    { modelId: 'text', mediaTypes: ['ai_text'], displayName: 'Text', workflows: [{ id: 'ai.refine' }], effectiveEnabled: true }
  ] }] }, { policyVersion: 'v1', pricingFxThbPerUsd: 35, creditsPerThbAssumption: 10, models: [
    { providerId: 'retired', modelId: 'old', providerCostUsd: 0.000015, publishedCredits: 15 }
  ] }, { catalogVersion: 'video1', models: [] });
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows.find(row => row.modelId === 'text').coverage, 'missing_rate');
  assert.deepEqual(result.rows.find(row => row.modelId === 'old').rates, [{ dimension: 'providerCostUsd', value: '0.000015' }]);
  assert.equal(result.rows.find(row => row.modelId === 'old').retail[0].value, '15');
});

test('Finance source read does not create, migrate or write Credits data and excludes sensitive fields', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'mpf-finance-'));
  try {
    const file = path.join(directory, 'credits.json');
    const repo = new CreditAccountRepository({ databaseFile: file });
    assert.equal((await repo.readFinanceLedger()).available, false);
    await assert.rejects(access(file));
    const content = JSON.stringify({ schemaVersion: 2, ledgerEntries: [{ ...event('e1', now), metadata: { prompt: 'PRIVATE' }, userId: 'PRIVATE' }] });
    await writeFile(file, content);
    assert.equal(JSON.stringify(await repo.readFinanceLedger()).includes('PRIVATE'), false);
    assert.equal(await readFile(file, 'utf8'), content);
    await writeFile(file, '{"schemaVersion":1,"users":{}}');
    assert.equal((await repo.readFinanceLedger()).available, false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
