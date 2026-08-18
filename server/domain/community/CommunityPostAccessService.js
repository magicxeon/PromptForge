import { assertActorContext, RepositoryContractError } from '../../repositories/repositoryContracts.js';
import path from 'path';
import { OUTPUTS_DIR } from '../../config/paths.js';
import { auditLogRepo } from '../../repositories/audit/AuditLogRepository.js';
import { communityPostRepo } from '../../repositories/community/CommunityPostRepository.js';
import { generationResultRepo } from '../../repositories/generation/GenerationResultRepository.js';
import {
  assertCanEditCommunityPost,
  assertCanViewCommunityPost,
  isCommunityPostFeedVisible
} from './communityPostPolicy.js';
import { buildCommunityPostPublicView } from './communityPostPublicView.js';
import { communityClassificationService } from './CommunityClassificationService.js';

export class CommunityPostAccessService {
  constructor({
    postRepository = communityPostRepo,
    auditRepository = auditLogRepo,
    classificationService = communityClassificationService,
    generationRepository = generationResultRepo
  } = {}) {
    this.postRepository = postRepository;
    this.auditRepository = auditRepository;
    this.classificationService = classificationService;
    this.generationRepository = generationRepository;
  }

  async listPublicPosts(query = {}, actorContext = null) {
    const actor = actorContext ? assertActorContext(actorContext) : null;
    const page = await this.postRepository.listPublic(query, actor);
    return {
      ...page,
      items: page.items.filter(isCommunityPostFeedVisible).map(buildCommunityPostPublicView)
    };
  }

  async getPublicPost(postId, actorContext) {
    const actor = assertActorContext(actorContext);
    const post = await this.postRepository.findById(postId);
    assertCanViewCommunityPost(post, actor, { directLink: true });
    const isOwner = post.ownerUserId === actor.userId;
    const sourceGenerationId = post.sourceGenerationResultId || post.sourceGenerationId;
    const generation = sourceGenerationId
      ? await this.generationRepository.findById(sourceGenerationId)
      : null;
    const publicView = buildCommunityPostPublicView(
      withGenerationMetadataFallback(post, generation)
    );
    return {
      ...publicView,
      faceReuseAvailability: publicView.faceReuseAvailability
        || (isOwner && post.sourceGenerationMode === 'headshot'),
      viewer: {
        isOwner,
        permissions: {
          canVoteComparison: post.postType === 'comparison' && !isOwner,
          canReport: !isOwner,
          canUsePrivateReferences: false,
          canDownloadPrivateOutput: false
        }
      }
    };
  }

  async getPostForTemplateUse(postId, actorContext) {
    const actor = assertActorContext(actorContext);
    const post = await this.postRepository.findById(postId);
    assertCanViewCommunityPost(post, actor, { directLink: true });
    if (!['active', 'published'].includes(post.status)) {
      throw new RepositoryContractError(
        'community_template_setup_incomplete',
        'This Template is still being prepared and cannot be reused yet.',
        409
      );
    }
    if (post.reusePolicy !== 'remix_allowed') {
      throw new RepositoryContractError('community_template_unavailable', 'This template is not available for reuse.', 404);
    }
    return post;
  }

  async getPublicMediaFile(postId, kind, actorContext) {
    const actor = assertActorContext(actorContext);
    const post = await this.postRepository.findById(postId);
    assertCanViewCommunityPost(post, actor, { directLink: true });
    const source = kind === 'thumbnail' ? (post.thumbnailUrl || post.imageUrl) : post.imageUrl;
    const fileName = outputFileName(source);
    if (!fileName) {
      throw new RepositoryContractError('community_media_unavailable', 'This community image is unavailable.', 404);
    }
    return path.join(OUTPUTS_DIR, fileName);
  }

