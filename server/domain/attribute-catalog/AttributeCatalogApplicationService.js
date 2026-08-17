import { createAttributesBundleLoader } from '../../app/routes/attributesRoutes.js';
import { catalogFingerprint } from './attributeCatalogContracts.js';
import { attributeCatalogSourceRepository } from '../../repositories/attribute-catalog/AttributeCatalogSourceRepository.js';
import { attributeCatalogRepository } from '../../repositories/attribute-catalog/AttributeCatalogRepository.js';
import { attributeCatalogReleaseRepository } from '../../repositories/attribute-catalog/AttributeCatalogReleaseRepository.js';
import { attributeCatalogValidationService } from './AttributeCatalogValidationService.js';
import { attributeCatalogReleaseService } from './AttributeCatalogReleaseService.js';
import { adminPolicyService } from '../admin/AdminPolicyService.js';
import { auditLogRepo } from '../../repositories/audit/AuditLogRepository.js';
import { RepositoryContractError } from '../../repositories/repositoryContracts.js';
import { approvedVisualAssetService } from '../assets/ApprovedVisualAssetService.js';
import { attributeLocalizationService } from './AttributeLocalizationService.js';
import { referenceAssetService } from '../assets/ReferenceAssetService.js';
import { resolveAttributePresentationKind } from '../../config/attributePresentation.js';

export class AttributeCatalogApplicationService {
  constructor({
    sourceRepository = attributeCatalogSourceRepository,
    draftRepository = attributeCatalogRepository,
    releaseRepository = attributeCatalogReleaseRepository,
    validationService = attributeCatalogValidationService,
    releaseService = attributeCatalogReleaseService,
    policy = adminPolicyService,
    auditRepository = auditLogRepo,
    legacyBundleLoader = createAttributesBundleLoader(),
    generationService = null,
    visualAssetService = approvedVisualAssetService,
    localizationService = attributeLocalizationService,
    referenceService = referenceAssetService
  } = {}) {
    this.sourceRepository = sourceRepository;
    this.draftRepository = draftRepository;
    this.releaseRepository = releaseRepository;
    this.validationService = validationService;
    this.releaseService = releaseService;
    this.policy = policy;
    this.auditRepository = auditRepository;
    this.legacyBundleLoader = legacyBundleLoader;
    this.generationService = generationService;
    this.visualAssetService = visualAssetService;
    this.localizationService = localizationService;
    this.referenceService = referenceService;
  }

  async getOverview(actorContext) {
    this.policy.assertCanAccessBackoffice(actorContext);
    const [inventory, drafts, releases, state] = await Promise.all([
      this.sourceRepository.createInventory(),
      this.draftRepository.list(),
      this.releaseRepository.list(),
      this.releaseRepository.getState()
    ]);
    return {
      inventory: summarizeInventory(inventory),
      drafts: drafts.map(summarizeDraft),
      releases: releases.map(summarizeRelease).reverse(),
      state,
      permissions: permissionsFor(actorContext)
    };
  }

  async listDefinitions(query, actorContext) {
    this.policy.assertCanAccessBackoffice(actorContext);
    const draftId = String(query.draftId || '').trim();
    const bundle = draftId
      ? (await this.draftRepository.findById(draftId)).bundle
      : await this.resolveReadBundle();
    const search = String(query.search || '').trim().toLocaleLowerCase();
    const requestedCategory = String(query.category || '').trim();
    const requestedSubcategory = String(query.subcategory || '').trim();
    const requestedOptionId = String(query.optionId || '').trim();
    const status = String(query.status || '').trim();
    const presentationKind = String(query.presentationKind || '').trim();
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    const offset = Math.max(0, Number(query.offset) || 0);
    const searchable = bundle.library
      .filter(option => !status || (status === 'enabled' ? option.enabled !== false : option.enabled === false))
      .filter(option => !presentationKind
        || resolveAttributePresentationKind(option?.category, definitionFieldOf(option)) === presentationKind)
      .filter(option => !search || searchableOption(option).includes(search));
    const facets = buildDefinitionFacets(searchable);
    const focusedOption = requestedOptionId
      ? bundle.library.find(option => option?.id === requestedOptionId) || null
      : null;
    const category = requestedCategory
      || focusedOption?.category
      || (!search ? facets[0]?.category : '')
      || '';
    const categoryFacet = facets.find(facet => facet.category === category);
    const subcategory = requestedSubcategory
      || (focusedOption?.category === category ? definitionFieldOf(focusedOption) : '')
      || (!search ? categoryFacet?.fields[0]?.field : '')
      || '';
    const filtered = searchable
      .filter(option => !category || option.category === category)
      .filter(option => !subcategory || definitionFieldOf(option) === subcategory);
    return {
      items: filtered.slice(offset, offset + limit).map(option => ({
        ...option,
        subcategory: definitionFieldOf(option),
        presentationKind: resolveAttributePresentationKind(option?.category, definitionFieldOf(option))
      })),
      offset,
      limit,
      total: filtered.length,
      hasMore: offset + limit < filtered.length,
      facets,
      resolvedFilters: {
        category,
        subcategory,
        optionId: focusedOption?.id || null,
        draftId: draftId || null
      }
    };
  }

