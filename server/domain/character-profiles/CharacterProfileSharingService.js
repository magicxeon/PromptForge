import fs from 'fs/promises';
import path from 'path';
import { OUTPUTS_DIR } from '../../config/paths.js';
import { characterProfileRepo } from '../../repositories/character-profiles/CharacterProfileRepository.js';
import { characterProfileVersionRepo } from '../../repositories/character-profiles/CharacterProfileVersionRepository.js';
import { communityCharacterRepo } from '../../repositories/community/CommunityCharacterRepository.js';
import { generationResultRepo } from '../../repositories/generation/GenerationResultRepository.js';
import { communityPostRepo } from '../../repositories/community/CommunityPostRepository.js';
import {
  assertActorContext,
  RepositoryContractError
} from '../../repositories/repositoryContracts.js';
import {
  assertProfileReuse,
  assertProfileView,
  reuseStatus
} from './characterProfilePolicy.js';
import { characterUsageService } from './CharacterUsageService.js';
import { buildCharacterIdentityFacets } from './CharacterIdentityFacetService.js';
import { buildCommunityPostPublicView } from '../community/communityPostPublicView.js';
import {
  assertCharacterDestination,
  getCharacterTypeCapabilities,
  normalizeCharacterType,
  resolveCanonicalCharacterAsset
} from './characterTypePolicy.js';

export class CharacterProfileSharingService {
  constructor({
    profileRepository = characterProfileRepo,
    versionRepository = characterProfileVersionRepo,
    communityCharacterRepository = communityCharacterRepo,
    generationResultRepository = generationResultRepo,
    communityPostRepository = communityPostRepo,
    usageService = characterUsageService
  } = {}) {
    this.profileRepository = profileRepository;
    this.versionRepository = versionRepository;
    this.communityCharacterRepository = communityCharacterRepository;
    this.generationResultRepository = generationResultRepository;
    this.communityPostRepository = communityPostRepository;
    this.usageService = usageService;
  }

  async updateSharing(profileId, input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const profile = await this.profileRepository.findByIdForOwner(profileId, actor.userId);
    if (!profile) {
      throw new RepositoryContractError('character_profile_not_found', 'Character Profile not found.', 404);
    }
    if (profile.status !== 'approved' && (input.visibility !== 'private' || input.reusePolicy !== 'owner_only')) {
      throw new RepositoryContractError(
        'character_profile_approval_required',
        'Approve a canonical casting export before sharing this Character.',
        409
      );
    }
    const visibilityPolicies = ['private', 'unlisted', 'public'];
    const reusePolicies = ['owner_only', 'view_only', 'public_reusable'];
    if (input.visibility !== undefined && !visibilityPolicies.includes(input.visibility)) {
      throw new RepositoryContractError(
        'character_visibility_invalid',
        'Character visibility is invalid.',
        400
      );
    }
    if (input.reusePolicy !== undefined && !reusePolicies.includes(input.reusePolicy)) {
      throw new RepositoryContractError(
        'character_reuse_policy_invalid',
        'Character reuse policy is invalid.',
        400
      );
    }
    const visibility = input.visibility ?? profile.visibility;
    const reusePolicy = input.reusePolicy ?? profile.reusePolicy;
    if (reusePolicy === 'public_reusable' && input.rightsDeclarationAccepted !== true) {
      throw new RepositoryContractError(
        'character_rights_declaration_required',
        'Confirm that you have the right to share this Character for reuse.',
        409
      );
    }
    const updated = await this.profileRepository.updateSystem(profile.id, {
      visibility,
      reusePolicy,
      rightsDeclarationVersion: reusePolicy === 'public_reusable'
        ? 'character-public-reuse-rights-v1'
        : profile.rightsDeclarationVersion || null,
      rightsDeclarationAcceptedAt: reusePolicy === 'public_reusable'
        ? new Date().toISOString()
        : profile.rightsDeclarationAcceptedAt || null
    });
    await this.syncProjection(updated, actor);
    return this.buildOwnerSummary(updated);
  }

