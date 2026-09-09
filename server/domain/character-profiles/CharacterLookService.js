import { promises as fs } from 'node:fs';
import path from 'node:path';
import { characterLookRepository } from '../../repositories/character-profiles/CharacterLookRepository.js';
import { assertActorContext, RepositoryContractError } from '../../repositories/repositoryContracts.js';
import { cinematicWardrobeAuthorityService } from '../assets/CinematicWardrobeAuthorityService.js';
import { characterUsageService } from './CharacterUsageService.js';
import { generationResultRepo } from '../../repositories/generation/GenerationResultRepository.js';
import { assetRepo } from '../../repositories/assets/AssetRepository.js';
import { loadPromptRecipe } from '../../config/prompt-recipes/loadPromptRecipe.js';
import { OUTPUTS_DIR } from '../../config/paths.js';
import { loadVideoReferenceAssetContent, fingerprintLookVideoReference } from '../assets/VideoReferenceAssetContent.js';
import { trustedGeneratedSourceService } from '../generation/TrustedGeneratedSourceService.js';

const GARMENT_ROLES = new Set(['full_look', 'upper', 'lower', 'outerwear', 'footwear', 'accessory']);
const SOURCE_MODES = new Set(['character_default', 'uploaded', 'uploaded_character_sheet', 'ai_suggestion']);
const LOOK_SHEET_RECIPE = loadPromptRecipe('character-looks/look-sheet.v2.json');
const LOOK_SHEET_GENERATION_ENABLED = process.env.CHARACTER_LOOK_SHEET_GENERATION_ENABLED === undefined
  ? process.env.NODE_ENV !== 'production'
  : String(process.env.CHARACTER_LOOK_SHEET_GENERATION_ENABLED).toLowerCase() === 'true';
const CHARACTER_MATCH_CHECK_CAPABILITY = Object.freeze({
  available: false,
  qualified: false,
  reason: 'character_match_check_not_qualified'
});
const GENERATED_SHEET_MANIFEST = {
  layoutVersion: 'character-look-sheet-v1',
  regions: {
    front: { x: 0.02, y: 0.02, width: 0.3, height: 0.62 },
    side: { x: 0.35, y: 0.02, width: 0.3, height: 0.62 },
    back: { x: 0.68, y: 0.02, width: 0.3, height: 0.62 },
    face: { x: 0.35, y: 0.67, width: 0.3, height: 0.3 }
  }
};

export class CharacterLookService {
  constructor({
    repository = characterLookRepository,
    characterAuthorizationService = characterUsageService,
    wardrobeAuthorityService = cinematicWardrobeAuthorityService
    , generationResultRepository = generationResultRepo
    , assetRepository = assetRepo
    , outputsDirectory = OUTPUTS_DIR
    , trustedSources = trustedGeneratedSourceService
  } = {}) {
    this.repository = repository;
    this.characterAuthorizationService = characterAuthorizationService;
    this.wardrobeAuthorityService = wardrobeAuthorityService;
    this.generationResultRepository = generationResultRepository;
    this.assetRepository = assetRepository;
    this.outputsDirectory = path.resolve(outputsDirectory);
    this.trustedSources = trustedSources;
  }

  async list(characterProfileId, query = {}, actorContext) {
    await this.#authorizeCharacter(characterProfileId, query.characterProfileVersionId, actorContext);
    return { items: (await this.repository.listVisibleForActor(characterProfileId, actorContext)).map(toProjection) };
  }

