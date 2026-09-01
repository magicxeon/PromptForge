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
  const generationResultRepository = { findByIdForOwner: async () => null };
  const assetRepository = {
    findBySourceJobIdForOwner: async () => null,
    create: async (input, actor) => ({ id: 'ast_generated_sheet', ownerUserId: actor.userId, ...input })
  };
  return {
    directory,
    service: new CharacterLookService({
      repository,
      characterAuthorizationService,
      wardrobeAuthorityService,
      generationResultRepository,
      assetRepository
    })
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

test('unapproved Character Look preparation can be retired only by its owner and disappears from visible lists', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const created = await service.createDraft('charprof_a', {
    characterProfileVersionId: 'charver_a',
    name: 'Incorrect Look',
    description: 'Discard this direction.',
    sourceMode: 'ai_suggestion',
    idempotencyKey: 'look-incorrect'
  }, alice);

  await assert.rejects(
    service.retire('charprof_a', created.id, bob),
    error => error.code === 'character_look_not_found'
  );

  const retired = await service.retire('charprof_a', created.id, alice);
  assert.equal(retired.lifecycleStatus, 'retired');
  assert.equal(retired.versions[0].status, 'retired');
  assert.ok(retired.retiredAt);
  assert.equal(
    (await service.list('charprof_a', { characterProfileVersionId: 'charver_a' }, alice)).items.length,
    0
  );
});

test('approved Character Looks cannot be discarded from preparation', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const created = await service.createDraft('charprof_a', {
    characterProfileVersionId: 'charver_a', name: 'Approved Look', sourceMode: 'uploaded',
    garmentAuthorities: { full_look: { front: 'ast_outfit' } }
  }, alice);
  await service.attachReview('charprof_a', created.id, created.activeVersionId, {
    viewAssetIds: { front: 'ast_front', side: 'ast_side', back: 'ast_back' }
  }, alice);
  await service.approve('charprof_a', created.id, created.activeVersionId, alice);

  await assert.rejects(
    service.retire('charprof_a', created.id, alice),
    error => error.code === 'character_look_discard_not_allowed'
  );
  assert.equal(
    (await service.list('charprof_a', { characterProfileVersionId: 'charver_a' }, alice)).items.length,
    1
  );
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
  assert.equal(reviewedVersion.provenance.kind, 'user_uploaded');
  assert.equal(reviewedVersion.identityAssurance.status, 'unverified');
  assert.equal(reviewedVersion.rightsDeclaration.acceptedByUserId, alice.userId);
  assert.match(reviewedVersion.reviewMediaUrl, /\/media\/sheet$/);
  assert.equal(reviewed.workflowState, 'review_ready');
  assert.deepEqual(reviewed.capabilities.characterMatchCheck, {
    available: false,
    qualified: false,
    reason: 'character_match_check_not_qualified'
  });

  const approved = await service.approve('charprof_a', created.id, created.activeVersionId, alice);
  assert.equal(approved.lifecycleStatus, 'approved');
  assert.equal(approved.versions[0].generationLineage.source, 'manual_sheet_upload');
  assert.equal(approved.versions[0].identityAssurance.status, 'user_confirmed');
  assert.equal(approved.workflowState, 'approved_unbound');
});