  async syncProjection(profile, actorContext) {
    const version = await this.versionRepository.findById(profile.activeVersionId);
    if (!version) return null;
    const publicProjection = profile.visibility === 'public' && profile.status === 'approved';
    return this.communityCharacterRepository.upsertProfileProjection({
      creatorProfileId: profile.creatorProfileId || null,
      characterProfileId: profile.id,
      characterProfileVersionId: version.id,
      displayName: profile.displayName,
      description: profile.shortDescription,
      personalitySummary: profile.personalitySummary,
      intendedUses: profile.intendedUses,
      characterType: normalizeCharacterType(profile.characterType),
      sourceGenerationResultId: resolveCanonicalCharacterAsset(version, profile.characterType),
      sourceGenerationResultIds: [resolveCanonicalCharacterAsset(version, profile.characterType)].filter(Boolean),
      previewImageAssetId: resolveCanonicalCharacterAsset(version, profile.characterType),
      canonicalCastingExportAssetId: version.canonicalCastingExportAssetId,
      canonicalCharacterSheetAssetId: version.canonicalCharacterSheetAssetId,
      destinationCapabilities: [
        ...getCharacterTypeCapabilities(profile.characterType).destinations
      ],
      outfitBehavior: getCharacterTypeCapabilities(profile.characterType).outfitBehavior,
      faceReferencePolicy: profile.reusePolicy === 'public_reusable' ? 'public_reusable' : 'replace_required',
      outfitReferencePolicy: 'none',
      reusePolicy: profile.reusePolicy === 'public_reusable' ? 'use_as_character' : 'view_only',
      visibility: publicProjection ? 'public' : 'private',
      status: publicProjection ? 'active' : 'hidden'
    }, actorContext);
  }

  async listPublic(query = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const page = await this.profileRepository.listPublic(query);
    const summaries = await Promise.all(
      page.items.map(item => this.buildPublicSummary(item, actor))
    );
    return {
      ...page,
      items: await this.applyFeaturedWork(summaries, actor, page.items)
    };
  }

  async getPublicDetail(profileId, actorContext) {
    const actor = assertActorContext(actorContext);
    const profile = assertProfileView(await this.profileRepository.findById(profileId), actor);
    const version = await this.requireActiveVersion(profile);
    const stats = await this.usageService.getStats(profile.id);
    const summary = await this.buildPublicSummary(profile, actor, version);
    const [featuredSummary] = await this.applyFeaturedWork([summary], actor, [profile]);
    return {
      ...featuredSummary,
      shortDescription: profile.shortDescription,
      personalitySummary: profile.personalitySummary,
      stats,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      isOwner: profile.ownerUserId === actor.userId,
      recordVersion: profile.ownerUserId === actor.userId ? profile.recordVersion : undefined
    };
  }

  async createHandoff(profileId, input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const profile = assertProfileReuse(await this.profileRepository.findById(profileId), actor);
    const version = await this.requireActiveVersion(profile);
    const destination = ['fashion_blueprint', 'scene_builder', 'playground_image'].includes(input.destination)
      ? input.destination
      : 'scene_builder';
    const characterType = normalizeCharacterType(profile.characterType);
    const capabilities = assertCharacterDestination(characterType, destination);
    const referenceAssetId = resolveCanonicalCharacterAsset(version, characterType);
    if (!referenceAssetId) {
      throw new RepositoryContractError(
        'character_reference_unavailable',
        'The canonical Character reference is unavailable.',
        409
      );
    }
    return {
      handoffVersion: 1,
      destination,
      characterProfileId: profile.id,
      characterProfileVersionId: version.id,
      characterReferenceAssetId: referenceAssetId,
      characterReferenceUrl: `/api/community/character-profiles/${encodeURIComponent(profile.id)}/image`,
      displayName: profile.displayName,
      personalitySummarySnapshot: profile.personalitySummary,
      intendedUsesSnapshot: [...profile.intendedUses],
      characterType,
      destinationCapabilities: [...capabilities.destinations],
      outfitBehavior: capabilities.outfitBehavior,
      compatibleAttributeSnapshot: sanitizeCompatibleAttributes(version.structuredCharacterSnapshot),
      attribution: {
        ownerUserId: profile.ownerUserId,
        ownerUsername: profile.ownerUsernameSnapshot || profile.ownerUsername || null,
        creatorProfileId: profile.creatorProfileId || null
      },
      sourceOwnerUserId: profile.ownerUserId,
      reusePolicy: profile.reusePolicy,
      createdAt: new Date().toISOString(),
      characterProfileContext: {
        purpose: 'character_usage',
        characterProfileId: profile.id,
        characterProfileVersionId: version.id,
        useCase: destination === 'fashion_blueprint'
          ? 'fashion'
          : destination === 'scene_builder' ? 'scene_story' : 'general',
        sourceType: destination === 'fashion_blueprint'
          ? 'fashion_blueprint'
          : destination === 'scene_builder' ? 'scene_builder' : 'direct_generation',
        sourceId: profile.id,
        characterType,
        outfitBehavior: capabilities.outfitBehavior
      }
    };
  }

