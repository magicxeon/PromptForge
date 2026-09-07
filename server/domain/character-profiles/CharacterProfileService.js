import { characterProfileRepo } from '../../repositories/character-profiles/CharacterProfileRepository.js';
import { characterProfileVersionRepo } from '../../repositories/character-profiles/CharacterProfileVersionRepository.js';
import { generationResultRepo } from '../../repositories/generation/GenerationResultRepository.js';
import { assertActorContext, RepositoryContractError } from '../../repositories/repositoryContracts.js';
import { creatorProfileService } from '../community/CreatorProfileService.js';
import { stripEmbeddedReferenceDataFromSnapshot } from '../generation/referenceUtils.js';
import { adminPolicyService } from '../admin/AdminPolicyService.js';
import { auditLogRepo } from '../../repositories/audit/AuditLogRepository.js';
import { characterProfileSharingService } from './CharacterProfileSharingService.js';
import { buildCharacterIdentityFacets } from './CharacterIdentityFacetService.js';
import { characterUsageService } from './CharacterUsageService.js';
import {
  CHARACTER_TYPE,
  getCharacterTypeCapabilities,
  normalizeCharacterType,
  normalizeIntendedUsesForCharacterType,
  resolveCanonicalCharacterAsset
} from './characterTypePolicy.js';
import { getCharacterCastingPolicy } from './characterCastingPolicy.js';
import {
  deriveCharacterIdentityMetadata,
  normalizeCharacterIdentityMetadata
} from './characterIdentityMetadata.js';

export class CharacterProfileService {
  constructor({
    profileRepository = characterProfileRepo,
    versionRepository = characterProfileVersionRepo,
    generationResultRepository = generationResultRepo,
    profileSharingService = characterProfileSharingService,
    usageService = characterUsageService,
    creatorProfiles = creatorProfileService,
    adminPolicy = adminPolicyService,
    auditRepository = auditLogRepo
  } = {}) {
    this.profileRepository = profileRepository;
    this.versionRepository = versionRepository;
    this.generationResultRepository = generationResultRepository;
    this.profileSharingService = profileSharingService;
    this.usageService = usageService;
    this.creatorProfiles = creatorProfiles;
    this.adminPolicy = adminPolicy;
    this.auditRepository = auditRepository;
  }

  async create(input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const idempotencyKey = String(input.idempotencyKey || '').trim();
    if (idempotencyKey) {
      const existing = await this.profileRepository.findByIdempotencyKey(actor.userId, idempotencyKey);
      if (existing) return this.getOwnerDetail(existing.id, actor);
    }
    const source = await this.generationResultRepository.findByIdForOwner(
      input.sourceGenerationResultId,
      actor.userId
    );
    if (!source || source.mode !== 'character-sheet') {
      throw new RepositoryContractError(
        'character_sheet_result_required',
        'A successful owned Character Sheet result is required.',
        409
      );
    }
    const creatorProfile = await this.creatorProfiles.ensureProfileForActor(actor);
    const characterType = normalizeCharacterType(
      source.characterSheetConfig?.characterType || source.characterType
    );
    const profile = await this.profileRepository.create({
      ...input,
      characterType,
      intendedUses: normalizeIntendedUsesForCharacterType(input.intendedUses, characterType),
      creatorProfileId: creatorProfile.id,
      idempotencyKey
    }, actor);
    const existingVersions = await this.versionRepository.listByProfileId(profile.id);
    if (existingVersions.length) return this.getOwnerDetail(profile.id, actor);
    const structuredCharacterSnapshot = stripEmbeddedReferenceDataFromSnapshot({
      selections: source.selections || {},
      characterSheetConfig: source.characterSheetConfig || null,
      sourceOwnership: source.sourceOwnership || null
    });
    const canonicalHeadshotAssetId = resolveSourceHeadshotAssetId(source);
    const version = await this.versionRepository.create({
      characterProfileId: profile.id,
      characterType,
      structuredCharacterSnapshot,
      identityMetadata: deriveCharacterIdentityMetadata(structuredCharacterSnapshot),
      sourceGenerationResultIds: [source.id],
      canonicalHeadshotAssetId,
      canonicalFaceAssetId: canonicalHeadshotAssetId,
      canonicalCharacterSheetAssetId: source.id
    }, actor);
    const reviewVersion = await attachInitialCastingCandidate({
      version,
      source,
      versionRepository: this.versionRepository
    });
    await this.profileRepository.updateSystem(profile.id, {
      activeVersionId: reviewVersion.id,
      status: reviewVersion.status === 'review' ? 'review' : 'draft'
    });
    return this.getOwnerDetail(profile.id, actor);
  }