  async createDraft(characterProfileId, input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const authorization = await this.#authorizeCharacter(
      characterProfileId,
      input.characterProfileVersionId,
      actor
    );
    const garmentAuthorities = normalizeGarmentAuthorities(input.garmentAuthorities);
    const sourceMode = normalizeSourceMode(input.sourceMode);
    const sourceSheetAssetId = sourceMode === 'uploaded_character_sheet'
      ? String(input.sourceSheetAssetId || '').trim()
      : '';
    const assetIds = [...new Set([
      ...Object.values(garmentAuthorities).flatMap(authority => Object.values(authority)),
      sourceSheetAssetId
    ].filter(Boolean))];
    const authority = await this.wardrobeAuthorityService.authorizeLook({
      mode: sourceMode === 'character_default' || sourceMode === 'ai_suggestion'
        ? 'character_default'
        : 'uploaded',
      assetIds
    }, actor);
    if (!['character_default', 'ai_suggestion'].includes(sourceMode) && !assetIds.length) {
      throw new RepositoryContractError('character_look_garment_required', 'At least one owned garment reference is required.', 409);
    }
    if (sourceMode === 'ai_suggestion' && !String(input.description || '').trim()) {
      throw new RepositoryContractError('character_look_ai_direction_required', 'Describe the AI wardrobe direction before saving.', 409);
    }
    const record = await this.repository.createDraft({
      characterProfileId,
      sourceCharacterProfileVersionId: authorization.identityPack.characterProfileVersionId,
      sourceCharacterOwnerUserId: authorization.attribution.ownerUserId,
      official: authorization.attribution.ownerUserId === actor.userId,
      name: bounded(input.name, 100, 'Untitled Look'),
      description: bounded(input.description, 1200, ''),
      tags: normalizeTags(input.tags),
      sourceMode,
      garmentAuthorities,
      sourceSheetAssetId: sourceSheetAssetId || null,
      authoritySnapshot: authority.assets,
      canonicalFaceAssetId: authorization.identityPack.canonicalFaceAssetId,
      suggestionSnapshot: sourceMode === 'ai_suggestion'
        ? normalizeSuggestionSnapshot(input.suggestionSnapshot)
        : null,
      idempotencyKey: input.idempotencyKey
    }, actor);
    return toProjection(record);
  }

  async attachReview(characterProfileId, lookId, versionId, input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const look = await this.#assertOwnedLook(characterProfileId, lookId, actor);
    const sheetReview = normalizeSheetReview(input);
    const viewAssetIds = sheetReview
      ? { front: sheetReview.assetId, side: sheetReview.assetId, back: sheetReview.assetId }
      : normalizeViewAssetIds(input.viewAssetIds);
    const authority = await this.wardrobeAuthorityService.authorizeLook({
      mode: 'uploaded', assetIds: Object.values(viewAssetIds)
    }, actor);
    const assetsById = new Map(authority.assets.map(item => [item.id, item]));
    const approvedViewAssets = Object.fromEntries(Object.entries(viewAssetIds).map(([role, assetId]) => [
      role, {
        assetId,
        contentHash: assetsById.get(assetId)?.contentHash || null,
        ...(sheetReview ? { cropRegion: sheetReview.cropManifest.regions[role] } : {})
      }
    ]));
    const recordedAt = new Date().toISOString();
    const sourceAssetIds = [...new Set(Object.values(viewAssetIds))];
    return toProjection(await this.repository.attachReview(look.id, versionId, {
      approvedViewAssets,
      approvedSheetAsset: sheetReview ? {
        assetId: sheetReview.assetId,
        contentHash: assetsById.get(sheetReview.assetId)?.contentHash || null
      } : null,
      cropManifest: sheetReview?.cropManifest || null,
      generationLineage: input.generationLineage || {
        source: sheetReview ? 'manual_sheet_upload' : 'manual_upload'
      },
      provenance: {
        kind: 'user_uploaded',
        characterProfileId,
        characterProfileVersionId: look.sourceCharacterProfileVersionId,
        sourceAssetIds,
        generationResultId: null,
        generationJobId: null,
        recipeId: null,
        recipeVersion: null,
        recipeFingerprint: null,
        provider: null,
        model: null,
        recordedAt
      },
      identityAssurance: {
        status: 'unverified',
        characterProfileVersionId: look.sourceCharacterProfileVersionId,
        validationEvidenceId: null,
        updatedAt: recordedAt
      },
      rightsDeclaration: sheetReview ? {
        accepted: true,
        acceptedByUserId: actor.userId,
        acceptedAt: recordedAt,
        policyVersion: 'character-look-sheet-rights-v1'
      } : null
    }, actor));
  }

  async getGenerationPlan(characterProfileId, lookId, versionId, actorContext) {
    if (!LOOK_SHEET_GENERATION_ENABLED) {
      throw new RepositoryContractError(
        'character_look_sheet_generation_unqualified',
        'AI Character Look Sheet generation is not qualified for this environment.',
        409
      );
    }
    const look = await this.#assertOwnedLook(characterProfileId, lookId, actorContext);
    const version = look.versions.find(item => item.id === versionId);
    if (!version || look.activeVersionId !== version.id || version.status !== 'source_ready') {
      throw new RepositoryContractError(
        'character_look_source_not_ready',
        'The active source-ready Character Look version is required.',
        409
      );
    }
    const authorization = await this.#authorizeCharacter(
      characterProfileId,
      look.sourceCharacterProfileVersionId,
      actorContext
    );
    const wardrobeReferences = resolveWardrobeReferences(version.garmentAuthorities);
    if (version.sourceMode !== 'ai_suggestion' && !wardrobeReferences.outfit_front) {
      throw new RepositoryContractError(
        'character_look_garment_required',
        'An owned wardrobe source is required before generating a Look Sheet.',
        409
      );
    }
    const wardrobeContract = compileWardrobeContract(look);
    const prompt = [
      LOOK_SHEET_RECIPE.instruction,
      `Look name: ${bounded(look.name, 100, 'Untitled Look')}.`,
      look.description ? `Wardrobe direction: ${bounded(look.description, 1200, '')}.` : '',
      wardrobeContract,
      'Output the requested wardrobe-locked Character Look Sheet, not a neutral identity turnaround. Do not simplify, omit, or replace the target outfit.'
    ].filter(Boolean).join(' ');
    return {
      operation: 'character_look_sheet',
      recipe: {
        id: LOOK_SHEET_RECIPE.id,
        version: LOOK_SHEET_RECIPE.version,
        fingerprint: LOOK_SHEET_RECIPE.fingerprint
      },
      prompt,
      references: wardrobeReferences,
      characterProfileContext: {
        purpose: 'character_usage',
        characterProfileId,
        characterProfileVersionId: authorization.identityPack.characterProfileVersionId,
        useCase: 'scene_story',
        sourceType: 'scene_builder',
        sourceId: look.id,
        characterType: authorization.characterType,
        outfitBehavior: 'replaceable'
      },
      output: { aspectRatio: '1:1', outputCount: 1 },
      source: {
        characterProfileId,
        characterProfileVersionId: authorization.identityPack.characterProfileVersionId,
        lookId: look.id,
        lookVersionId: version.id
      }
    };
  }

  async attachGeneratedReview(characterProfileId, lookId, versionId, input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const look = await this.#assertOwnedLook(characterProfileId, lookId, actor);
    const version = look.versions.find(item => item.id === versionId);
    if (!version || look.activeVersionId !== version.id || version.status !== 'source_ready') {
      throw new RepositoryContractError(
        'character_look_source_not_ready',
        'The active source-ready Character Look version is required.',
        409
      );
    }
    const resultId = String(input.generationResultId || '').trim();
    const result = await this.generationResultRepository.findByIdForOwner(resultId, actor.userId);
    if (!result?.imageUrl || result.mode !== 'character-sheet') {
      throw new RepositoryContractError(
        'character_look_generation_result_required',
        'A completed owned Character Look Sheet generation result is required.',
        409
      );
    }
    const resultContext = result.characterProfileContext || {};
    const resultSource = result.sceneTemplateSnapshot?.characterLookSource || {};
    const resultRecipe = result.sceneTemplateSnapshot?.promptRecipeSnapshot || {};
    if (resultContext.characterProfileId !== characterProfileId
      || resultContext.characterProfileVersionId !== look.sourceCharacterProfileVersionId
      || resultContext.sourceId !== look.id
      || resultSource.characterProfileId !== characterProfileId
      || resultSource.characterProfileVersionId !== look.sourceCharacterProfileVersionId
      || resultSource.lookId !== look.id
      || resultSource.lookVersionId !== version.id
      || resultRecipe.id !== LOOK_SHEET_RECIPE.id
      || resultRecipe.version !== LOOK_SHEET_RECIPE.version
      || resultRecipe.fingerprint !== LOOK_SHEET_RECIPE.fingerprint) {
      throw new RepositoryContractError(
        'character_look_generation_context_mismatch',
        'The generated Look Sheet does not belong to this Character Look version.',
        409
      );
    }
    const storageKey = outputStorageKey(result.imageUrl);
    if (!storageKey) {
      throw new RepositoryContractError(
        'character_look_generation_asset_unavailable',
        'The generated Look Sheet Asset is unavailable.',
        409
      );
    }
    let asset = await this.assetRepository.findBySourceJobIdForOwner(
      result.id,
      actor.userId,
      'character_look_sheet'
    );
    if (!asset) {
      asset = await this.assetRepository.create({
        assetType: 'character_look_sheet',
        storageKey,
        publicUrl: result.imageUrl,
        mimeType: result.mimeType || 'image/png',
        sourceJobId: result.id,
        metadata: {
          characterProfileId,
          characterProfileVersionId: look.sourceCharacterProfileVersionId,
          characterLookId: look.id,
          characterLookVersionId: version.id,
          recipeId: LOOK_SHEET_RECIPE.id,
          recipeVersion: LOOK_SHEET_RECIPE.version,
          recipeFingerprint: LOOK_SHEET_RECIPE.fingerprint
        }
      }, actor);
    }
    const authority = await this.wardrobeAuthorityService.authorizeLook({
      mode: 'uploaded',
      assetIds: [asset.id]
    }, actor);
    const contentHash = authority.assets[0]?.contentHash || null;
    const recordedAt = new Date().toISOString();
    const approvedViewAssets = Object.fromEntries(['front', 'side', 'back'].map(role => [
      role,
      { assetId: asset.id, contentHash, cropRegion: GENERATED_SHEET_MANIFEST.regions[role] }
    ]));
    return toProjection(await this.repository.attachReview(look.id, version.id, {
      approvedViewAssets,
      approvedSheetAsset: { assetId: asset.id, contentHash },
      cropManifest: GENERATED_SHEET_MANIFEST,
      generationLineage: {
        source: 'generation_result',
        generationResultId: result.id,
        provider: result.provider || null,
        model: result.submodel || result.model || null,
        recipeId: LOOK_SHEET_RECIPE.id,
        recipeVersion: LOOK_SHEET_RECIPE.version,
        recipeFingerprint: LOOK_SHEET_RECIPE.fingerprint
      },
      provenance: {
        kind: 'system_generated',
        characterProfileId,
        characterProfileVersionId: look.sourceCharacterProfileVersionId,
        sourceAssetIds: [asset.id],
        generationResultId: result.id,
        generationJobId: result.id,
        recipeId: LOOK_SHEET_RECIPE.id,
        recipeVersion: LOOK_SHEET_RECIPE.version,
        recipeFingerprint: LOOK_SHEET_RECIPE.fingerprint,
        provider: result.provider || null,
        model: result.submodel || result.model || null,
        recordedAt
      },
      identityAssurance: {
        status: 'unverified',
        characterProfileVersionId: look.sourceCharacterProfileVersionId,
        validationEvidenceId: null,
        updatedAt: recordedAt
      },
      rightsDeclaration: null
    }, actor));
  }

  async importGeneratedSheet(characterProfileId, input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const name = String(input.name || '').trim().slice(0, 100);
    const generationId = String(input.generationResultId || '').trim();
    if (!name || !generationId || input.identityAndViewsConfirmed !== true) {
      throw new RepositoryContractError('character_look_import_confirmation_required',
        'Choose a generated sheet and confirm the Character identity and front, side and back views.', 400);
    }
    const authorization = await this.#authorizeCharacter(characterProfileId, input.characterProfileVersionId, actor);
    const source = await this.trustedSources.describeOwnedImage(generationId, actor);
    const asset = await this.wardrobeAuthorityService.importGeneratedSheet(source, actor);
    const characterProfileVersionId = authorization.identityPack.characterProfileVersionId;
    const look = await this.repository.createDraft({
      characterProfileId, sourceCharacterProfileVersionId: characterProfileVersionId,
      sourceCharacterOwnerUserId: authorization.attribution.ownerUserId,
      official: authorization.attribution.ownerUserId === actor.userId,
      name, sourceMode: 'generated_character_sheet', sourceSheetAssetId: asset.id,
      allowRetiredReplacement: true,
      canonicalFaceAssetId: authorization.identityPack.canonicalFaceAssetId,
      authoritySnapshot: [{ id: asset.id, contentHash: source.contentHash }],
      idempotencyKey: `generated-sheet:${JSON.stringify([characterProfileId, characterProfileVersionId, generationId])}`
    }, actor);
    const version = look.versions.find(item => item.id === look.activeVersionId);
    if (look.lifecycleStatus === 'retired' || !version || version.status === 'retired') {
      throw new RepositoryContractError('character_look_not_found', 'This imported Look was retired.', 409);
    }
    if (version.status !== 'source_ready') return toProjection(look);
    const recordedAt = new Date().toISOString();
    const review = {
      approvedViewAssets: Object.fromEntries(['front', 'side', 'back'].map(role => [role,
        { assetId: asset.id, contentHash: source.contentHash }])),
      approvedSheetAsset: { assetId: asset.id, contentHash: source.contentHash },
      cropManifest: null,
      generationLineage: { source: 'generated_import', generationResultId: source.id,
        provider: source.providerId, model: source.modelId },
      provenance: { kind: 'generated_import', characterProfileId, characterProfileVersionId,
        sourceAssetIds: [asset.id], generationResultId: source.id, generationJobId: source.id,
        recipeId: null, recipeVersion: null, recipeFingerprint: null,
        provider: source.providerId, model: source.modelId, recordedAt },
      identityAssurance: { status: 'unverified', characterProfileVersionId,
        validationEvidenceId: null, updatedAt: recordedAt },
      rightsDeclaration: { accepted: true, acceptedByUserId: actor.userId,
        acceptedAt: recordedAt, policyVersion: 'generated-sheet-identity-views-v1' }
    };
    try {
      return toProjection(await this.repository.attachReview(look.id, version.id, review, actor));
    } catch (error) {
      if (error.code !== 'character_look_version_not_ready') throw error;
      const current = await this.repository.findForOwner(look.id, actor);
      if (!['review', 'approved'].includes(current?.versions.find(item => item.id === version.id)?.status)) throw error;
      return toProjection(current);
    }
  }

  async approve(characterProfileId, lookId, versionId, actorContext) {
    const look = await this.#assertOwnedLook(characterProfileId, lookId, actorContext);
    await this.#validateImportedSheet(look.versions.find(item => item.id === versionId), actorContext);
    return toProjection(await this.repository.approve(lookId, versionId, actorContext));
  }

  async getReviewMediaFile(characterProfileId, lookId, versionId, actorContext) {
    const actor = assertActorContext(actorContext);
    const look = await this.#assertOwnedLook(characterProfileId, lookId, actor);
    const version = look.versions.find(item => item.id === versionId);
    const assetId = String(version?.approvedSheetAsset?.assetId || '').trim();
    if (!assetId) {
      throw new RepositoryContractError(
        'character_look_review_media_unavailable',
        'Character Look review media is unavailable.',
        404
      );
    }
    const asset = await this.assetRepository.findByIdForOwner(assetId, actor.userId);
    if (!asset?.storageKey || asset.status === 'deleted') {
      throw new RepositoryContractError(
        'character_look_review_media_unavailable',
        'Character Look review media is unavailable.',
        404
      );
    }
    const filePath = path.resolve(this.outputsDirectory, asset.storageKey);
    const relative = path.relative(this.outputsDirectory, filePath);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new RepositoryContractError(
        'character_look_review_media_unavailable',
        'Character Look review media is unavailable.',
        404
      );
    }
    await fs.access(filePath).catch(() => {
      throw new RepositoryContractError(
        'character_look_review_media_unavailable',
        'Character Look review media is unavailable.',
        404
      );
    });
    return filePath;
  }

  async retire(characterProfileId, lookId, actorContext) {
    const look = await this.repository.findForOwner(lookId, actorContext);
    if (!look || look.characterProfileId !== characterProfileId) {
      throw new RepositoryContractError('character_look_not_found', 'Character Look not found.', 404);
    }
    await this.#authorizeCharacter(characterProfileId, look.sourceCharacterProfileVersionId, actorContext);
    if (look.lifecycleStatus === 'retired') return toProjection(look);
    if (look.approvedVersionId || look.lifecycleStatus === 'approved'
      || look.versions.some(version => ['approved', 'superseded'].includes(version.status))) {
      throw new RepositoryContractError(
        'character_look_discard_not_allowed',
        'Approved Character Looks cannot be removed from Look preparation.',
        409
      );
    }
    return toProjection(await this.repository.retire(lookId, actorContext));
  }

  async resolveApprovedVersion(characterProfileId, lookId, versionId, actorContext) {
    const look = await this.repository.findForOwner(lookId, actorContext);
    if (!look || look.characterProfileId !== characterProfileId) {
      throw new RepositoryContractError('character_look_version_unavailable', 'Approved Character Look version is unavailable.', 409);
    }
    await this.#authorizeCharacter(
      characterProfileId,
      look.sourceCharacterProfileVersionId,
      actorContext
    );
    const version = look?.versions.find(item => item.id === versionId && item.status === 'approved');
    if (look.lifecycleStatus === 'retired' || !version) {
      throw new RepositoryContractError('character_look_version_unavailable', 'Approved Character Look version is unavailable.', 409);
    }
    return { look: toProjection(look), version: structuredClone(version) };
  }

  async resolveApprovedSheetReference(characterProfileId, lookId, versionId, actorContext) {
    const { look, version } = await this.resolveApprovedVersion(characterProfileId, lookId, versionId, actorContext);
    const imported = await this.#validateImportedSheet(version, actorContext);
    const asset = await this.assetRepository.findByIdForOwner(version.approvedSheetAsset?.assetId, actorContext.userId);
    if (!asset || asset.status === 'deleted') {
      throw new RepositoryContractError('character_look_sheet_unavailable', 'The approved Character Look Sheet is unavailable.', 409);
    }
    const { bytes: _bytes, ...content } = await loadVideoReferenceAssetContent(asset, { outputsDirectory: this.outputsDirectory });
    const approvedHash = version.approvedSheetAsset?.contentHash;
    if (approvedHash && approvedHash !== content.contentHash) {
      throw new RepositoryContractError('character_look_sheet_changed', 'The approved Character Look Sheet content changed.', 409);
    }
    return {
      characterProfileVersionId: look.sourceCharacterProfileVersionId,
      asset: { ...asset, ...content },
      trustedGenerationId: imported?.id || null,
      sourceFingerprint: fingerprintLookVideoReference({ assetId: asset.id, characterLookVersionId: versionId, contentHash: content.contentHash }),
      previewUrl: `/api/character-profiles/${encodeURIComponent(characterProfileId)}/looks/${encodeURIComponent(lookId)}/versions/${encodeURIComponent(versionId)}/media/sheet`
    };
  }

  async #validateImportedSheet(version, actorContext) {
    if (version?.provenance?.kind !== 'generated_import') return null;
    const source = await this.trustedSources.describeOwnedImage(version.provenance.generationResultId, actorContext);
    if (source.contentHash !== version.approvedSheetAsset?.contentHash) {
      throw new RepositoryContractError('character_look_sheet_changed', 'The imported sheet content changed.', 409);
    }
    return source;
  }

  async #authorizeCharacter(characterProfileId, characterProfileVersionId, actorContext) {
    const context = {
      purpose: 'character_usage', characterProfileId,
      characterProfileVersionId: characterProfileVersionId || await this.#resolveVersionId(characterProfileId, actorContext),
      useCase: 'cinematic', sourceType: 'scene_builder', sourceId: characterProfileId
    };
    return this.characterAuthorizationService.validateGenerationContext(context, actorContext);
  }

  async #resolveVersionId(characterProfileId, actorContext) {
    const records = await this.repository.listVisibleForActor(characterProfileId, actorContext);
    const existing = records[0]?.sourceCharacterProfileVersionId;
    if (existing) return existing;
    throw new RepositoryContractError('character_look_character_version_required', 'Choose a pinned Character version before managing Looks.', 409);
  }

  async #assertOwnedLook(characterProfileId, lookId, actorContext) {
    const look = await this.repository.findForOwner(lookId, actorContext);
    if (!look || look.characterProfileId !== characterProfileId
      || ['retired', 'deleted'].includes(look.lifecycleStatus)) {
      throw new RepositoryContractError('character_look_not_found', 'Character Look not found.', 404);
    }
    await this.#authorizeCharacter(characterProfileId, look.sourceCharacterProfileVersionId, actorContext);
    return look;
  }
}

