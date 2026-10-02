import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CinematicApplicationService } from '../server/domain/cinematic/CinematicApplicationService.js';
import { CinematicProjectRepository } from '../server/repositories/cinematic/CinematicProjectRepository.js';
import { normalizeChapterOutlineRows, approvedChapterOutline } from '../server/domain/cinematic/CinematicChapterOutline.js';
import { estimateCinematicWriting, normalizeWritingUsage } from '../server/domain/credits/CinematicWritingPricing.js';
import { CinematicFullStoryService } from '../server/domain/generation/CinematicFullStoryService.js';
import { OpenAITextProvider } from '../server/providers/OpenAITextProvider.js';

const actor = { userId: 'outline-owner', username: 'writer', role: 'user' };
const rows = [1, 2, 3].map(n => ({ title: `Chapter ${n}`, synopsis: `Turn ${n} of the story.`, seasonNumber: 1 }));
async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'chapter-outline-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const repository = new CinematicProjectRepository({ projectsFile: path.join(dir, 'projects.json') });
  let calls = 0, request;
  const service = new CinematicApplicationService({ repository, fullStoryService: {
    proposeChapterOutline: async () => { calls++; return { chapters: rows, rationale: 'Three turns.', warnings: [], provenance: { provider: 'test', model: 'text', responseId: 'test-response', usage: null } }; },
    proposeChapters: async input => { request = input; return { proposalId: 'test-proposal', chapters: input.chapterPlan.map(row => ({ title: row.title, story: row.synopsis })), warnings: [],
      provenance: { provider: 'test', model: 'text', responseId: 'test-response', usage: { inputTokens: 100, outputTokens: 80, cachedInputTokens: 0, reasoningTokens: 20 }, recordedAt: '2026-09-26T00:00:00Z' } }; }
  } });
  let project = await service.createProject({ title: 'Story', storyBrief: 'A journey.', format: 'mini-series', durationSeconds: 60, chapterCount: 1, creationIntent: 'draft' }, actor);
  project = await service.saveFullStoryRevision(project.id, { expectedVersion: project.version, content: 'A long journey with three dramatic turns.', source: 'manual' }, actor);
  project = await service.confirmFullStoryRevision(project.id, { expectedVersion: project.version, revisionId: project.activeFullStoryVersionId }, actor);
  return { service, repository, project, calls: () => calls, request: () => request };
}

test('outline review changes the target only on approval and feeds approved Chapter generation', async t => {
  const f = await fixture(t);
  let p = await f.service.proposeChapterOutline(f.project.id, { expectedVersion: f.project.version }, actor);
  assert.equal(p.chapterOutline.chapters.length, 3);
  assert.equal(p.setup.chapterCount, 1);
  await assert.rejects(f.service.generateFullStoryChapters(p.id, { expectedVersion: p.version }, actor), { code: 'cinematic_chapter_outline_review_required' });
  const edited = rows.map(row => ({ ...row, title: `Reviewed ${row.title}` }));
  p = await f.service.approveChapterOutline(p.id, { expectedVersion: p.version, outlineId: p.chapterOutline.id, chapters: edited }, actor);
  assert.equal(p.setup.chapterCount, 3);
  assert.equal(p.chapterStory, '');
  assert.equal(p.scenes.length, 0);
  assert.throws(() => approvedChapterOutline({ ...p, setup: { ...p.setup, chapterCount: 2 } }), { code: 'cinematic_chapter_outline_stale' });
  assert.throws(() => approvedChapterOutline({ ...p, activeFullStoryVersionId: 'unconfirmed-edit' }), { code: 'cinematic_chapter_outline_stale' });
  const generated = await f.service.generateFullStoryChapters(p.id, { expectedVersion: p.version }, actor);
  assert.equal(f.request().chapterPlan[0].title, 'Reviewed Chapter 1');
  assert.equal(f.request().chapterPlan[0].synopsis, rows[0].synopsis);
  assert.equal(generated.workspace.chapters.length, 3);
  assert.equal(generated.proposal.provenance.usage.inputTokens, 100);
  const stored = await f.repository.findForActor(p.id, actor);
  assert.equal(stored.chapterProposals.at(-1).provenance.usage.outputTokens, 80);
});

test('outline approval rejects stale versions and story changes; discard leaves prose intact', async t => {
  const f = await fixture(t);
  let p = await f.service.proposeChapterOutline(f.project.id, { expectedVersion: f.project.version }, actor);
  await assert.rejects(f.service.approveChapterOutline(p.id, { expectedVersion: p.version - 1, outlineId: p.chapterOutline.id, chapters: rows }, actor));
  p = await f.service.saveFullStoryRevision(p.id, { expectedVersion: p.version, source: 'manual', content: 'Changed ending.' }, actor);
  p = await f.service.confirmFullStoryRevision(p.id, { expectedVersion: p.version, revisionId: p.activeFullStoryVersionId }, actor);
  await assert.rejects(f.service.approveChapterOutline(p.id, { expectedVersion: p.version, outlineId: p.chapterOutline.id, chapters: rows }, actor), { code: 'cinematic_chapter_outline_stale' });
  p = await f.service.approveChapterOutline(p.id, { expectedVersion: p.version, outlineId: p.chapterOutline.id, action: 'discard' }, actor);
  assert.equal(p.chapterOutline, null);
  assert.equal(p.fullStoryVersions.at(-1).content, 'Changed ending.');
  assert.equal(p.setup.chapterCount, 1);
});