  async listOwn(query = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const page = await this.profileRepository.findByOwner(actor.userId, query);
    const ownerPage = {
      ...page,
      items: await Promise.all(page.items.map(async profile => {
        const version = await this.versionRepository.findById(profile.activeVersionId);
        const canonicalAssetId = version && version.characterProfileId === profile.id
          ? resolveCanonicalCharacterAsset(version, profile.characterType)
            || version.canonicalCharacterSheetAssetId
            || version.sourceGenerationResultIds?.[0]
            || null
          : null;
        const ownerThumbnailUrl = canonicalAssetId
          ? `/api/character-profiles/${encodeURIComponent(profile.id)}/media/thumbnail`
          : null;
        const ownerImageUrl = canonicalAssetId
          ? `/api/character-profiles/${encodeURIComponent(profile.id)}/media/image`
          : null;
        const hasCastingPreview = normalizeCharacterType(profile.characterType) === CHARACTER_TYPE.REUSABLE_MODEL
          && Boolean(version?.castingFrontPreviewUrl);
        const ownerDisplayUrl = hasCastingPreview ? ownerThumbnailUrl : ownerImageUrl;
        return {
          ...profile,
          identityFacets: buildCharacterIdentityFacets(version),
          isOwner: true,
          ownerUsername: profile.ownerUsernameSnapshot || profile.ownerUsername || actor.username,
          reuseStatus: profile.status === 'approved' ? 'available' : 'unavailable',
          handoffAvailable: profile.status === 'approved' && version?.status === 'approved',
          characterProfileVersionId: version?.id || '',
          characterType: normalizeCharacterType(profile.characterType),
          destinationCapabilities: normalizeCharacterType(profile.characterType) === CHARACTER_TYPE.STYLED_CHARACTER
            ? ['scene_builder']
            : ['fashion_blueprint', 'scene_builder'],
          imageUrl: ownerImageUrl,
          thumbnailUrl: ownerThumbnailUrl,
          displayImageUrl: ownerDisplayUrl,
          displayImageSource: ownerThumbnailUrl
            ? hasCastingPreview
              ? 'casting_preview'
              : 'owner_canonical_sheet'
            : undefined,
          stats: await this.usageService.getStats(profile.id)
        };
      }))
    };
    if (typeof this.profileSharingService.applyFeaturedWork !== 'function') return ownerPage;
    return {
      ...ownerPage,
      items: await this.profileSharingService.applyFeaturedWork(ownerPage.items, actor, page.items)
    };
  }

  async getOwnerDetail(id, actorContext) {
    const actor = assertActorContext(actorContext);
    const profile = await this.profileRepository.findByIdForOwner(id, actor.userId);
    if (!profile) {
      throw new RepositoryContractError('character_profile_not_found', 'Character Profile not found.', 404);
    }
    const characterType = normalizeCharacterType(profile.characterType);
    const capabilities = getCharacterTypeCapabilities(characterType);
    const version = await this.versionRepository.findById(profile.activeVersionId);
    const canonicalAssetId = version && version.characterProfileId === profile.id
      ? resolveCanonicalCharacterAsset(version, characterType)
        || version.canonicalCharacterSheetAssetId
        || version.sourceGenerationResultIds?.[0]
        || null
      : null;
    const ownerImageUrl = canonicalAssetId
      ? `/api/character-profiles/${encodeURIComponent(profile.id)}/media/image`
      : null;
    const ownerThumbnailUrl = canonicalAssetId
      ? `/api/character-profiles/${encodeURIComponent(profile.id)}/media/thumbnail`
      : null;
    const hasCastingPreview = characterType === CHARACTER_TYPE.REUSABLE_MODEL
      && Boolean(version?.castingFrontPreviewUrl);
    const ownerDisplayUrl = hasCastingPreview ? ownerThumbnailUrl : ownerImageUrl;
    const ownerDetail = {
      ...profile,
      identityFacets: buildCharacterIdentityFacets(version),
      ownerUsername: profile.ownerUsernameSnapshot || profile.ownerUsername || actor.username,
      versions: await this.versionRepository.listByProfileId(profile.id),
      stats: await this.usageService.getStats(profile.id),
      isOwner: true,
      characterType,
      destinationCapabilities: [...capabilities.destinations],
      outfitBehavior: capabilities.outfitBehavior,
      reuseStatus: profile.status === 'approved' ? 'available' : 'unavailable',
      handoffAvailable: profile.status === 'approved' && version?.status === 'approved',
      characterProfileVersionId: version?.id || '',
      imageUrl: ownerImageUrl,
      thumbnailUrl: ownerThumbnailUrl,
      displayImageUrl: ownerDisplayUrl,
      displayImageSource: ownerDisplayUrl
        ? hasCastingPreview
          ? 'casting_preview'
          : 'owner_canonical_sheet'
        : undefined
    };
    if (typeof this.profileSharingService.applyFeaturedWork !== 'function') return ownerDetail;
    const [featuredDetail] = await this.profileSharingService.applyFeaturedWork(
      [ownerDetail],
      actor,
      [profile]
    );
    return featuredDetail;
  }