function normalizeGarmentAuthorities(input) {
  const normalized = {};
  for (const [role, authority] of Object.entries(input && typeof input === 'object' ? input : {})) {
    if (!GARMENT_ROLES.has(role) || !authority || typeof authority !== 'object') continue;
    const views = Object.fromEntries(['front', 'side', 'back'].map(view => [
      view, String(authority[view] || '').trim()
    ]).filter(([, assetId]) => assetId));
    if (views.front) normalized[role] = views;
  }
  return normalized;
}

function normalizeSourceMode(value) {
  const sourceMode = String(value || 'uploaded').trim();
  return SOURCE_MODES.has(sourceMode) ? sourceMode : 'uploaded';
}

function normalizeSheetReview(input) {
  const assetId = String(input?.sheetAssetId || '').trim();
  if (!assetId) return null;
  if (input?.rightsDeclarationAccepted !== true) {
    throw new RepositoryContractError(
      'character_look_sheet_rights_required',
      'Confirm that you have the right to use the uploaded Character Look Sheet.',
      409
    );
  }
  return { assetId, cropManifest: normalizeCropManifest(input.cropManifest) };
}

function normalizeCropManifest(input) {
  const source = input && typeof input === 'object' ? input : {};
  const layoutVersion = String(source.layoutVersion || 'character-look-sheet-v1').trim().slice(0, 80);
  const regions = Object.fromEntries(['front', 'side', 'back'].map(role => [
    role,
    normalizeCropRegion(source.regions?.[role], role)
  ]));
  if (source.regions?.face) regions.face = normalizeCropRegion(source.regions.face, 'face');
  return { layoutVersion, regions };
}