  async createDraft(input, actorContext, request = {}) {
    const actor = this.policy.assertCanManageAttributeCatalog(actorContext);
    const bundle = await this.resolveReadBundle();
    const inventory = await this.sourceRepository.createInventory();
    const draft = await this.draftRepository.create({
      title: normalizeTitle(input?.title),
      baseReleaseId: (await this.releaseRepository.getState()).activeReleaseId,
      baseFingerprint: catalogFingerprint(bundle),
      inventoryFingerprint: catalogFingerprint(inventory),
      bundle,
      validation: null
    }, actor);
    await this.audit('attribute_catalog.draft_created', draft, actor, request, input?.reason || null);
    return draft;
  }

  async getDraft(draftId, actorContext) {
    this.policy.assertCanAccessBackoffice(actorContext);
    return this.draftRepository.findById(draftId);
  }

  async saveOption(draftId, input, actorContext, request = {}) {
    const actor = this.policy.assertCanManageAttributeCatalog(actorContext);
    const expectedRevision = requireRevision(input?.expectedRevision);
    const currentDraft = await this.draftRepository.findById(draftId);
    if (currentDraft.revision !== expectedRevision) throw revisionConflict();
    const option = normalizeOption(input?.option, { allowGeneratedId: true });
    const previousOption = option.id
      ? findOptionalUniqueOption(currentDraft.bundle.library, option.id)
      : null;
    assertExistingPlacement(currentDraft.bundle.library, option);
    if (!option.id) {
      option.id = createStableOptionId(option, currentDraft.bundle.library);
      inheritFieldDefaults(option, currentDraft.bundle.library);
    }
    const localization = await this.localizationService.localize({
      englishLabel: englishLabelOf(option),
      previousLabels: previousOption && typeof previousOption.label === 'object'
        ? previousOption.label
        : null
    });
    option.label = localization.labels;
    option.localization = localization.metadata;
    const draft = await this.draftRepository.update(draftId, expectedRevision, current => {
      const indexes = current.bundle.library
        .map((candidate, index) => candidate?.id === option.id ? index : -1)
        .filter(index => index >= 0);
      if (indexes.length > 1) {
        throw new RepositoryContractError(
          'attribute_catalog_legacy_option_ambiguous',
          'This legacy option ID is duplicated. Migrate it before editing.',
          409
        );
      }
      if (indexes.length === 1) current.bundle.library[indexes[0]] = option;
      else current.bundle.library.push(option);
      current.lastSavedOptionId = option.id;
      current.validation = null;
      return current;
    });
    await this.audit('attribute_catalog.option_saved', draft, actor, request, input?.reason || null);
    return draft;
  }

  async validateDraft(draftId, input, actorContext, request = {}) {
    const actor = this.policy.assertCanManageAttributeCatalog(actorContext);
    const expectedRevision = requireRevision(input?.expectedRevision);
    const current = await this.draftRepository.findById(draftId);
    if (current.revision !== expectedRevision) throw revisionConflict();
    const validation = this.validationService.validateBundle(current.bundle);
    const draft = await this.draftRepository.update(draftId, expectedRevision, next => ({
      ...next,
      status: validation.valid ? 'review_ready' : 'validation_failed',
      validation
    }));
    await this.audit('attribute_catalog.draft_validated', draft, actor, request, null);
    return draft;
  }