  async updateMetadata(id, input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const profile = await this.profileRepository.findByIdForOwner(id, actor.userId);
    if (!profile) {
      throw new RepositoryContractError('character_profile_not_found', 'Character Profile not found.', 404);
    }
    const updated = await this.profileRepository.updateOwned(id, {
      version: input.version,
      ...(Object.hasOwn(input, 'displayName') ? { displayName: input.displayName } : {}),
      ...(Object.hasOwn(input, 'shortDescription')
        ? { shortDescription: input.shortDescription }
        : {}),
      ...(Object.hasOwn(input, 'personalitySummary')
        ? { personalitySummary: input.personalitySummary }
        : {}),
      ...(Object.hasOwn(input, 'intendedUses')
        ? {
          intendedUses: normalizeIntendedUsesForCharacterType(
            input.intendedUses,
            profile.characterType
          )
        }
        : {})
    }, actor);
    if (updated.status === 'approved') {
      await this.profileSharingService.syncProjection(updated, actorContext);
    }
    return this.getOwnerDetail(updated.id, actorContext);
  }

  async createIdentityVersion(id, input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const profile = await this.profileRepository.findByIdForOwner(id, actor.userId);
    if (!profile || ['archived', 'blocked'].includes(profile.status)) {
      throw new RepositoryContractError('character_profile_not_found', 'Character Profile not found.', 404);
    }
    const source = await this.generationResultRepository.findByIdForOwner(
      input.sourceGenerationResultId,
      actor.userId
    );
    if (!source || source.mode !== 'character-sheet') {
      throw new RepositoryContractError(
        'character_sheet_result_required',
        'A successful owned Character Sheet result is required.',
        409
      );
    }
    const existingVersions = await this.versionRepository.listByProfileId(profile.id);
    if (existingVersions.some(version =>
      (version.sourceGenerationResultIds || []).includes(source.id)
    )) {
      return this.getOwnerDetail(profile.id, actor);
    }
    const nextCharacterType = normalizeCharacterType(
      source.characterSheetConfig?.characterType || source.characterType
    );
    const structuredCharacterSnapshot = stripEmbeddedReferenceDataFromSnapshot({
      selections: source.selections || {},
      characterSheetConfig: source.characterSheetConfig || null,
      sourceOwnership: source.sourceOwnership || null
    });
    const canonicalHeadshotAssetId = resolveSourceHeadshotAssetId(source);
    const version = await this.versionRepository.create({
      characterProfileId: profile.id,
      characterType: nextCharacterType,
      structuredCharacterSnapshot,
      identityMetadata: deriveCharacterIdentityMetadata(structuredCharacterSnapshot),
      sourceGenerationResultIds: [source.id],
      canonicalHeadshotAssetId,
      canonicalFaceAssetId: canonicalHeadshotAssetId,
      canonicalCharacterSheetAssetId: source.id
    }, actor);
    const reviewVersion = await attachInitialCastingCandidate({
      version,
      source,
      versionRepository: this.versionRepository
    });
    const updated = await this.profileRepository.updateSystem(profile.id, {
      characterType: nextCharacterType,
      intendedUses: normalizeIntendedUsesForCharacterType(
        profile.intendedUses,
        nextCharacterType
      ),
      activeVersionId: reviewVersion.id,
      status: reviewVersion.status === 'review' ? 'review' : 'draft',
      visibility: 'private',
      reusePolicy: 'owner_only'
    });
    await this.profileSharingService.syncProjection(updated, actor);
    return this.getOwnerDetail(profile.id, actor);
  }

