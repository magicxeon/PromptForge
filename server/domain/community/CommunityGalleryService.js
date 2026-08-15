import {
  assertActorContext,
  RepositoryContractError
} from '../../repositories/repositoryContracts.js';
import { communityGalleryRepo } from '../../repositories/community/CommunityGalleryRepository.js';
import { communityCharacterRepo } from '../../repositories/community/CommunityCharacterRepository.js';
import { communityPostRepo } from '../../repositories/community/CommunityPostRepository.js';
import { creatorProfileRepo } from '../../repositories/community/CreatorProfileRepository.js';
import { sanitizeReferenceSlotsForPublic } from '../scene-templates/sceneTemplateSanitizer.js';
import { communityPostAccessService } from './CommunityPostAccessService.js';
import { creatorProfileService } from './CreatorProfileService.js';
import { isCommunityPostFeedVisible } from './communityPostPolicy.js';
import { characterProfileSharingService } from '../character-profiles/CharacterProfileSharingService.js';

export class CommunityGalleryService {
  constructor({
    galleryRepository = communityGalleryRepo,
    characterRepository = communityCharacterRepo,
    postRepository = communityPostRepo,
    profileRepository = creatorProfileRepo,
    postAccessService = communityPostAccessService,
    profileService = creatorProfileService,
    profileCharacterService = null
  } = {}) {
    this.galleryRepository = galleryRepository;
    this.characterRepository = characterRepository;
    this.postRepository = postRepository;
    this.profileRepository = profileRepository;
    this.postAccessService = postAccessService;
    this.profileService = profileService;
    this.profileCharacterService = profileCharacterService;
  }

  async addGalleryItem(input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const post = await this.requireOwnedPost(input.postId, actor);
    const profile = await this.profileService.ensureProfileForActor(actor);
    await this.assertNoDuplicate(this.galleryRepository, actor.userId, post.id);
    const item = await this.galleryRepository.create({
      creatorProfileId: profile.id,
      sourceCommunityPostId: post.id,
      sourceGenerationResultId: post.sourceGenerationResultId,
      imageAssetId: post.imageAssetId,
      thumbnailAssetId: post.thumbnailAssetId,
      title: input.title || post.title,
      description: input.description ?? post.description,
      officialTags: post.officialTags,
      customTags: post.customTags,
      reusePolicy: input.reusePolicy,
      visibility: input.visibility || 'public',
      sceneBuilderHandoffSnapshot: post.sceneTemplateSnapshot
    }, actor);
    return {
      id: item.id,
      title: item.title,
      visibility: item.visibility,
      reusePolicy: item.reusePolicy
    };
  }

  async createCharacter(input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const post = await this.requireOwnedPost(input.postId, actor);
    if (!post.sceneTemplateSnapshot) {
      throw new RepositoryContractError(
        'community_character_handoff_required',
        'A reusable Scene Builder snapshot is required to create a Character.',
        409
      );
    }
    const profile = await this.profileService.ensureProfileForActor(actor);
    await this.assertNoDuplicate(this.characterRepository, actor.userId, post.id);
    const item = await this.characterRepository.create({
      creatorProfileId: profile.id,
      sourceCommunityPostId: post.id,
      displayName: input.displayName || post.title || 'Character',
      description: input.description ?? post.description,
      characterType: input.characterType,
      sourceGenerationResultId: post.sourceGenerationResultId,
      previewImageAssetId: post.thumbnailAssetId || post.imageAssetId,
      faceReferencePolicy: input.faceReferencePolicy || 'replace_required',
      outfitReferencePolicy: input.outfitReferencePolicy || 'replace_required',
      reusePolicy: input.reusePolicy || 'use_as_character',
      visibility: input.visibility || 'public',
      officialTags: post.officialTags,
      sceneBuilderHandoffSnapshot: post.sceneTemplateSnapshot
    }, actor);
    return {
      id: item.id,
      displayName: item.displayName,
      visibility: item.visibility,
      reusePolicy: item.reusePolicy
    };
  }

