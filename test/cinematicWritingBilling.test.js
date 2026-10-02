import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PromptEnhancementRepository } from '../server/repositories/generation/PromptEnhancementRepository.js';
import { CinematicWritingOperationService } from '../server/domain/generation/CinematicWritingOperationService.js';
import { CreditApplicationService } from '../server/domain/credits/CreditApplicationService.js';
import { CreditReservationService } from '../server/domain/credits/CreditReservationService.js';
import { CreditAccountRepository } from '../server/repositories/credits/CreditAccountRepository.js';
import { quoteCinematicWriting } from '../server/domain/credits/CinematicWritingPricing.js';
import { CinematicApplicationService } from '../server/domain/cinematic/CinematicApplicationService.js';
import { registerCinematicRoutes } from '../server/app/routes/cinematicRoutes.js';
import { CinematicSeriesService } from '../server/domain/cinematic/CinematicSeriesService.js';

const policy = {
  policyVersion: 'fixture-policy', pricingFxThbPerUsd: 35, creditsPerThbAssumption: 10,
  creditRoundingIncrement: 5, operatingSafetyBufferRate: 0.15,
  profitMarkupPercentByMedia: { text: 30, image: 30, video: 30 },
  textEnhancement: { enabled: true, version: 'fixture-rate', providerId: 'openai', modelId: 'fixture-model',
    effectiveAt: '2020-01-01', reviewBy: '2100-01-01', inputUsdPerMillion: 2, outputUsdPerMillion: 10 },
  cinematicWritingBilling: { enabled: true, version: 'fixture-billing', inputBytesPerToken: 2.5,
    inputOverheadTokens: 1500, maximumInputBytes: 524288, quoteTtlSeconds: 900,
    operations: { characters: { floorCredits: 40 }, chapters: { floorCredits: 100 }, wardrobe: { floorCredits: 10 } } }
};
const request = { operation: 'characters', input: { expectedVersion: 1 }, sceneId: null, assignmentId: null };
const source = { projectId: 'p1', projectVersion: 1, fullStory: 'A saved story.' };

