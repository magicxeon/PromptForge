import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PromptEnhancementRepository } from '../server/repositories/generation/PromptEnhancementRepository.js';
import { CreditAccountRepository } from '../server/repositories/credits/CreditAccountRepository.js';
import { CreditApplicationService } from '../server/domain/credits/CreditApplicationService.js';
import { CreditReservationService } from '../server/domain/credits/CreditReservationService.js';
import { CreditPricingPolicyService } from '../server/domain/credits/CreditPricingPolicyService.js';
import { calculateTextEnhancementPrice } from '../server/domain/credits/TextEnhancementPricing.js';
import { LookSheetEnhancementService } from '../server/domain/generation/LookSheetEnhancementService.js';
import { prepareEnhancementInput, validateEnhancementResult } from '../server/domain/generation/lookSheetEnhancementPrompt.js';
import { acceptLookSheetSnapshot, compileLookSheetPrompt } from '../server/domain/character-profiles/LookSheetDefinitionService.js';
import { writeJsonFileAtomic } from '../server/repositories/json/jsonFileStore.js';
import { normalizeGenerationContext, compilePromptFromGenerationContext, createQueueOptions } from '../server/domain/generation/generationRequestService.js';
import { prepareGenerationReferences } from '../server/domain/generation/prepareGenerationReferences.js';
import { OpenAITextProvider } from '../server/providers/OpenAITextProvider.js';
import { GenerationApplicationService } from '../server/domain/generation/GenerationApplicationService.js';

const policy = JSON.parse(await readFile(new URL('../server/config/credit-pricing-policy.json', import.meta.url), 'utf8'));
policy.textEnhancement.effectiveAt = '2020-01-01'; policy.textEnhancement.reviewBy = '2099-01-01';
const fields = { schemaVersion: 1, name: 'MIRA', ageYears: 24, appearance: 'Dark hair and brown eyes',
  situation: 'Night market stall owner', outfit: 'Cotton shirt', personality: 'Warm and determined' };
const context = { lookSheetDefinition: fields, generationSurface: 'playground' };
const snapshot = acceptLookSheetSnapshot(context);
const originalPrompt = compileLookSheetPrompt({ ...context, lookSheetSnapshot: snapshot });
const input = { userId: 'alice', snapshot, originalPrompt };
const coveredFields = ['name', 'ageYears', 'appearance', 'situation', 'outfit', 'personality'];
async function fixture(t, balance = 100) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'mpf-enhancement-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const databaseFile = path.join(directory, 'credits.json');
  await writeJsonFileAtomic(databaseFile, { schemaVersion: 2, accounts: [{ userId: 'alice', username: 'alice',
    status: 'active', availableCredits: balance, reservedCredits: 0 }], estimates: [], reservations: [], ledgerEntries: [] });
  const accountRepository = new CreditAccountRepository({ databaseFile });
  const reservationService = new CreditReservationService({ accountRepo: accountRepository,
    pricingPolicyService: new CreditPricingPolicyService({ policyData: policy }) });
  const credits = new CreditApplicationService({ accountRepository, reservationService });
  const repository = new PromptEnhancementRepository(path.join(directory, 'enhancements.json'));
  let calls = 0;
  const refiner = {
    getLookSheetPolicy: () => ({ enabled: true, provider: 'openai', model: 'gpt-5.6-luna', maxOutputTokens: 1800, reasoningEffort: 'low' }),
    enhanceLookSheet: async prepared => {
      calls++;
      assert.ok((await credits.getAccount('alice')).reservedCredits > 0, 'reserve precedes dispatch');
      return { sourceFingerprint: prepared.sourceFingerprint, coveredFields, refinedPrompt: `Photographic character document with natural fabric detail. ${prepared.canonicalPrompt}`,
        responseId: 'fixture-response', usage: { input_tokens: 900, output_tokens: 500 } };
    }
  };
  return { credits, repository, accountRepository, refiner, service: new LookSheetEnhancementService({ credits, repository, refiner }), calls: () => calls };
}