  async listGalleryByHandle(handle, query, actorContext) {
    assertActorContext(actorContext);
    const profile = await this.requireProfile(handle);
    const page = await this.galleryRepository.listPublic({
      ...query,
      filters: { creatorProfileId: profile.id }
    });
    const visibleItems = await this.filterVisibleSourcePosts(
      this.galleryRepository,
      page.items
    );
    return {
      ...page,
      items: visibleItems.map(item => ({
        ...item,
        imageUrl: `/api/community/gallery/${encodeURIComponent(item.id)}/image`,
        thumbnailUrl: `/api/community/gallery/${encodeURIComponent(item.id)}/thumbnail`
      }))
    };
  }

  async listCharactersByHandle(handle, query, actorContext) {
    const actor = assertActorContext(actorContext);
    const profile = await this.requireProfile(handle);
    if (this.profileCharacterService) {
      return this.profileCharacterService.listPublic({
        ...query,
        filters: {
          ...(query?.filters || {}),
          creatorProfileId: profile.id,
          ownerUserId: profile.userId
        }
      }, actor);
    }
    const page = await this.characterRepository.listPublic({
      ...query,
      filters: {
        creatorProfileId: profile.id,
        ownerUserId: profile.userId
      }
    });
    const visibleItems = await this.filterVisibleSourcePosts(
      this.characterRepository,
      page.items
    );
    return {
      ...page,
      items: visibleItems.map(item => ({
        ...item,
        id: item.characterProfileId || item.id,
        communityCharacterProjectionId: item.characterProfileId ? item.id : null,
        imageUrl: item.characterProfileId
          ? `/api/community/character-profiles/${encodeURIComponent(item.characterProfileId)}/image`
          : `/api/community/characters/${encodeURIComponent(item.id)}/image`,
        thumbnailUrl: item.characterProfileId
          ? `/api/community/character-profiles/${encodeURIComponent(item.characterProfileId)}/thumbnail`
          : `/api/community/characters/${encodeURIComponent(item.id)}/thumbnail`
      }))
    };
  }

  async getGalleryMediaFile(itemId, kind, actorContext) {
    const actor = assertActorContext(actorContext);
    const item = await this.requireVisibleItem(this.galleryRepository, itemId, actor);
    return this.postAccessService.getPublicMediaFile(item.sourceCommunityPostId, kind, actor);
  }

  async getCharacterMediaFile(itemId, kind, actorContext) {
    const actor = assertActorContext(actorContext);
    const item = await this.requireVisibleItem(this.characterRepository, itemId, actor);
    return this.postAccessService.getPublicMediaFile(item.sourceCommunityPostId, kind, actor);
  }

  async createGalleryHandoff(itemId, actorContext) {
    const actor = assertActorContext(actorContext);
    const item = await this.requireVisibleItem(this.galleryRepository, itemId, actor);
    if (!['use_as_template', 'remix_with_required_replacements'].includes(item.reusePolicy)) {
      throw new RepositoryContractError('community_gallery_handoff_unavailable', 'This Gallery item is view-only.', 404);
    }
    return this.buildHandoff('gallery_image', item, actor);
  }

  async createCharacterHandoff(itemId, actorContext) {
    const actor = assertActorContext(actorContext);
    const item = await this.requireVisibleItem(this.characterRepository, itemId, actor);
    if (!['use_as_character', 'remix_with_required_replacements'].includes(item.reusePolicy)) {
      throw new RepositoryContractError('community_character_handoff_unavailable', 'This Character is view-only.', 404);
    }
    const handoff = this.buildHandoff('character_asset', item, actor);
    forcePrivateCharacterReplacements(
      handoff.sceneTemplateSnapshot,
      item,
      actor.userId === item.ownerUserId
    );
    handoff.requiredUserReplacements = requiredReplacementIds(handoff.sceneTemplateSnapshot);
    return handoff;
  }

