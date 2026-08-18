import { assertActorContext, RepositoryContractError } from '../../repositories/repositoryContracts.js';
import { assetRepo } from '../../repositories/assets/AssetRepository.js';
import { communityPostRepo } from '../../repositories/community/CommunityPostRepository.js';
import { characterProfileRepo } from '../../repositories/character-profiles/CharacterProfileRepository.js';
import { characterProfileVersionRepo } from '../../repositories/character-profiles/CharacterProfileVersionRepository.js';
import { creatorProfileService } from './CreatorProfileService.js';
import { buildCommunityPostPublicView } from './communityPostPublicView.js';

const DRAFT_TTL_MS = 15 * 60 * 1000;

export class CommunityVideoShareService {
  constructor({
    assetRepository = assetRepo,
    postRepository = communityPostRepo,
    profileRepository = characterProfileRepo,
    versionRepository = characterProfileVersionRepo,
    creatorProfiles = creatorProfileService,
    now = () => Date.now()
  } = {}) {
    this.assetRepository = assetRepository;
    this.postRepository = postRepository;
    this.profileRepository = profileRepository;
    this.versionRepository = versionRepository;
    this.creatorProfiles = creatorProfiles;
    this.now = now;
    this.drafts = new Map();
  }

  async createDraft(assetId, actorContext) {
    const actor = assertActorContext(actorContext);
    const asset = await this.assetRepository.findByIdForOwner(assetId, actor.userId);
    assertShareableVideoAsset(asset);
    const characterAttributions = await this.#resolveAttributions(
      asset.metadata?.characterAttributions
    );
    const now = this.now();
    const draft = {
      id: `videodraft_${now}_${Math.random().toString(36).slice(2, 10)}`,
      ownerUserId: actor.userId,
      videoAssetId: asset.id,
      videoUrl: asset.publicUrl,
      posterUrl: asset.metadata?.posterUrl || asset.thumbnailUrl || null,
      durationSeconds: positiveNumber(asset.metadata?.durationSeconds),
      title: '',
      description: '',
      visibility: 'public',
      promptVisibility: 'private',
      characterAttributions,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + DRAFT_TTL_MS).toISOString()
    };
    this.#removeExpired(now);
    this.drafts.set(draft.id, draft);
    return structuredClone(draft);
  }

  updateDraft(draftId, input, actorContext) {
    const actor = assertActorContext(actorContext);
    const draft = this.#getOwnedDraft(draftId, actor.userId);
    const next = {
      ...draft,
      title: input.title === undefined ? draft.title : bounded(input.title, 120),
      description: input.description === undefined
        ? draft.description
        : bounded(input.description, 1000),
      visibility: input.visibility === undefined
        ? draft.visibility
        : pick(input.visibility, ['public', 'unlisted', 'private'], 'public'),
      promptVisibility: input.promptVisibility === 'full' ? 'full' : 'private'
    };
    this.drafts.set(draftId, next);
    return structuredClone(next);
  }

  async publish(draftId, input, actorContext) {
    const actor = assertActorContext(actorContext);
    const draft = this.#getOwnedDraft(draftId, actor.userId);
    const asset = await this.assetRepository.findByIdForOwner(
      draft.videoAssetId,
      actor.userId
    );
    assertShareableVideoAsset(asset);
    if (!draft.posterUrl) {
      throw new RepositoryContractError(
        'community_video_poster_required',
        'A durable video poster is required before publication.',
        409
      );
    }
    const existing = (await this.postRepository.readAll()).find(post => (
      post.ownerUserId === actor.userId
      && post.videoAssetId === asset.id
      && post.status !== 'removed'
    ));
    if (existing) return buildCommunityPostPublicView(existing);
    const title = bounded(input.title ?? draft.title, 120);
    if (!title) throw new RepositoryContractError('post_title_required', 'Title is required.');
    const creatorProfile = await this.creatorProfiles.ensureProfileForActor(actor);
    const post = await this.postRepository.create({
      postType: 'video',
      mediaType: 'video',
      title,
      description: bounded(input.description ?? draft.description, 1000),
      creatorProfileId: creatorProfile.id,
      videoAssetId: asset.id,
      videoUrl: asset.publicUrl,
      posterUrl: draft.posterUrl,
      thumbnailUrl: draft.posterUrl,
      durationSeconds: draft.durationSeconds,
      videoMetadata: {
        durationSeconds: draft.durationSeconds,
        width: asset.width || null,
        height: asset.height || null,
        mimeType: asset.mimeType
      },
      characterAttributions: draft.characterAttributions,
      promptVisibility: input.promptVisibility === 'full'
        || draft.promptVisibility === 'full' ? 'full' : 'private',
      sharedPromptSnapshot: {
        schemaVersion: 1,
        authoringMode: 'manual',
        source: 'video_asset',
        publicPromptText: null
      },
      visibility: pick(input.visibility ?? draft.visibility, ['public', 'unlisted', 'private'], 'public'),
      reusePolicy: 'view_only',
      sourceType: 'generated_video',
      status: 'published'
    }, actor);
    this.drafts.delete(draftId);
    return buildCommunityPostPublicView(post);
  }

  async #resolveAttributions(value) {
    const candidates = Array.isArray(value) ? value.slice(0, 6) : [];
    const verified = [];
    for (const candidate of candidates) {
      const profile = await this.profileRepository.findById(candidate?.characterProfileId);
      const version = await this.versionRepository.findById(candidate?.characterProfileVersionId);
      if (!profile || !version || version.characterProfileId !== profile.id
        || profile.status !== 'approved' || version.status !== 'approved') continue;
      verified.push({
        characterProfileId: profile.id,
        characterProfileVersionId: version.id,
        displayName: profile.displayName,
        verificationStatus: profile.visibility === 'public' ? 'verified' : 'hidden_private'
      });
    }
    return verified;
  }

  #getOwnedDraft(draftId, ownerUserId) {
    this.#removeExpired(this.now());
    const draft = this.drafts.get(draftId);
    if (!draft || draft.ownerUserId !== ownerUserId) {
      throw new RepositoryContractError('video_share_draft_not_found', 'Video share draft not found or expired.', 404);
    }
    return draft;
  }

  #removeExpired(now) {
    for (const [id, draft] of this.drafts.entries()) {
      if (Date.parse(draft.expiresAt) <= now) this.drafts.delete(id);
    }
  }
}

function assertShareableVideoAsset(asset) {
  if (!asset || asset.status === 'deleted'
    || asset.assetType !== 'cinematic_video_output'
    || !String(asset.mimeType || '').startsWith('video/')
    || !asset.publicUrl) {
    throw new RepositoryContractError(
      'community_video_asset_not_shareable',
      'A completed owned Video Asset is required.',
      409
    );
  }
}

function bounded(value, max) {
  return String(value || '').trim().slice(0, max);
}

function pick(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function positiveNumber(value) {
  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
}

export const communityVideoShareService = new CommunityVideoShareService();
