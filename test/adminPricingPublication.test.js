import assert from 'node:assert/strict';
import test from 'node:test';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AdminConfigurationService } from '../server/domain/admin-configuration/AdminConfigurationService.js';
import { PricingConfigurationService } from '../server/domain/admin-configuration/PricingConfigurationService.js';
import { AdminConfigurationRepository } from '../server/repositories/admin-configuration/AdminConfigurationRepository.js';
import { CreditPricingPolicyService } from '../server/domain/credits/CreditPricingPolicyService.js';
import { calculateCostPlusCredits } from '../server/domain/credits/CostPlusPricing.js';
import { calculateTextEnhancementPrice } from '../server/domain/credits/TextEnhancementPricing.js';

const policy = JSON.parse(await fs.readFile(new URL('../server/config/credit-pricing-policy.json', import.meta.url), 'utf8'));
const admin = { userId: 'usr_admin_fixture', username: 'fixture', role: 'admin' };
const values = { profitMarkupPercentByMedia: { text: 30, image: 30, video: 30 },
  baseActiveRevisionId: null, reason: 'Initial pilot markup', commandId: 'draft_fixture_1' };
const publication = { expectedVersion: 1, baseActiveRevisionId: null,
  commandId: 'publish_fixture_1', reason: 'Reviewed markup change' };

async function fixture(t, options = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'admin-pricing-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const repository = new AdminConfigurationRepository({ revisionsFile: path.join(directory, 'revisions.json') });
  const pricing = new CreditPricingPolicyService({ policyData: structuredClone(policy),
    pricingConfiguration: new PricingConfigurationService({ repository }) });
  const audits = [];
  const service = new AdminConfigurationService({ repository, pricingPolicy: pricing,
    featurePolicy: { assertEnabled() {} }, audit: { async record(record) { audits.push(record); } },
    policy: { assertCanAccessBackoffice: actor => actor }, environment: { NODE_ENV: 'test' }, ...options });
  return { repository, pricing, service, audits };
}

test('admin pricing: public read contract exposes three independent initial percentages', async t => {
  const f = await fixture(t);
  const state = await f.service.list(admin);
  assert.deepEqual(state.activePricing.profitMarkupPercentByMedia, { text: 30, image: 30, video: 30 });
  assert.equal(state.activePricing.revisionId, null);
  assert.equal(state.activePricing.pricingPolicyVersion, policy.policyVersion);
});

test('admin pricing: strict bounded numeric percentages reject malformed/secret/extra fields', async t => {
  const f = await fixture(t);
  for (const markup of [null, [], { text: 30, image: 30 }, { text: 30, image: 30, video: '30' },
    { text: 30, image: 30, video: NaN }, { text: 30, image: 30, video: -1 },
    { text: 30, image: 30, video: 1001 }, { text: 30, image: 30, video: 30, extra: 1 }]) {
    assert.equal(f.service.validate({ scope: 'pricing', values: { ...values, profitMarkupPercentByMedia: markup } }, admin).valid, false);
  }
  for (const extra of [{ apiKey: 'forbidden' }, { pricingFxThbPerUsd: 1 }, { providerId: 'unrelated' }]) {
    await assert.rejects(f.service.createDraft({ scope: 'pricing', values: { ...values, ...extra } }, admin),
    { code: 'admin_configuration_invalid' });
  }
  assert.equal(f.service.validate({ scope: 'pricing', values: { ...values,
    profitMarkupPercentByMedia: { text: 0, image: 30.5, video: 1000 } } }, admin).valid, true);
});

test('admin pricing: cost-plus markup is distinct from gross margin and supports zero', () => {
  assert.equal(calculateCostPlusCredits(1, policy, 'video'), 525);
  assert.equal(calculateCostPlusCredits(1, { ...policy, profitMarkupPercentByMedia: { text: 0, image: 0, video: 0 } }, 'text'), 405);
  assert.throws(() => calculateCostPlusCredits(1, policy, 'unknown'));
});

