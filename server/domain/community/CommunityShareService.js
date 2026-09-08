import { sanitizeReferenceSlotsForPublic } from '../scene-templates/sceneTemplateSanitizer.js';
import { assertActorContext, RepositoryContractError } from '../../repositories/repositoryContracts.js';
import { stripEmbeddedBase64 } from '../../repositories/recordNormalizer.js';
import { generationResultRepo } from '../../repositories/generation/GenerationResultRepository.js';
import { communityPostRepo } from '../../repositories/community/CommunityPostRepository.js';
import { communityRemixRepo } from '../../repositories/community/RemixEventRepository.js';
import { CommunityPostAccessService } from './CommunityPostAccessService.js';
import { CommunityTemplateDetailService } from './CommunityTemplateDetailService.js';
import { communityClassificationService } from './CommunityClassificationService.js';
import { creatorProfileService } from './CreatorProfileService.js';
import { communityModerationService } from './CommunityModerationService.js';
import { communityEngagementService } from './CommunityEngagementService.js';
import {
  applyPromptVisibilityToSnapshots,
  buildGeneratedShareSnapshots,
  canPublishAsRemixOnly,
  isTemplateDerivedGeneration,
  isReusablePublishedSnapshot
} from './communityShareSnapshot.js';
import { templateCoreService as defaultTemplateCoreService } from '../templates/TemplateCoreService.js';
import { buildTemplateInputPolicy, getTemplateInputPolicy, TEMPLATE_INPUT_POLICY } from '../templates/templateInputPolicy.js';

const DRAFT_TTL_MS = 15 * 60 * 1000;
const PROMPT_VISIBILITIES = new Set(['full', 'partial', 'remix_only', 'private']);
const POST_VISIBILITIES = new Set(['public', 'unlisted', 'private']);
const FACE_REUSE_POLICIES = new Set(['view_only', 'public_reusable']);
const activeImagePublications = new Set();

export class CommunityShareService {
  constructor({
    generationRepository = generationResultRepo,
    postRepository = communityPostRepo,
    remixRepository = communityRemixRepo,
    postAccessService = null,
    classificationService = communityClassificationService,
    profileService = null,
    moderationService = communityModerationService,
    engagementService = communityEngagementService,
    templateCoreService = defaultTemplateCoreService,
    now = () => Date.now()
  } = {}) {
    this.generationRepository = generationRepository;
    this.templateDetailService = new CommunityTemplateDetailService({ postRepository, generationRepository });
    this.postRepository = postRepository;
    this.remixRepository = remixRepository;
    this.classificationService = classificationService;
    this.profileService = profileService;
    this.moderationService = moderationService;
    this.engagementService = engagementService;
    this.templateCoreService = templateCoreService;
    this.postAccessService = postAccessService || new CommunityPostAccessService({
      postRepository,
      classificationService
    });
    this.now = now;
    this.shareDrafts = new Map();
    this.presentationUpdates = new Map();
  }