test('Character Look review media is owner-authorized and confined to the outputs directory', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const outputsDirectory = path.join(directory, 'outputs');
  const storageKey = path.join('character-looks', 'sheet.png');
  const sheetPath = path.join(outputsDirectory, storageKey);
  await fs.mkdir(path.dirname(sheetPath), { recursive: true });
  await fs.writeFile(sheetPath, 'sheet');
  service.outputsDirectory = path.resolve(outputsDirectory);
  service.assetRepository.findByIdForOwner = async (assetId, ownerUserId) => (
    assetId === 'ast_sheet' && ownerUserId === alice.userId
      ? { id: assetId, storageKey, status: 'ready' }
      : null
  );
  const created = await service.createDraft('charprof_a', {
    characterProfileVersionId: 'charver_a', name: 'Review media',
    sourceMode: 'uploaded_character_sheet', sourceSheetAssetId: 'ast_sheet'
  }, alice);
  await service.attachReview('charprof_a', created.id, created.activeVersionId, {
    sheetAssetId: 'ast_sheet', rightsDeclarationAccepted: true,
    cropManifest: {
      layoutVersion: 'character-look-sheet-v1',
      regions: {
        front: { x: 0, y: 0, width: 0.3, height: 0.6 },
        side: { x: 0.35, y: 0, width: 0.3, height: 0.6 },
        back: { x: 0.7, y: 0, width: 0.3, height: 0.6 }
      }
    }
  }, alice);

  assert.equal(
    await service.getReviewMediaFile('charprof_a', created.id, created.activeVersionId, alice),
    path.resolve(sheetPath)
  );
  await assert.rejects(
    service.getReviewMediaFile('charprof_a', created.id, created.activeVersionId, bob),
    error => error.code === 'character_look_not_found'
  );

  service.assetRepository.findByIdForOwner = async () => ({
    id: 'ast_sheet', storageKey: path.join('..', 'outside.png'), status: 'ready'
  });
  await assert.rejects(
    service.getReviewMediaFile('charprof_a', created.id, created.activeVersionId, alice),
    error => error.code === 'character_look_review_media_unavailable'
  );
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
    sourceMode: 'ai_suggestion',
    suggestionSnapshot: {
      wardrobeDirection: 'A restrained commuter look suitable for a damp night platform.',
      garments: {
        upper: 'cream ribbed knit top',
        lower: 'charcoal straight trousers',
        outerwear: 'navy rain coat',
        footwear: 'black leather ankle boots',
        accessories: ['silver wristwatch']
      },
      palette: ['navy', 'cream', 'charcoal'],
      materials: ['ribbed knit', 'matte rain shell', 'leather'],
      movementConstraints: ['coat hem remains clear while walking'],
      continuityNotes: ['coat remains buttoned in every view'],
      provenance: { recipeId: 'cinematic-wardrobe-suggestion', recipeVersion: 1 }
    }
  }, alice);
  assert.equal(created.versions[0].sourceMode, 'ai_suggestion');
  assert.equal(created.versions[0].status, 'source_ready');
  assert.equal(created.approvedVersionId, null);
  assert.equal(created.suggestionSnapshot.provenance.recipeVersion, 1);
  const plan = await service.getGenerationPlan(
    'charprof_a', created.id, created.activeVersionId, alice
  );
  assert.equal(plan.recipe.version, 2);
  assert.match(plan.prompt, /Required target outfit:/);
  assert.match(plan.prompt, /cream ribbed knit top/i);
  assert.match(plan.prompt, /navy rain coat/i);
  assert.match(plan.prompt, /silver wristwatch/i);
  assert.match(plan.prompt, /Required palette: navy, cream, charcoal/i);
  assert.match(plan.prompt, /coat remains buttoned in every view/i);
  assert.match(plan.prompt, /not a neutral identity turnaround/i);
});

test('Character Look generation plan pins the source version, global recipe and owned wardrobe references', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const created = await service.createDraft('charprof_a', {
    characterProfileVersionId: 'charver_a',
    name: 'Platform coat',
    description: 'A practical navy coat with black trousers.',
    sourceMode: 'uploaded',
    garmentAuthorities: { full_look: { front: 'ast_outfit_front', back: 'ast_outfit_back' } }
  }, alice);

  const plan = await service.getGenerationPlan(
    'charprof_a', created.id, created.activeVersionId, alice
  );
  assert.equal(plan.operation, 'character_look_sheet');
  assert.equal(plan.source.lookVersionId, created.activeVersionId);
  assert.equal(plan.recipe.id, 'character-look-sheet');
  assert.equal(plan.recipe.version, 2);
  assert.equal(plan.recipe.fingerprint.length, 16);
  assert.deepEqual(plan.references, {
    outfit_front: 'ast_outfit_front',
    outfit_back: 'ast_outfit_back'
  });
  assert.equal(plan.characterProfileContext.sourceId, created.id);
  assert.match(plan.prompt, /practical navy coat/i);
});

test('Character Look generation keeps a long recipe prompt in the main prompt contract', async t => {
  const { directory, service } = await fixture();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const direction = 'Layer a practical movement-safe evening outfit with restrained texture and exact continuity. '.repeat(8);
  const created = await service.createDraft('charprof_a', {
    characterProfileVersionId: 'charver_a', name: 'Long prompt Look',
    description: direction, sourceMode: 'ai_suggestion'
  }, alice);

  const plan = await service.getGenerationPlan(
    'charprof_a', created.id, created.activeVersionId, alice
  );
  assert.ok(plan.prompt.length > 300);
  assert.match(plan.prompt, /Wardrobe direction:/);
  assert.equal('additionalDirection' in plan, false);
});