  async approveStyled(id, input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const profile = await this.profileRepository.findByIdForOwner(id, actor.userId);
    if (!profile || normalizeCharacterType(profile.characterType) !== CHARACTER_TYPE.STYLED_CHARACTER) {
      throw new RepositoryContractError(
        'styled_character_not_found',
        'Styled Character Profile not found.',
        404
      );
    }
    const version = await this.versionRepository.findById(
      input.characterProfileVersionId || profile.activeVersionId
    );
    if (!version || version.characterProfileId !== profile.id || version.ownerUserId !== actor.userId) {
      throw new RepositoryContractError('character_profile_version_not_found', 'Character version not found.', 404);
    }
    const source = await this.generationResultRepository.findByIdForOwner(
      version.canonicalCharacterSheetAssetId,
      actor.userId
    );
    if (!source?.imageUrl) {
      throw new RepositoryContractError(
        'styled_character_source_required',
        'The owned Styled Character Sheet image is unavailable.',
        409
      );
    }
    const approved = await this.versionRepository.approveStyled(
      version.id,
      input.consentDeclarationVersion || null
    );
    const updated = await this.profileRepository.updateSystem(profile.id, {
      status: 'approved',
      activeVersionId: approved.id
    });
    return { profile: updated, version: approved };
  }

  async convertToReusableModel(id, actorContext) {
    const actor = assertActorContext(actorContext);
    const profile = await this.profileRepository.findByIdForOwner(id, actor.userId);
    if (!profile || normalizeCharacterType(profile.characterType) !== CHARACTER_TYPE.STYLED_CHARACTER
      || ['archived', 'blocked'].includes(profile.status)) {
      throw new RepositoryContractError('styled_character_not_found', 'Styled Character Profile not found.', 404);
    }
    const sourceVersion = await this.versionRepository.findById(profile.activeVersionId);
    if (!sourceVersion || sourceVersion.characterProfileId !== profile.id) {
      throw new RepositoryContractError('character_profile_version_not_found', 'Character version not found.', 404);
    }
    const version = await this.versionRepository.create({
      characterProfileId: profile.id,
      characterType: CHARACTER_TYPE.REUSABLE_MODEL,
      structuredCharacterSnapshot: sourceVersion.structuredCharacterSnapshot,
      identityMetadata: normalizeCharacterIdentityMetadata(
        sourceVersion.identityMetadata,
        sourceVersion.structuredCharacterSnapshot
      ),
      sourceGenerationResultIds: sourceVersion.sourceGenerationResultIds,
      canonicalHeadshotAssetId: sourceVersion.canonicalHeadshotAssetId,
      canonicalFaceAssetId: sourceVersion.canonicalFaceAssetId,
      canonicalCharacterSheetAssetId: sourceVersion.canonicalCharacterSheetAssetId
    }, actor);
    const updated = await this.profileRepository.updateSystem(profile.id, {
      characterType: CHARACTER_TYPE.REUSABLE_MODEL,
      intendedUses: normalizeIntendedUsesForCharacterType(
        profile.intendedUses,
        CHARACTER_TYPE.REUSABLE_MODEL
      ),
      activeVersionId: version.id,
      status: 'draft',
      visibility: 'private',
      reusePolicy: 'owner_only'
    });
    await this.profileSharingService.syncProjection(updated, actor);
    return this.getOwnerDetail(updated.id, actor);
  }