  async listPublicWorks(profileId, query = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const profile = assertProfileView(await this.profileRepository.findById(profileId), actor);
    const posts = await this.communityPostRepository.listPublic({
      limit: Math.min(50, Number(query.limit) || 24),
      cursor: query.cursor || null,
      sort: query.sort || 'newest'
    }, actor);
    const sourceIds = posts.items.map(post => post.sourceGenerationResultId).filter(Boolean);
    const results = await this.generationResultRepository.findByIds(sourceIds);
    const resultById = new Map(results.map(result => [result.id, result]));
    const matches = [];
    for (const post of posts.items) {
      const attributed = Array.isArray(post.characterAttributions)
        && post.characterAttributions.some(item => (
          item.characterProfileId === profile.id
          && item.verificationStatus === 'verified'
        ));
      if (attributed) {
        matches.push(buildCommunityPostPublicView(post));
        continue;
      }
      const result = resultById.get(post.sourceGenerationResultId);
      if (result?.characterProfileContext?.characterProfileId === profile.id) {
        matches.push(buildCommunityPostPublicView(post));
      }
    }
    return {
      items: matches,
      nextCursor: posts.nextCursor,
      hasMore: posts.hasMore
    };
  }

  async listFeaturedImageCandidates(profileId, query = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const profile = await this.profileRepository.findByIdForOwner(profileId, actor.userId);
    if (!profile) {
      throw new RepositoryContractError('character_profile_not_found', 'Character Profile not found.', 404);
    }
    const limit = Math.min(60, Math.max(1, Number(query.limit) || 36));
    const candidates = await this.resolveFeaturedCandidates([profile]);
    const seenGenerationIds = new Set();
    const items = [];
    for (const candidate of candidates.get(profile.id) || []) {
      if (candidate.sourceType === 'community_post'
        && candidate.ownership === 'owner'
        && seenGenerationIds.has(candidate.generationResultId)) continue;
      if (candidate.sourceType === 'generation_result') {
        seenGenerationIds.add(candidate.generationResultId);
      }
      items.push(toFeaturedCandidateView(profile.id, candidate));
      if (items.length >= limit) break;
    }
    return { items, nextCursor: null, hasMore: false };
  }

  async updateFeaturedImage(profileId, input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const profile = await this.profileRepository.findByIdForOwner(profileId, actor.userId);
    if (!profile) {
      throw new RepositoryContractError('character_profile_not_found', 'Character Profile not found.', 404);
    }
    const mode = input.mode === 'manual' ? 'manual' : 'auto';
    let sourceType = null;
    let generationResultId = null;
    let postId = null;
    if (mode === 'manual') {
      sourceType = input.sourceType === 'generation_result'
        ? 'generation_result'
        : input.sourceType === 'community_post' || input.postId
          ? 'community_post'
          : null;
      const sourceId = String(input.sourceId || input.postId || '').trim();
      if (!sourceType || !sourceId) {
        throw new RepositoryContractError(
          'character_featured_work_required',
          'Choose an eligible Character image to feature.',
          400
        );
      }
      if (sourceType === 'generation_result') {
        const result = await this.generationResultRepository.findById(sourceId);
        if (!isOwnedCharacterResult(result, profile)) {
          throw new RepositoryContractError(
            'character_featured_work_ineligible',
            'The selected image is not an eligible result owned by this Character owner.',
            409
          );
        }
        generationResultId = result.id;
      } else {
        const post = await this.communityPostRepository.findPublicById(sourceId);
        const result = post?.sourceGenerationResultId
          ? await this.generationResultRepository.findById(post.sourceGenerationResultId)
          : null;
        if (!post || !isCharacterResult(result, profile)) {
          throw new RepositoryContractError(
            'character_featured_work_ineligible',
            'The selected image is not an eligible public Community work for this Character.',
            409
          );
        }
        postId = post.id;
      }
    }
    const updated = await this.profileRepository.updateOwned(profile.id, {
      version: input.recordVersion,
      featuredImageMode: mode,
      featuredImageSourceType: sourceType,
      featuredGenerationResultId: generationResultId,
      featuredWorkPostId: postId
    }, actor);
    await this.syncProjection(updated, actor);
    return {
      characterProfileId: updated.id,
      recordVersion: updated.recordVersion,
      featuredImageMode: updated.featuredImageMode,
      featuredImageSourceType: updated.featuredImageSourceType,
      featuredGenerationResultId: updated.featuredGenerationResultId,
      featuredWorkPostId: updated.featuredWorkPostId
    };
  }