async function fixture(t, balance = 200) {
  const dir = await mkdtemp(path.join(tmpdir(), 'momelo-writing-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'credits.json');
  await writeFile(file, JSON.stringify({ schemaVersion: 2, accounts: [{ userId: 'a', availableCredits: balance,
    reservedCredits: 0, status: 'active' }], reservations: [], ledgerEntries: [], estimates: [] }));
  const account = new CreditAccountRepository({ databaseFile: file });
  const reservations = new CreditReservationService({ accountRepo: account, pricingPolicyService: { loadPolicy: async () => policy } });
  const credits = new CreditApplicationService({ accountRepository: account, reservationService: reservations });
  const repository = new PromptEnhancementRepository(path.join(dir, 'operations.json'));
  const service = new CinematicWritingOperationService({ repository, credits });
  const quote = await service.quote({ userId: 'a', projectId: 'p1', operation: 'characters', request, source,
    model: 'fixture-model', maxOutputTokens: 1800 });
  const args = { userId: 'a', projectId: 'p1', operation: 'characters', id: quote.id, request,
    loadSource: async () => source };
  return { service, credits, account, repository, quote, args };
}

test('writing price is a configured bounded service quote, not claimed actual token use', () => {
  const quote = quoteCinematicWriting(policy, { operation: 'characters', model: 'fixture-model', inputBytes: 1000, maxOutputTokens: 1800 });
  assert.equal(quote.totalCredits, 40);
  assert.equal(quote.billingMode, 'fixed_service_quote');
  assert.equal(quote.profitMarkupPercent, 30);
  for (const patch of [{ operation: 'full_story' }, { model: 'unpriced' }, { inputBytes: 600000 }]) {
    assert.throws(() => quoteCinematicWriting(policy, { operation: 'characters', model: 'fixture-model', inputBytes: 1000, maxOutputTokens: 1800, ...patch }));
  }
  assert.throws(() => quoteCinematicWriting({ ...policy, profitMarkupPercentByMedia: { text: -1 } },
    { operation: 'characters', model: 'fixture-model', inputBytes: 1000, maxOutputTokens: 1800 }));
});

test('writing reserves before dispatch, saves deliverable then captures once and replays unchanged result', async t => {
  const f = await fixture(t);
  let calls = 0;
  const run = async () => {
    calls++;
    assert.equal((await f.credits.getAccount('a')).reservedCredits, 40);
    return { characters: [{ displayName: 'Alice' }] };
  };
  const result = await f.service.execute({ ...f.args, run });
  assert.equal(result.billingStatus, 'paid');
  assert.equal(result.chargedCredits, 40);
  assert.equal((await f.repository.get(f.quote.id, 'a')).status, 'succeeded');
  assert.equal((await f.credits.getAccount('a')).availableCredits, 160);
  const replay = await f.service.execute({ ...f.args, loadSource: async () => { throw new Error('Source changed after result'); }, run });
  assert.deepEqual(replay, result);
  assert.equal(calls, 1);
  const ledger = (await f.account.readRaw()).ledgerEntries;
  assert.equal(ledger.filter(item => item.operationType === 'capture').length, 1);
});

test('writing rejects absent, foreign, changed input/source and expired quotes without AI or debit', async t => {
  const f = await fixture(t);
  let calls = 0;
  const run = async () => { calls++; return {}; };
  for (const patch of [{ id: undefined }, { userId: 'b' }, { projectId: 'p2' },
    { request: { ...request, input: { expectedVersion: 2 } } },
    { loadSource: async () => ({ ...source, projectVersion: 2 }) }]) {
    await assert.rejects(f.service.execute({ ...f.args, run, ...patch }));
  }
  const record = await f.repository.get(f.quote.id, 'a');
  await f.repository.update(f.quote.id, 'a', { quote: { ...record.quote, expiresAt: '2000-01-01' } });
  await assert.rejects(f.service.execute({ ...f.args, run }));
  assert.equal(calls, 0);
  assert.equal((await f.credits.getAccount('a')).availableCredits, 200);
});

test('writing insufficient funds and invalid AI result never retain a charge', async t => {
  const low = await fixture(t, 10);
  let calls = 0;
  await assert.rejects(low.service.execute({ ...low.args, run: async () => { calls++; return {}; } }));
  assert.equal(calls, 0);
  assert.equal((await low.credits.getAccount('a')).availableCredits, 10);
  const f = await fixture(t);
  await assert.rejects(f.service.execute({ ...f.args, run: async () => { throw Object.assign(new Error('Bad result'), { code: 'invalid_result' }); } }));
  assert.equal((await f.credits.getAccount('a')).availableCredits, 200);
  assert.equal((await f.repository.get(f.quote.id, 'a')).status, 'failed');
});

test('writing concurrent acceptance dispatches once; delivered capture failure recovers without AI', async t => {
  const f = await fixture(t);
  let finish;
  let entered;
  const started = new Promise(resolve => { entered = resolve; });
  const pending = f.service.execute({ ...f.args, run: () => { entered(); return new Promise(resolve => { finish = resolve; }); } });
  await started;
  await assert.rejects(f.service.execute({ ...f.args, run: async () => { throw new Error('Duplicate AI'); } }), { code: 'cinematic_writing_processing' });
  const originalCapture = f.credits.captureForJob.bind(f.credits);
  f.credits.captureForJob = async () => { throw new Error('Temporary ledger outage'); };
  finish({ chapters: [] });
  assert.equal((await pending).billingStatus, 'settlement_pending');
  assert.equal((await f.repository.get(f.quote.id, 'a')).status, 'delivered');
  const delivered = await f.service.read(f.quote.id, 'a', 'p1');
  assert.equal(delivered.result.billingStatus, 'settlement_pending');
  f.credits.captureForJob = originalCapture;
  await f.service.recover();
  assert.equal((await f.service.read(f.quote.id, 'a', 'p1')).result.billingStatus, 'paid');
  assert.equal((await f.credits.getAccount('a')).availableCredits, 160);
});

test('writing recovery keeps ambiguous dispatch reserved and does not consume Look Sheet receipts', async t => {
  const f = await fixture(t);
  const reserved = await f.credits.reserveWriting({ userId: 'a', operationId: f.quote.id,
    quote: (await f.repository.get(f.quote.id, 'a')).quote });
  await f.repository.update(f.quote.id, 'a', { status: 'dispatching', reservationId: reserved.reservation.reservationId });
  await f.repository.insert({ id: 'look-1', userId: 'a', status: 'delivered', quote: { expiresAt: '2100-01-01' } });
  await f.service.recover();
  assert.equal((await f.repository.get(f.quote.id, 'a')).status, 'reconciliation_required');
  assert.equal((await f.repository.get('look-1', 'a')).status, 'delivered');
  assert.equal((await f.credits.getAccount('a')).reservedCredits, 40);
  await f.credits.reconcileStartupOrphanReservations({ shouldPreserveReservation: reservation => reservation.metadata?.kind === 'cinematic_text' });
  assert.equal((await f.credits.getAccount('a')).reservedCredits, 40);
  await assert.rejects(f.service.read(f.quote.id, 'b', 'p1'), { code: 'cinematic_writing_not_found' });
});

test('Cinematic Full Story stays free at zero balance while separate Character extraction uses quote/reserve/capture', async t => {
  const f = await fixture(t, 40);
  const project = { id: 'p1', version: 1, title: 'Example', setup: { storyBrief: 'A story', format: 'mini-series', durationSeconds: 60 },
    fullStoryVersions: [{ id: 'story1', content: 'A saved story' }], activeFullStoryVersionId: 'story1', castAssignments: [], scenes: [] };
  let fullCalls = 0;
  let characterCalls = 0;
  const app = new CinematicApplicationService({ repository: { findForActor: async (_id, actor) => actor.userId === 'a' ? project : null },
    seriesService: { getWorkspace: async () => ({ productionProject: { storyProjectId: project.id }, chapters: [] }) },
    writingOperationService: f.service,
    fullStoryService: { policyLoader: () => ({ model: 'fixture-model', provider: 'openai', maxOutputTokens: 1800 }),
      propose: async () => { fullCalls++; return { fullStory: 'Free draft', characters: [], billingStatus: 'free' }; },
      proposeCharacters: async () => { characterCalls++; return { fullStory: 'Saved story', characters: [{ displayName: 'Alice' }] }; } } });
  const actor = { userId: 'a' };
  const body = { expectedVersion: 1, purpose: 'characters' };
  await assert.rejects(app.executeWriting('p1', { operation: 'characters', input: body }, actor), { code: 'cinematic_writing_quote_required' });
  assert.equal(characterCalls, 0);
  const quote = await app.quoteWriting('p1', { operation: 'characters', input: body }, actor);
  const extracted = await app.executeWriting('p1', { operation: 'characters', input: { ...body, writingQuoteId: quote.id } }, actor);
  assert.equal(extracted.chargedCredits, 40);
  assert.equal(characterCalls, 1);
  assert.equal((await f.credits.getAccount('a')).availableCredits, 0);
  assert.equal((await app.proposeFullStory('p1', { expectedVersion: 1 }, actor)).billingStatus, 'free');
  assert.equal(fullCalls, 1);
  assert.equal((await f.credits.getAccount('a')).availableCredits, 0);
});

test('all paid Cinematic HTTP entry points reject missing quotes before authoring dispatch', async () => {
  const handlers = new Map();
  const router = Object.fromEntries(['get', 'post', 'patch', 'put', 'delete'].map(method => [method, (url, handler) => handlers.set(`${method}:${url}`, handler)]));
  const app = new CinematicApplicationService();
  registerCinematicRoutes(router, { cinematicService: app });
  const paths = [
    ['/api/cinematic/story-enhancements', {}],
    ['/api/cinematic/projects/:projectId/full-story/proposals', { purpose: 'characters' }],
    ['/api/cinematic/projects/:projectId/full-story/chapters', {}],
    ['/api/cinematic/projects/:projectId/chapter-outline/proposals', {}],
    ['/api/cinematic/projects/:projectId/chapter-proposals', {}],
    ['/api/cinematic/projects/:projectId/scene-proposals', {}],
    ['/api/cinematic/projects/:projectId/scenes/:sceneId/shot-proposals', {}],
    ['/api/cinematic/projects/:projectId/scenes/:sceneId/environment/proposals', {}],
    ['/api/cinematic/projects/:projectId/cast/:assignmentId/wardrobe-suggestion', {}],
    ['/api/cinematic/projects/:projectId/story-plan/proposals', {}],
    ['/api/cinematic/projects/:projectId/scenes/:sceneId/direction-proposals', {}]
  ];
  for (const [url, body] of paths) {
    let status;
    let result;
    const res = { set() { return this; }, status(value) { status = value; return this; }, json(value) { result = value; return this; } };
    await handlers.get(`post:${url}`)({ params: { projectId: 'p1', sceneId: 's1', assignmentId: 'c1' }, body, actorContext: { userId: 'a' } }, res);
    assert.equal(status, 409, url);
    assert.equal(result.error.code, 'cinematic_writing_quote_required', url);
  }
});

test('writing recovers reservation-to-receipt crash and dispatch-receipt failure without stuck Credits', async t => {
  const crash = await fixture(t);
  const record = await crash.repository.get(crash.quote.id, 'a');
  await crash.repository.claim(crash.quote.id, 'a', record.fingerprint);
  await crash.credits.reserveWriting({ userId: 'a', operationId: crash.quote.id, quote: record.quote });
  await crash.service.recover();
  assert.equal((await crash.credits.getAccount('a')).reservedCredits, 0);
  assert.equal((await crash.credits.getAccount('a')).availableCredits, 200);
  const writeFail = await fixture(t);
  const update = writeFail.repository.update.bind(writeFail.repository);
  writeFail.repository.update = (id, userId, patch) => {
    if (patch.status === 'dispatching') throw new Error('Receipt outage');
    return update(id, userId, patch);
  };
  let calls = 0;
  await assert.rejects(writeFail.service.execute({ ...writeFail.args, run: async () => { calls++; return {}; } }));
  assert.equal(calls, 0);
  assert.equal((await writeFail.credits.getAccount('a')).reservedCredits, 0);
  assert.equal((await writeFail.credits.getAccount('a')).availableCredits, 200);
});

test('blocked non-AI preflight and absent results do not charge', async t => {
  const f = await fixture(t);
  const blocked = await f.service.execute({ ...f.args, run: async () => ({ status: 'blocked', provenance: null }) });
  assert.equal(blocked.billingStatus, 'free');
  assert.equal((await f.credits.getAccount('a')).availableCredits, 200);
  const invalid = await fixture(t);
  await assert.rejects(invalid.service.execute({ ...invalid.args, run: async () => null }), { code: 'cinematic_writing_invalid_result' });
  assert.equal((await invalid.credits.getAccount('a')).availableCredits, 200);
});

test('Wardrobe uses the existing empty-input API and binds the server source version', async t => {
  const f = await fixture(t);
  const project = { id: 'p1', version: 1, title: 'Story', setup: {}, durationTargetMs: 4000, aspectRatio: '9:16',
    castAssignments: [{ id: 'c1', displayName: 'Alice' }], scenes: [], fullStoryVersions: [] };
  let calls = 0;
  const app = new CinematicApplicationService({ repository: { findForActor: async () => project }, writingOperationService: f.service,
    seriesService: { getWorkspace: async () => ({ productionProject: { storyProjectId: project.id }, chapters: [] }) },
    wardrobeSuggestionService: { policyLoader: () => ({ model: 'fixture-model', provider: 'openai', maxOutputTokens: 1800 }),
      suggest: async () => { calls++; return { wardrobeDirection: 'A practical jacket.' }; } } });
  const actor = { userId: 'a' };
  const request = { operation: 'wardrobe', assignmentId: 'c1', input: {} };
  const stale = await app.quoteWriting('p1', request, actor);
  project.version++;
  await assert.rejects(app.executeWriting('p1', { ...request, input: { writingQuoteId: stale.id } }, actor));
  assert.equal(calls, 0);
  const quote = await app.quoteWriting('p1', request, actor);
  const result = await app.executeWriting('p1', { ...request, input: { writingQuoteId: quote.id } }, actor);
  assert.equal(result.billingStatus, 'paid');
  assert.equal(calls, 1);
});

test('writing context changes during reservation refund before AI dispatch', async t => {
  const f = await fixture(t);
  let current = source;
  const reserve = f.credits.reserveWriting.bind(f.credits);
  f.credits.reserveWriting = async inputs => {
    const reserved = await reserve(inputs);
    current = { ...source, rootVersion: 2 };
    return reserved;
  };
  let calls = 0;
  await assert.rejects(f.service.execute({ ...f.args, loadSource: async () => current,
    run: async () => { calls++; return {}; } }), { code: 'cinematic_writing_source_changed' });
  assert.equal(calls, 0);
  assert.equal((await f.credits.getAccount('a')).availableCredits, 200);
  assert.equal((await f.credits.getAccount('a')).reservedCredits, 0);
});

test('writing binds canonical pinned or legacy Full Story root and sibling revision identities', async t => {
  for (const pinned of [true, false]) {
    const f = await fixture(t);
    const makeProject = (id, number) => ({ id, version: 1, title: id, setup: {}, castAssignments: [], scenes: [],
      chapterStory: 'Unchanged prose', activeChapterVersionId: `${id}-rev1`, chapterVersions: [], fullStoryVersions: [],
      seriesMembership: { seriesId: 'series', seasonId: 'season', chapterNumber: number } });
    const root = makeProject('root', 1);
    root.fullStoryVersions = [{ id: 'story', content: 'Confirmed full story' }];
    root.activeFullStoryVersionId = root.confirmedFullStoryVersionId = 'story';
    const sibling = makeProject('sibling', 2);
    sibling.chapterOrigin = { projectId: root.id };
    const target = makeProject('target', 3);
    target.chapterOrigin = { projectId: sibling.id };
    const data = { projects: [root, sibling, target], series: [{ id: 'series', version: 1, title: 'Series',
      ...(pinned ? { storyProjectId: root.id } : {}), seasons: [{ id: 'season', number: 1 }] }] };
    // Legacy canonical resolution follows its documented origin fallback.
    if (!pinned) delete target.chapterOrigin;
    const repository = { findForActor: async id => structuredClone(data.projects.find(item => item.id === id)),
      readSeriesWorkspaceForActor: async () => structuredClone(data) };
    const seriesService = new CinematicSeriesService({ repository });
    const app = new CinematicApplicationService({ repository, seriesService, writingOperationService: f.service,
      fullStoryService: { policyLoader: () => ({ model: 'fixture-model', provider: 'openai', maxOutputTokens: 1800 }) } });
    const actor = { userId: 'a' };
    const payload = { operation: 'chapters', input: { expectedVersion: 1, scope: 'selected', instruction: 'Refine continuity.' } };
    const prepared = await app.writingSource(target.id, payload, actor);
    assert.equal(prepared.source.rootId, root.id);
    assert.equal(prepared.source.fullStory, 'Confirmed full story');
    let calls = 0;
    app.proposeChapters = async () => { calls++; return {}; };
    const rootQuote = await app.quoteWriting(target.id, payload, actor);
    root.version++;
    await assert.rejects(app.executeWriting(target.id, { ...payload, input: { ...payload.input, writingQuoteId: rootQuote.id } }, actor));
    const siblingQuote = await app.quoteWriting(target.id, payload, actor);
    sibling.activeChapterVersionId = 'same-prose-restored-rev2';
    await assert.rejects(app.executeWriting(target.id, { ...payload, input: { ...payload.input, writingQuoteId: siblingQuote.id } }, actor));
    const racedQuote = await app.quoteWriting(target.id, payload, actor);
    const reserve = f.credits.reserveWriting.bind(f.credits);
    f.credits.reserveWriting = async inputs => { const result = await reserve(inputs); sibling.version++; return result; };
    await assert.rejects(app.executeWriting(target.id, { ...payload, input: { ...payload.input, writingQuoteId: racedQuote.id } }, actor),
      { code: 'cinematic_writing_source_changed' });
    assert.equal(calls, 0);
    assert.equal((await f.credits.getAccount('a')).availableCredits, 200);
    assert.equal((await f.credits.getAccount('a')).reservedCredits, 0);
  }
});

test('authoring rechecks context after its own snapshot read and before provider dispatch', async t => {
  const f = await fixture(t);
  const project = { id: 'p1', version: 1, title: 'Story', setup: {}, castAssignments: [], scenes: [],
    fullStoryVersions: [{ id: 'story', content: 'Saved story' }], activeFullStoryVersionId: 'story' };
  let reads = 0;
  let calls = 0;
  const app = new CinematicApplicationService({ writingOperationService: f.service,
    repository: { findForActor: async () => {
      reads++;
      const snapshot = structuredClone(project);
      if (reads === 4) project.version++;
      return snapshot;
    } },
    seriesService: { getWorkspace: async () => ({ productionProject: { storyProjectId: 'p1' }, chapters: [] }) },
    fullStoryService: { policyLoader: () => ({ model: 'fixture-model', provider: 'openai', maxOutputTokens: 1800 }),
      proposeCharacters: async () => { calls++; return {}; } } });
  const actor = { userId: 'a' };
  const payload = { operation: 'characters', input: { expectedVersion: 1, purpose: 'characters' } };
  const quote = await app.quoteWriting('p1', payload, actor);
  await assert.rejects(app.executeWriting('p1', { ...payload, input: { ...payload.input, writingQuoteId: quote.id } }, actor));
  assert.equal(calls, 0);
  assert.equal((await f.credits.getAccount('a')).availableCredits, 200);
  assert.equal((await f.credits.getAccount('a')).reservedCredits, 0);
});
