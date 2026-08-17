import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createAttributesBundleLoader } from '../server/app/routes/attributesRoutes.js';
import { AttributeCatalogApplicationService } from '../server/domain/attribute-catalog/AttributeCatalogApplicationService.js';
import { AttributeCatalogReleaseService } from '../server/domain/attribute-catalog/AttributeCatalogReleaseService.js';
import { AttributeCatalogRepository } from '../server/repositories/attribute-catalog/AttributeCatalogRepository.js';
import { AttributeCatalogReleaseRepository } from '../server/repositories/attribute-catalog/AttributeCatalogReleaseRepository.js';

const admin = { userId: 'usr_admin', username: 'admin', role: 'admin' };
const support = { userId: 'usr_support', username: 'support', role: 'support' };
const customer = { userId: 'usr_customer', username: 'customer', role: 'user' };

test('Attribute Catalog groups definitions by category and resolves a focused option to its field', async () => {
  const bundle = {
    library: [
      option('character.001', 'character', 'Body Shape'),
      option('character.004', 'character', 'Face Shape'),
      option('scene.001', 'scene', 'Lighting'),
      option('scene.002', 'scene', 'Lighting')
    ]
  };
  const service = new AttributeCatalogApplicationService({
    releaseService: { getCompiledActiveBundle: async () => null },
    legacyBundleLoader: () => bundle
  });

  const result = await service.listDefinitions({ optionId: 'character.004' }, admin);

  assert.deepEqual(result.resolvedFilters, {
    category: 'character',
    subcategory: 'Face Shape',
    optionId: 'character.004',
    draftId: null
  });
  assert.deepEqual(result.items.map(item => item.id), ['character.004']);
  assert.deepEqual(result.facets, [
    {
      category: 'character',
      count: 2,
      fields: [
        { field: 'Body Shape', count: 1 },
        { field: 'Face Shape', count: 1 }
      ]
    },
    {
      category: 'scene',
      count: 2,
      fields: [{ field: 'Lighting', count: 2 }]
    }
  ]);
});

test('Attribute Catalog maps legacy visual options without subcategory to their customer field', async () => {
  const bundle = {
    library: [
      { ...option('face.001', 'face', ''), subcategory: '' },
      { ...option('face.002', 'face', ''), subcategory: undefined }
    ]
  };
  const service = new AttributeCatalogApplicationService({
    releaseService: { getCompiledActiveBundle: async () => null },
    legacyBundleLoader: () => bundle
  });

  const result = await service.listDefinitions({ category: 'face', subcategory: 'Face Shape' }, admin);

  assert.equal(result.total, 2);
  assert.deepEqual(result.items.map(item => item.id), ['face.001', 'face.002']);
  assert.deepEqual(result.resolvedFilters, {
    category: 'face',
    subcategory: 'Face Shape',
    optionId: null,
    draftId: null
  });
  assert.equal(result.items.every(item => item.presentationKind === 'visual'), true);
});

test('Attribute Catalog definition reads can target a saved draft without changing runtime', async t => {
  const harness = await createHarness(t);
  const draft = await harness.service.createDraft({ title: 'Draft read' }, admin);
  const source = draft.bundle.library.find(item => item?.category && item?.subcategory);
  const changed = {
    ...source,
    label: { en: 'Draft-only label' }
  };
  const saved = await harness.service.saveOption(draft.id, {
    expectedRevision: draft.revision,
    option: changed
  }, admin);

  const draftResult = await harness.service.listDefinitions({
    draftId: draft.id,
    optionId: source.id
  }, admin);
  const runtimeResult = await harness.service.listDefinitions({ optionId: source.id }, admin);

  assert.equal(draftResult.items[0].label.en, 'Draft-only label');
  assert.equal(draftResult.resolvedFilters.draftId, draft.id);
  assert.equal(runtimeResult.items[0].label.en === 'Draft-only label', false);
  assert.equal(saved.revision, 2);
});

test('Attribute Catalog filters canonical visual and text presentation kinds', async () => {
  const bundle = {
    library: [
      option('face.001', 'face', 'Face Shape'),
      option('camera.001', 'camera', 'Lens')
    ]
  };
  const service = new AttributeCatalogApplicationService({
    releaseService: { getCompiledActiveBundle: async () => null },
    legacyBundleLoader: () => bundle
  });

  const visual = await service.listDefinitions({ presentationKind: 'visual' }, admin);
  const text = await service.listDefinitions({ presentationKind: 'text' }, admin);

  assert.deepEqual(visual.items.map(item => item.id), ['face.001']);
  assert.deepEqual(text.items.map(item => item.id), ['camera.001']);
});