  async getFeaturedCandidateMediaFile(profileId, sourceType, sourceId, actorContext) {
    const actor = assertActorContext(actorContext);
    const profile = await this.profileRepository.findByIdForOwner(profileId, actor.userId);
    if (!profile) {
      throw new RepositoryContractError('character_profile_not_found', 'Character Profile not found.', 404);
    }
    const candidate = await this.resolveRequestedCandidate(profile, sourceType, sourceId);
    return this.resolveCandidateFile(candidate);
  }

  async getFeaturedImageFile(profileId, actorContext) {
    const actor = assertActorContext(actorContext);
    const profile = assertProfileView(await this.profileRepository.findById(profileId), actor);
    const candidatesByProfileId = await this.resolveFeaturedCandidates([profile]);
    const candidate = selectFeaturedCandidate(
      profile,
      candidatesByProfileId.get(profile.id) || [],
      profile.activeVersionId
    );
    if (!candidate) return this.getMediaFile(profileId, actor, 'thumbnail');
    return this.resolveCandidateFile(candidate);
  }

  async resolveRequestedCandidate(profile, sourceType, sourceId) {
    const id = String(sourceId || '').trim();
    if (sourceType === 'generation_result') {
      const result = await this.generationResultRepository.findById(id);
      if (isOwnedCharacterResult(result, profile)) return buildResultCandidate(result, profile);
    } else if (sourceType === 'community_post') {
      const post = await this.communityPostRepository.findPublicById(id);
      const result = post?.sourceGenerationResultId
        ? await this.generationResultRepository.findById(post.sourceGenerationResultId)
        : null;
      if (post && isCharacterResult(result, profile)) return buildPostCandidate(post, result, profile);
    }
    throw new RepositoryContractError(
      'character_featured_work_ineligible',
      'The selected Character image is no longer eligible.',
      409
    );
  }

  async resolveCandidateFile(candidate) {
    const result = candidate?.generationResultId
      ? await this.generationResultRepository.findById(candidate.generationResultId)
      : null;
    const thumbnailPath = await resolveExistingOutputPath(result?.thumbnailUrl);
    if (thumbnailPath) return thumbnailPath;
    const imagePath = await resolveExistingOutputPath(result?.imageUrl);
    if (imagePath) return imagePath;
    throw new RepositoryContractError(
      'character_featured_media_missing',
      'The selected Character image file is unavailable.',
      404
    );
  }

  async resolveFeaturedCandidates(profiles = []) {
    const profileIds = profiles.map(profile => profile.id).filter(Boolean);
    const results = await this.generationResultRepository.findByCharacterProfileIds(profileIds);
    const posts = await this.communityPostRepository.findPublicBySourceGenerationResultIds(
      results.map(result => result.id)
    );
    const postsByResultId = new Map();
    for (const post of posts) {
      if (post.deletedAt) continue;
      const entries = postsByResultId.get(post.sourceGenerationResultId) || [];
      entries.push(post);
      postsByResultId.set(post.sourceGenerationResultId, entries);
    }
    const profileById = new Map(profiles.map(profile => [profile.id, profile]));
    const candidatesByProfileId = new Map(profileIds.map(id => [id, []]));
    for (const result of results) {
      const profile = profileById.get(result?.characterProfileContext?.characterProfileId);
      if (!profile || !hasRenderableImage(result)) continue;
      const candidates = candidatesByProfileId.get(profile.id);
      if (result.ownerUserId === profile.ownerUserId) {
        candidates.push(buildResultCandidate(result, profile));
      }
      for (const post of postsByResultId.get(result.id) || []) {
        candidates.push(buildPostCandidate(post, result, profile));
      }
    }
    for (const candidates of candidatesByProfileId.values()) {
      candidates.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    }
    return candidatesByProfileId;
  }

