import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { CharacterLookRepository } from '../server/repositories/character-profiles/CharacterLookRepository.js';
import { CharacterLookService } from '../server/domain/character-profiles/CharacterLookService.js';

const alice = { userId: 'usr_alice', username: 'user_alice', role: 'user' };
const bob = { userId: 'usr_bob', username: 'user_bob', role: 'user' };

async function fixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'character-look-'));
  const repository = new CharacterLookRepository({ looksFile: path.join(directory, 'looks.json') });
  const characterAuthorizationService = {
    validateGenerationContext: async (context, actor) => ({
      ...context,
      identityPack: {
        characterProfileId: context.characterProfileId,
        characterProfileVersionId: context.characterProfileVersionId,
        canonicalFaceAssetId: 'ast_face',
        status: 'identity_pack_ready'
      },
      attribution: { ownerUserId: actor.userId, ownerUsername: actor.username }
    })
  };
  const wardrobeAuthorityService = {
    authorizeLook: async input => ({
      mode: input.mode,
      assets: (input.assetIds || []).map(id => ({ id, assetType: 'generation_reference', contentHash: `hash_${id}` }))
    })
  };
  return {
    directory,
    service: new CharacterLookService({ repository, characterAuthorizationService, wardrobeAuthorityService })
  };
}

test('Character Look drafts pin Character identity and owned garment authority', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const created = await service.createDraft('charprof_a', {
    characterProfileVersionId: 'charver_a',
    name: 'Station Arrival',
    sourceMode: 'uploaded',
    garmentAuthorities: { upper: { front: 'ast_top' }, lower: { front: 'ast_bottom' } },
    idempotencyKey: 'look-station-arrival'
  }, alice);

  assert.equal(created.sourceCharacterProfileVersionId, 'charver_a');
  assert.equal(created.lifecycleStatus, 'draft');
  assert.equal(created.versions[0].status, 'source_ready');
  assert.equal(created.versions[0].canonicalFaceAssetId, 'ast_face');
  assert.deepEqual(created.versions[0].garmentAuthorities, { upper: { front: 'ast_top' }, lower: { front: 'ast_bottom' } });
  assert.equal((await service.list('charprof_a', { characterProfileVersionId: 'charver_a' }, alice)).items.length, 1);
  assert.equal((await service.list('charprof_a', { characterProfileVersionId: 'charver_a' }, bob)).items.length, 0);
});

test('Character Look approval requires an explicit complete three-view review set', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const created = await service.createDraft('charprof_a', {
    characterProfileVersionId: 'charver_a', name: 'Platform Look', sourceMode: 'uploaded',
    garmentAuthorities: { full_look: { front: 'ast_outfit' } }
  }, alice);
  const versionId = created.versions[0].id;
  await assert.rejects(
    service.attachReview('charprof_a', created.id, versionId, {
      viewAssetIds: { front: 'ast_front', side: 'ast_side' }
    }, alice),
    error => error.code === 'character_look_views_required'
  );
  const review = await service.attachReview('charprof_a', created.id, versionId, {
    viewAssetIds: { front: 'ast_front', side: 'ast_side', back: 'ast_back' }
  }, alice);
  assert.equal(review.versions[0].status, 'review');
  const approved = await service.approve('charprof_a', created.id, versionId, alice);
  assert.equal(approved.lifecycleStatus, 'approved');
  assert.equal(approved.approvedVersionId, versionId);
});

test('Approved Look resolution reauthorizes the exact pinned Character version', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'character-look-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const contexts = [];
  const repository = new CharacterLookRepository({ looksFile: path.join(directory, 'looks.json') });
  const service = new CharacterLookService({
    repository,
    characterAuthorizationService: {
      validateGenerationContext: async (context, actor) => {
        contexts.push(structuredClone(context));
        return {
          identityPack: {
            characterProfileVersionId: context.characterProfileVersionId,
            canonicalFaceAssetId: 'ast_face'
          },
          attribution: { ownerUserId: actor.userId }
        };
      }
    },
    wardrobeAuthorityService: {
      authorizeLook: async input => ({
        assets: (input.assetIds || []).map(id => ({ id, contentHash: `hash_${id}` }))
      })
    }
  });
  const created = await service.createDraft('charprof_a', {
    characterProfileVersionId: 'charver_pinned',
    name: 'Pinned Look',
    sourceMode: 'uploaded',
    garmentAuthorities: { full_look: { front: 'ast_outfit' } }
  }, alice);
  const versionId = created.activeVersionId;
  await service.attachReview('charprof_a', created.id, versionId, {
    viewAssetIds: { front: 'ast_front', side: 'ast_side', back: 'ast_back' }
  }, alice);
  await service.approve('charprof_a', created.id, versionId, alice);

  const resolved = await service.resolveApprovedVersion('charprof_a', created.id, versionId, alice);
  assert.equal(resolved.version.id, versionId);
  assert.equal(contexts.at(-1).characterProfileVersionId, 'charver_pinned');
});