test('Attribute Catalog protects optimistic revisions and Support read-only access', async t => {
  const harness = await createHarness(t);
  const draft = await harness.service.createDraft({ title: 'Pilot' }, admin);
  const placement = draft.bundle.library.find(item => item?.category && item?.subcategory);

  const saved = await harness.service.saveOption(draft.id, {
    expectedRevision: draft.revision,
    option: option('test.admin.pilot', placement.category, placement.subcategory)
  }, admin);
  assert.equal(saved.revision, 2);
  assert.equal(saved.bundle.library.some(item => item.id === 'test.admin.pilot'), true);

  await assert.rejects(
    () => harness.service.saveOption(draft.id, {
      expectedRevision: draft.revision,
      option: option('test.admin.stale', placement.category, placement.subcategory)
    }, admin),
    error => error.code === 'attribute_catalog_revision_conflict'
  );
  await assert.rejects(
    () => harness.service.createDraft({ title: 'Forbidden' }, support),
    error => error.code === 'attribute_catalog_mutation_forbidden'
  );
  await assert.rejects(
    () => harness.service.getOverview(customer),
    error => error.code === 'admin_access_forbidden'
  );
  assert.equal((await harness.service.getOverview(support)).permissions.canMutate, false);
});

test('Attribute Catalog generates a stable ID and enabled locale labels for a new option', async t => {
  const harness = await createHarness(t, {
    localizationService: {
      localize: async ({ englishLabel }) => ({
        labels: { en: englishLabel, th: `TH:${englishLabel}` },
        metadata: { schemaVersion: 1, status: 'generated', locales: ['th'] }
      })
    }
  });
  const draft = await harness.service.createDraft({ title: 'Create option' }, admin);
  const sibling = draft.bundle.library.find(item => item?.category && item?.subcategory);
  const saved = await harness.service.saveOption(draft.id, {
    expectedRevision: draft.revision,
    option: {
      id: '',
      category: sibling.category,
      subcategory: sibling.subcategory,
      label: { en: 'Editorial Coat' },
      prompt: { default: 'wearing an editorial coat' },
      enabled: true,
      tags: []
    }
  }, admin);

  assert.match(saved.lastSavedOptionId, /^[a-z0-9._-]+$/);
  const created = saved.bundle.library.find(item => item.id === saved.lastSavedOptionId);
  assert.equal(created.label.en, 'Editorial Coat');
  assert.equal(created.label.th, 'TH:Editorial Coat');
  assert.equal(created.localization.status, 'generated');
  assert.deepEqual(created.ui, sibling.ui);
});

test('Attribute Catalog rejects new taxonomy and compiles outfit-aware focused tests', async t => {
  const harness = await createHarness(t);
  const draft = await harness.service.createDraft({ title: 'Focused tests' }, admin);
  await assert.rejects(
    () => harness.service.saveOption(draft.id, {
      expectedRevision: draft.revision,
      option: {
        id: '',
        category: 'new_category',
        subcategory: 'New Field',
        label: { en: 'Unsupported taxonomy' },
        prompt: { default: 'unsupported' },
        enabled: true
      }
    }, admin),
    error => error.code === 'attribute_catalog_existing_field_required'
  );

  const outfit = draft.bundle.library.find(item => /cloth|outfit/i.test(`${item?.category} ${item?.subcategory}`));
  assert.ok(outfit, 'Expected an existing clothing option in the canonical bundle.');
  const plan = await harness.service.createFocusedTestPlan(draft.id, {
    optionId: outfit.id,
    visualFamily: 'facial_feature'
  }, admin);
  assert.equal(plan.visualFamily, 'outfit_illustration');
  assert.equal(plan.testKind, 'worn_outfit_fidelity');
  assert.equal(plan.candidateCount, 1);
  assert.equal(plan.generationMode, 'scene');
  assert.match(plan.prompt, /naturally wearing/i);
  assert.ok(plan.checklist.some(item => /construction/i.test(item)));
});

