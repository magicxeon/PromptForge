import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { CharacterProfileRepository } from '../server/repositories/character-profiles/CharacterProfileRepository.js';
import { CharacterProfileService } from '../server/domain/character-profiles/CharacterProfileService.js';
import { CharacterProfileSharingService } from '../server/domain/character-profiles/CharacterProfileSharingService.js';
import { canReuseCharacterProfile, canViewCharacterProfile } from '../server/domain/character-profiles/characterProfilePolicy.js';
import { registerCharacterProfileRoutes } from '../server/app/routes/characterProfileRoutes.js';
import { CharacterUsageService } from '../server/domain/character-profiles/CharacterUsageService.js';
import { CharacterLookService } from '../server/domain/character-profiles/CharacterLookService.js';

const actor = { userId: 'owner', username: 'owner' };
async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'character-delete-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const repo = new CharacterProfileRepository({ profilesFile: path.join(dir, 'profiles.json') });
  const profile = await repo.create({ displayName: 'Keep my images' }, actor);
  await repo.updateSystem(profile.id, { status: 'approved', visibility: 'public', reusePolicy: 'public_reusable', activeVersionId: 'v1' });
  const events = [];
  const projections = [];
  const sharing = { syncProjection: async item => projections.push(item) };
  const service = new CharacterProfileService({ profileRepository: repo, profileSharingService: sharing,
    auditRepository: { appendEvent: async event => events.push(event) } });
  return { repo, profile, service, sharing, events, projections };
}

test('delete requires exact confirmation and ownership without changing the record', async t => {
  const f = await fixture(t);
  for (const confirmation of ['', 'delete', ' DELETE ', null]) {
    await assert.rejects(f.service.deleteOwned(f.profile.id, { confirmation }, actor), { code: 'character_delete_confirmation_required' });
  }
  await assert.rejects(f.service.deleteOwned(f.profile.id, { confirmation: 'DELETE' }, { userId: 'foreign' }), { code: 'character_profile_not_found' });
  assert.equal((await f.repo.findById(f.profile.id)).status, 'approved');
  assert.equal(f.events.length, 0);
});

test('soft deletion is idempotent, hides reads and denies stale resurrection while retaining identity history', async t => {
  const f = await fixture(t);
  const first = await f.service.deleteOwned(f.profile.id, { confirmation: 'DELETE' }, actor);
  const [second, third] = await Promise.all([1, 2].map(() => f.service.deleteOwned(f.profile.id, { confirmation: 'DELETE' }, actor)));
  assert.deepEqual(first, second);
  assert.deepEqual(first, third);
  const [stored] = await f.repo.readAll();
  assert.equal(stored.status, 'deleted');
  assert.equal(stored.deletedByUserId, actor.userId);
  assert.equal(stored.activeVersionId, 'v1');
  assert.equal(stored.recordVersion, 3);
  assert.equal(canViewCharacterProfile(stored, actor), false);
  assert.equal(canReuseCharacterProfile(stored, actor), false);
  assert.equal(await f.repo.findById(f.profile.id), null);
  assert.equal(await f.repo.findByIdForOwner(f.profile.id, actor.userId), null);
  assert.equal((await f.repo.findByOwner(actor.userId)).items.length, 0);
  assert.equal((await f.repo.listPublic()).items.length, 0);
  await assert.rejects(f.repo.updateOwned(f.profile.id, { displayName: 'Revive' }, actor), { code: 'character_profile_not_found' });
  await assert.rejects(f.repo.updateSystem(f.profile.id, { status: 'approved' }), { code: 'character_profile_not_found' });
  await assert.rejects(f.service.getOwnerDetail(f.profile.id, actor), { code: 'character_profile_not_found' });
  await assert.rejects(f.service.deleteOwned(f.profile.id, { confirmation: 'DELETE' }, { userId: 'foreign' }), { code: 'character_profile_not_found' });
  const sharing = new CharacterProfileSharingService({ profileRepository: f.repo });
  await assert.rejects(sharing.createHandoff(f.profile.id, {}, actor), { code: 'character_profile_reuse_forbidden' });
  await assert.rejects(sharing.getMediaFile(f.profile.id, actor), { code: 'character_profile_not_found' });
  assert.equal(f.events[0].action, 'character_profile_delete');
  assert.equal(f.projections[0].visibility, 'private');
});

test('projection failure leaves authoritative tombstone and cleanup can be retried', async t => {
  const f = await fixture(t);
  let fail = true;
  f.sharing.syncProjection = async () => { if (fail) throw new Error('storage unavailable'); };
  await assert.rejects(f.service.deleteOwned(f.profile.id, { confirmation: 'DELETE' }, actor), /storage unavailable/);
  assert.equal(await f.repo.findById(f.profile.id), null);
  fail = false;
  assert.equal((await f.service.deleteOwned(f.profile.id, { confirmation: 'DELETE' }, actor)).status, 'deleted');
  assert.equal(f.events.length, 1);
});

test('deletion denies new Look actions but retains usage accounting for already accepted work', async t => {
  const f = await fixture(t);
  await f.service.deleteOwned(f.profile.id, { confirmation: 'DELETE' }, actor);
  const recorded = [];
  const usage = new CharacterUsageService({ profileRepository: f.repo,
    versionRepository: { findById: async () => ({ id: 'v1', characterProfileId: f.profile.id, status: 'approved', canonicalCastingExportAssetId: 'sheet' }) },
    usageRepository: { createIdempotent: async input => { recorded.push(input); return input; } }
  });
  await usage.handleCompletedGeneration({ job: { id: 'accepted-before-delete', options: {
    payerUserId: actor.userId, characterProfileContext: { characterProfileId: f.profile.id, characterProfileVersionId: 'v1' }
  } } });
  assert.equal(recorded[0].generationJobId, 'accepted-before-delete');
  const look = { id: 'look', characterProfileId: f.profile.id, sourceCharacterProfileVersionId: 'v1', lifecycleStatus: 'draft', versions: [] };
  const looks = new CharacterLookService({ characterAuthorizationService: usage,
    repository: { findForOwner: async () => look } });
  await assert.rejects(looks.approve(f.profile.id, 'look', 'lv1', actor), { code: 'character_usage_context_invalid' });
  await assert.rejects(looks.getReviewMediaFile(f.profile.id, 'look', 'lv1', actor), { code: 'character_usage_context_invalid' });
  await assert.rejects(looks.retire(f.profile.id, 'look', actor), { code: 'character_usage_context_invalid' });
});

test('DELETE route delegates actor, confirmation and request ID to canonical facade', async () => {
  const routes = new Map();
  const app = { use() {}, get() {}, post() {}, patch() {}, delete: (url, handler) => routes.set(url, handler) };
  let received;
  registerCharacterProfileRoutes(app, { profileService: { deleteOwned: async (...args) => {
    received = args; return { id: 'c', status: 'deleted' };
  } } });
  let output;
  await routes.get('/api/character-profiles/:id')({ params: { id: 'c' }, body: { confirmation: 'DELETE' }, actorContext: actor, requestId: 'req' }, { json: value => { output = value; } });
  assert.deepEqual(received, ['c', { confirmation: 'DELETE' }, actor, { requestId: 'req' }]);
  assert.equal(output.status, 'deleted');
});
