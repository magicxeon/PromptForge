import { sanitizeReferenceSlotsForPublic } from '../scene-templates/sceneTemplateSanitizer.js';
import { assertActorContext, RepositoryContractError } from '../../repositories/repositoryContracts.js';
import { stripEmbeddedBase64 } from '../../repositories/recordNormalizer.js';
import { generationResultRepo } from '../../repositories/generation/GenerationResultRepository.js';
import { communityPostRepo } from '../../repositories/community/CommunityPostRepository.js';
import { communityRemixRepo } from '../../repositories/community/RemixEventRepository.js';
import { CommunityPostAccessService } from './CommunityPostAccessService.js';
import { communityClassificationService } from './CommunityClassificationService.js';
import { creatorProfileService } from './CreatorProfileService.js';
import {
  applyPromptVisibilityToSnapshots,
  buildGeneratedShareSnapshots,
  canPublishAsRemixOnly,
  isReusablePublishedSnapshot
} from './communityShareSnapshot.js';

const DRAFT_TTL_MS = 15 * 60 * 1000;
const PROMPT_VISIBILITIES = new Set(['full', 'partial', 'remix_only', 'private']);
const POST_VISIBILITIES = new Set(['public', 'unlisted', 'private']);

export class CommunityShareService {
  constructor({
    generationRepository = generationResultRepo,
    postRepository = communityPostRepo,
    remixRepository = communityRemixRepo,
    postAccessService = null,
    classificationService = communityClassificationService,
    profileService = null,
    now = () => Date.now()
  } = {}) {
    this.generationRepository = generationRepository;
    this.postRepository = postRepository;
    this.remixRepository = remixRepository;
    this.classificationService = classificationService;
    this.profileService = profileService;
    this.postAccessService = postAccessService || new CommunityPostAccessService({
      postRepository,
      classificationService
    });
    this.now = now;
    this.shareDrafts = new Map();
  }

  async createGeneratedShareDraft(sourceGenerationId, actorContext) {
    const actor = assertActorContext(actorContext);
    if (!sourceGenerationId) {
      throw new RepositoryContractError('source_generation_required', 'A source generation ID is required.');
    }

    const generation = await this.generationRepository.findByIdForOwner(sourceGenerationId, actor.userId);
    if (!generation) {
      throw new RepositoryContractError('source_generation_not_found', 'The source generation result is not available.', 404);
    }
    const publicViewer = { userId: 'community_public', username: 'community_public', role: 'user' };
    const creatorProfile = this.profileService
      ? await this.profileService.ensureProfileForActor(actor)
      : null;
    const sanitizedSceneTemplate = generation.sceneTemplateSnapshot && typeof generation.sceneTemplateSnapshot === 'object'
      ? stripEmbeddedBase64(sanitizeReferenceSlotsForPublic(
        generation.sceneTemplateSnapshot,
        publicViewer,
        { userId: generation.ownerUserId, username: generation.ownerUsername }
      ))
      : null;
    const snapshots = buildGeneratedShareSnapshots(generation, sanitizedSceneTemplate);
    const timestamp = this.now();
    const classificationSnapshot = sanitizedSceneTemplate || {
      authoringMode: snapshots.workflowSnapshot.authoringMode,
      finalPromptSnapshot: snapshots.sharedPromptSnapshot.publicPromptText,
      structuredSelectionsSnapshot: snapshots.workflowSnapshot.structuredSelections
    };
    const taxonomySuggestion = await this.classificationService.classifyGeneration(
      generation,
      classificationSnapshot
    );
    const draft = {
      id: `draft_${timestamp}_${Math.random().toString(36).slice(2, 9)}`,
      schemaVersion: 1,
      sourceGenerationId: generation.id,
      ownerUserId: actor.userId,
      ownerUsername: actor.username,
      creatorProfileId: creatorProfile?.id
        || actor.activeCreatorProfileId
        || actor.profileId
        || null,
      imageAssetId: generation.imageAssetId || generation.assetId || null,
      thumbnailAssetId: generation.thumbnailAssetId || null,
      imageUrl: generation.imageUrl || '',
      thumbnailUrl: generation.thumbnailUrl || '',
      sourceType: sanitizedSceneTemplate ? 'scene_template' : 'generated_image',
      title: '',
      description: '',
      promptVisibility: 'full',
      visibility: 'public',
      ...snapshots,
      taxonomySuggestion,
      createdAt: new Date(timestamp).toISOString(),
      expiresAt: new Date(timestamp + DRAFT_TTL_MS).toISOString()
    };

    this.removeExpiredDrafts(timestamp);
    this.shareDrafts.set(draft.id, draft);
    return structuredClone(draft);
  }