  async createVisualCandidatePlan(draftId, input, actorContext) {
    this.policy.assertCanManageAttributeCatalog(actorContext);
    const draft = await this.draftRepository.findById(draftId);
    const option = findUniqueOption(draft.bundle.library, input?.optionId);
    const visualFamily = normalizeVisualFamily(input?.visualFamily);
    return {
      schemaVersion: 1,
      recipeVersion: 'attribute-visual-authoring-v1',
      draftId,
      draftRevision: draft.revision,
      optionId: option.id,
      visualFamily,
      candidateCount: 3,
      prompt: compileVisualAuthoringPrompt(option, visualFamily),
      negativePrompt: 'text, labels, letters, numbers, logo, watermark, multiple panels, decorative frame, cropped subject, inconsistent line weight',
      generationMode: generationModeForVisualFamily(visualFamily),
      generationSurface: 'studio',
      aspectRatio: '1:1',
      imageResolution: '1K'
    };
  }

  async createFocusedTestPlan(draftId, input, actorContext) {
    this.policy.assertCanManageAttributeCatalog(actorContext);
    const draft = await this.draftRepository.findById(draftId);
    const option = findUniqueOption(draft.bundle.library, input?.optionId);
    const visualFamily = normalizeVisualFamily(inferVisualFamily(option));
    return compileFocusedTestPlan({ draftId, draftRevision: draft.revision, option, visualFamily });
  }

  async uploadVisualCandidate(draftId, input, actorContext, request = {}) {
    const actor = this.policy.assertCanManageAttributeCatalog(actorContext);
    const draft = await this.draftRepository.findById(draftId);
    const option = findUniqueOption(draft.bundle.library, input?.optionId);
    const uploaded = await this.referenceService.storeReference({
      dataUrl: input?.dataUrl,
      role: 'style_reference',
      sourceMode: 'attribute_visual_upload'
    }, actor, {
      namespace: 'attribute-visual-uploads',
      assetType: 'attribute_visual_upload'
    });
    const result = {
      assetId: uploaded.referenceId,
      optionId: option.id,
      imageUrl: uploaded.imageUrl,
      thumbnailUrl: uploaded.thumbnailUrl,
      mimeType: uploaded.mimeType,
      width: uploaded.width,
      height: uploaded.height,
      source: 'upload'
    };
    await this.audit('attribute_catalog.visual_candidate_uploaded', { id: uploaded.referenceId }, actor, request, null);
    return result;
  }

  async approveVisualCandidate(draftId, input, actorContext, request = {}) {
    const actor = this.policy.assertCanManageAttributeCatalog(actorContext);
    const expectedRevision = requireRevision(input?.expectedRevision);
    const optionId = String(input?.optionId || '').trim();
    const jobId = String(input?.jobId || '').trim();
    const assetId = String(input?.assetId || '').trim();
    let imageUrl;
    let mimeType;
    let sourceAssetId = null;
    if (assetId) {
      const asset = await this.referenceService.repository.findByIdForOwner(assetId, actor.userId);
      if (!asset || asset.status === 'deleted' || asset.assetType !== 'attribute_visual_upload') {
        throw new RepositoryContractError(
          'attribute_catalog_visual_upload_not_found',
          'The uploaded visual candidate is unavailable or not owned by this Admin.',
          404
        );
      }
      sourceAssetId = asset.id;
      imageUrl = asset.publicUrl;
      mimeType = asset.mimeType || null;
    } else {
      if (!this.generationService) {
        throw new RepositoryContractError(
          'attribute_catalog_generation_unavailable',
          'Generation is unavailable for Attribute visual approval.',
          503
        );
      }
      const status = await this.generationService.getJobStatusForUser(jobId, actor.username);
      imageUrl = status?.status === 'completed' ? status.result?.imageUrl : null;
      mimeType = status?.result?.mimeType || null;
      if (!imageUrl) {
        throw new RepositoryContractError(
          'attribute_catalog_visual_candidate_not_ready',
          'The selected visual candidate is not a completed owned generation.',
          409
        );
      }
    }
    const approvedAssets = await this.visualAssetService.createApprovedSet({
      sourceJobId: jobId || null,
      sourceAssetId,
      imageUrl,
      mimeType
    }, actor);
    const draft = await this.draftRepository.update(draftId, expectedRevision, current => {
      const option = findUniqueOption(current.bundle.library, optionId);
      option.visualAssetSet = {
        schemaVersion: 1,
        status: 'approved',
        sourceJobId: jobId || null,
        sourceAssetId,
        ...approvedAssets,
        visualFamily: normalizeVisualFamily(input?.visualFamily),
        styleVersion: 'attribute-visual-authoring-v1',
        approvedByUserId: actor.userId,
        approvedByUsername: actor.username,
        approvedAt: new Date().toISOString()
      };
      current.validation = null;
      return current;
    });
    await this.audit('attribute_catalog.visual_candidate_approved', draft, actor, request, null);
    return draft;
  }

