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
    const visibility = ['private', 'unlisted', 'public'].includes(input.visibility)
      ? input.visibility
      : profile.visibility;
    const reusePolicy = ['owner_only', 'view_only', 'public_reusable'].includes(input.reusePolicy)
      ? input.reusePolicy
      : profile.reusePolicy;
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
      items: await this.applyFeaturedWork(summaries, actor)
    };
  }

  async getPublicDetail(profileId, actorContext) {
    const actor = assertActorContext(actorContext);
    const profile = assertProfileView(await this.profileRepository.findById(profileId), actor);
    const version = await this.requireActiveVersion(profile);
    const stats = await this.usageService.getStats(profile.id);
    const summary = await this.buildPublicSummary(profile, actor, version);
    const [featuredSummary] = await this.applyFeaturedWork([summary], actor);
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
    const destination = ['fashion_blueprint', 'scene_builder'].includes(input.destination)
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
        characterProfileId: profile.id,
        characterProfileVersionId: version.id,
        useCase: destination === 'fashion_blueprint' ? 'fashion' : 'scene_story',
        sourceType: destination === 'fashion_blueprint' ? 'fashion_blueprint' : 'scene_builder',
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

  async applyFeaturedWork(summaries = [], actorContext) {
    if (!summaries.length) return summaries;
    try {
      const profileIds = new Set(summaries.map(item => item.id));
      const posts = await this.communityPostRepository.listPublic(
        { limit: 50, sort: 'newest' },
        actorContext
      );
      const sourceIds = posts.items.map(post => post.sourceGenerationResultId).filter(Boolean);
      const results = await this.generationResultRepository.findByIds(sourceIds);
      const resultById = new Map(results.map(result => [result.id, result]));
      const featuredByProfileId = new Map();

      for (const post of posts.items) {
        const result = resultById.get(post.sourceGenerationResultId);
        const profileId = result?.characterProfileContext?.characterProfileId;
        if (!profileIds.has(profileId) || featuredByProfileId.has(profileId)) continue;
        const publicPost = buildCommunityPostPublicView(post);
        const displayImageUrl = publicPost.thumbnailUrl || publicPost.imageUrl;
        if (displayImageUrl) {
          featuredByProfileId.set(profileId, {
            displayImageUrl,
            displayImageSource: 'featured_work'
          });
        }
      }

      return summaries.map(summary => ({
        ...summary,
        ...(featuredByProfileId.get(summary.id) || {})
      }));
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
      imageUrl: canonicalImageUrl,
      thumbnailUrl,
      faceThumbnailUrl: `/api/community/character-profiles/${encodeURIComponent(profile.id)}/face`,
      displayImageUrl: hasCastingPreview ? thumbnailUrl : canonicalImageUrl,
      displayImageSource: hasCastingPreview ? 'casting_preview' : 'canonical_sheet',
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