function normalizeCropRegion(value, role) {
  const region = value && typeof value === 'object' ? value : null;
  if (!region) {
    throw new RepositoryContractError('character_look_sheet_layout_invalid', `The ${role} crop region is required.`, 400);
  }
  const normalized = Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, Number(region[key])]));
  const valid = Object.values(normalized).every(Number.isFinite)
    && normalized.x >= 0 && normalized.y >= 0
    && normalized.width > 0 && normalized.height > 0
    && normalized.x + normalized.width <= 1
    && normalized.y + normalized.height <= 1;
  if (!valid) {
    throw new RepositoryContractError('character_look_sheet_layout_invalid', `The ${role} crop region is invalid.`, 400);
  }
  return normalized;
}

function normalizeViewAssetIds(input) {
  const result = Object.fromEntries(['front', 'side', 'back'].map(role => [role, String(input?.[role] || '').trim()]));
  if (Object.values(result).some(value => !value)) {
    throw new RepositoryContractError('character_look_views_required', 'Front, side and back Look Assets are required.', 409);
  }
  return result;
}

function normalizeTags(value) {
  return [...new Set((Array.isArray(value) ? value : []).map(item => bounded(item, 40, '')).filter(Boolean))].slice(0, 12);
}

function normalizeSuggestionSnapshot(value) {
  if (!value || typeof value !== 'object') return null;
  return structuredClone(value);
}

