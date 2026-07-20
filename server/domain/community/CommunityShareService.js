import { sanitizeReferenceSlotsForPublic } from '../scene-templates/sceneTemplateSanitizer.js';
import { assertActorContext, RepositoryContractError } from '../../repositories/repositoryContracts.js';
import { stripEmbeddedBase64 } from '../../repositories/recordNormalizer.js';
import { generationResultRepo } from '../../repositories/generation/GenerationResultRepository.js';
import { communityPostRepo } from '../../repositories/community/CommunityPostRepository.js';
import { communityRemixRepo } from '../../repositories/community/RemixEventRepository.js';

const DRAFT_TTL_MS = 15 * 60 * 1000;

export class CommunityShareService {
  constructor({
    generationRepository = generationResultRepo,
    postRepository = communityPostRepo,
    remixRepository = communityRemixRepo,
    now = () => Date.now()
  } = {}) {
    this.generationRepository = generationRepository;
    this.postRepository = postRepository;
    this.remixRepository = remixRepository;
    this.now = now;
    this.shareDrafts = new Map();
  }

  async createSceneShareDraft(sourceGenerationId, actorContext) {
    const actor = assertActorContext(actorContext);
    if (!sourceGenerationId) {
      throw new RepositoryContractError('source_generation_required', 'A source generation ID is required.');
    }

    const generation = await this.generationRepository.findByIdForOwner(sourceGenerationId, actor.userId);
    if (!generation) {
      throw new RepositoryContractError('source_generation_not_found', 'The source generation result is not available.', 404);
    }
    if (!generation.sceneTemplateSnapshot || typeof generation.sceneTemplateSnapshot !== 'object') {
      throw new RepositoryContractError('scene_template_required', 'This image was not generated from a scene template.');
    }

    const publicViewer = { userId: 'community_public', username: 'community_public', role: 'user' };
    const sanitizedSnapshot = stripEmbeddedBase64(sanitizeReferenceSlotsForPublic(
      generation.sceneTemplateSnapshot,
      publicViewer,
      generation.ownerUsername
    ));
    const timestamp = this.now();
    const draft = {
      id: `draft_${timestamp}_${Math.random().toString(36).slice(2, 9)}`,
      schemaVersion: 1,
      sourceGenerationId: generation.id,
      ownerUserId: actor.userId,
      ownerUsername: actor.username,
      imageUrl: generation.imageUrl || '',
      thumbnailUrl: generation.thumbnailUrl || '',
      sceneTemplateSnapshot: sanitizedSnapshot,
      createdAt: new Date(timestamp).toISOString(),
      expiresAt: new Date(timestamp + DRAFT_TTL_MS).toISOString()
    };

    this.removeExpiredDrafts(timestamp);
    this.shareDrafts.set(draft.id, draft);
    return structuredClone(draft);
  }

  async publishSceneTemplateShare(draftId, payload = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const draft = this.getDraftForOwner(draftId, actor.userId);
    if (!draft) {
      throw new RepositoryContractError('share_draft_not_found', 'Draft not found or expired.', 404);
    }

    const title = String(payload.title || '').trim();
    const promptVisibility = payload.promptVisibility;
    if (!title) throw new RepositoryContractError('post_title_required', 'Title is required.');
    if (!promptVisibility) throw new RepositoryContractError('prompt_visibility_required', 'Prompt visibility setting is required.');
    if (!['full', 'hidden', 'remix_only'].includes(promptVisibility)) {
      throw new RepositoryContractError('invalid_prompt_visibility', 'Prompt visibility setting is invalid.');
    }

    const snapshot = stripEmbeddedBase64(draft.sceneTemplateSnapshot);
    if (snapshot.authoringMode === 'manual' && promptVisibility === 'remix_only') {
      throw new RepositoryContractError(
        'manual_remix_only_not_supported',
        'Manual prompts cannot be hidden during remix. Please share as Full Prompt.'
      );
    }

    if (promptVisibility === 'remix_only') {
      snapshot.finalPromptSnapshot = '';
      snapshot.manualPromptSnapshot = '';
    }

    const post = await this.postRepository.create({
      title,
      description: typeof payload.description === 'string' ? payload.description : '',
      promptVisibility,
      imageUrl: draft.imageUrl,
      thumbnailUrl: draft.thumbnailUrl,
      sourceGenerationResultId: draft.sourceGenerationId,
      sourceGenerationId: draft.sourceGenerationId,
      sceneTemplateSnapshot: snapshot,
      visibility: 'public',
      reusePolicy: 'remix_allowed'
    }, actor);

    this.shareDrafts.delete(draftId);
    return post;
  }

  async getTemplateForViewer(postId, actorContext) {
    const actor = assertActorContext(actorContext);
    const post = await this.postRepository.findPublicById(postId);
    if (!post) {
      throw new RepositoryContractError('shared_template_not_found', 'Shared template not found.', 404);
    }

    const sanitizedSnapshot = stripEmbeddedBase64(sanitizeReferenceSlotsForPublic(
      post.sceneTemplateSnapshot,
      actor,
      post.ownerUsername
    ));
    return {
      postId: post.id,
      title: post.title,
      description: post.description,
      ownerUserId: post.ownerUserId,
      ownerUsername: post.ownerUsername,
      sceneTemplateSnapshot: sanitizedSnapshot
    };
  }

  async recordRemix(eventInput = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    if (!eventInput.sourcePostId) {
      throw new RepositoryContractError('source_post_required', 'A source post ID is required.');
    }
    const post = await this.postRepository.findPublicById(eventInput.sourcePostId);
    if (!post) {
      throw new RepositoryContractError('shared_template_not_found', 'Shared template not found.', 404);
    }

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
}

export const communityShareService = new CommunityShareService();

// Compatibility exports for existing app composition while routes migrate to the service object.
export { communityPostRepo, communityRemixRepo };
export const createSceneShareDraft = (...args) => communityShareService.createSceneShareDraft(...args);
export const publishSceneTemplateShare = (...args) => communityShareService.publishSceneTemplateShare(...args);