  async createGeneratedShareDraft(sourceGenerationId, actorContext) {
    const actor = assertActorContext(actorContext);
    if (!sourceGenerationId) {
      throw new RepositoryContractError('source_generation_required', 'A source generation ID is required.');
    }

    const generation = await this.generationRepository.findByIdForOwner(sourceGenerationId, actor.userId);
    if (!generation || generation.deletedAt) {
      throw new RepositoryContractError('source_generation_not_found', 'The source generation result is not available.', 404);
    }
    await this.assertGenerationNotShared(generation.id, actor.userId);
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
    const sharingPolicy = await this.getGenerationSharingPolicy(generation);
    // Original drafts are owner-only and retain the sanitized recipe for an
    // explicit policy choice. Public snapshots are filtered again at publish.
    const snapshots = applyPromptVisibilityToSnapshots(
      buildGeneratedShareSnapshots(generation, sanitizedSceneTemplate), sharingPolicy.derived ? 'private' : 'full'
    );
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
    const inputPolicy = getTemplateInputPolicy(sanitizedSceneTemplate);
    const suggestedTemplateInputs = inputPolicy.supported && !sharingPolicy.derived
      ? buildTemplateInputPolicy(sanitizedSceneTemplate).inputs : [];
    const mandatoryTemplateInputIds = deriveMandatoryTemplateInputIds(
      suggestedTemplateInputs
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
      sourceGenerationMode: generation.mode || null,
      faceReuseEligible: generation.mode === 'headshot',
      templateEligible: inputPolicy.supported && !sharingPolicy.derived,
      templateIneligibleReason: sharingPolicy.derived ? 'template_derived_generation' : null,
      allowedPromptVisibilities: sharingPolicy.allowedPromptVisibilities,
      allowedTemplatePromptVisibilities: inputPolicy.supported && !sharingPolicy.derived
        ? ['full', ...(canPublishAsRemixOnly(snapshots) ? ['remix_only'] : [])]
        : [],
      templateInputPolicy: sharingPolicy.derived ? undefined : inputPolicy,
      mandatoryTemplateInputIds,
      suggestedTemplateInputSchema: sanitizedSceneTemplate && !sharingPolicy.derived
        ? {
          schemaVersion: 1,
          inputs: suggestedTemplateInputs
        }
        : null,
      faceReusePolicy: 'view_only',
      title: '',
      description: '',
      promptVisibility: sharingPolicy.promptVisibility,
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

  async getTemplateDetail(postId, query, actorContext) {
    return this.templateDetailService.getForPost(postId, query, actorContext);
  }

  async getTemplatePreviews(query, actorContext) {
    return this.templateDetailService.getPreviews(query, actorContext);
  }

  async getGenerationSharingPolicy(generation) {
    const derived = isTemplateDerivedGeneration(generation);
    return {
      derived,
      promptVisibility: 'private',
      allowedPromptVisibilities: derived ? ['private'] : ['full', 'partial', 'remix_only', 'private']
    };
  }

  async getGenerationShareStatus(sourceGenerationId, actorContext) {
    const actor = assertActorContext(actorContext);
    const generation = await this.generationRepository.findByIdForOwner(sourceGenerationId, actor.userId);
    if (!generation || generation.deletedAt) {
      throw new RepositoryContractError('source_generation_not_found', 'The source generation result is not available.', 404);
    }
    const post = await this.postRepository.findByGenerationForOwner(generation.id, actor.userId);
    return { shared: Boolean(post), ...(post ? { post: {
      id: post.id, postType: post.postType, visibility: post.visibility, status: post.status
    } } : {}) };
  }

  async assertGenerationNotShared(generationId, ownerUserId) {
    if (await this.postRepository.findByGenerationForOwner(generationId, ownerUserId)) {
      throw new RepositoryContractError('community_generation_already_shared', 'This image has already been shared.', 409);
    }
  }

  async updateGeneratedShareDraft(draftId, payload = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const current = this.getDraftForOwner(draftId, actor.userId);
    if (!current) {
      throw new RepositoryContractError('share_draft_not_found', 'Draft not found or expired.', 404);
    }
    if (current.templateIneligibleReason === 'template_derived_generation'
      && payload.promptVisibility !== undefined && payload.promptVisibility !== 'private') {
      throw new RepositoryContractError('community_source_prompt_visibility_restricted',
        'Images created with a Template must be shared with a private prompt.', 403);
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
        : validatePostVisibility(payload.visibility),
      faceReusePolicy: payload.faceReusePolicy === undefined
        ? current.faceReusePolicy
        : validateFaceReusePolicy(payload.faceReusePolicy, current)
    };
    this.shareDrafts.set(draftId, next);
    return structuredClone(next);
  }

  async publishGeneratedImageShare(draftId, payload = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const draft = this.getDraftForOwner(draftId, actor.userId);
    if (!draft) throw new RepositoryContractError('share_draft_not_found', 'Draft not found or expired.', 404);
    const key = JSON.stringify([actor.userId, draft.sourceGenerationId]);
    if (activeImagePublications.has(key)) {
      throw new RepositoryContractError('community_generation_share_in_progress', 'This image is being shared. Please wait.', 409);
    }
    if (activeImagePublications.size >= 256) {
      throw new RepositoryContractError('community_share_busy', 'Sharing is busy. Please retry shortly.', 429);
    }
    activeImagePublications.add(key);
    try { return await this.performGeneratedImageShare(draftId, payload, actor); }
    finally { activeImagePublications.delete(key); }
  }

  async performGeneratedImageShare(draftId, payload = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const draft = this.getDraftForOwner(draftId, actor.userId);
    if (!draft) {
      throw new RepositoryContractError('share_draft_not_found', 'Draft not found or expired.', 404);
    }

    const generation = await this.generationRepository.findByIdForOwner(draft.sourceGenerationId, actor.userId);
    if (!generation || generation.deletedAt) {
      throw new RepositoryContractError('source_generation_not_found', 'The source generation result is not available.', 404);
    }
    await this.assertGenerationNotShared(generation.id, actor.userId);
    // Recheck persisted provenance, not a cached draft or client eligibility flag.
    if (payload.publishAsTemplate === true && isTemplateDerivedGeneration(generation)) {
      throw new RepositoryContractError('community_template_derivative_not_publishable',
        'Images created with a Template can be shared as images, but not published as reusable Templates.', 403);
    }
    const sharingPolicy = await this.getGenerationSharingPolicy(generation);

    const title = String(payload.title ?? draft.title ?? '').trim();
    const promptVisibility = validatePromptVisibility(
      payload.promptVisibility ?? draft.promptVisibility ?? 'private'
    );
    const visibility = validatePostVisibility(payload.visibility ?? draft.visibility ?? 'public');
    if (!sharingPolicy.allowedPromptVisibilities.includes(promptVisibility)) {
      throw new RepositoryContractError('community_source_prompt_visibility_restricted',
        'The source Template does not permit this prompt visibility. Share the image with a private prompt.', 403);
    }
    const faceReusePolicy = validateFaceReusePolicy(
      payload.faceReusePolicy ?? draft.faceReusePolicy ?? 'view_only',
      draft,
      visibility
    );
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
    const publishAsTemplate = payload.publishAsTemplate === true;
    if (publishAsTemplate && !reusable) {
      throw new RepositoryContractError(
        'community_template_not_reusable',
        'This generation cannot be published as a reusable template.'
      );
    }
    const canonicalTemplate = publishAsTemplate
      ? await this.templateCoreService.publishFromGeneration({
        templateId: payload.templateId || null,
        kind: payload.templateKind || 'scene_image',
        title,
        description: typeof payload.description === 'string' ? payload.description : draft.description,
        visibility,
        promptVisibility,
        executionSnapshot: draft.sceneTemplateSnapshot,
        publicInputSchema: buildTemplateInputPolicy(draft.sceneTemplateSnapshot, payload.templateInputOptions),
        inputPolicyId: TEMPLATE_INPUT_POLICY,
        pricing: {
          accessCredits: payload.templateAccessCredits,
          creatorShareBps: payload.creatorShareBps
        },
        compatibility: payload.compatibility,
        sourceGenerationId: draft.sourceGenerationId,
        preview: {
          imageUrl: draft.imageUrl,
          thumbnailUrl: draft.thumbnailUrl,
          imageAssetId: draft.imageAssetId,
          thumbnailAssetId: draft.thumbnailAssetId,
          aspectRatio: draft.workflowSnapshot?.generationSettings?.aspectRatio
        }
      }, actor)
      : null;
    const postType = canonicalTemplate ? 'template' : 'image';

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
      templateDerived: sharingPolicy.derived,
      creatorProfileId: draft.creatorProfileId,
      postType,
      sourceSceneTemplateSnapshotId: canonicalTemplate?.version.id || null,
      templateId: canonicalTemplate?.template.id || null,
      templateVersionId: canonicalTemplate?.version.id || null,
      templatePricing: canonicalTemplate?.template.pricing || null,
      sourceComparisonSetId: null,
      imageAssetId: draft.imageAssetId,
      thumbnailAssetId: draft.thumbnailAssetId,
      sourceType: draft.sourceType,
      sourceGenerationMode: draft.sourceGenerationMode,
      faceReusePolicy,
      ...publishedSnapshots,
      sceneTemplateSnapshot: canonicalTemplate ? publishedSnapshots.sceneTemplateSnapshot : null,
      visibility,
      reusePolicy: canonicalTemplate ? 'remix_allowed' : 'view_only',
      status: canonicalTemplate ? 'draft' : 'published',
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

    if (post.templateId) {
      const sessionResult = await this.templateCoreService.createUseSession({
        templateId: post.templateId,
        templateVersionId: post.templateVersionId || null,
        sourceCommunityPostId: post.id
      }, actor);
      return {
        postId: post.id,
        title: post.title,
        description: post.description,
        ...sessionResult
      };
    }
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
    const generatedJobId = String(eventInput.generatedJobId || '').trim();
    const generation = generatedJobId
      ? await this.generationRepository.findByIdForOwner(generatedJobId, actor.userId)
      : null;
    if (!generation || generation.status !== 'completed') {
      throw new RepositoryContractError(
        'community_remix_generation_unverified',
        'A completed generation owned by the active user is required.',
        409
      );
    }
    const remixEvent = await this.remixRepository.appendEvent({
      sourcePostId: post.id,
      templateId: eventInput.templateId || post.id,
      generatedJobId,
      replacementSummary: eventInput.replacementSummary || {}
    }, actor);
    await this.engagementService.recordSuccessfulRemix({
      postId: post.id,
      generatedJobId,
      templateId: eventInput.templateId || post.id
    }, actor);
    return remixEvent;
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
    const actor = assertActorContext(actorContext);
    const post = await this.postRepository.findById(postId);
    if (!post || post.ownerUserId !== actor.userId) {
      throw new RepositoryContractError('community_post_forbidden', 'You do not have permission to edit this post.', 403);
    }
    const key = post.templateId || post.id;
    const current = this.presentationUpdates.get(key);
    if ((!current && this.presentationUpdates.size >= 256) || current?.count >= 16) {
      throw new RepositoryContractError('template_update_busy', 'Template updates are busy. Retry shortly.', 429);
    }
    const entry = current || { tail: Promise.resolve(), count: 0 };
    entry.count++;
    this.presentationUpdates.set(key, entry);
    const operation = entry.tail.catch(() => {}).then(() => this.performSharedPostPresentationUpdate(postId, presentation, actor));
    entry.tail = operation;
    try { return await operation; }
    finally {
      entry.count--;
      if (entry.count === 0) this.presentationUpdates.delete(key);
    }
  }

  async performSharedPostPresentationUpdate(postId, presentation, actorContext) {
    const actor = assertActorContext(actorContext);
    const post = await this.postRepository.findById(postId);
    if (!post || post.ownerUserId !== actor.userId) {
      throw new RepositoryContractError(
        'community_post_forbidden',
        'You do not have permission to edit this post.',
        403
      );
    }
    if (post.postType === 'image' && presentation?.promptVisibility !== undefined
      && presentation.promptVisibility !== 'private') {
      const generationId = post.sourceGenerationResultId || post.sourceGenerationId;
      const generation = generationId
        ? await this.generationRepository.findByIdForOwner(generationId, actor.userId) : null;
      if (post.templateDerived === true || isTemplateDerivedGeneration(generation || {})) {
        throw new RepositoryContractError('community_source_prompt_visibility_restricted',
          'Images created with a Template must be shared with a private prompt.', 403);
      }
    }
    let templateSettings = null;
    let inputVersion = null;
    if (presentation?.templateInputOptions !== undefined) {
      if (post.postType !== 'template' || !post.templateId) {
        throw new RepositoryContractError('template_not_found', 'Template not found.', 404);
      }
      inputVersion = await this.templateCoreService.updateInputPolicy(
        post.templateId, presentation.templateInputOptions, presentation.expectedTemplateVersionId, actor,
        { postVersionId: post.templateVersionId }
      );
    }
    if (post.postType === 'template' && post.templateId && (
      inputVersion
      ||
      presentation?.templateAccessCredits !== undefined
      || presentation?.promptVisibility !== undefined
      || presentation?.visibility !== undefined
    )) {
      templateSettings = await this.templateCoreService.updatePublishedSettings(
        post.templateId,
        {
          accessCredits: presentation.templateAccessCredits,
          promptVisibility: presentation.promptVisibility,
          visibility: presentation.visibility
        },
        actor
      );
    }
    const promptVisibility = templateSettings?.version.promptVisibility
      || presentation?.promptVisibility;
    const sceneTemplateSnapshot = templateSettings?.sceneTemplateSnapshot;
    const publicPromptText = promptVisibility === 'full'
      ? String(templateSettings?.version.executionSnapshot?.finalPromptSnapshot || '').trim() || null
      : null;
    return this.postAccessService.updatePresentation(postId, {
      ...presentation,
      promptVisibility,
      templatePricing: templateSettings?.template.pricing,
      templateVersionId: templateSettings?.version.id,
      expectedPostTemplateVersionId: templateSettings ? post.templateVersionId : undefined,
      sceneTemplateSnapshot,
      sharedPromptSnapshot: templateSettings
        ? {
          ...(post.sharedPromptSnapshot || {}),
          publicPromptText
        }
        : undefined
    }, actor);
  }

  async activatePreparedTemplate({ templateId, templateVersionId }, actorContext) {
    const actor = assertActorContext(actorContext);
    return this.postRepository.activatePreparedTemplateByVersion(
      templateId,
      templateVersionId,
      actor
    );
  }

  async updateSharedPostTaxonomy(postId, taxonomy, actorContext) {
    return this.postAccessService.updateTaxonomy(postId, taxonomy, actorContext);
  }

  async moderateSharedPost(postId, moderation, actorContext) {
    return this.moderationService.moderate({
      postId,
      action: moderation?.action,
      reason: moderation?.reason
    }, actorContext);
  }

  async unpublishOwnPost(postId, actorContext) {
    return this.postAccessService.unpublishOwnPost(postId, actorContext);
  }
}

function deriveMandatoryTemplateInputIds(inputs) {
  return inputs
    .filter(input => {
      const field = String(input?.sourceFieldName || input?.id || '').toLowerCase();
      return input?.fashionBindingRole === 'fashion.outfit_front'
        || field === 'outfit_front'
        || field === 'outfit_front_reference';
    })
    .map(input => String(input.id || input.sourceFieldName || '').trim())
    .filter(Boolean);
}

export const communityShareService = new CommunityShareService({
  profileService: creatorProfileService,
  moderationService: communityModerationService
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

function validateFaceReusePolicy(value, draft = {}, visibility = draft.visibility) {
  const normalized = String(value || 'view_only');
  if (!FACE_REUSE_POLICIES.has(normalized)) {
    throw new RepositoryContractError('face_reuse_policy_invalid', 'Face reuse policy is invalid.');
  }
  if (normalized === 'public_reusable'
    && (!draft.faceReuseEligible || draft.sourceGenerationMode !== 'headshot' || visibility !== 'public')) {
    throw new RepositoryContractError(
      'face_reuse_policy_unavailable',
      'Public Face reuse requires a public Face Creation result.'
    );
  }
  return normalized;
}