test('Attribute Catalog validates, publishes immutable releases, activates and rolls back', async t => {
  const harness = await createHarness(t);
  const firstDraft = await harness.service.createDraft({ title: 'First' }, admin);
  const validatedFirst = await harness.service.validateDraft(firstDraft.id, {
    expectedRevision: firstDraft.revision
  }, admin);
  assert.equal(validatedFirst.validation.valid, true);

  const firstPublished = await harness.service.publishDraft(firstDraft.id, {
    expectedRevision: validatedFirst.revision,
    reason: 'First controlled release'
  }, admin);
  const firstState = await harness.service.activateRelease(firstPublished.release.id, {
    expectedRevision: 0,
    reason: 'Activate first controlled release'
  }, admin);
  assert.equal(firstState.activeReleaseId, firstPublished.release.id);

  const secondDraft = await harness.service.createDraft({ title: 'Second' }, admin);
  const placement = secondDraft.bundle.library.find(item => item?.category && item?.subcategory);
  const changedSecond = await harness.service.saveOption(secondDraft.id, {
    expectedRevision: secondDraft.revision,
    option: option('test.admin.second', placement.category, placement.subcategory)
  }, admin);
  const validatedSecond = await harness.service.validateDraft(secondDraft.id, {
    expectedRevision: changedSecond.revision
  }, admin);
  const secondPublished = await harness.service.publishDraft(secondDraft.id, {
    expectedRevision: validatedSecond.revision,
    reason: 'Second controlled release'
  }, admin);
  const secondState = await harness.service.activateRelease(secondPublished.release.id, {
    expectedRevision: firstState.revision,
    reason: 'Activate second controlled release'
  }, admin);
  assert.equal(secondState.previousReleaseId, firstPublished.release.id);

  const rollbackState = await harness.service.rollback({
    expectedRevision: secondState.revision,
    reason: 'Rollback drill'
  }, admin);
  assert.equal(rollbackState.activeReleaseId, firstPublished.release.id);
  assert.equal((await harness.releaseRepository.list()).length, 2);
  assert.equal(harness.auditEvents.some(event => event.action === 'attribute_catalog.release_rolled_back'), true);
});

test('Attribute Catalog blocks publication when a new duplicate ID is introduced', async t => {
  const harness = await createHarness(t);
  const draft = await harness.service.createDraft({ title: 'Invalid' }, admin);
  const duplicate = structuredClone(draft.bundle.library[0]);
  draft.bundle.library.push(duplicate);
  await fs.writeFile(harness.draftsFile, JSON.stringify([draft]), 'utf8');

  const validated = await harness.service.validateDraft(draft.id, {
    expectedRevision: draft.revision
  }, admin);
  assert.equal(validated.validation.valid, false);
  assert.equal(validated.validation.errors.some(error => error.entityId === duplicate.id), true);
  await assert.rejects(
    () => harness.service.publishDraft(validated.id, {
      expectedRevision: validated.revision,
      reason: 'Must remain blocked'
    }, admin),
    error => error.code === 'attribute_catalog_validation_failed'
  );
  assert.equal((await harness.releaseRepository.list()).length, 0);
});