  async publishDraft(draftId, input, actorContext, request = {}) {
    const actor = this.policy.assertCanManageAttributeCatalog(actorContext);
    const reason = this.policy.requireReason(input?.reason, 'Attribute Catalog publication');
    const expectedRevision = requireRevision(input?.expectedRevision);
    const draft = await this.draftRepository.findById(draftId);
    if (draft.revision !== expectedRevision) throw revisionConflict();
    const validation = this.validationService.validateBundle(draft.bundle);
    const release = await this.releaseService.publish({ draft, validation, actor, reason });
    const publishedDraft = await this.draftRepository.update(draftId, expectedRevision, current => ({
      ...current,
      status: 'published',
      publishedReleaseId: release.id,
      validation
    }));
    await this.audit('attribute_catalog.release_published', release, actor, request, reason);
    return { draft: publishedDraft, release };
  }

  async activateRelease(releaseId, input, actorContext, request = {}) {
    const actor = this.policy.assertCanManageAttributeCatalog(actorContext);
    const reason = this.policy.requireReason(input?.reason, 'Attribute Catalog activation');
    const state = await this.releaseRepository.activate(releaseId, requireRevision(input?.expectedRevision));
    await this.audit('attribute_catalog.release_activated', { id: releaseId, state }, actor, request, reason);
    return state;
  }

  async rollback(input, actorContext, request = {}) {
    const actor = this.policy.assertCanManageAttributeCatalog(actorContext);
    const reason = this.policy.requireReason(input?.reason, 'Attribute Catalog rollback');
    const state = await this.releaseRepository.getState();
    if (!state.previousReleaseId) {
      throw new RepositoryContractError(
        'attribute_catalog_rollback_unavailable',
        'No previous Attribute Catalog release is available.',
        409
      );
    }
    const next = await this.releaseRepository.activate(state.previousReleaseId, requireRevision(input?.expectedRevision));
    await this.audit('attribute_catalog.release_rolled_back', { id: next.activeReleaseId, state: next }, actor, request, reason);
    return next;
  }

  async resolveReadBundle() {
    const active = await this.releaseService.getCompiledActiveBundle();
    return active?.bundle || this.legacyBundleLoader();
  }

  async resolvePublicRuntimeBundle() {
    const enabled = ['1', 'true', 'yes', 'on'].includes(
      String(process.env.ATTRIBUTE_CATALOG_RUNTIME_ENABLED || '').trim().toLowerCase()
    );
    if (!enabled) {
      return { bundle: await this.legacyBundleLoader(), source: 'legacy', releaseId: null };
    }
    const active = await this.releaseService.getCompiledActiveBundle();
    if (!active) {
      return { bundle: await this.legacyBundleLoader(), source: 'legacy_fallback', releaseId: null };
    }
    return { bundle: active.bundle, source: 'attribute_catalog', releaseId: active.release.id };
  }

  async audit(action, target, actor, request, reason) {
    return this.auditRepository.appendEvent({
      action,
      targetType: 'attribute_catalog',
      targetId: target.id,
      reason,
      requestId: request.requestId || request.headers?.['x-request-id'] || null,
      afterSnapshot: summarizeAuditTarget(target)
    }, actor);
  }
}

function summarizeInventory(inventory) {
  return {
    attributeFileCount: inventory.attributeFiles.length,
    attributeOptionCount: inventory.attributeOptionCount,
    enabledAttributeOptionCount: inventory.enabledAttributeOptionCount,
    fieldManifestCount: inventory.fieldManifests.length,
    indexedFieldManifestCount: inventory.indexedFieldManifestCount,
    unindexedFieldManifests: inventory.unindexedFieldManifests,
    duplicateAttributeIds: inventory.duplicateAttributeIds,
    missingVisualAttributeIdCount: inventory.missingVisualAttributeIds.length,
    unknownVisualAttributeIds: inventory.unknownVisualAttributeIds
  };
}

