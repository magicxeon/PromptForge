import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { CharacterLookService } from '../server/domain/character-profiles/CharacterLookService.js';
import { CharacterLookRepository } from '../server/repositories/character-profiles/CharacterLookRepository.js';
import { CinematicWardrobeAuthorityService } from '../server/domain/assets/CinematicWardrobeAuthorityService.js';
import { AssetRepository } from '../server/repositories/assets/AssetRepository.js';
import { TrustedGeneratedSourceService } from '../server/domain/generation/TrustedGeneratedSourceService.js';
import { TrustedGeneratedSourceRepository } from '../server/repositories/generation/TrustedGeneratedSourceRepository.js';
import { loadVideoReferenceAssetContent } from '../server/domain/assets/VideoReferenceAssetContent.js';

const actor = { userId: 'owner', username: 'owner', role: 'user' };
const other = { userId: 'other', username: 'other', role: 'user' };
const input = { characterProfileVersionId: 'charv1', name: 'Garden Look',
  generationResultId: 'sheet1', identityAndViewsConfirmed: true };

async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'generated-cast-sheet-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const bytes = await sharp({ create: { width: 512, height: 768, channels: 3, background: '#8a9199' } }).png().toBuffer();
  await fs.writeFile(path.join(dir, 'sheet.png'), bytes);
  const source = { id: 'sheet1', ownerUserId: actor.userId, storageKey: 'sheet.png',
    providerId: 'modelark', modelId: 'dola-seedream-5-0-pro-260628',
    generationMode: 'text_to_image', referenceCount: 0, providerRequestId: 'provider-job',
    credentialScope: 'scope', generatedAt: '2026-09-08T00:00:00Z', timestampSource: 'provider',
    originalOutputUrl: 'https://test.bytepluses.com/sheet.png?private=fixture-only',
    contentHash: crypto.createHash('sha256').update(bytes).digest('hex'), sizeBytes: bytes.length };
  const state = { now: Date.parse('2026-09-09T00:00:00Z'), scope: 'scope', deleted: false, failUrl: false, urlCalls: 0 };
  const trustedRepository = new TrustedGeneratedSourceRepository({ file: path.join(dir, 'trusted.json') });
  await trustedRepository.create(source);
  const trustedSources = new TrustedGeneratedSourceService({
    repository: trustedRepository,
    history: { async findByIdForOwner(id, owner) {
      return owner === actor.userId && id === source.id && !state.deleted ? { id, imageUrl: '/outputs/sheet.png' } : null;
    } },
    scopeResolver: () => state.scope, now: () => state.now,
    contentLoader: item => loadVideoReferenceAssetContent(item, { outputsDirectory: dir }),
    urlVerifier: async () => { state.urlCalls++; if (state.failUrl) throw new Error('URL failed'); }
  });
  const assets = new AssetRepository({ assetsFile: path.join(dir, 'assets.json'), userRepository: {} });
  const repository = new CharacterLookRepository({ looksFile: path.join(dir, 'looks.json') });
  const service = new CharacterLookService({ repository, outputsDirectory: dir, assetRepository: assets,
    wardrobeAuthorityService: new CinematicWardrobeAuthorityService({ assetRepository: assets }), trustedSources,
    characterAuthorizationService: { async validateGenerationContext(context, caller) {
      if (caller.userId !== actor.userId || context.characterProfileVersionId !== 'charv1') throw new Error('Character forbidden');
      return { identityPack: { characterProfileVersionId: 'charv1', canonicalFaceAssetId: 'face' },
        attribution: { ownerUserId: actor.userId } };
    } }
  });
  return { service, repository, assets, trustedSources, trustedRepository, state, source, dir };
}

test('import: retains whole original, conservative provenance and review before explicit approval', async t => {
  const f = await fixture(t);
  const look = await f.service.importGeneratedSheet('character', input, actor);
  const version = look.versions[0];
  assert.equal(look.lifecycleStatus, 'review');
  assert.equal(version.sourceMode, 'generated_character_sheet');
  assert.equal(version.provenance.kind, 'generated_import');
  assert.equal(version.identityAssurance.status, 'unverified');
  assert.equal(version.cropManifest, null);
  assert.equal(version.provenance.recipeId, null);
  assert.equal(JSON.stringify(look).includes('private=fixture'), false);
  for (const view of Object.values(version.approvedViewAssets)) {
    assert.equal(view.assetId, version.approvedSheetAsset.assetId);
    assert.equal(view.cropRegion, undefined);
  }
  const approved = await f.service.approve('character', look.id, version.id, actor);
  assert.equal(approved.versions[0].identityAssurance.status, 'user_confirmed');
  const resolved = await f.service.resolveApprovedSheetReference('character', look.id, version.id, actor);
  assert.equal(resolved.trustedGenerationId, 'sheet1');
  assert.equal(resolved.asset.contentHash, f.source.contentHash);
  assert.equal(resolved.asset.width, 512);
  assert.equal(f.state.urlCalls, 0);
});