test('one owned Character Look Sheet can satisfy review and approval without Generation', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const created = await service.createDraft('charprof_a', {
    characterProfileVersionId: 'charver_a',
    name: 'Uploaded Station Sheet',
    sourceMode: 'uploaded_character_sheet',
    sourceSheetAssetId: 'ast_sheet'
  }, alice);
  const cropManifest = {
    layoutVersion: 'character-look-sheet-v1',
    regions: {
      front: { x: 0.02, y: 0.02, width: 0.3, height: 0.62 },
      side: { x: 0.35, y: 0.02, width: 0.3, height: 0.62 },
      back: { x: 0.68, y: 0.02, width: 0.3, height: 0.62 },
      face: { x: 0.35, y: 0.67, width: 0.3, height: 0.3 }
    }
  };
  const reviewed = await service.attachReview(
    'charprof_a', created.id, created.activeVersionId,
    { sheetAssetId: 'ast_sheet', cropManifest, rightsDeclarationAccepted: true },
    alice
  );

  const reviewedVersion = reviewed.versions[0];
  assert.equal(reviewedVersion.status, 'review');
  assert.equal(reviewedVersion.approvedSheetAsset.assetId, 'ast_sheet');
  assert.equal(reviewedVersion.approvedViewAssets.front.assetId, 'ast_sheet');
  assert.deepEqual(reviewedVersion.approvedViewAssets.side.cropRegion, cropManifest.regions.side);
  assert.equal(reviewedVersion.generationLineage.source, 'manual_sheet_upload');

  const approved = await service.approve('charprof_a', created.id, created.activeVersionId, alice);
  assert.equal(approved.lifecycleStatus, 'approved');
  assert.equal(approved.versions[0].generationLineage.source, 'manual_sheet_upload');
});

test('Character Look Sheet review requires rights and bounded crop regions', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const created = await service.createDraft('charprof_a', {
    characterProfileVersionId: 'charver_a', name: 'Unsafe Sheet',
    sourceMode: 'uploaded_character_sheet', sourceSheetAssetId: 'ast_sheet'
  }, alice);
  const cropManifest = {
    regions: {
      front: { x: 0, y: 0, width: 0.34, height: 0.7 },
      side: { x: 0.33, y: 0, width: 0.34, height: 0.7 },
      back: { x: 0.67, y: 0, width: 0.34, height: 0.7 }
    }
  };
  await assert.rejects(
    service.attachReview('charprof_a', created.id, created.activeVersionId, {
      sheetAssetId: 'ast_sheet', cropManifest, rightsDeclarationAccepted: false
    }, alice),
    error => error.code === 'character_look_sheet_rights_required'
  );
  await assert.rejects(
    service.attachReview('charprof_a', created.id, created.activeVersionId, {
      sheetAssetId: 'ast_sheet', cropManifest, rightsDeclarationAccepted: true
    }, alice),
    error => error.code === 'character_look_sheet_layout_invalid'
  );
});

test('AI wardrobe direction is stored as a non-approved proposal without Assets', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const created = await service.createDraft('charprof_a', {
    characterProfileVersionId: 'charver_a',
    name: 'AI Station Direction',
    description: 'A restrained commuter look suitable for a damp night platform.',
    sourceMode: 'ai_suggestion'
  }, alice);
  assert.equal(created.versions[0].sourceMode, 'ai_suggestion');
  assert.equal(created.versions[0].status, 'source_ready');
  assert.equal(created.approvedVersionId, null);
});