test('foreign and child outline requests never dispatch a provider', async t => {
  const f = await fixture(t);
  await assert.rejects(f.service.proposeChapterOutline(f.project.id, { expectedVersion: f.project.version }, { ...actor, userId: 'other' }));
  const child = await f.repository.mutateForActor(f.project.id, actor, p => { p.chapterOrigin = { projectId: 'another-root' }; return p; });
  await assert.rejects(f.service.proposeChapterOutline(child.id, { expectedVersion: child.version }, actor), { code: 'cinematic_chapter_outline_root_required' });
  assert.equal(f.calls(), 0);
});

test('pending prose blocks planning and bounded outline history preserves existing production', async t => {
  const f = await fixture(t);
  let p = await f.repository.mutateForActor(f.project.id, actor, p => {
    p.chapterProposals = [{ id: 'pending', status: 'pending_review', scope: 'all' }]; return p;
  });
  await assert.rejects(f.service.proposeChapterOutline(p.id, { expectedVersion: p.version }, actor), { code: 'cinematic_chapter_proposal_pending' });
  assert.equal(f.calls(), 0);
  p = await f.repository.mutateForActor(p.id, actor, p => {
    p.chapterProposals = [];
    p.chapterStory = 'Existing prose'; p.generationAttempts = [{ id: 'existing-take', status: 'complete' }]; return p;
  });
  for (let n = 0; n < 12; n++) p = await f.service.proposeChapterOutline(p.id, { expectedVersion: p.version }, actor);
  assert.equal(p.chapterOutlineHistory.length, 10);
  p = await f.service.approveChapterOutline(p.id, { expectedVersion: p.version, outlineId: p.chapterOutline.id, chapters: rows }, actor);
  assert.equal(p.chapterOutlineHistory.length, 10);
  assert.equal(p.chapterStory, 'Existing prose');
  assert.deepEqual(p.generationAttempts, [{ id: 'existing-take', status: 'complete' }]);
});

test('advisory service does not dispatch and unavailable provider settings yield unknown prices', async () => {
  const service = new CinematicFullStoryService({ policyLoader: () => ({ enabled: false }), providerFactory: () => assert.fail('unexpected dispatch') });
  const result = await service.estimateChapterPlanning({ fullStory: 'Story' });
  assert.deepEqual(result.estimates, { chapter_outline: null, chapters: null });
  assert.equal(result.billingStatus, 'qualification_no_charge');
});

test('outline rows reject missing fields, excessive count, Movie expansion and missing Seasons', () => {
  const setup = { format: 'mini-series', seasonEnabled: false, seasonCount: 1 };
  for (const bad of [[], [{ ...rows[0], title: ' ' }], Array(25).fill(rows[0]), [{ ...rows[0], seasonNumber: 0 }]]) assert.throws(() => normalizeChapterOutlineRows(bad, setup));
  assert.throws(() => normalizeChapterOutlineRows(rows, { ...setup, format: 'short-film' }));
  assert.throws(() => normalizeChapterOutlineRows(rows, { ...setup, seasonEnabled: true, seasonCount: 2 }));
});

test('advisory pricing includes margin, rounds up, distinguishes unknown rates and never charges', async () => {
  const policy = JSON.parse(await fs.readFile(new URL('../server/config/credit-pricing-policy.json', import.meta.url), 'utf8'));
  const input = { operation: 'chapters', model: 'gpt-6-sol', inputBytes: 46250, maxOutputTokens: 8000 };
  const now = Date.parse('2026-09-26');
  const paidPreview = estimateCinematicWriting(policy, input, now);
  assert.equal(paidPreview.publicEstimate.chargeCredits, paidPreview.publicEstimate.credits);
  assert.equal(paidPreview.publicEstimate.costBasis, 'service_price_preview');
  policy.cinematicWritingBilling = { ...policy.cinematicWritingBilling, enabled: false };
  const price = estimateCinematicWriting(policy, input, now);
  assert.equal(price.inputTokens, 20000);
  assert.equal(price.providerCostUsd, 0.12);
  assert.equal(price.publicEstimate.credits, 165);
  assert.equal(price.publicEstimate.chargeCredits, 0);
  assert.ok(price.assumedGrossMargin >= 0.7);
  assert.ok(estimateCinematicWriting(policy, { ...input, inputBytes: 150000 }, now).publicEstimate.credits > price.publicEstimate.credits);
  assert.equal(estimateCinematicWriting(policy, { ...input, model: 'unknown' }, now), null);
  assert.equal(estimateCinematicWriting(policy, input, Date.parse('2030-01-01')), null);
  assert.equal(estimateCinematicWriting({ ...policy, targetGrossMarginRate: 1 }, input, now), null);
  assert.equal(normalizeWritingUsage(null), null);
  assert.deepEqual(normalizeWritingUsage({ input_tokens: 100, output_tokens: 80, output_tokens_details: { reasoning_tokens: 50 } }),
    { inputTokens: 100, outputTokens: 80, cachedInputTokens: 0, reasoningTokens: 50 });
});

test('outline provider uses the structured recipe and records returned token usage', async () => {
  const provider = new OpenAITextProvider('fixture');
  let request;
  provider.requestStructured = async input => { request = input; return { id: 'response', output_text: JSON.stringify({ chapters: rows, rationale: 'Three turns.', warnings: [] }), usage: { input_tokens: 100, output_tokens: 80 } }; };
  const service = new CinematicFullStoryService({ policyLoader: () => ({ enabled: true, provider: 'openai', model: 'gpt-6-sol', apiKey: 'fixture', maxOutputTokens: 8000 }),
    providerFactory: () => provider, availabilityPolicy: { assertAvailable: () => {} } });
  const result = await service.proposeChapterOutline({ fullStory: 'Story', settings: { format: 'mini-series', seasonEnabled: false, seasonCount: 1 } });
  assert.equal(result.chapters.length, 3);
  assert.equal(request.schemaName, 'momelo_cinematic_chapter_outline');
  assert.equal(result.provenance.usage.inputTokens, 100);
});
