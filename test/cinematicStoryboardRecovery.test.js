import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { GenerationGroupRepository } from '../server/repositories/generation/GenerationGroupRepository.js';
import { GenerationResultRepository } from '../server/repositories/generation/GenerationResultRepository.js';
import { CinematicStoryboardAssetService } from '../server/domain/assets/CinematicStoryboardAssetService.js';

const actor = { userId: 'usr_alice', username: 'alice' };
const group = () => ({
  actorUserId: actor.userId, actorUsername: actor.username,
  generationSurface: 'cinematic', generationMode: 'scene', childJobIds: ['job_a'],
  children: [{ jobId: 'job_a', status: 'completed', creditCharged: true, creditRefunded: false,
    result: { imageUrl: '/outputs/job_a.png', mimeType: 'image/png' } }]
});

async function fixture(t, record = group(), history = null) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'storyboard-recovery-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const groupsFile = path.join(dir, 'groups.json');
  await fs.writeFile(groupsFile, JSON.stringify([record]));
  const results = new GenerationResultRepository({
    historyStore: { getById: async () => history },
    groupRepository: new GenerationGroupRepository({ groupsFile })
  });
  const assets = new CinematicStoryboardAssetService({
    outputsDirectory: dir, generationResults: results,
    assetRepository: {
      findBySourceJobIdForOwner: async () => null,
      create: async input => ({ ...input, id: 'asset_a', createdAt: '2026-09-12T00:00:00Z' })
    }
  });
  return { dir, results, assets };
}

test('approval recovers a durable owned result without History or invented sketch metadata', async t => {
  const { dir, assets } = await fixture(t);
  await fs.writeFile(path.join(dir, 'job_a.png'), 'original-output');
  const result = await assets.approveGenerationResult({ jobId: 'job_a' }, actor);
  assert.equal(result.imageUrl, '/outputs/job_a.png');
  assert.equal(result.storyboardRenderStyle, null);
  assert.equal(result.providerOutputProvenance, null);
  assert.match(result.contentHash, /^[a-f0-9]{64}$/);
});

test('recovery retains explicit server-authored sketch metadata', async t => {
  const record = group();
  record.children[0].result.storyboardRenderStyle = 'concept_sketch_v1';
  const { results } = await fixture(t, record);
  assert.equal((await results.findStoryboardSourceForOwner('job_a', actor)).storyboardRenderStyle, 'concept_sketch_v1');
});

test('recovery rejects missing, foreign, pending, refunded and non-Cinematic results', async t => {
  for (const [name, change] of [
    ['foreign', g => { g.actorUserId = 'usr_bob'; }],
    ['foreign username', g => { g.actorUsername = 'bob'; }],
    ['pending', g => { g.children[0].status = 'processing'; }],
    ['refunded', g => { g.children[0].creditRefunded = true; }],
    ['uncaptured', g => { g.children[0].creditCharged = false; }],
    ['playground', g => { g.generationSurface = 'playground'; }],
    ['look sheet', g => { g.generationMode = 'character-sheet'; }],
    ['missing child', g => { g.children = []; }]
  ]) {
    const record = group();
    change(record);
    const { results } = await fixture(t, record);
    assert.equal(await results.findStoryboardSourceForOwner('job_a', actor), null, name);
  }
});

test('existing History remains authoritative over recovery', async t => {
  const history = { id: 'job_a', username: 'bob', imageUrl: '/outputs/job_a.png' };
  const { results } = await fixture(t, group(), history);
  assert.equal(await results.findStoryboardSourceForOwner('job_a', actor), null);
  history.username = actor.username;
  assert.deepEqual(await results.findStoryboardSourceForOwner('job_a', actor), history);
});

test('recovered approval still rejects deleted files and unsafe output paths', async t => {
  const { assets } = await fixture(t);
  await assert.rejects(assets.approveGenerationResult({ jobId: 'job_a' }, actor),
    { code: 'cinematic_storyboard_source_unavailable' });
  const record = group();
  record.children[0].result.imageUrl = '/outputs/../private.png';
  const unsafe = await fixture(t, record);
  await assert.rejects(unsafe.assets.approveGenerationResult({ jobId: 'job_a' }, actor),
    { code: 'cinematic_storyboard_source_unavailable' });
});