  async getMediaFile(profileId, actorContext, mediaKind = 'image') {
    const actor = assertActorContext(actorContext);
    const profile = assertProfileView(await this.profileRepository.findById(profileId), actor);
    const version = await this.versionRepository.findById(profile.activeVersionId);
    const characterType = normalizeCharacterType(profile.characterType);
    const canonicalAssetId = version
      ? resolveCanonicalCharacterAsset(version, characterType)
      : null;
    if (!version || version.characterProfileId !== profile.id
      || !canonicalAssetId
      || (profile.ownerUserId !== actor.userId && version.status !== 'approved')) {
      throw new RepositoryContractError(
        'character_profile_media_not_ready',
        'Character image is not ready.',
        409
      );
    }
    const derivativeUrl = characterType === 'reusable_model' && mediaKind === 'face'
      ? version.castingFacePreviewUrl
      : characterType === 'reusable_model' && mediaKind === 'thumbnail'
        ? version.castingFrontPreviewUrl
        : null;
    const derivativePath = await resolveExistingOutputPath(derivativeUrl);
    if (derivativePath) return derivativePath;

    const result = await this.generationResultRepository.findById(canonicalAssetId);
    const canonicalPath = await resolveExistingOutputPath(result?.imageUrl);
    if (canonicalPath) return canonicalPath;

    throw new RepositoryContractError(
      'character_profile_media_missing',
      'Character image file is unavailable.',
      404
    );
  }

  async applyFeaturedWork(summaries = [], actorContext, profiles = []) {
    if (!summaries.length) return summaries;
    try {
      const profileById = new Map(profiles.map(profile => [profile.id, profile]));
      const candidatesByProfileId = await this.resolveFeaturedCandidates(profiles);

      return summaries.map(summary => {
        const profile = profileById.get(summary.id);
        const candidates = candidatesByProfileId.get(summary.id) || [];
        const selected = selectFeaturedCandidate(profile, candidates, summary.characterProfileVersionId);
        const manual = profile?.featuredImageMode === 'manual' && isStoredSelection(profile, selected);
        return selected ? {
          ...summary,
          displayImageUrl: `/api/community/character-profiles/${encodeURIComponent(summary.id)}/featured-image`,
          displayImageSource: selected.ownership === 'owner'
            ? manual ? 'owner_selected_generation' : 'owner_generation'
            : manual ? 'owner_selected_work' : 'featured_work',
          featuredImageMode: manual ? 'manual' : 'auto',
          featuredImageSourceType: manual ? selected.sourceType : null,
          featuredGenerationResultId: manual && selected.sourceType === 'generation_result'
            ? selected.generationResultId
            : null,
          featuredWorkPostId: manual && selected.sourceType === 'community_post'
            ? selected.postId
            : null
        } : {
          ...summary,
          featuredImageMode: profile?.featuredImageMode === 'manual' ? 'manual' : 'auto',
          featuredImageSourceType: profile?.featuredImageSourceType || null,
          featuredGenerationResultId: profile?.featuredGenerationResultId || null,
          featuredWorkPostId: profile?.featuredWorkPostId || null
        };
      });
    } catch (error) {
      console.warn('[Character Profiles] Featured public work lookup failed:', error.message);
      return summaries;
    }
  }