  async updateGeneratedShareDraft(draftId, payload = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const current = this.getDraftForOwner(draftId, actor.userId);
    if (!current) {
      throw new RepositoryContractError('share_draft_not_found', 'Draft not found or expired.', 404);
    }

    const next = {
      ...current,
      title: payload.title === undefined ? current.title : String(payload.title || '').trim(),
      description: payload.description === undefined ? current.description : String(payload.description || '').trim(),
      promptVisibility: payload.promptVisibility === undefined
        ? current.promptVisibility
        : validatePromptVisibility(payload.promptVisibility),
      visibility: payload.visibility === undefined
        ? current.visibility
        : validatePostVisibility(payload.visibility)
    };
    this.shareDrafts.set(draftId, next);
    return structuredClone(next);
  }

  async publishGeneratedImageShare(draftId, payload = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const draft = this.getDraftForOwner(draftId, actor.userId);
    if (!draft) {
      throw new RepositoryContractError('share_draft_not_found', 'Draft not found or expired.', 404);
    }

    const title = String(payload.title ?? draft.title ?? '').trim();
    const promptVisibility = validatePromptVisibility(
      payload.promptVisibility ?? draft.promptVisibility ?? 'full'
    );
    const visibility = validatePostVisibility(payload.visibility ?? draft.visibility ?? 'public');
    if (!title) throw new RepositoryContractError('post_title_required', 'Title is required.');

    const draftSnapshots = {
      sharedPromptSnapshot: draft.sharedPromptSnapshot,
      providerModelSnapshot: draft.providerModelSnapshot,
      workflowSnapshot: draft.workflowSnapshot,
      sceneTemplateSnapshot: draft.sceneTemplateSnapshot
    };
    if (promptVisibility === 'remix_only' && !canPublishAsRemixOnly(draftSnapshots)) {
      const isManual = draftSnapshots.sharedPromptSnapshot?.authoringMode === 'manual'
        || draftSnapshots.sceneTemplateSnapshot?.authoringMode === 'manual';
      throw new RepositoryContractError(
        'manual_remix_only_not_supported',
        isManual
          ? 'Manual prompts cannot be hidden during remix. Please share as Full Prompt.'
          : 'Remix Only requires a guided Scene Builder template. Please share a Full, Partial or Private Prompt.'
      );
    }

    const publishedSnapshots = applyPromptVisibilityToSnapshots(draftSnapshots, promptVisibility);
    const reusable = isReusablePublishedSnapshot(publishedSnapshots, promptVisibility);
    const postType = reusable ? 'template' : 'image';

    const taxonomy = await this.classificationService.preparePublishTaxonomy(
      draft.taxonomySuggestion,
      {
        officialTags: payload.officialTags,
        customTags: payload.customTags
      }
    );
    const post = await this.postRepository.create({
      title,
      description: typeof payload.description === 'string' ? payload.description : draft.description,
      promptVisibility,
      imageUrl: draft.imageUrl,
      thumbnailUrl: draft.thumbnailUrl,
      sourceGenerationResultId: draft.sourceGenerationId,
      sourceGenerationId: draft.sourceGenerationId,
      creatorProfileId: draft.creatorProfileId,
      postType,
      sourceSceneTemplateSnapshotId: null,
      sourceComparisonSetId: null,
      imageAssetId: draft.imageAssetId,
      thumbnailAssetId: draft.thumbnailAssetId,
      sourceType: draft.sourceType,
      ...publishedSnapshots,
      visibility,
      reusePolicy: reusable ? 'remix_allowed' : 'view_only',
      ...taxonomy
    }, actor);

    this.shareDrafts.delete(draftId);
    return post;
  }

  async createSceneShareDraft(sourceGenerationId, actorContext) {
    return this.createGeneratedShareDraft(sourceGenerationId, actorContext);
  }

  async publishSceneTemplateShare(draftId, payload = {}, actorContext) {
    return this.publishGeneratedImageShare(draftId, payload, actorContext);
  }