function compileWardrobeContract(look) {
  if (look?.versions?.find(item => item.id === look.activeVersionId)?.sourceMode !== 'ai_suggestion') {
    return '';
  }
  const suggestion = look.suggestionSnapshot && typeof look.suggestionSnapshot === 'object'
    ? look.suggestionSnapshot
    : {};
  const garments = suggestion.garments && typeof suggestion.garments === 'object'
    ? suggestion.garments
    : {};
  const garmentParts = [
    ['Upper garment', garments.upper],
    ['Lower garment', garments.lower],
    ['Outerwear', garments.outerwear],
    ['Footwear', garments.footwear],
    ['Accessories', Array.isArray(garments.accessories) ? garments.accessories.join(', ') : garments.accessories]
  ].map(([label, value]) => {
    const detail = bounded(value, 240, '');
    return detail ? `${label}: ${detail}` : '';
  }).filter(Boolean);
  const list = (value, maximumItems = 8) => (Array.isArray(value) ? value : [])
    .map(item => bounded(item, 160, ''))
    .filter(Boolean)
    .slice(0, maximumItems)
    .join(', ');
  const sections = [
    garmentParts.length ? `Required target outfit: ${garmentParts.join('; ')}.` : '',
    list(suggestion.palette) ? `Required palette: ${list(suggestion.palette)}.` : '',
    list(suggestion.materials) ? `Required materials: ${list(suggestion.materials)}.` : '',
    list(suggestion.movementConstraints) ? `Movement-safe construction: ${list(suggestion.movementConstraints)}.` : '',
    list(suggestion.continuityNotes) ? `Continuity requirements: ${list(suggestion.continuityNotes)}.` : ''
  ].filter(Boolean);
  return sections.length
    ? `Authoritative wardrobe contract. ${sections.join(' ')}`
    : '';
}