  async buildPublicSummary(profile, actor, providedVersion = null) {
    const version = providedVersion || await this.requireActiveVersion(profile);
    const stats = await this.usageService.getStats(profile.id);
    const characterType = normalizeCharacterType(profile.characterType);
    const capabilities = getCharacterTypeCapabilities(characterType);
    const canonicalImageUrl = `/api/community/character-profiles/${encodeURIComponent(profile.id)}/image`;
    const thumbnailUrl = `/api/community/character-profiles/${encodeURIComponent(profile.id)}/thumbnail`;
    const hasCastingPreview = characterType === 'reusable_model'
      && Boolean(version.castingFrontPreviewUrl);
    return {
      id: profile.id,
      identityFacets: buildCharacterIdentityFacets(version),
      displayName: profile.displayName,
      personalitySummary: profile.personalitySummary,
      intendedUses: [...profile.intendedUses],
      characterType,
      destinationCapabilities: [...capabilities.destinations],
      outfitBehavior: capabilities.outfitBehavior,
      creatorProfileId: profile.creatorProfileId || null,
      ownerUsername: profile.ownerUsernameSnapshot || profile.ownerUsername || null,
      status: profile.status,
      reusePolicy: profile.reusePolicy,
      reuseStatus: reuseStatus(profile, actor),
      handoffAvailable: profile.ownerUserId === actor.userId || profile.reusePolicy === 'public_reusable',
      isOwner: profile.ownerUserId === actor.userId,
      imageUrl: canonicalImageUrl,
      thumbnailUrl,
      faceThumbnailUrl: `/api/community/character-profiles/${encodeURIComponent(profile.id)}/face`,
      displayImageUrl: hasCastingPreview ? thumbnailUrl : canonicalImageUrl,
      displayImageSource: hasCastingPreview ? 'casting_preview' : 'canonical_sheet',
      featuredImageMode: profile.featuredImageMode === 'manual' ? 'manual' : 'auto',
      featuredImageSourceType: profile.featuredImageSourceType || null,
      featuredGenerationResultId: profile.featuredGenerationResultId || null,
      featuredWorkPostId: profile.featuredWorkPostId || null,
      characterProfileVersionId: version.id,
      stats
    };
  }

  buildOwnerSummary(profile) {
    return {
      id: profile.id,
      status: profile.status,
      visibility: profile.visibility,
      reusePolicy: profile.reusePolicy,
      characterType: normalizeCharacterType(profile.characterType),
      featuredImageMode: profile.featuredImageMode === 'manual' ? 'manual' : 'auto',
      featuredImageSourceType: profile.featuredImageSourceType || null,
      featuredGenerationResultId: profile.featuredGenerationResultId || null,
      featuredWorkPostId: profile.featuredWorkPostId || null,
      recordVersion: profile.recordVersion
    };
  }

  async requireActiveVersion(profile) {
    const version = await this.versionRepository.findById(profile.activeVersionId);
    if (!version || version.characterProfileId !== profile.id || version.status !== 'approved') {
      throw new RepositoryContractError('character_profile_version_not_found', 'Approved Character version not found.', 404);
    }
    return version;
  }
}

function featuredEngagementScore(post) {
  const engagement = post.engagementSummary || {};
  return (Number(engagement.likeCount) || 0) * 3
    + (Number(engagement.saveCount) || 0) * 4
    + (Number(engagement.commentCount) || 0) * 4
    + (Number(engagement.remixSuccessCount) || 0) * 5
    + (Number(engagement.comparisonVoteCount) || 0) * 4
    + (Number(engagement.viewCount) || 0) * 0.1;
}

function hasRenderableImage(result) {
  return Boolean(
    result?.id
    && (result.imageUrl || result.thumbnailUrl)
    && result.artifactVisibility !== 'system_internal'
    && result.operationPurpose !== 'template_pose_proxy'
  );
}

function isCharacterResult(result, profile) {
  return hasRenderableImage(result)
    && result.characterProfileContext?.characterProfileId === profile.id;
}

function isOwnedCharacterResult(result, profile) {
  return isCharacterResult(result, profile) && result.ownerUserId === profile.ownerUserId;
}

function buildResultCandidate(result, profile) {
  return {
    sourceType: 'generation_result',
    sourceId: result.id,
    generationResultId: result.id,
    postId: null,
    ownership: 'owner',
    title: result.fashionBlueprintContext?.productName
      || result.title
      || `Generation ${result.id.slice(-6)}`,
    createdAt: normalizeCandidateDate(result.timestamp || result.createdAt),
    characterProfileVersionId: result.characterProfileContext?.characterProfileVersionId || null,
    score: 0,
    profileId: profile.id
  };
}