test('import: duplicate concurrent requests and partial-review retry reuse the Asset and Look', async t => {
  const f = await fixture(t);
  const original = f.repository.attachReview.bind(f.repository);
  let fail = true;
  f.repository.attachReview = (...args) => {
    if (fail) { fail = false; throw new Error('Simulated storage interruption'); }
    return original(...args);
  };
  await assert.rejects(f.service.importGeneratedSheet('character', input, actor), /interruption/);
  const looks = await Promise.all([1, 2].map(() => f.service.importGeneratedSheet('character', input, actor)));
  assert.equal(looks[0].id, looks[1].id);
  assert.equal((await f.assets.readRaw()).length, 1);
  assert.equal((await f.repository.readAll()).length, 1);
  assert.equal(looks[0].lifecycleStatus, 'review');
});

test('import: missing confirmation, foreign Character/source and deleted source cannot import', async t => {
  const f = await fixture(t);
  await assert.rejects(f.service.importGeneratedSheet('character', { ...input, identityAndViewsConfirmed: false }, actor),
    { code: 'character_look_import_confirmation_required' });
  await assert.rejects(f.service.importGeneratedSheet('character', input, other), /Character forbidden/);
  await assert.rejects(f.trustedSources.describeOwnedImage('sheet1', other), { code: 'video_trusted_source_unavailable' });
  f.state.deleted = true;
  await assert.rejects(f.service.importGeneratedSheet('character', input, actor), { code: 'video_trusted_source_unavailable' });
  assert.equal((await f.repository.readAll()).length, 0);
});

test('import: discarding an unapproved import permits a new Look without duplicating the source Asset', async t => {
  const f = await fixture(t);
  const first = await f.service.importGeneratedSheet('character', input, actor);
  await f.service.retire('character', first.id, actor);
  const next = await f.service.importGeneratedSheet('character', input, actor);
  assert.notEqual(next.id, first.id);
  assert.equal(next.lifecycleStatus, 'review');
  assert.equal((await f.assets.readRaw()).length, 1);
});

test('import: expiry and account changes fail at approval and approved-reference resolution', async t => {
  const f = await fixture(t);
  const look = await f.service.importGeneratedSheet('character', input, actor);
  f.state.now += 31 * 86400000;
  await assert.rejects(f.service.approve('character', look.id, look.activeVersionId, actor), { code: 'video_trusted_source_unavailable' });
  f.state.now -= 31 * 86400000;
  await f.service.approve('character', look.id, look.activeVersionId, actor);
  f.state.scope = 'other-account';
  await assert.rejects(f.service.resolveApprovedSheetReference('character', look.id, look.activeVersionId, actor),
    { code: 'video_trusted_source_unavailable' });
});

test('import: changed bytes and rejected original cannot be approved', async t => {
  const f = await fixture(t);
  const look = await f.service.importGeneratedSheet('character', input, actor);
  const bytes = await fs.readFile(path.join(f.dir, 'sheet.png'));
  await fs.writeFile(path.join(f.dir, 'sheet.png'), Buffer.from('changed'));
  await assert.rejects(f.service.approve('character', look.id, look.activeVersionId, actor), { code: 'video_reference_content_invalid' });
  await fs.writeFile(path.join(f.dir, 'sheet.png'), bytes);
  await f.trustedSources.recordRejection({ id: 'failed-video', providerError: { code: 'InputImageSensitiveContentDetected' },
    submittedRequest: { references: [{ assetId: 'look-asset', trustedGenerationId: 'sheet1' }] } }, actor);
  assert.ok((await f.trustedRepository.findManyForOwner(['sheet1'], actor.userId))[0].rejection);
  await assert.rejects(f.service.approve('character', look.id, look.activeVersionId, actor), { code: 'video_trusted_source_unavailable' });
});

test('transport: private original URL only, URL/hash failures never fall back to a local upload', async t => {
  const f = await fixture(t);
  const safe = await f.trustedSources.describeOwnedImage('sheet1', actor);
  assert.equal(JSON.stringify(safe).includes('private=fixture'), false);
  assert.equal(await f.trustedSources.resolveOwnedImage('sheet1', actor, safe.contentHash), f.source.originalOutputUrl);
  await assert.rejects(f.trustedSources.resolveOwnedImage('sheet1', actor, 'wrong-hash'), { code: 'video_trusted_source_unavailable' });
  f.state.failUrl = true;
  await assert.rejects(f.trustedSources.resolveOwnedImage('sheet1', actor, safe.contentHash), /URL failed/);
});