function summarizeDraft(draft) {
  return {
    id: draft.id,
    title: draft.title,
    revision: draft.revision,
    status: draft.status,
    optionCount: draft.bundle?.library?.length || 0,
    validation: draft.validation,
    updatedAt: draft.updatedAt,
    ownerUsername: draft.ownerUsername
  };
}

function summarizeRelease(release) {
  return {
    id: release.id,
    status: release.status,
    sourceDraftId: release.sourceDraftId,
    sourceDraftRevision: release.sourceDraftRevision,
    bundleFingerprint: release.bundleFingerprint,
    publishedByUsername: release.publishedByUsername,
    publishedAt: release.publishedAt,
    reason: release.reason
  };
}

function permissionsFor(actor) {
  return { canRead: true, canMutate: actor?.role === 'admin', canPublish: actor?.role === 'admin' };
}

function searchableOption(option) {
  return [
    option.id,
    option.category,
    option.subcategory,
    option.label?.en,
    option.label?.th,
    ...(Array.isArray(option.tags) ? option.tags : [])
  ].filter(Boolean).join(' ').toLocaleLowerCase();
}

function definitionFieldOf(option) {
  const explicit = String(option?.subcategory || '').trim();
  if (explicit) return explicit;
  return {
    face: 'Face Shape',
    eyes: 'Eyes',
    eyebrows: 'Eyebrows',
    nose: 'Nose',
    lips: 'Lips',
    expression: 'Expression'
  }[String(option?.category || '').trim()] || 'Other';
}

function buildDefinitionFacets(library) {
  const categories = new Map();
  for (const option of library) {
    const category = String(option?.category || 'uncategorized').trim() || 'uncategorized';
    const field = definitionFieldOf(option);
    const categoryEntry = categories.get(category) || { category, count: 0, fields: new Map() };
    categoryEntry.count += 1;
    categoryEntry.fields.set(field, (categoryEntry.fields.get(field) || 0) + 1);
    categories.set(category, categoryEntry);
  }
  return [...categories.values()]
    .sort((left, right) => left.category.localeCompare(right.category))
    .map(entry => ({
      category: entry.category,
      count: entry.count,
      fields: [...entry.fields.entries()]
        .map(([field, count]) => ({ field, count }))
        .sort((left, right) => left.field.localeCompare(right.field))
    }));
}

function normalizeTitle(value) {
  const title = String(value || '').trim();
  return title || `Attribute Catalog draft ${new Date().toISOString().slice(0, 10)}`;
}

function normalizeOption(value, { allowGeneratedId = false } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RepositoryContractError('attribute_catalog_option_required', 'A valid Attribute option is required.', 400);
  }
  const option = structuredClone(value);
  option.id = String(option.id || '').trim();
  if ((!option.id && !allowGeneratedId) || option.id.length > 160 || (option.id && !/^[a-z0-9._-]+$/i.test(option.id))) {
    throw new RepositoryContractError('attribute_catalog_option_id_invalid', 'Attribute option ID is invalid.', 400);
  }
  if (!String(option.category || '').trim() || !String(option.subcategory || '').trim()) {
    throw new RepositoryContractError(
      'attribute_catalog_option_placement_required',
      'New or edited options require category and subcategory.',
      400
    );
  }
  if (!option.label || (typeof option.label === 'object' && !String(option.label.en || '').trim())) {
    throw new RepositoryContractError('attribute_catalog_option_label_required', 'An English label is required.', 400);
  }
  return option;
}

function englishLabelOf(option) {
  return typeof option.label === 'string'
    ? option.label.trim()
    : String(option.label?.en || '').trim();
}

function assertExistingPlacement(library, option) {
  const exists = (library || []).some(candidate => (
    candidate?.category === option.category
    && candidate?.subcategory === option.subcategory
  ));
  if (!exists) {
    throw new RepositoryContractError(
      'attribute_catalog_existing_field_required',
      'Phase 1 requires an existing Category and Field.',
      400
    );
  }
}