test('admin pricing: saving draft never changes quote policy; publication updates fresh reads only', async t => {
  const f = await fixture(t);
  const before = await f.pricing.loadPolicy();
  const revision = await f.service.createDraft({ scope: 'pricing', values: { ...values,
    profitMarkupPercentByMedia: { text: 35, image: 40, video: 50 } } }, admin);
  assert.deepEqual((await f.pricing.loadPolicy()).profitMarkupPercentByMedia, before.profitMarkupPercentByMedia);
  const published = await f.service.publish(revision.id, admin, { body: publication });
  const after = await f.pricing.loadPolicy();
  assert.equal(published.status, 'active');
  assert.equal(after.pricingRevisionId, revision.id);
  assert.equal(after.profitMarkupPercentByMedia.video, 50);
  assert.notEqual(after.policyVersion, before.policyVersion);
  assert.equal(before.profitMarkupPercentByMedia.video, 30);
  assert.equal(published.activation.actorUserId, admin.userId);
  assert.equal(f.audits.at(-1).action, 'admin_pricing_publication_requested');
});

test('admin pricing: publication reaches measured image and paid Look Sheet text quotes, not fixed image tariffs', async t => {
  const f = await fixture(t);
  const imageRequest = { userId: admin.userId, requestedProviderId: 'openai',
    requestedModelId: 'gpt-image-2.5-sunburst', aspectRatio: '6:8', referenceCount: 0, outputCount: 1 };
  const textRequest = { provider: 'openai', model: 'gpt-6-sol', inputTokenBudget: 1000, maxOutputTokens: 500 };
  const beforePolicy = await f.pricing.loadPolicy();
  const beforeImage = await f.pricing.calculateEstimate(imageRequest);
  const beforeText = calculateTextEnhancementPrice(beforePolicy, textRequest);
  const fixedRequest = { ...imageRequest, requestedModelId: 'gpt-image-1-mini', quality: 'standard' };
  const beforeFixed = await f.pricing.calculateEstimate(fixedRequest);
  const revision = await f.service.createDraft({ scope: 'pricing', values: { ...values,
    profitMarkupPercentByMedia: { text: 100, image: 100, video: 30 } } }, admin);
  await f.service.publish(revision.id, admin, { body: publication });
  const afterImage = await f.pricing.calculateEstimate(imageRequest);
  const afterText = calculateTextEnhancementPrice(await f.pricing.loadPolicy(), textRequest);
  assert.equal(beforeImage.estimatedCredits, 25);
  assert.equal(afterImage.estimatedCredits, 35);
  assert.equal(beforeText.totalCredits, 4);
  assert.equal(afterText.totalCredits, 6);
  assert.equal(afterImage.breakdown.retailAssumptions.profitMarkupPercent, 100);
  assert.equal((await f.pricing.calculateEstimate(fixedRequest)).estimatedCredits, beforeFixed.estimatedCredits);
  assert.equal(calculateTextEnhancementPrice(beforePolicy, textRequest).totalCredits, beforeText.totalCredits);
  assert.equal(beforeImage.breakdown.retailAssumptions.profitMarkupPercent, 30);
  const zeroPolicy = { ...beforePolicy, profitMarkupPercentByMedia: { text: 0, image: 0, video: 0 } };
  const zeroPricing = new CreditPricingPolicyService({ policyData: zeroPolicy });
  assert.equal((await zeroPricing.calculateEstimate(imageRequest)).estimatedCredits, 20);
  assert.equal(calculateTextEnhancementPrice(zeroPolicy, textRequest).totalCredits, 3);
});

test('admin pricing: concurrent publication is idempotent and conflicting retries fail', async t => {
  const f = await fixture(t);
  const revision = await f.service.createDraft({ scope: 'pricing', values }, admin);
  const results = await Promise.all([0, 1].map(() => f.service.publish(revision.id, admin, publication)));
  assert.equal(results.filter(result => result.replayed).length, 1);
  await assert.rejects(f.service.publish(revision.id, admin, { ...publication, reason: 'Different reason' }),
  { code: 'configuration_command_conflict' });
  const state = await f.repository.getState();
  assert.equal(state.revisions.filter(item => item.status === 'active').length, 1);
});

