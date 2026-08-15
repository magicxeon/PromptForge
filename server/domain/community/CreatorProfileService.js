import {
  assertActorContext,
  RepositoryContractError
} from '../../repositories/repositoryContracts.js';
import { creatorProfileRepo } from '../../repositories/community/CreatorProfileRepository.js';
import { creatorFollowRepo } from '../../repositories/community/CreatorFollowRepository.js';
import { communityPostRepo } from '../../repositories/community/CommunityPostRepository.js';
import { communityCharacterRepo } from '../../repositories/community/CommunityCharacterRepository.js';
import { buildCommunityPostPublicView } from './communityPostPublicView.js';

export class CreatorProfileService {
  constructor({
    profileRepository = creatorProfileRepo,
    followRepository = creatorFollowRepo,
    postRepository = communityPostRepo,
    characterRepository = communityCharacterRepo
  } = {}) {
    this.profileRepository = profileRepository;
    this.followRepository = followRepository;
    this.postRepository = postRepository;
    this.characterRepository = characterRepository;
  }

  async ensureProfileForActor(actorContext) {
    const actor = assertActorContext(actorContext);
    const existing = await this.profileRepository.findByUserId(actor.userId);
    return existing || this.profileRepository.ensureForActor(actor);
  }

  async getOwnProfile(actorContext) {
    const actor = assertActorContext(actorContext);
    const profile = await this.ensureProfileForActor(actor);
    return this.buildPublicProfile(profile, actor);
  }

  async updateOwnProfile(input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const profile = await this.ensureProfileForActor(actor);
    if (input.presentation !== undefined) {
      await this.assertOwnedPublicPresentation(input.presentation, actor);
    }
    const updated = await this.profileRepository.updateOwnProfile(profile.id, {
      displayName: input.displayName,
      bio: input.bio,
      presentation: input.presentation,
      recordVersion: input.recordVersion
    }, actor);
    return this.buildPublicProfile(updated, actor);
  }

  async updateOwnPresentation(input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const profile = await this.ensureProfileForActor(actor);
    const presentation = input.presentation || input;
    await this.assertOwnedPublicPresentation(presentation, actor);
    const updated = await this.profileRepository.updateOwnProfile(profile.id, {
      presentation,
      recordVersion: input.recordVersion
    }, actor);
    return this.buildPublicProfile(updated, actor);
  }

  async getPublicProfileByHandle(handle, viewerContext) {
    const viewer = viewerContext ? assertActorContext(viewerContext) : null;
    const profile = await this.profileRepository.findByHandle(handle);
    if (!profile) {
      throw new RepositoryContractError('creator_profile_not_found', 'Creator profile not found.', 404);
    }
    return this.buildPublicProfile(profile, viewer);
  }

  async listPublicPortfolio(handle, query = {}, viewerContext) {
    const viewer = viewerContext ? assertActorContext(viewerContext) : null;
    const profile = await this.profileRepository.findByHandle(handle);
    if (!profile) {
      throw new RepositoryContractError('creator_profile_not_found', 'Creator profile not found.', 404);
    }
    const ownerView = viewer?.userId === profile.userId;
    const page = ownerView
      ? await this.postRepository.findByOwner(profile.userId, query)
      : await this.postRepository.listPublic({
        limit: query.limit,
        cursor: query.cursor,
        sort: query.sort,
        filters: {
          ownerUserId: profile.userId
        }
      }, viewer);
    return {
      ...page,
      items: page.items.map(buildCommunityPostPublicView)
    };
  }

  async follow(profileId, actorContext) {
    const actor = assertActorContext(actorContext);
    const profile = await this.requireProfile(profileId);
    if (profile.userId === actor.userId) {
      throw new RepositoryContractError(
        'creator_self_follow_forbidden',
        'You cannot follow your own creator profile.',
        409
      );
    }
    await this.followRepository.follow(profile.id, actor);
    return this.buildPublicProfile(profile, actor);
  }

  async unfollow(profileId, actorContext) {
    const actor = assertActorContext(actorContext);
    const profile = await this.requireProfile(profileId);
    await this.followRepository.unfollow(profile.id, actor);
    return this.buildPublicProfile(profile, actor);
  }

  async requireProfile(profileId) {
    const profile = await this.profileRepository.findById(profileId);
    if (!profile || profile.status !== 'active') {
      throw new RepositoryContractError('creator_profile_not_found', 'Creator profile not found.', 404);
    }
    return profile;
  }

  async assertOwnedPublicPresentation(presentation = {}, actor) {
    if (!presentation || typeof presentation !== 'object') return;
    const postIds = uniqueIds([
      presentation.coverPostId,
      ...asArray(presentation.featuredPostIds),
      ...asArray(presentation.featuredTemplatePostIds)
    ]);
    for (const postId of postIds) {
      const post = await this.postRepository.findById(postId);
      if (!post || post.ownerUserId !== actor.userId
        || post.visibility !== 'public'
        || !['active', 'published'].includes(post.status)) {
        throw new RepositoryContractError(
          'creator_presentation_item_forbidden',
          'Profile presentation can only feature your active public work.',
          409
        );
      }
    }
    for (const characterId of uniqueIds(asArray(presentation.featuredCharacterProfileIds))) {
      const character = await this.characterRepository.findById(characterId)
        || await this.characterRepository.findByCharacterProfileId?.(characterId);
      if (!character || character.ownerUserId !== actor.userId
        || character.visibility !== 'public'
        || character.status !== 'active') {
        throw new RepositoryContractError(
          'creator_presentation_item_forbidden',
          'Profile presentation can only feature your active public work.',
          409
        );
      }
    }
  }

  async buildPublicProfile(profile, viewerContext) {
    const [followerCount, followingCount, portfolio] = await Promise.all([
      this.followRepository.countByCreatorProfileId(profile.id),
      this.followRepository.countByFollowerUserId(profile.userId),
      this.postRepository.listPublic({
        limit: 1,
        filters: { ownerUserId: profile.userId }
      }, viewerContext)
    ]);
    const viewerUserId = viewerContext?.userId || null;
    const viewerIsOwner = viewerUserId === profile.userId;
    const viewerIsFollowing = viewerUserId && !viewerIsOwner
      ? await this.followRepository.isFollowing(viewerUserId, profile.id)
      : false;

    return {
      id: profile.id,
      handle: profile.handle,
      displayName: profile.displayName,
      bio: profile.bio,
      avatarAssetId: profile.avatarAssetId,
      presentation: structuredClone(profile.presentation || {}),
      badgeCodes: [...(profile.badgeCodes || [])],
      followerCount,
      followingCount,
      publicPostCount: Number(portfolio.totalApprox) || 0,
      viewer: {
        isOwner: viewerIsOwner,
        isFollowing: viewerIsFollowing
      },
      recordVersion: viewerIsOwner ? profile.recordVersion : undefined,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
    };
  }
}

function uniqueIds(values) {
  return [...new Set(values.filter(value => typeof value === 'string' && value.trim()).map(value => value.trim()))];
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export const creatorProfileService = new CreatorProfileService();