function createStableOptionId(option, library) {
  const prefix = [option.category, option.subcategory, englishLabelOf(option)]
    .map(slugPart)
    .filter(Boolean)
    .join('.');
  const base = prefix.slice(0, 140) || 'attribute.option';
  const ids = new Set((library || []).map(candidate => candidate?.id).filter(Boolean));
  if (!ids.has(base)) return base;
  let suffix = 2;
  while (ids.has(`${base}.${suffix}`)) suffix += 1;
  return `${base}.${suffix}`;
}

function slugPart(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function inheritFieldDefaults(option, library) {
  const sibling = (library || []).find(candidate => (
    candidate?.category === option.category
    && candidate?.subcategory === option.subcategory
  ));
  if (!sibling) return option;
  option.ui = { ...(sibling.ui || {}), ...(option.ui || {}) };
  return option;
}

function findOptionalUniqueOption(library, optionId) {
  const matches = (library || []).filter(option => option?.id === optionId);
  if (matches.length > 1) {
    throw new RepositoryContractError(
      'attribute_catalog_legacy_option_ambiguous',
      'This legacy option ID is duplicated. Migrate it before editing.',
      409
    );
  }
  return matches[0] || null;
}

function findUniqueOption(library, optionId) {
  const id = String(optionId || '').trim();
  const matches = (library || []).filter(option => option?.id === id);
  if (matches.length !== 1) {
    throw new RepositoryContractError(
      matches.length ? 'attribute_catalog_legacy_option_ambiguous' : 'attribute_catalog_option_not_found',
      matches.length ? 'This legacy option ID is duplicated.' : 'Attribute option not found.',
      matches.length ? 409 : 404
    );
  }
  return matches[0];
}

function normalizeVisualFamily(value) {
  const family = String(value || 'facial_feature').trim();
  const allowed = new Set([
    'facial_feature',
    'hair_silhouette',
    'body_silhouette',
    'outfit_illustration',
    'material_swatch',
    'pose_diagram'
  ]);
  if (!allowed.has(family)) {
    throw new RepositoryContractError('attribute_catalog_visual_family_invalid', 'Visual family is invalid.', 400);
  }
  return family;
}

function generationModeForVisualFamily(visualFamily) {
  if (visualFamily === 'body_silhouette') return 'character-sheet';
  if (['outfit_illustration', 'material_swatch', 'pose_diagram'].includes(visualFamily)) return 'scene';
  return 'headshot';
}

function compileVisualAuthoringPrompt(option, visualFamily) {
  const label = typeof option.label === 'string' ? option.label : option.label?.en || option.id;
  const semanticPrompt = typeof option.prompt === 'string'
    ? option.prompt
    : option.prompt?.default || label;
  const familyDirection = {
    facial_feature: 'a single precise monochrome facial-feature diagram centered at thumbnail-readable scale',
    hair_silhouette: 'a single clean monochrome hairstyle silhouette on a neutral head guide',
    body_silhouette: 'a single professional anatomical body silhouette with neutral stance and complete margins',
    outfit_illustration: 'a single clean fashion garment illustration showing construction and silhouette',
    material_swatch: 'a seamless square material swatch with physically credible texture and even lighting',
    pose_diagram: 'a single clear neutral pose diagram with readable joint direction and complete limbs'
  }[visualFamily];
  return [
    `Create ${familyDirection}.`,
    `The option is "${label}" and its exact semantic direction is: ${semanticPrompt}.`,
    'Match the established Momelo visual-option family: restrained thin line weight, consistent scale, high contrast, no identity, and no decorative styling.',
    'Use one subject or sample only. Keep safe margins on every side. The result must remain distinguishable at a small UI thumbnail size.',
    'No text, labels, letters, numbers, logo, watermark, border, inset, comparison layout, or extra variation.'
  ].join(' ');
}

function inferVisualFamily(option) {
  const direction = `${option?.category || ''} ${option?.subcategory || ''}`.toLowerCase();
  if (/body|build|silhouette|height/.test(direction)) return 'body_silhouette';
  if (/hair/.test(direction)) return 'hair_silhouette';
  if (/material|texture|pattern|fabric|surface/.test(direction)) return 'material_swatch';
  if (/pose|hand|gaze|camera|framing|lighting|environment|scene|architecture/.test(direction)) return 'pose_diagram';
  if (/outfit|cloth|garment|fashion/.test(direction)) return 'outfit_illustration';
  return 'facial_feature';
}

function compileFocusedTestPlan({ draftId, draftRevision, option, visualFamily }) {
  const label = typeof option.label === 'string' ? option.label : option.label?.en || option.id;
  const semanticPrompt = typeof option.prompt === 'string'
    ? option.prompt
    : option.prompt?.default || label;
  const recipes = {
    facial_feature: {
      testKind: 'identity_safe_headshot',
      generationMode: 'headshot',
      aspectRatio: '1:1',
      direction: 'Create one neutral photorealistic adult headshot on a plain studio background. Keep identity-neutral styling and make the selected facial attribute clearly readable without changing unrelated facial features.',
      checklist: ['selected feature is visible', 'unrelated facial structure remains neutral', 'one headshot only']
    },
    hair_silhouette: {
      testKind: 'complete_hairstyle_headshot',
      generationMode: 'headshot',
      aspectRatio: '1:1',
      direction: 'Create one photorealistic head-and-shoulders adult portrait with the complete hairstyle and hair silhouette visible inside safe margins. Keep face, wardrobe and background neutral.',
      checklist: ['complete hairstyle visible', 'hair direction matches option', 'face and wardrobe remain neutral']
    },
    body_silhouette: {
      testKind: 'neutral_body_sheet',
      generationMode: 'character-sheet',
      aspectRatio: '6:8',
      direction: 'Create one professional full-body adult casting reference in a neutral anatomical stance with complete head-to-feet margins and modest fitted gray casting clothes. Test only the selected body direction.',
      checklist: ['complete body visible', 'selected proportion is readable', 'neutral stance and clothing']
    },
    outfit_illustration: {
      testKind: 'worn_outfit_fidelity',
      generationMode: 'scene',
      aspectRatio: '6:8',
      direction: 'Create one photorealistic full-body fashion lookbook image of a neutral adult model naturally wearing the selected clothing direction. Show the complete garment, silhouette, construction, coverage and hem with hands clear of important details.',
      checklist: ['garment is naturally worn', 'silhouette and construction match', 'complete outfit remains visible']
    },
    material_swatch: {
      testKind: 'material_application',
      generationMode: 'scene',
      aspectRatio: '1:1',
      direction: 'Create one photorealistic fashion product close-up applying the selected material, pattern or surface to a simple neutral garment panel under even color-accurate studio light.',
      checklist: ['material is physically credible', 'scale and repeat are readable', 'color remains accurate']
    },
    pose_diagram: {
      testKind: 'controlled_scene_direction',
      generationMode: 'scene',
      aspectRatio: '6:8',
      direction: 'Create one professional fashion photograph with one complete adult subject. Apply only the selected pose, camera, lighting or environment direction while keeping wardrobe and identity neutral and commercially realistic.',
      checklist: ['selected direction is unambiguous', 'complete required framing', 'no unrelated stylization']
    }
  };
  const recipe = recipes[visualFamily];
  return {
    schemaVersion: 1,
    recipeVersion: 'attribute-focused-test-v1',
    draftId,
    draftRevision,
    optionId: option.id,
    visualFamily,
    testKind: recipe.testKind,
    candidateCount: 1,
    prompt: `${recipe.direction} Apply this exact Attribute direction: ${semanticPrompt}. Output one image only with no text, labels, logos or watermark.`,
    negativePrompt: 'multiple people, multiple views, contact sheet, text, labels, logo, watermark, cropped required subject, unrelated styling',
    generationMode: recipe.generationMode,
    generationSurface: 'studio',
    aspectRatio: recipe.aspectRatio,
    imageResolution: '1K',
    checklist: recipe.checklist
  };
}

function requireRevision(value) {
  const revision = Number(value);
  if (!Number.isInteger(revision) || revision < 0) {
    throw new RepositoryContractError('attribute_catalog_revision_required', 'A valid expected revision is required.', 400);
  }
  return revision;
}

function revisionConflict() {
  return new RepositoryContractError(
    'attribute_catalog_revision_conflict',
    'The Attribute Catalog draft changed. Refresh before retrying.',
    409
  );
}

function summarizeAuditTarget(target) {
  return {
    id: target.id,
    status: target.status || target.state?.activeReleaseId || null,
    revision: target.revision || target.state?.revision || null,
    sourceDraftId: target.sourceDraftId || null
  };
}

export const attributeCatalogApplicationService = new AttributeCatalogApplicationService();