function bounded(value, maximum, fallback) {
  const normalized = String(value || '').trim();
  return normalized ? normalized.slice(0, maximum) : fallback;
}

function resolveWardrobeReferences(authorities = {}) {
  const ordered = ['full_look', 'upper', 'lower', 'outerwear', 'footwear', 'accessory'];
  const entries = ordered.map(role => authorities?.[role]).filter(Boolean);
  const front = entries.map(item => item.front).find(Boolean) || null;
  const back = entries.map(item => item.back).find(Boolean) || null;
  return {
    ...(front ? { outfit_front: front } : {}),
    ...(back ? { outfit_back: back } : {})
  };
}

function outputStorageKey(imageUrl) {
  const value = String(imageUrl || '').trim();
  return value.startsWith('/outputs/') ? value.slice('/outputs/'.length) : null;
}

function toProjection(record) {
  const versions = (record.versions || []).map(version => projectVersion(record, version));
  const activeVersion = versions.find(version => version.id === record.activeVersionId) || null;
  return structuredClone({
    id: record.id,
    characterProfileId: record.characterProfileId,
    sourceCharacterProfileVersionId: record.sourceCharacterProfileVersionId,
    name: record.name,
    description: record.description,
    tags: record.tags,
    official: record.official,
    visibility: record.visibility,
    lifecycleStatus: record.lifecycleStatus,
    activeVersionId: record.activeVersionId,
    approvedVersionId: record.approvedVersionId,
    versions,
    workflowState: resolveWorkflowState(record, activeVersion),
    capabilities: {
      characterMatchCheck: CHARACTER_MATCH_CHECK_CAPABILITY
    },
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    retiredAt: record.retiredAt || null,
    suggestionSnapshot: record.suggestionSnapshot || null
  });
}

