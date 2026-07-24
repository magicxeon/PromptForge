import { RepositoryContractError } from '../../repositories/repositoryContracts.js';
import { communityPostRepo } from '../../repositories/community/CommunityPostRepository.js';
import { adminPolicyService } from '../admin/AdminPolicyService.js';
import { auditService } from '../audit/AuditService.js';

export class CommunityModerationService {
  constructor({ postRepository = communityPostRepo, policy = adminPolicyService, audit = auditService } = {}) {
    this.postRepository = postRepository;
    this.policy = policy;
    this.audit = audit;
  }

  async moderate({ postId, action, reason }, actorContext, request = null) {
    const actor = this.policy.assertCanAccessBackoffice(actorContext);
    const normalizedReason = this.policy.requireReason(reason, 'Community moderation');
    if (!['hide', 'remove'].includes(action)) {
      throw new RepositoryContractError('community_moderation_action_invalid', 'Moderation action must be hide or remove.', 400);
    }
    const current = await this.postRepository.findById(postId);
    if (!current) throw new RepositoryContractError('community_post_not_found', 'Community post not found.', 404);

    const updated = await this.postRepository.setModerationStatus(postId, action, normalizedReason, actor);
    await this.audit.record({
      action: `community.post.${action}`,
      targetType: 'community_post',
      targetId: postId,
      reason: normalizedReason,
      beforeSnapshot: { status: current.status, visibility: current.visibility },
      afterSnapshot: { status: updated.status, visibility: updated.visibility }
    }, actor, request);
    return updated;
  }
}

export const communityModerationService = new CommunityModerationService();
