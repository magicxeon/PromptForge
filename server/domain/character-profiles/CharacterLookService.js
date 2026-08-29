import { characterLookRepository } from '../../repositories/character-profiles/CharacterLookRepository.js';
import { assertActorContext, RepositoryContractError } from '../../repositories/repositoryContracts.js';
import { cinematicWardrobeAuthorityService } from '../assets/CinematicWardrobeAuthorityService.js';
import { characterUsageService } from './CharacterUsageService.js';

const GARMENT_ROLES = new Set(['full_look', 'upper', 'lower', 'footwear', 'accessory']);
const SOURCE_MODES = new Set(['character_default', 'uploaded', 'uploaded_character_sheet', 'ai_suggestion']);

export class CharacterLookService {
  constructor({
    repository = characterLookRepository,
    characterAuthorizationService = characterUsageService,
    wardrobeAuthorityService = cinematicWardrobeAuthorityService
  } = {}) {
    this.repository = repository;
    this.characterAuthorizationService = characterAuthorizationService;
    this.wardrobeAuthorityService = wardrobeAuthorityService;
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
      description: bounded(input.description, 500, ''),
      tags: normalizeTags(input.tags),
      sourceMode,
      garmentAuthorities,
      sourceSheetAssetId: sourceSheetAssetId || null,
      authoritySnapshot: authority.assets,
      canonicalFaceAssetId: authorization.identityPack.canonicalFaceAssetId,
      idempotencyKey: input.idempotencyKey
    }, actor);
    return toProjection(record);
  }

  async attachReview(characterProfileId, lookId, versionId, input = {}, actorContext) {
    const look = await this.#assertOwnedLook(characterProfileId, lookId, actorContext);
    const sheetReview = normalizeSheetReview(input);
    const viewAssetIds = sheetReview
      ? { front: sheetReview.assetId, side: sheetReview.assetId, back: sheetReview.assetId }
      : normalizeViewAssetIds(input.viewAssetIds);
    const authority = await this.wardrobeAuthorityService.authorizeLook({
      mode: 'uploaded', assetIds: Object.values(viewAssetIds)
    }, actorContext);
    const assetsById = new Map(authority.assets.map(item => [item.id, item]));
    const approvedViewAssets = Object.fromEntries(Object.entries(viewAssetIds).map(([role, assetId]) => [
      role, {
        assetId,
        contentHash: assetsById.get(assetId)?.contentHash || null,
        ...(sheetReview ? { cropRegion: sheetReview.cropManifest.regions[role] } : {})
      }
    ]));
    return toProjection(await this.repository.attachReview(look.id, versionId, {
      approvedViewAssets,
      approvedSheetAsset: sheetReview ? {
        assetId: sheetReview.assetId,
        contentHash: assetsById.get(sheetReview.assetId)?.contentHash || null
      } : null,
      cropManifest: sheetReview?.cropManifest || null,
      generationLineage: input.generationLineage || {
        source: sheetReview ? 'manual_sheet_upload' : 'manual_upload'
      }
    }, actorContext));
  }

  async approve(characterProfileId, lookId, versionId, actorContext) {
    await this.#assertOwnedLook(characterProfileId, lookId, actorContext);
    return toProjection(await this.repository.approve(lookId, versionId, actorContext));
  }

  async retire(characterProfileId, lookId, actorContext) {
    await this.#assertOwnedLook(characterProfileId, lookId, actorContext);
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
    if (!look || look.characterProfileId !== characterProfileId) {
      throw new RepositoryContractError('character_look_not_found', 'Character Look not found.', 404);
    }
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

function bounded(value, maximum, fallback) {
  const normalized = String(value || '').trim();
  return normalized ? normalized.slice(0, maximum) : fallback;
}

function toProjection(record) {
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
    versions: record.versions,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    retiredAt: record.retiredAt || null
  });
}

export const characterLookService = new CharacterLookService();