  async getTemplateForViewer(postId, actorContext) {
    const actor = assertActorContext(actorContext);
    const post = await this.postAccessService.getPostForTemplateUse(postId, actor);

    if (!post.sceneTemplateSnapshot || typeof post.sceneTemplateSnapshot !== 'object') {
      throw new RepositoryContractError(
        'community_template_unavailable',
        'This post does not contain a reusable Scene Builder template.',
        404
      );
    }
    const sanitizedSnapshot = stripEmbeddedBase64(sanitizeReferenceSlotsForPublic(
      post.sceneTemplateSnapshot,
      actor,
      { userId: post.ownerUserId, username: post.ownerUsername }
    ));
    return {
      postId: post.id,
      title: post.title,
      description: post.description,
      sceneTemplateSnapshot: sanitizedSnapshot
    };
  }

  async recordRemix(eventInput = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    if (!eventInput.sourcePostId) {
      throw new RepositoryContractError('source_post_required', 'A source post ID is required.');
    }
    const post = await this.postAccessService.getPostForTemplateUse(eventInput.sourcePostId, actor);

    return this.remixRepository.appendEvent({
      sourcePostId: post.id,
      templateId: eventInput.templateId || post.id,
      generatedJobId: eventInput.generatedJobId || null,
      replacementSummary: eventInput.replacementSummary || {}
    }, actor);
  }

  getDraftForOwner(draftId, ownerUserId) {
    this.removeExpiredDrafts(this.now());
    const draft = this.shareDrafts.get(draftId);
    if (!draft || draft.ownerUserId !== ownerUserId) return null;
    return structuredClone(draft);
  }

  removeExpiredDrafts(now) {
    for (const [draftId, draft] of this.shareDrafts.entries()) {
      if (Date.parse(draft.expiresAt || '') <= now) this.shareDrafts.delete(draftId);
    }
  }

  async listSharedPosts(query, actorContext) {
    const filters = {
      ...(query?.filters && typeof query.filters === 'object' ? query.filters : {}),
      ...(typeof query?.officialTag === 'string' ? { officialTag: query.officialTag } : {}),
      ...(typeof query?.customTag === 'string' ? { customTag: query.customTag } : {}),
      ...(typeof query?.search === 'string' ? { search: query.search } : {})
    };
    return this.postAccessService.listPublicPosts({ ...query, filters }, actorContext);
  }

  async getSharedPost(postId, actorContext) {
    return this.postAccessService.getPublicPost(postId, actorContext);
  }

  async getSharedPostMediaFile(postId, kind, actorContext) {
    return this.postAccessService.getPublicMediaFile(postId, kind, actorContext);
  }

  async updateSharedPostPresentation(postId, presentation, actorContext) {
    return this.postAccessService.updatePresentation(postId, presentation, actorContext);
  }

  async updateSharedPostTaxonomy(postId, taxonomy, actorContext) {
    return this.postAccessService.updateTaxonomy(postId, taxonomy, actorContext);
  }

  async moderateSharedPost(postId, moderation, actorContext) {
    return this.postAccessService.moderate(postId, moderation, actorContext);
  }

  async unpublishOwnPost(postId, actorContext) {
    return this.postAccessService.unpublishOwnPost(postId, actorContext);
  }
}

export const communityShareService = new CommunityShareService({
  profileService: creatorProfileService
});

// Compatibility exports for existing app composition while routes migrate to the service object.
export { communityPostRepo, communityRemixRepo };
export const createGeneratedShareDraft = (...args) => communityShareService.createGeneratedShareDraft(...args);
export const publishGeneratedImageShare = (...args) => communityShareService.publishGeneratedImageShare(...args);
export const createSceneShareDraft = (...args) => communityShareService.createSceneShareDraft(...args);
export const publishSceneTemplateShare = (...args) => communityShareService.publishSceneTemplateShare(...args);

function validatePromptVisibility(value) {
  if (!value) {
    throw new RepositoryContractError('prompt_visibility_required', 'Prompt visibility setting is required.');
  }
  if (!PROMPT_VISIBILITIES.has(value)) {
    throw new RepositoryContractError('invalid_prompt_visibility', 'Prompt visibility setting is invalid.');
  }
  return value;
}

function validatePostVisibility(value) {
  if (!POST_VISIBILITIES.has(value)) {
    throw new RepositoryContractError('invalid_post_visibility', 'Post visibility setting is invalid.');
  }
  return value;
}