test('Attribute Catalog plans bounded candidates and approves only an owned completed job', async t => {
  const visualCalls = [];
  const harness = await createHarness(t, {
    generationService: {
      getJobStatusForUser: async (jobId, username) => {
        assert.equal(username, admin.username);
        if (jobId === 'job_pending') return { status: 'processing' };
        return {
          status: 'completed',
          result: { imageUrl: '/outputs/job_visual.jpg', mimeType: 'image/jpeg' }
        };
      }
    },
    visualAssetService: {
      createApprovedSet: async (input, actor) => {
        visualCalls.push({ input, actor });
        return {
          original: { imageUrl: input.imageUrl, mimeType: input.mimeType },
          preview: { assetId: 'ast_preview', imageUrl: '/outputs/preview.webp', contentHash: 'preview-hash' },
          thumbnail: { assetId: 'ast_thumb', imageUrl: '/outputs/thumb.webp', contentHash: 'thumb-hash' }
        };
      }
    }
  });
  const draft = await harness.service.createDraft({ title: 'Visual pilot' }, admin);
  const optionId = draft.bundle.library.find(item => item?.id)?.id;
  const plan = await harness.service.createVisualCandidatePlan(draft.id, {
    optionId,
    visualFamily: 'facial_feature'
  }, admin);
  assert.equal(plan.candidateCount, 3);
  assert.equal(plan.recipeVersion, 'attribute-visual-authoring-v1');
  assert.equal(plan.generationMode, 'headshot');
  assert.match(plan.prompt, /thumbnail size/i);

  const outfit = draft.bundle.library.find(item => /cloth|outfit/i.test(`${item?.category} ${item?.subcategory}`));
  assert.ok(outfit, 'Expected an existing clothing option in the canonical bundle.');
  const outfitPlan = await harness.service.createVisualCandidatePlan(draft.id, {
    optionId: outfit.id,
    visualFamily: 'outfit_illustration'
  }, admin);
  assert.equal(outfitPlan.generationMode, 'scene');
  assert.match(outfitPlan.prompt, /garment illustration/i);

  await assert.rejects(
    () => harness.service.approveVisualCandidate(draft.id, {
      expectedRevision: draft.revision,
      optionId,
      visualFamily: 'facial_feature',
      jobId: 'job_pending'
    }, admin),
    error => error.code === 'attribute_catalog_visual_candidate_not_ready'
  );
  const approved = await harness.service.approveVisualCandidate(draft.id, {
    expectedRevision: draft.revision,
    optionId,
    visualFamily: 'facial_feature',
    jobId: 'job_completed'
  }, admin);
  const approvedOption = approved.bundle.library.find(item => item.id === optionId);
  assert.equal(approvedOption.visualAssetSet.status, 'approved');
  assert.equal(approvedOption.visualAssetSet.preview.assetId, 'ast_preview');
  assert.equal(approvedOption.visualAssetSet.thumbnail.assetId, 'ast_thumb');
  assert.equal(visualCalls.length, 1);
  assert.equal(harness.auditEvents.some(event => event.action === 'attribute_catalog.visual_candidate_approved'), true);
});

test('Attribute Catalog uploads an owned visual candidate and approves it through the same derivative contract', async t => {
  const referenceCalls = [];
  const visualCalls = [];
  const referenceService = {
    storeReference: async (input, actor, options) => {
      referenceCalls.push({ input, actor, options });
      return {
        referenceId: 'ast_attribute_upload',
        imageUrl: '/outputs/attribute-visual-uploads/usr_admin/source.webp',
        thumbnailUrl: '/outputs/attribute-visual-uploads/usr_admin/source.webp',
        mimeType: 'image/webp',
        width: 640,
        height: 640
      };
    },
    repository: {
      findByIdForOwner: async (assetId, ownerUserId) => assetId === 'ast_attribute_upload' && ownerUserId === admin.userId
        ? {
            id: assetId,
            ownerUserId,
            status: 'active',
            assetType: 'attribute_visual_upload',
            publicUrl: '/outputs/attribute-visual-uploads/usr_admin/source.webp',
            mimeType: 'image/webp'
          }
        : null
    }
  };
  const harness = await createHarness(t, {
    referenceService,
    visualAssetService: {
      createApprovedSet: async input => {
        visualCalls.push(input);
        return {
          original: { imageUrl: input.imageUrl, mimeType: input.mimeType },
          preview: { assetId: 'ast_upload_preview', imageUrl: '/outputs/attribute-visuals/preview.webp' },
          thumbnail: { assetId: 'ast_upload_thumb', imageUrl: '/outputs/attribute-visuals/thumb.webp' }
        };
      }
    }
  });
  const draft = await harness.service.createDraft({ title: 'Upload visual' }, admin);
  const optionId = draft.bundle.library.find(item => item?.id)?.id;
  const uploaded = await harness.service.uploadVisualCandidate(draft.id, {
    optionId,
    dataUrl: 'data:image/webp;base64,AAAA'
  }, admin);
  assert.equal(uploaded.assetId, 'ast_attribute_upload');
  assert.equal(referenceCalls[0].options.assetType, 'attribute_visual_upload');

  const approved = await harness.service.approveVisualCandidate(draft.id, {
    expectedRevision: draft.revision,
    optionId,
    assetId: uploaded.assetId,
    visualFamily: 'facial_feature'
  }, admin);
  const approvedOption = approved.bundle.library.find(item => item.id === optionId);
  assert.equal(approvedOption.visualAssetSet.sourceAssetId, uploaded.assetId);
  assert.equal(approvedOption.visualAssetSet.sourceJobId, null);
  assert.equal(visualCalls[0].sourceAssetId, uploaded.assetId);
  assert.equal(harness.auditEvents.some(event => event.action === 'attribute_catalog.visual_candidate_uploaded'), true);
});

