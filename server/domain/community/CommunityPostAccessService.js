import { assertActorContext, RepositoryContractError } from '../../repositories/repositoryContracts.js';
import path from 'path';
import { OUTPUTS_DIR } from '../../config/paths.js';
import { auditLogRepo } from '../../repositories/audit/AuditLogRepository.js';
import { communityPostRepo } from '../../repositories/community/CommunityPostRepository.js';
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
    classificationService = communityClassificationService
  } = {}) {
    this.postRepository = postRepository;
    this.auditRepository = auditRepository;
    this.classificationService = classificationService;
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
    return buildCommunityPostPublicView(post);
  }

  async getPostForTemplateUse(postId, actorContext) {
    const actor = assertActorContext(actorContext);
    const post = await this.postRepository.findById(postId);
    assertCanViewCommunityPost(post, actor, { directLink: true });
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

  async updatePresentation(postId, presentation = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const post = await this.postRepository.findById(postId);
    assertCanEditCommunityPost(post, actor);
    return this.postRepository.updatePresentationById(postId, {
      title: presentation.title,
      description: presentation.description,
      customTags: presentation.customTags,
      visibility: presentation.visibility
    }, actor);
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
