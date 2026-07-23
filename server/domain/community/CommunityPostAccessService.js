import { assertActorContext, RepositoryContractError } from '../../repositories/repositoryContracts.js';
import path from 'path';
import { OUTPUTS_DIR } from '../../config/paths.js';
import { auditLogRepo } from '../../repositories/audit/AuditLogRepository.js';
import { communityPostRepo } from '../../repositories/community/CommunityPostRepository.js';
import {
  assertCanEditCommunityPost,
  assertCanModerateCommunityPost,
  assertCanViewCommunityPost,
  isCommunityPostFeedVisible
} from './communityPostPolicy.js';
import { buildCommunityPostPublicView } from './communityPostPublicView.js';

export class CommunityPostAccessService {
  constructor({ postRepository = communityPostRepo, auditRepository = auditLogRepo } = {}) {
    this.postRepository = postRepository;
    this.auditRepository = auditRepository;
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
    return this.postRepository.updatePresentationById(postId, presentation, actor);
  }

  async moderate(postId, moderation = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const post = await this.postRepository.findById(postId);
    const action = moderation.action;
    const reason = moderation.reason;
    assertCanModerateCommunityPost(post, actor, action, reason);
    const updated = await this.postRepository.setModerationStatus(postId, action, reason, actor);
    await this.auditRepository.appendEvent({
      action: `community_post_${action}`,
      targetType: 'community_post',
      targetId: postId,
      reason: String(reason).trim(),
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