test('public runtime remains legacy until guarded cutover is enabled', async t => {
  const previousFlag = process.env.ATTRIBUTE_CATALOG_RUNTIME_ENABLED;
  t.after(() => {
    if (previousFlag === undefined) delete process.env.ATTRIBUTE_CATALOG_RUNTIME_ENABLED;
    else process.env.ATTRIBUTE_CATALOG_RUNTIME_ENABLED = previousFlag;
  });
  const harness = await createHarness(t);
  const draft = await harness.service.createDraft({ title: 'Runtime cutover' }, admin);
  const validated = await harness.service.validateDraft(draft.id, {
    expectedRevision: draft.revision
  }, admin);
  const published = await harness.service.publishDraft(validated.id, {
    expectedRevision: validated.revision,
    reason: 'Runtime cutover test'
  }, admin);
  await harness.service.activateRelease(published.release.id, {
    expectedRevision: 0,
    reason: 'Runtime cutover test'
  }, admin);

  process.env.ATTRIBUTE_CATALOG_RUNTIME_ENABLED = 'false';
  const legacy = await harness.service.resolvePublicRuntimeBundle();
  assert.equal(legacy.source, 'legacy');
  assert.equal(legacy.releaseId, null);
  assert.equal(legacy.bundle.catalogRelease, undefined);

  process.env.ATTRIBUTE_CATALOG_RUNTIME_ENABLED = 'true';
  const catalog = await harness.service.resolvePublicRuntimeBundle();
  assert.equal(catalog.source, 'attribute_catalog');
  assert.equal(catalog.releaseId, published.release.id);
  assert.equal(catalog.bundle.catalogRelease.id, published.release.id);
});

async function createHarness(t, overrides = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-attribute-catalog-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const draftsFile = path.join(directory, 'drafts.json');
  const releasesFile = path.join(directory, 'releases.json');
  const stateFile = path.join(directory, 'state.json');
  const draftRepository = new AttributeCatalogRepository({ draftsFile });
  const releaseRepository = new AttributeCatalogReleaseRepository({ releasesFile, stateFile });
  const releaseService = new AttributeCatalogReleaseService({ releaseRepository });
  const auditEvents = [];
  const sourceRepository = {
    createInventory: async () => ({
      attributeFiles: Array.from({ length: 25 }, (_, index) => ({ file: `${index}.json` })),
      attributeOptionCount: 1,
      enabledAttributeOptionCount: 1,
      fieldManifests: Array.from({ length: 19 }, (_, index) => ({ file: `${index}/manifest.json` })),
      indexedFieldManifestCount: 18,
      unindexedFieldManifests: [],
      duplicateAttributeIds: [],
      missingVisualAttributeIds: [],
      unknownVisualAttributeIds: []
    })
  };
  const service = new AttributeCatalogApplicationService({
    sourceRepository,
    draftRepository,
    releaseRepository,
    releaseService,
    legacyBundleLoader: createAttributesBundleLoader(),
    auditRepository: {
      appendEvent: async event => {
        auditEvents.push(structuredClone(event));
        return event;
      }
    },
    generationService: overrides.generationService || null,
    visualAssetService: overrides.visualAssetService || {
      createApprovedSet: async () => {
        throw new Error('Visual assets are not expected in this test.');
      }
    },
    localizationService: overrides.localizationService || {
      localize: async ({ englishLabel, previousLabels }) => ({
        labels: { ...(previousLabels || {}), en: englishLabel, th: previousLabels?.th || englishLabel },
        metadata: { schemaVersion: 1, status: 'fallback', locales: ['th'] }
      })
    },
    referenceService: overrides.referenceService
  });
  return { service, releaseRepository, auditEvents, draftsFile };
}

function option(id, category = 'test', subcategory = 'Pilot') {
  return {
    id,
    category,
    subcategory,
    label: { en: 'Pilot option', th: 'Pilot option' },
    ui: { control: 'select', group: 'Test' },
    prompt: { default: 'a controlled pilot option' },
    enabled: true
  };
}