  async getVideoMediaFile(postId, kind, actorContext) {
    const actor = assertActorContext(actorContext);
    const post = await this.postRepository.findById(postId);
    assertCanViewCommunityPost(post, actor, { directLink: true });
    if (post.postType !== 'video') {
      throw new RepositoryContractError('community_video_unavailable', 'Video post not found.', 404);
    }
    const source = kind === 'poster'
      ? (post.posterUrl || post.thumbnailUrl || post.imageUrl)
      : post.videoUrl;
    const fileName = outputFileName(source);
    if (!fileName) {
      throw new RepositoryContractError(
        'community_video_media_unavailable',
        kind === 'poster' ? 'Video poster is unavailable.' : 'Video is unavailable.',
        404
      );
    }
    return path.join(OUTPUTS_DIR, fileName);
  }

  async getComparisonSlotMediaFile(postId, slotId, actorContext, kind = 'image') {
    const actor = assertActorContext(actorContext);
    const post = await this.postRepository.findById(postId);
    assertCanViewCommunityPost(post, actor, { directLink: true });
    if (post.postType !== 'comparison') {
      throw new RepositoryContractError('community_comparison_unavailable', 'Comparison post not found.', 404);
    }
    const slots = post.comparisonSnapshot?.slots || post.workflowSnapshot?.comparison?.slots || [];
    const slot = slots.find(item => String(item.slotId || item.id) === String(slotId));
    const source = kind === 'video'
      ? slot?.videoUrl
      : kind === 'poster'
        ? (slot?.posterUrl || slot?.thumbnailUrl)
        : slot?.imageUrl;
    const fileName = outputFileName(source);
    if (!fileName) {
      throw new RepositoryContractError('community_media_unavailable', 'Comparison image is unavailable.', 404);
    }
    return path.join(OUTPUTS_DIR, fileName);
  }

  async getCollectionItemMediaFile(postId, itemId, kind, actorContext) {
    const actor = assertActorContext(actorContext);
    const post = await this.postRepository.findById(postId);
    assertCanViewCommunityPost(post, actor, { directLink: true });
    if (post.postType !== 'collection') {
      throw new RepositoryContractError(
        'community_collection_unavailable',
        'Collection post not found.',
        404
      );
    }
    const items = post.collectionSnapshot?.items
      || post.workflowSnapshot?.collection?.items
      || [];
    const item = items.find(entry => String(entry.itemId) === String(itemId));
    const source = kind === 'thumbnail'
      ? (item?.thumbnailUrl || item?.imageUrl)
      : item?.imageUrl;
    const fileName = outputFileName(source);
    if (!fileName) {
      throw new RepositoryContractError(
        'community_media_unavailable',
        'Collection image is unavailable.',
        404
      );
    }
    return path.join(OUTPUTS_DIR, fileName);
  }

  async updatePresentation(postId, presentation = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const post = await this.postRepository.findById(postId);
    assertCanEditCommunityPost(post, actor);
    const updated = await this.postRepository.updatePresentationById(postId, {
      title: presentation.title,
      description: presentation.description,
      customTags: presentation.customTags,
      visibility: presentation.visibility,
      promptVisibility: presentation.promptVisibility,
      templatePricing: presentation.templatePricing,
      sharedPromptSnapshot: presentation.sharedPromptSnapshot,
      sceneTemplateSnapshot: presentation.sceneTemplateSnapshot
    }, actor);
    await this.auditRepository.appendEvent({
      action: 'community_post_owner_presentation_updated',
      targetType: 'community_post',
      targetId: postId,
      reason: 'Owner updated public presentation metadata.',
      beforeSnapshot: publicPresentationAuditSnapshot(post),
      afterSnapshot: publicPresentationAuditSnapshot(updated)
    }, actor);
    return buildCommunityPostPublicView(updated);
  }

  async updateTaxonomy(postId, taxonomy = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    if (!['admin', 'support'].includes(actor.role)) {
      throw new RepositoryContractError(
        'community_taxonomy_forbidden',
        'Only admin or support can correct published taxonomy.',
        403
      );
    }
    const reason = String(taxonomy.reason || '').trim();
    if (!reason) {
      throw new RepositoryContractError(
        'community_taxonomy_reason_required',
        'A reason is required when correcting published taxonomy.'
      );
    }
    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw new RepositoryContractError('community_post_not_found', 'Community post not found.', 404);
    }