test('admin pricing: version/baseline conflicts cannot override another publication', async t => {
  const f = await fixture(t);
  const first = await f.service.createDraft({ scope: 'pricing', values }, admin);
  const second = await f.service.createDraft({ scope: 'pricing', values: { ...values, commandId: 'draft_fixture_2' } }, admin);
  await assert.rejects(f.service.publish(first.id, admin, { ...publication, expectedVersion: 2 }),
  { code: 'admin_pricing_revision_conflict' });
  await f.service.publish(first.id, admin, publication);
  await assert.rejects(f.service.publish(second.id, admin, { ...publication, commandId: 'publish_fixture_2' }),
  { code: 'admin_pricing_revision_conflict' });
  await assert.rejects(f.service.createDraft({ scope: 'pricing', values: { ...values, commandId: 'draft_fixture_3' } }, admin),
  { code: 'admin_pricing_revision_conflict' });
});

test('admin pricing: support cannot draft or activate; production remains explicitly gated', async t => {
  const f = await fixture(t);
  const support = { ...admin, role: 'support' };
  assert.throws(() => f.service.validate({ scope: 'pricing', values }, support), { code: 'admin_pricing_forbidden' });
  await assert.rejects(f.service.createDraft({ scope: 'pricing', values }, support), { code: 'admin_pricing_forbidden' });
  await assert.rejects(f.service.publish('unknown', support, publication), { code: 'admin_pricing_forbidden' });
  const production = await fixture(t, { environment: { NODE_ENV: 'production' } });
  await assert.rejects(production.service.createDraft({ scope: 'pricing', values }, admin), { code: 'admin_pricing_production_gated' });
  await assert.rejects(production.service.publish('unknown', admin, publication), { code: 'admin_pricing_production_gated' });
});

test('admin pricing: feature gate and audit failure prevent activation', async t => {
  const f = await fixture(t);
  const revision = await f.service.createDraft({ scope: 'pricing', values }, admin);
  f.service.featurePolicy = { assertEnabled(name) { if (name === 'runtimeConfigurationPublish') throw new Error('gated'); } };
  await assert.rejects(async () => f.service.publish(revision.id, admin, publication), /gated/);
  assert.equal(await f.repository.getActivePricing(), null);
  f.service.featurePolicy = { assertEnabled() {} };
  f.service.audit = { record() { throw new Error('audit unavailable'); } };
  await assert.rejects(f.service.publish(revision.id, admin, publication), /audit unavailable/);
  assert.equal(await f.repository.getActivePricing(), null);
});

test('admin pricing: forward publication preserves previous immutable payload and pricing history', async t => {
  const f = await fixture(t);
  const first = await f.service.createDraft({ scope: 'pricing', values }, admin);
  await f.service.publish(first.id, admin, publication);
  const replacementValues = { ...values, commandId: 'draft_fixture_2', baseActiveRevisionId: first.id,
    profitMarkupPercentByMedia: { text: 30, image: 30, video: 20 } };
  const second = await f.service.createDraft({ scope: 'pricing', values: replacementValues }, admin);
  await f.service.publish(second.id, admin, { ...publication, commandId: 'publish_fixture_2', baseActiveRevisionId: first.id });
  const old = await f.repository.findById(first.id);
  assert.equal(old.status, 'superseded');
  assert.deepEqual(old.values, first.values);
  assert.equal(old.activation.profitMarkupPercentByMedia.video, 30);
  assert.equal((await f.pricing.loadPolicy()).profitMarkupPercentByMedia.video, 20);
});

test('admin pricing: publication can only change markup, not providers, billing or tariffs', async t => {
  const f = await fixture(t);
  const revision = await f.service.createDraft({ scope: 'pricing', values }, admin);
  await assert.rejects(f.service.publish(revision.id, admin, { ...publication, providerId: 'unrelated' }), { code: 'admin_configuration_invalid' });
  await f.service.publish(revision.id, admin, publication);
  const after = await f.pricing.loadPolicy();
  assert.deepEqual(after.models, policy.models);
  assert.deepEqual(after.cinematicWritingBilling, policy.cinematicWritingBilling);
  assert.deepEqual(after.videoActualUsage, policy.videoActualUsage);
  assert.equal((await f.pricing.calculateEstimate({ userId: admin.userId, requestedProviderId: 'gemini',
    requestedModelId: 'gemini-3.1-flash-lite-image' })).estimatedCredits, 45);
});