  buildHandoff(sourceType, item, actor) {
    if (!item.sceneBuilderHandoffSnapshot) {
      throw new RepositoryContractError('community_handoff_snapshot_missing', 'Reusable template data is unavailable.', 404);
    }
    const snapshot = sanitizeReferenceSlotsForPublic(
      item.sceneBuilderHandoffSnapshot,
      actor,
      { userId: item.ownerUserId, username: item.ownerUsername }
    );
    return {
      sourceType,
      sourceId: item.id,
      sceneTemplateSnapshot: snapshot,
      referenceSlotMapping: snapshot?.referenceSlotMapping || {},
      replaceableVariables: snapshot?.replaceableVariables || [],
      requiredUserReplacements: requiredReplacementIds(snapshot)
    };
  }

  async requireOwnedPost(postId, actor) {
    const post = await this.postRepository.findById(postId);
    if (!post || post.ownerUserId !== actor.userId) {
      throw new RepositoryContractError('community_post_not_found', 'Owned Community post not found.', 404);
    }
    if (!['active', 'published', 'reported'].includes(post.status)) {
      throw new RepositoryContractError('community_post_unavailable', 'This Community post is unavailable.', 409);
    }
    return post;
  }

  async requireProfile(handle) {
    const profile = await this.profileRepository.findByHandle(handle);
    if (!profile) throw new RepositoryContractError('creator_profile_not_found', 'Creator profile not found.', 404);
    return profile;
  }

  async requireVisibleItem(repository, itemId, actor) {
    const item = await repository.findById(itemId);
    if (!item || item.status !== 'active'
      || (item.ownerUserId !== actor.userId && item.visibility !== 'public')) {
      throw new RepositoryContractError('community_item_not_found', 'Community item not found.', 404);
    }
    return item;
  }

  async assertNoDuplicate(repository, ownerUserId, sourcePostId) {
    const page = await repository.findByOwner(ownerUserId, { limit: 50 });
    if (page.items.some(item => item.sourceCommunityPostId === sourcePostId)) {
      throw new RepositoryContractError(
        'community_item_already_exists',
        'This post is already in the selected Community collection.',
        409
      );
    }
  }

  async filterVisibleSourcePosts(repository, summaries) {
    const decisions = await Promise.all(summaries.map(async summary => {
      const item = await repository.findById(summary.id);
      const post = item?.sourceCommunityPostId
        ? await this.postRepository.findById(item.sourceCommunityPostId)
        : null;
      if (item?.characterProfileId && !item.sourceCommunityPostId) return summary;
      return post && isCommunityPostFeedVisible(post) ? summary : null;
    }));
    return decisions.filter(Boolean);
  }
}

function requiredReplacementIds(snapshot) {
  return Object.entries(snapshot?.referenceSlotMapping || {})
    .filter(([, slot]) => slot?.sharePolicy === 'required_user_replacement' || slot?.reuseAllowed === false)
    .map(([slotId]) => slotId);
}

function forcePrivateCharacterReplacements(snapshot, item, viewerIsOwner) {
  if (viewerIsOwner || !snapshot?.referenceSlotMapping) return;
  const privateKinds = [];
  if (item.faceReferencePolicy !== 'public_reusable') privateKinds.push(/face|character/i);
  if (item.outfitReferencePolicy !== 'public_reusable') privateKinds.push(/outfit|clothing/i);
  Object.entries(snapshot.referenceSlotMapping).forEach(([slotId, slot]) => {
    if (!privateKinds.some(pattern => pattern.test(slotId))) return;
    slot.sharePolicy = 'required_user_replacement';
    slot.reuseAllowed = false;
    delete slot.imageUrl;
    delete slot.sourceAssetId;
    delete slot.sourceJobId;
  });
}

export const communityGalleryService = new CommunityGalleryService({
  profileCharacterService: characterProfileSharingService
});