    const prepared = await this.classificationService.prepareAdminTaxonomy({
      officialTags: taxonomy.officialTags,
      customTags: taxonomy.customTags === undefined ? post.customTags : taxonomy.customTags
    });
    const updated = await this.postRepository.updateTaxonomyById(postId, prepared, actor);
    await this.auditRepository.appendEvent({
      action: 'community_post_taxonomy_corrected',
      targetType: 'community_post',
      targetId: postId,
      reason,
      beforeSnapshot: {
        taxonomyVersion: post.taxonomyVersion,
        officialTags: post.officialTags,
        customTags: post.customTags,
        categoryCodes: post.categoryCodes,
        trendingCategoryCodes: post.trendingCategoryCodes
      },
      afterSnapshot: {
        taxonomyVersion: updated.taxonomyVersion,
        officialTags: updated.officialTags,
        customTags: updated.customTags,
        categoryCodes: updated.categoryCodes,
        trendingCategoryCodes: updated.trendingCategoryCodes
      }
    }, actor);
    return buildCommunityPostPublicView(updated);
  }

  async unpublishOwnPost(postId, actorContext) {
    const actor = assertActorContext(actorContext);
    const post = await this.postRepository.findById(postId);
    assertCanEditCommunityPost(post, actor);
    const updated = await this.postRepository.unpublishByOwner(postId, actor);
    await this.auditRepository.appendEvent({
      action: 'community_post_owner_unpublished',
      targetType: 'community_post',
      targetId: postId,
      reason: 'Owner unpublished the post.',
      beforeSnapshot: { status: post.status, visibility: post.visibility },
      afterSnapshot: { status: updated.status, visibility: updated.visibility }
    }, actor);
    return buildCommunityPostPublicView(updated);
  }
}

function publicPresentationAuditSnapshot(post = {}) {
  return {
    title: post.title || '',
    description: post.description || '',
    customTags: Array.isArray(post.customTags) ? [...post.customTags] : [],
    visibility: post.visibility || 'public',
    promptVisibility: post.promptVisibility || 'hidden',
    templateAccessCredits: Math.max(0, Number(post.templatePricing?.accessCredits) || 0),
    templateId: post.templateId || null,
    templateVersionId: post.templateVersionId || null
  };
}

function withGenerationMetadataFallback(post, generation) {
  if (!generation) return post;
  const existing = post.workflowSnapshot?.generationSettings || {};
  const snapshotSettings = generation.sceneTemplateSnapshot?.generationSettingsSnapshot || {};
  return {
    ...post,
    workflowSnapshot: {
      ...(post.workflowSnapshot || {}),
      generationSettings: {
        aspectRatio: existing.aspectRatio
          ?? snapshotSettings.aspectRatio
          ?? generation.aspectRatio
          ?? null,
        width: existing.width ?? snapshotSettings.width ?? generation.width ?? null,
        height: existing.height ?? snapshotSettings.height ?? generation.height ?? null,
        resolution: existing.resolution
          ?? snapshotSettings.resolution
          ?? generation.resolution
          ?? null,
        generationDuration: existing.generationDuration
          ?? generation.generationDuration
          ?? generation.usage?.latency_ms
          ?? null
      }
    }
  };
}

function outputFileName(value) {
  if (typeof value !== 'string' || !value.startsWith('/outputs/')) return null;
  const candidate = value.slice('/outputs/'.length).replaceAll('/', path.sep);
  if (!candidate || path.isAbsolute(candidate)) return null;

  const resolved = path.resolve(OUTPUTS_DIR, candidate);
  const relative = path.relative(OUTPUTS_DIR, resolved);
  if (!relative || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return null;
  return relative;
}

export const communityPostAccessService = new CommunityPostAccessService();