function buildPostCandidate(post, result, profile) {
  const publicPost = buildCommunityPostPublicView(post);
  return {
    sourceType: 'community_post',
    sourceId: post.id,
    generationResultId: result.id,
    postId: post.id,
    ownership: result.ownerUserId === profile.ownerUserId ? 'owner' : 'community',
    title: publicPost.title || `Community work ${post.id.slice(-6)}`,
    createdAt: normalizeCandidateDate(publicPost.createdAt || result.timestamp),
    characterProfileVersionId: result.characterProfileContext?.characterProfileVersionId || null,
    score: featuredEngagementScore(publicPost),
    profileId: profile.id
  };
}

function normalizeCandidateDate(value) {
  const date = typeof value === 'number' ? new Date(value) : new Date(value || 0);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

function isStoredSelection(profile, candidate) {
  if (!profile || !candidate) return false;
  const sourceType = profile.featuredImageSourceType
    || (profile.featuredGenerationResultId ? 'generation_result' : null)
    || (profile.featuredWorkPostId ? 'community_post' : null);
  return sourceType === candidate.sourceType
    && (sourceType === 'generation_result'
      ? profile.featuredGenerationResultId === candidate.generationResultId
      : profile.featuredWorkPostId === candidate.postId);
}

function selectFeaturedCandidate(profile, candidates = [], activeVersionId = null) {
  if (!profile) return null;
  if (profile.featuredImageMode === 'manual') {
    const manual = candidates.find(candidate => isStoredSelection(profile, candidate));
    if (manual) return manual;
  }
  const byVersionAndDate = (left, right) => {
    const leftActive = left.characterProfileVersionId === activeVersionId ? 1 : 0;
    const rightActive = right.characterProfileVersionId === activeVersionId ? 1 : 0;
    return rightActive - leftActive || right.createdAt.localeCompare(left.createdAt);
  };
  const owned = candidates
    .filter(candidate => candidate.sourceType === 'generation_result' && candidate.ownership === 'owner')
    .sort(byVersionAndDate)[0];
  if (owned) return owned;
  return candidates
    .filter(candidate => candidate.sourceType === 'community_post')
    .sort((left, right) => {
      const versionOrder = byVersionAndDate(left, right);
      if (left.characterProfileVersionId !== right.characterProfileVersionId) return versionOrder;
      return right.score - left.score || right.createdAt.localeCompare(left.createdAt);
    })[0] || null;
}

function toFeaturedCandidateView(profileId, candidate) {
  const pathSourceType = encodeURIComponent(candidate.sourceType);
  const pathSourceId = encodeURIComponent(candidate.sourceId);
  const mediaUrl = `/api/character-profiles/${encodeURIComponent(profileId)}`
    + `/featured-image-candidates/${pathSourceType}/${pathSourceId}/media`;
  return {
    id: `${candidate.sourceType}:${candidate.sourceId}`,
    sourceType: candidate.sourceType,
    sourceId: candidate.sourceId,
    generationResultId: candidate.generationResultId,
    postId: candidate.postId,
    ownership: candidate.ownership,
    title: candidate.title,
    imageUrl: mediaUrl,
    thumbnailUrl: mediaUrl,
    createdAt: candidate.createdAt
  };
}

function sanitizeCompatibleAttributes(snapshot = {}) {
  const selections = snapshot.selections || snapshot.structuredSelections || snapshot;
  const allowedGroups = new Set(['Character', 'Face', 'Hair', 'Skin', 'Body']);
  return Object.fromEntries(Object.entries(selections || {}).filter(([, value]) =>
    value && typeof value === 'object' && allowedGroups.has(value.group)
  ));
}

export const characterProfileSharingService = new CharacterProfileSharingService();

async function resolveExistingOutputPath(imageUrl) {
  if (typeof imageUrl !== 'string' || !imageUrl.startsWith('/outputs/')) return null;
  const relative = imageUrl.slice('/outputs/'.length).replaceAll('/', path.sep);
  const candidate = path.resolve(OUTPUTS_DIR, relative);
  const root = path.resolve(OUTPUTS_DIR);
  if (!candidate.startsWith(`${root}${path.sep}`)) return null;
  try {
    await fs.access(candidate);
    return candidate;
  } catch {
    return null;
  }
}