test('pricing: fixed-service fee uses rate/FX/buffer/margin and whole Credits, not image rounding', () => {
  const result = calculateTextEnhancementPrice(policy, { provider: 'openai', model: 'gpt-5.6-luna', inputTokenBudget: 1000, maxOutputTokens: 500 });
  assert.equal(result.totalCredits, 2); assert.equal(result.providerCostUsd, 0.0008);
  for (const patch of [{ model: 'unknown' }, { inputTokenBudget: Infinity }, { maxOutputTokens: 1801 }, { inputTokenBudget: 40001 }]) {
    assert.throws(() => calculateTextEnhancementPrice(policy, { provider: 'openai', model: 'gpt-5.6-luna', inputTokenBudget: 1000, maxOutputTokens: 500, ...patch }), { code: 'credit_pricing_unavailable' });
  }
  assert.throws(() => calculateTextEnhancementPrice({ ...policy, textEnhancement: null }, {}));
  assert.throws(() => calculateTextEnhancementPrice({ ...policy, textEnhancement: { ...policy.textEnhancement, reviewBy: '2020-01-02' } }, {}));
});
test('prompt: all fields remain authoritative and realism does not alter the source brief', () => {
  const prepared = prepareEnhancementInput(snapshot, originalPrompt);
  const result = validateEnhancementResult({ sourceFingerprint: prepared.sourceFingerprint, coveredFields, refinedPrompt: 'A naturally lit character sheet. '.repeat(5) }, prepared, originalPrompt);
  for (const value of Object.values(fields).filter(value => typeof value === 'string')) assert.ok(result.includes(value));
  assert.match(result, /24 years/); assert.match(result, /Do not invent wrinkles/);
  assert.match(result, /stylized/); assert.ok(!result.includes('undefined'));
  assert.throws(() => validateEnhancementResult({ sourceFingerprint: 'other', refinedPrompt: result }, prepared, originalPrompt));
  assert.throws(() => validateEnhancementResult({ sourceFingerprint: prepared.sourceFingerprint, refinedPrompt: '' }, prepared, originalPrompt));
});
test('lifecycle: concurrent replay reserves, dispatches and captures once; artifact reuses without AI', async t => {
  const f = await fixture(t); const quote = await f.service.quote(input); assert.equal(f.calls(), 0);
  await Promise.all([f.service.execute({ ...input, id: quote.id }), f.service.execute({ ...input, id: quote.id })]);
  const result = await f.service.read(quote.id, 'alice'); assert.equal(result.status, 'succeeded');
  await f.service.execute({ ...input, id: quote.id });
  const artifact = await f.service.resolve(quote.id, 'alice', snapshot, originalPrompt);
  assert.ok(artifact.prompt.includes(originalPrompt)); assert.equal(f.calls(), 1);
  const account = await f.credits.getAccount('alice');
  assert.equal(account.availableCredits, 100 - quote.credits); assert.equal(account.reservedCredits, 0);
  const raw = await f.accountRepository.readRaw(); assert.equal(raw.reservations.length, 1);
  assert.equal(raw.ledgerEntries.filter(item => item.operationType === 'capture').length, 1);
  assert.equal(raw.reservations[0].metadata.kind, 'look_sheet_enhancement');
  await assert.rejects(f.service.resolve(quote.id, 'bob', snapshot, originalPrompt));
  await assert.rejects(f.service.resolve(quote.id, 'alice', { ...snapshot, fields: { ...fields, ageYears: 60 } }, originalPrompt));
});
test('lifecycle: insufficient credits and malformed output never charge for a successful fallback', async t => {
  const poor = await fixture(t, 0); const q = await poor.service.quote(input);
  const failed = await poor.service.execute({ ...input, id: q.id });
  assert.equal(failed.status, 'failed'); assert.equal(poor.calls(), 0); assert.equal(failed.errorCode, 'credit_insufficient');
  const f = await fixture(t); f.refiner.enhanceLookSheet = async () => ({ refinedPrompt: '' });
  const quote = await f.service.quote(input);
  assert.equal((await f.service.execute({ ...input, id: quote.id })).status, 'failed');
  assert.equal((await f.credits.getAccount('alice')).availableCredits, 100);
  await f.service.execute({ ...input, id: quote.id });
  assert.equal((await f.accountRepository.readRaw()).reservations.length, 1);
});
test('recovery: capture failure retries settlement but never provider dispatch', async t => {
  const f = await fixture(t); const capture = f.credits.captureForJob.bind(f.credits);
  f.credits.captureForJob = async () => { throw new Error('disk unavailable'); };
  const quote = await f.service.quote(input);
  const result = await f.service.execute({ ...input, id: quote.id });
  assert.equal(result.status, 'delivered'); assert.equal(result.prompt, null);
  f.credits.captureForJob = capture;
  await new LookSheetEnhancementService({ repository: f.repository, credits: f.credits, refiner: f.refiner }).recover();
  assert.equal((await f.service.read(quote.id, 'alice')).status, 'succeeded'); assert.equal(f.calls(), 1);
});
test('recovery: interrupted reserve/dispatch releases once and never calls provider again', async t => {
  const f = await fixture(t); const q = await f.service.quote(input);
  const record = await f.repository.get(q.id, 'alice');
  await f.repository.claim(q.id, 'alice', record.fingerprint);
  await f.credits.reserveTextEnhancement({ userId: 'alice', operationId: q.id, quote: record.quote });
  await f.service.recover(); await f.service.recover();
  assert.equal((await f.service.read(q.id, 'alice')).status, 'failed');
  assert.equal((await f.credits.getAccount('alice')).availableCredits, 100); assert.equal(f.calls(), 0);
});
test('privacy: foreign/stale requests cannot claim a quote or fetch an artifact', async t => {
  const f = await fixture(t); const q = await f.service.quote(input);
  await assert.rejects(f.service.execute({ ...input, userId: 'bob', id: q.id }));
  await assert.rejects(f.service.execute({ ...input, originalPrompt: 'altered', id: q.id }));
  await assert.rejects(f.service.read(q.id, 'bob'), { code: 'enhancement_not_found' }); assert.equal(f.calls(), 0);
});
test('integration: authorized artifact changes image quote fingerprint and reaches canonical queue without another text call', async t => {
  const f = await fixture(t); const quote = await f.service.quote(input);
  await f.service.execute({ ...input, id: quote.id });
  const context = normalizeGenerationContext({ generationSurface: 'playground', generationMode: 'character-sheet',
    lookSheetDefinition: fields, lookSheetEnhancementId: quote.id, promptRefinement: { enabled: true } }, { userId: 'alice' });
  await prepareGenerationReferences(context, { actorContext: { userId: 'alice' }, enhancementService: f.service,
    characterService: { validateGenerationContext: async () => null },
    processingService: { processContext: async () => ({ providerPlan: { referenceCount: 0 } }) } });
  assert.equal(context.lookSheetSnapshot.enhancementId, quote.id);
  assert.notEqual(context.lookSheetSnapshot.fingerprint, snapshot.fingerprint);
  assert.match(compilePromptFromGenerationContext(context), /Authoritative character brief/);
  assert.equal(context.promptRefinement.enabled, false);
  const options = createQueueOptions(context, { username: 'alice', modelConfig: { defaults: {} } });
  assert.equal(options.lookSheetSnapshot.enhancementId, quote.id); assert.equal(f.calls(), 1);
  assert.throws(() => normalizeGenerationContext({ lookSheetEnhancementId: { prompt: 'forged' } }), { code: 'enhancement_stale' });
});
test('api: facade rejects anonymous, Studio and template enhancement before preparation or dispatch', async () => {
  const service = new GenerationApplicationService({ queueManager: {}, providerRegistry: { resolveSelection() { throw new Error('must not resolve'); } } });
  const body = { generationSurface: 'playground', generationMode: 'character-sheet', lookSheetDefinition: fields };
  await assert.rejects(service.enhanceLookSheet({ body, actorContext: null }), { code: 'actor_required' });
  for (const patch of [{ generationSurface: 'studio' }, { templateUseSessionId: 'private' }, { sceneBuilder: { templateDraft: {} } }]) {
    await assert.rejects(service.enhanceLookSheet({ body: { ...body, ...patch }, actorContext: { userId: 'alice' } }), { code: 'enhancement_invalid_request' });
  }
});
test('provider: text request is structured, non-stored, tool-free and bounded; incomplete output rejects', async () => {
  const requests = []; let status = 'completed';
  const provider = new OpenAITextProvider('fixture-key', { fetchImpl: async (_url, request) => {
    requests.push(JSON.parse(request.body));
    return { ok: true, json: async () => ({ status, id: 'fixture', output_text: JSON.stringify({ sourceFingerprint: 'source', refinedPrompt: 'result' }) }) };
  } });
  await provider.enhanceLookSheet({ input: { field: 'MIRA' }, instructions: 'fixture', schema: { type: 'object' },
    model: 'gpt-5.6-luna', maxOutputTokens: 1800, reasoningEffort: 'low', timeoutMs: 1000 });
  assert.equal(requests[0].store, false); assert.equal(requests[0].max_output_tokens, 1800);
  assert.equal(requests[0].tools, undefined); assert.equal(requests[0].text.format.strict, true);
  status = 'incomplete';
  await assert.rejects(provider.enhanceLookSheet({ input: {}, timeoutMs: 1000 }), { code: 'enhancement_incomplete' });
});
test('recovery: refund failure stays pending, then status read releases once', async t => {
  const f = await fixture(t); const refund = f.credits.refundForJob.bind(f.credits);
  f.credits.refundForJob = async () => { throw new Error('temporarily unavailable'); };
  f.refiner.enhanceLookSheet = async () => { throw Object.assign(new Error('timeout'), { code: 'enhancement_timeout' }); };
  const q = await f.service.quote(input);
  assert.equal((await f.service.execute({ ...input, id: q.id })).status, 'refund_pending');
  f.credits.refundForJob = refund;
  assert.equal((await f.service.read(q.id, 'alice')).status, 'failed');
  assert.equal((await f.credits.getAccount('alice')).availableCredits, 100);
});
test('pricing: expired consent cannot start a provider call', async t => {
  const f = await fixture(t); const q = await f.service.quote(input);
  const record = await f.repository.get(q.id, 'alice');
  await f.repository.update(q.id, 'alice', { quote: { ...record.quote, expiresAt: '2020-01-01' } });
  await assert.rejects(f.service.execute({ ...input, id: q.id }), { code: 'enhancement_stale' });
  assert.equal(f.calls(), 0);
});
test('integration: selected approved Character identity survives quote-to-image artifact matching', async t => {
  const f = await fixture(t);
  const identity = { purpose: 'character_usage', characterProfileId: 'char-1', characterProfileVersionId: 'v1', outfitBehavior: 'replaceable',
    identityPack: { ageRange: { minimum: 20, maximum: 29 }, attributes: { Ethnicity: { value: 'Thai', id: 'thai' } } } };
  const payload = { generationSurface: 'playground', generationMode: 'character-sheet',
    lookSheetDefinition: { ...fields, ageYears: null } };
  const dependencies = { actorContext: { userId: 'alice' }, enhancementService: f.service,
    characterService: { validateGenerationContext: async () => identity },
    processingService: { processContext: async () => ({ providerPlan: { referenceCount: 1 } }) } };
  const initial = normalizeGenerationContext(payload, dependencies.actorContext);
  await prepareGenerationReferences(initial, dependencies);
  const brief = compilePromptFromGenerationContext(initial);
  assert.match(brief, /Approved character identity/); assert.match(brief, /20-29/);
  const accepted = { userId: 'alice', snapshot: initial.lookSheetSnapshot, originalPrompt: brief };
  const q = await f.service.quote(accepted); await f.service.execute({ ...accepted, id: q.id });
  const next = normalizeGenerationContext({ ...payload, lookSheetEnhancementId: q.id }, dependencies.actorContext);
  await prepareGenerationReferences(next, dependencies);
  assert.equal(next.lookSheetSnapshot.enhancementId, q.id);
  assert.match(compilePromptFromGenerationContext(next), /20-29/); assert.equal(f.calls(), 1);
});
test('prompt: missing coverage and explicit age or multi-person contradictions reject', () => {
  const prepared = prepareEnhancementInput(snapshot, originalPrompt);
  const base = { sourceFingerprint: prepared.sourceFingerprint, coveredFields, refinedPrompt: originalPrompt };
  assert.throws(() => validateEnhancementResult({ ...base, coveredFields: coveredFields.filter(field => field !== 'outfit') }, prepared, originalPrompt));
  for (const phrase of ['age 60', '45 years old', 'two people', 'three sheets']) {
    assert.throws(() => validateEnhancementResult({ ...base, refinedPrompt: `${phrase}. ${originalPrompt}` }, prepared, originalPrompt), { code: 'enhancement_authority_conflict' });
  }
});
test('api: enhancement translation keys and placeholders match in EN/TH', async () => {
  const en = JSON.parse(await readFile(new URL('../client/i18n/locales/en/playground.json', import.meta.url), 'utf8'));
  const th = JSON.parse(await readFile(new URL('../client/i18n/locales/th/playground.json', import.meta.url), 'utf8'));
  const keys = catalog => Object.keys(catalog).filter(key => key.startsWith('lookSheet.')).sort();
  assert.deepEqual(keys(en), keys(th));
  for (const key of keys(en)) {
    const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
    assert.deepEqual(placeholders(en[key]), placeholders(th[key]), key);
  }
});
test('privacy: expired artifacts cannot generate and private text is purged without losing settlement evidence', async t => {
  const f = await fixture(t); const q = await f.service.quote(input);
  await f.service.execute({ ...input, id: q.id });
  await f.repository.update(q.id, 'alice', { artifactExpiresAt: '2020-01-01' });
  assert.equal((await f.service.read(q.id, 'alice')).status, 'expired');
  await assert.rejects(f.service.resolve(q.id, 'alice', snapshot, originalPrompt));
  await f.repository.mutate(() => {});
  const retained = await f.repository.get(q.id, 'alice');
  assert.equal(retained.prompt, undefined); assert.equal(retained.originalPrompt, undefined);
  assert.ok(retained.reservationId); assert.ok(retained.quote.totalCredits);
});
