import {
  assertActorContext,
  RepositoryContractError
} from '../../repositories/repositoryContracts.js';
import { communityPostRepo } from '../../repositories/community/CommunityPostRepository.js';
import { communityReportRepo } from '../../repositories/community/CommunityReportRepository.js';
import { adminPolicyService } from '../admin/AdminPolicyService.js';
import { auditService } from '../audit/AuditService.js';
import {
  assertCanViewCommunityPost,
  isCommunityPostOwner
} from './communityPostPolicy.js';

export class CommunityModerationService {
  constructor({
    postRepository = communityPostRepo,
    reportRepository = communityReportRepo,
    policy = adminPolicyService,
    audit = auditService,
    now = () => Date.now(),
    reportLimit = 5,
    reportWindowMs = 60 * 60 * 1000
  } = {}) {
    this.postRepository = postRepository;
    this.reportRepository = reportRepository;
    this.policy = policy;
    this.audit = audit;
    this.now = now;
    this.reportLimit = reportLimit;
    this.reportWindowMs = reportWindowMs;
  }

  async reportPost({ postId, reason, details }, actorContext) {
    const actor = assertAuthenticatedActor(actorContext);
    const normalizedReason = normalizeReportReason(reason);
    const post = await this.postRepository.findById(postId);
    assertCanViewCommunityPost(post, actor, { directLink: true });
    if (post.visibility !== 'public') {
      throw new RepositoryContractError(
        'community_report_target_unavailable',
        'This community post cannot be reported.',
        404
      );
    }
    if (isCommunityPostOwner(post, actor)) {
      throw new RepositoryContractError(
        'community_self_report_forbidden',
        'You cannot report your own community post.',
        409
      );
    }

    const result = await this.reportRepository.createWithRateLimit({
      targetType: 'community_post',
      targetId: post.id,
      reason: normalizedReason,
      details
    }, actor, {
      sinceTimestamp: this.now() - this.reportWindowMs,
      maxReports: this.reportLimit
    });
    if (result.created) await this.postRepository.markReported(post.id);
    return { report: publicReporterView(result.report), created: result.created };
  }

  async listReports(query, actorContext) {
    this.policy.assertCanAccessBackoffice(actorContext);
    return this.reportRepository.listForBackoffice(query);
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

const REPORT_REASONS = new Set([
  'copyright_or_ownership',
  'inappropriate_content',
  'misleading_or_spam',
  'private_information',
  'wrong_category',
  'other'
]);

function normalizeReportReason(value) {
  const reason = String(value || '').trim();
  if (!REPORT_REASONS.has(reason)) {
    throw new RepositoryContractError(
      'community_report_reason_invalid',
      'Select a valid report reason.',
      400
    );
  }
  return reason;
}

function assertAuthenticatedActor(actorContext) {
  const actor = assertActorContext(actorContext);
  if (actor.userId === 'anonymous_user' || actor.username === 'anonymous') {
    throw new RepositoryContractError(
      'community_report_authentication_required',
      'Sign in before reporting Community content.',
      401
    );
  }
  return actor;
}

function publicReporterView(report) {
  return {
    id: report.id,
    targetType: report.targetType,
    targetId: report.targetId,
    reason: report.reason,
    status: report.status,
    createdAt: report.createdAt
  };
}

export const communityModerationService = new CommunityModerationService();
