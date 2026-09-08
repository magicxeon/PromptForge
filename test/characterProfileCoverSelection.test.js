import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { CharacterProfileRepository } from '../server/repositories/character-profiles/CharacterProfileRepository.js';
import { GenerationResultRepository } from '../server/repositories/generation/GenerationResultRepository.js';
import { HistoryRepository } from '../server/repositories/generation/HistoryRepository.js';
import { CharacterProfileSharingService } from '../server/domain/character-profiles/CharacterProfileSharingService.js';

const owner = { userId: 'owner', username: 'alice' };
const other = { userId: 'other', username: 'bob' };
async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'character-cover-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const profiles = new CharacterProfileRepository({ profilesFile: path.join(dir, 'profiles.json') });
  const p = await profiles.create({ displayName: 'Mina' }, owner);
  const profile = await profiles.updateSystem(p.id, { activeVersionId: 'v1', status: 'approved', visibility: 'public' });
  const rows = [
    { id: 'legacy', username: 'alice', imageUrl: '/outputs/legacy.png', timestamp: 3 },
    { id: 'linked', username: 'alice', imageUrl: '/outputs/linked.png', timestamp: 2,
      characterProfileContext: { characterProfileId: profile.id, characterProfileVersionId: 'v1' } },
    { id: 'foreign', username: 'bob', imageUrl: '/outputs/foreign.png', timestamp: 1 }
  ];
  const historyStore = new HistoryRepository();
  historyStore.readAll = async () => structuredClone(rows);
  const users = [owner, other].map(item => ({ ...item, id: item.userId }));
  const results = new GenerationResultRepository({ historyStore, userRepository: {
    findById: async id => users.find(item => item.id === id),
    findByUsername: async username => users.find(item => item.username === username)
  } });
  const sharing = new CharacterProfileSharingService({ profileRepository: profiles,
    generationResultRepository: results, communityPostRepository: { findPublicBySourceGenerationResultIds: async () => [] },
    versionRepository: { findById: async () => ({ id: 'v1', characterProfileId: profile.id, status: 'approved', canonicalCharacterSheetAssetId: 'original', canonicalCastingExportAssetId: 'casting' }) },
    communityCharacterRepository: { upsertProfileProjection: async () => null },
    usageService: { getStats: async () => ({ totalOutputs: 0, byUseCase: {} }) }
  });
  sharing.resolveCandidateFile = async candidate => candidate.generationResultId;
  return { sharing, profiles, profile, rows };
}

test('My images includes normalized legacy owned images with a stable owner-scoped cursor', async t => {
  const f = await fixture(t);
  const first = await f.sharing.listFeaturedImageCandidates(f.profile.id, { scope: 'own', limit: 1 }, owner);
  assert.equal(first.items[0].sourceId, 'legacy');
  assert.equal(first.items[0].linkedToCharacter, false);
  assert.equal(first.hasMore, true);
  assert.ok(!JSON.stringify(first).includes('/outputs/'));
  const second = await f.sharing.listFeaturedImageCandidates(f.profile.id, { scope: 'own', limit: 1, cursor: first.nextCursor }, owner);
  assert.equal(second.items[0].sourceId, 'linked');
  assert.equal(second.hasMore, false);
  const linked = await f.sharing.listFeaturedImageCandidates(f.profile.id, {}, owner);
  assert.deepEqual(linked.items.map(item => item.sourceId), ['linked']);
  await assert.rejects(f.sharing.listFeaturedImageCandidates(f.profile.id, { scope: 'own' }, other), { code: 'character_profile_not_found' });
});

test('unlinked owned cover requires consent, persists without lineage mutation and never enters automatic selection', async t => {
  const f = await fixture(t);
  const before = structuredClone(f.rows);
  const input = { mode: 'manual', sourceType: 'generation_result', sourceId: 'legacy', recordVersion: f.profile.recordVersion };
  await assert.rejects(f.sharing.updateFeaturedImage(f.profile.id, input, owner), { code: 'character_cover_display_consent_required' });
  const updated = await f.sharing.updateFeaturedImage(f.profile.id, { ...input, displayConsentAccepted: true }, owner);
  assert.equal(updated.featuredGenerationResultId, 'legacy');
  assert.equal(await f.sharing.getFeaturedImageFile(f.profile.id, other), 'legacy');
  assert.deepEqual(f.rows, before);
  const selected = await f.profiles.findById(f.profile.id);
  const [summary] = await f.sharing.applyFeaturedWork([{ id: selected.id, characterProfileVersionId: 'v1' }], other, [selected]);
  assert.equal(summary.displayImageSource, 'owner_selected_generation');
  assert.ok(summary.displayImageUrl.endsWith(`?revision=${updated.recordVersion}`));
  await f.sharing.updateFeaturedImage(f.profile.id, { mode: 'auto', recordVersion: updated.recordVersion }, owner);
  assert.equal(await f.sharing.getFeaturedImageFile(f.profile.id, other), 'linked');
  assert.equal((await f.profiles.findById(f.profile.id)).featuredGenerationResultId, null);
});

for (const patch of [{ status: 'failed' }, { status: 'removed' }, { deletedAt: '2026-09-08' },
  { mediaType: 'video' }, { videoUrl: '/outputs/video.mp4' }, { artifactVisibility: 'system_internal' }]) {
  test(`ineligible owned image rejected for list, selection and candidate media: ${JSON.stringify(patch)}`, async t => {
    const f = await fixture(t);
    Object.assign(f.rows[0], patch);
    const page = await f.sharing.listFeaturedImageCandidates(f.profile.id, { scope: 'own' }, owner);
    assert.ok(!page.items.some(item => item.sourceId === 'legacy'));
    await assert.rejects(f.sharing.updateFeaturedImage(f.profile.id, { mode: 'manual', sourceType: 'generation_result', sourceId: 'legacy', displayConsentAccepted: true }, owner), { code: 'character_featured_work_ineligible' });
    await assert.rejects(f.sharing.getFeaturedCandidateMediaFile(f.profile.id, 'generation_result', 'legacy', owner), { code: 'character_featured_work_ineligible' });
  });
}

test('foreign cover is denied even with consent; private profile protects selected media and revoked image falls back', async t => {
  const f = await fixture(t);
  await assert.rejects(f.sharing.updateFeaturedImage(f.profile.id, { mode: 'manual', sourceType: 'generation_result', sourceId: 'foreign', displayConsentAccepted: true }, owner), { code: 'character_featured_work_ineligible' });
  await f.sharing.updateFeaturedImage(f.profile.id, { mode: 'manual', sourceType: 'generation_result', sourceId: 'legacy', displayConsentAccepted: true }, owner);
  await f.profiles.updateSystem(f.profile.id, { visibility: 'private' });
  await assert.rejects(f.sharing.getFeaturedImageFile(f.profile.id, other), { code: 'character_profile_not_found' });
  await assert.rejects(f.sharing.getFeaturedCandidateMediaFile(f.profile.id, 'generation_result', 'legacy', other), { code: 'character_profile_not_found' });
  f.rows[0].deletedAt = '2026-09-08';
  assert.equal(await f.sharing.getFeaturedImageFile(f.profile.id, owner), 'linked');
});