  async archive(id, actorContext) {
    const actor = assertActorContext(actorContext);
    const profile = await this.profileRepository.findByIdForOwner(id, actor.userId);
    if (!profile) {
      throw new RepositoryContractError('character_profile_not_found', 'Character Profile not found.', 404);
    }
    const updated = await this.profileRepository.updateSystem(id, {
      status: 'archived',
      visibility: 'private',
      reusePolicy: 'owner_only'
    });
    await this.profileSharingService.syncProjection(updated, actor);
    return { id: updated.id, status: updated.status };
  }

  async moderate(id, input = {}, actorContext, requestContext = {}) {
    const actor = this.adminPolicy.assertCanModerateCharacter(actorContext);
    const action = input.action === 'unblock' ? 'unblock' : 'block';
    const reason = this.adminPolicy.requireReason(input.reason, 'Character moderation');
    const current = await this.profileRepository.findById(id);
    if (!current) {
      throw new RepositoryContractError('character_profile_not_found', 'Character Profile not found.', 404);
    }
    const updated = action === 'block'
      ? await this.profileRepository.updateSystem(id, {
        status: 'blocked',
        moderationPreviousStatus: current.status,
        visibility: 'private',
        reusePolicy: 'owner_only',
        moderationReason: reason
      })
      : await this.profileRepository.updateSystem(id, {
        status: current.moderationPreviousStatus === 'approved' ? 'approved' : 'draft',
        visibility: 'private',
        reusePolicy: 'owner_only',
        moderationReason: null,
        moderationPreviousStatus: null
      });
    await this.profileSharingService.syncProjection(updated, {
      userId: updated.ownerUserId,
      username: updated.ownerUsernameSnapshot || updated.ownerUsername || null,
      role: 'user'
    });
    await this.auditRepository.appendEvent({
      action: `character_profile_${action}`,
      targetType: 'character_profile',
      targetId: updated.id,
      reason,
      beforeSnapshot: {
        status: current.status,
        visibility: current.visibility,
        reusePolicy: current.reusePolicy
      },
      afterSnapshot: {
        status: updated.status,
        visibility: updated.visibility,
        reusePolicy: updated.reusePolicy
      },
      requestId: requestContext.requestId || null
    }, actor);
    return {
      id: updated.id,
      status: updated.status,
      visibility: updated.visibility,
      reusePolicy: updated.reusePolicy
    };
  }
}

export const characterProfileService = new CharacterProfileService();

function resolveSourceHeadshotAssetId(source = {}) {
  const candidates = [
    ...(Array.isArray(source.characterSheetConfig?.sourceHeadshotIds)
      ? source.characterSheetConfig.sourceHeadshotIds
      : []),
    ...(Array.isArray(source.referencedFaceJobIds) ? source.referencedFaceJobIds : [])
  ];
  return candidates.find(value => typeof value === 'string' && value.trim()) || null;
}

async function attachInitialCastingCandidate({
  version,
  source,
  versionRepository
}) {
  if (!isCanonicalInitialCastingCandidate(source, version.characterType)) return version;
  return versionRepository.attachCastingResult(version.id, {
    generationResultId: source.id,
    assetId: source.id,
    castingExportLayoutVersion: source.characterSheetConfig.castingLayoutVersion,
    castingUniformPolicyVersion: source.characterSheetConfig.uniformPolicyVersion,
    providerModelSnapshot: {
      providerId: source.provider || null,
      modelId: source.submodel || source.model || null,
      resolution: source.imageResolution || null,
      providerConfigVersion: source.providerConfigVersion || null
    },
    promptSnapshotHash: source.promptHash || null
  });
}

function isCanonicalInitialCastingCandidate(source, characterType) {
  if (normalizeCharacterType(characterType) !== CHARACTER_TYPE.REUSABLE_MODEL || !source?.imageUrl) {
    return false;
  }
  const policy = getCharacterCastingPolicy();
  const config = source.characterSheetConfig || {};
  const compatibleLayoutIds = new Set([
    policy.layoutId,
    ...(Array.isArray(policy.compatibleLayoutIds) ? policy.compatibleLayoutIds : [])
  ]);
  return config.castingCandidate === true
    && config.layout?.type === config.castingLayoutVersion
    && compatibleLayoutIds.has(config.castingLayoutVersion)
    && config.uniformPolicyVersion === policy.uniformPolicyId
    && config.aspectRatio === policy.aspectRatio
    && Number(config.outputCount) === Number(policy.outputCount);
}