test('generated Character Look Sheet adoption revalidates lineage and remains in review', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'character-look-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const repository = new CharacterLookRepository({ looksFile: path.join(directory, 'looks.json') });
  let createdAsset = null;
  const service = new CharacterLookService({
    repository,
    characterAuthorizationService: {
      validateGenerationContext: async (context, actor) => ({
        ...context,
        characterType: 'styled_character',
        identityPack: {
          characterProfileVersionId: context.characterProfileVersionId,
          canonicalFaceAssetId: 'ast_face'
        },
        attribution: { ownerUserId: actor.userId }
      })
    },
    wardrobeAuthorityService: {
      authorizeLook: async input => ({
        assets: (input.assetIds || []).map(id => ({ id, contentHash: `hash_${id}` }))
      })
    },
    generationResultRepository: {
      findByIdForOwner: async (id, ownerUserId) => ownerUserId === alice.userId ? {
        id,
        mode: 'character-sheet',
        imageUrl: '/outputs/generated/look-sheet.png',
        mimeType: 'image/png',
        provider: 'gemini',
        submodel: 'image-model',
        characterProfileContext: {
          characterProfileId: 'charprof_a',
          characterProfileVersionId: 'charver_a',
          sourceId: createdAsset?.lookId
        },
        sceneTemplateSnapshot: {
          promptRecipeSnapshot: {
            id: 'character-look-sheet',
            version: 2,
            fingerprint: createdAsset?.recipeFingerprint
          },
          characterLookSource: {
            characterProfileId: 'charprof_a',
            characterProfileVersionId: 'charver_a',
            lookId: createdAsset?.lookId,
            lookVersionId: createdAsset?.lookVersionId
          }
        }
      } : null
    },
    assetRepository: {
      findBySourceJobIdForOwner: async () => null,
      create: async input => {
        createdAsset = { id: 'ast_generated_sheet', lookId: input.metadata.characterLookId, ...input };
        return createdAsset;
      }
    }
  });
  const created = await service.createDraft('charprof_a', {
    characterProfileVersionId: 'charver_a', name: 'Generated Look',
    sourceMode: 'ai_suggestion', description: 'A restrained evening coat.'
  }, alice);
  // The result lineage must point at the immutable Look source selected at submission.
  const generationPlan = await service.getGenerationPlan(
    'charprof_a', created.id, created.activeVersionId, alice
  );
  createdAsset = {
    lookId: created.id,
    lookVersionId: 'lookver_stale',
    recipeFingerprint: generationPlan.recipe.fingerprint
  };
  await assert.rejects(
    service.attachGeneratedReview(
      'charprof_a', created.id, created.activeVersionId,
      { generationResultId: 'job_look_sheet' }, alice
    ),
    error => error.code === 'character_look_generation_context_mismatch'
  );
  createdAsset.lookVersionId = created.activeVersionId;
  const reviewed = await service.attachGeneratedReview(
    'charprof_a', created.id, created.activeVersionId,
    { generationResultId: 'job_look_sheet' }, alice
  );

  assert.equal(reviewed.lifecycleStatus, 'review');
  assert.equal(reviewed.versions[0].status, 'review');
  assert.equal(reviewed.versions[0].approvedSheetAsset.assetId, 'ast_generated_sheet');
  assert.equal(reviewed.versions[0].generationLineage.generationResultId, 'job_look_sheet');
  assert.equal(reviewed.versions[0].provenance.kind, 'system_generated');
  assert.equal(reviewed.versions[0].provenance.recipeId, 'character-look-sheet');
  assert.equal(reviewed.versions[0].identityAssurance.status, 'unverified');
  assert.equal(reviewed.approvedVersionId, null);
  assert.equal(createdAsset.sourceJobId, 'job_look_sheet');

  const approved = await service.approve(
    'charprof_a', created.id, created.activeVersionId, alice
  );
  assert.equal(approved.versions[0].identityAssurance.status, 'lineage_bound');
  assert.equal(approved.versions[0].rightsDeclaration, null);
});

test('legacy Character Look records project conservative provenance and assurance', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'character-look-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const looksFile = path.join(directory, 'looks.json');
  await fs.writeFile(looksFile, JSON.stringify([{
    id: 'charlook_legacy', characterProfileId: 'charprof_a',
    sourceCharacterProfileVersionId: 'charver_a', ownerUserId: alice.userId,
    name: 'Legacy upload', description: '', tags: [], official: false,
    visibility: 'private', lifecycleStatus: 'approved', activeVersionId: 'lookver_legacy',
    approvedVersionId: 'lookver_legacy', createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z', versions: [{
      id: 'lookver_legacy', versionNumber: 1, sourceMode: 'uploaded_character_sheet',
      garmentAuthorities: {}, canonicalFaceAssetId: 'ast_face', status: 'approved',
      approvedViewAssets: {
        front: { assetId: 'ast_sheet' }, side: { assetId: 'ast_sheet' },
        back: { assetId: 'ast_sheet' }
      },
      approvedSheetAsset: { assetId: 'ast_sheet', contentHash: 'hash_ast_sheet' },
      generationLineage: { source: 'manual_sheet_upload' },
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
      approvedAt: '2026-01-01T00:00:00.000Z'
    }]
  }], null, 2));
  const repository = new CharacterLookRepository({ looksFile });
  const service = new CharacterLookService({
    repository,
    characterAuthorizationService: {
      validateGenerationContext: async context => ({
        identityPack: { characterProfileVersionId: context.characterProfileVersionId },
        attribution: { ownerUserId: alice.userId }
      })
    }
  });

  const [legacy] = (await service.list(
    'charprof_a', { characterProfileVersionId: 'charver_a' }, alice
  )).items;
  assert.equal(legacy.versions[0].provenance.kind, 'user_uploaded');
  assert.equal(legacy.versions[0].identityAssurance.status, 'legacy_unknown');
  assert.equal(legacy.versions[0].rightsDeclaration, null);
});