function projectVersion(record, version) {
  const generationSource = String(version.generationLineage?.source || '');
  const inferredKind = generationSource === 'generation_result'
    ? 'system_generated'
    : ['manual_sheet_upload', 'manual_upload'].includes(generationSource)
      ? 'user_uploaded'
      : 'legacy_unknown';
  const provenance = version.provenance || {
    kind: inferredKind,
    characterProfileId: record.characterProfileId,
    characterProfileVersionId: record.sourceCharacterProfileVersionId,
    sourceAssetIds: uniqueVersionAssetIds(version),
    generationResultId: version.generationLineage?.generationResultId || null,
    generationJobId: version.generationLineage?.generationResultId || null,
    recipeId: version.generationLineage?.recipeId || null,
    recipeVersion: version.generationLineage?.recipeVersion || null,
    recipeFingerprint: version.generationLineage?.recipeFingerprint || null,
    provider: version.generationLineage?.provider || null,
    model: version.generationLineage?.model || null,
    recordedAt: version.updatedAt || record.updatedAt
  };
  const identityAssurance = version.identityAssurance || {
    status: inferredKind === 'system_generated' ? 'lineage_bound' : 'legacy_unknown',
    characterProfileVersionId: record.sourceCharacterProfileVersionId,
    validationEvidenceId: null,
    updatedAt: version.updatedAt || record.updatedAt
  };
  return {
    ...version,
    provenance,
    identityAssurance,
    rightsDeclaration: version.rightsDeclaration || null,
    reviewMediaUrl: version.approvedSheetAsset?.assetId
      ? `/api/character-profiles/${encodeURIComponent(record.characterProfileId)}/looks/${encodeURIComponent(record.id)}/versions/${encodeURIComponent(version.id)}/media/sheet`
      : null
  };
}

function uniqueVersionAssetIds(version) {
  return [...new Set([
    version.approvedSheetAsset?.assetId,
    ...Object.values(version.approvedViewAssets || {}).map(item => item?.assetId)
  ].filter(Boolean))];
}

function resolveWorkflowState(record, activeVersion) {
  if (record.lifecycleStatus === 'retired') return 'retired';
  if (record.approvedVersionId) return 'approved_unbound';
  if (activeVersion?.status === 'review' && activeVersion.reviewMediaUrl) return 'review_ready';
  if (activeVersion?.status === 'source_ready') return 'source_ready';
  return 'failed_recoverable';
}

export const characterLookService = new CharacterLookService();
