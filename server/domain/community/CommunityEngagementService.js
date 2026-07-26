import {
  assertActorContext,
  RepositoryContractError
} from '../../repositories/repositoryContracts.js';
import { communityPostRepo } from '../../repositories/community/CommunityPostRepository.js';
import { communityEngagementEventRepo } from '../../repositories/community/CommunityEngagementEventRepository.js';
import { communityReactionRepo } from '../../repositories/community/CommunityReactionRepository.js';
import { communityCommentRepo } from '../../repositories/community/CommunityCommentRepository.js';
import { communityComparisonVoteRepo } from '../../repositories/community/CommunityComparisonVoteRepository.js';
import { communityEngagementAggregateRepo } from '../../repositories/community/CommunityEngagementAggregateRepository.js';
import { loadCommunityEngagementPolicy } from './communityEngagementPolicy.js';

export class CommunityEngagementService {
  constructor({
    postRepository = communityPostRepo,
    eventRepository = communityEngagementEventRepo,
    reactionRepository = communityReactionRepo,
    commentRepository = communityCommentRepo,
    voteRepository = communityComparisonVoteRepo,
    aggregateRepository = communityEngagementAggregateRepo,
    policyLoader = loadCommunityEngagementPolicy,
    now = () => new Date()
  } = {}) {
    this.postRepository = postRepository;
    this.eventRepository = eventRepository;
    this.reactionRepository = reactionRepository;
    this.commentRepository = commentRepository;
    this.voteRepository = voteRepository;
    this.aggregateRepository = aggregateRepository;
    this.policyLoader = policyLoader;
    this.now = now;
  }

  async getEngagement(postId, actorContext) {
    const actor = assertActorContext(actorContext);
    const post = await this.assertEngageablePost(postId);
    const [like, save, vote] = await Promise.all([
      this.reactionRepository.find(post.id, actor.userId, 'like'),
      this.reactionRepository.find(post.id, actor.userId, 'save'),
      this.voteRepository.find(post.id, actor.userId)
    ]);
    return {
      postId: post.id,
      summary: await this.reconcile(post.id),
      viewerState: {
        liked: like?.active === true,
        saved: save?.active === true,
        comparisonVoteSlotId: vote?.active ? vote.comparisonSlotId : null
      }
    };
  }

  async recordView(postId, actorContext, { anonymousSessionHash = null, requestId = null } = {}) {
    const actor = actorContext ? assertActorContext(actorContext) : null;
    const post = await this.assertEngageablePost(postId);
    const policy = await this.policyLoader();
    const since = new Date(
      this.now().getTime() - Number(policy.limits.viewDedupeHours) * 60 * 60 * 1000
    ).toISOString();
    const actorUserId = actor?.userId || null;
    const sessionHash = actorUserId ? null : normalizeAnonymousSessionHash(anonymousSessionHash);
    if (!actorUserId && !sessionHash) {
      throw new RepositoryContractError(
        'community_view_identity_required',
        'A signed-in actor or anonymous session is required.',
        401
      );
    }
    const result = await this.eventRepository.appendViewIfNotRecent({
      postId: post.id,
      actorUserId,
      anonymousSessionHash: sessionHash,
      dedupeKey: `view:${post.id}:${actorUserId || sessionHash}:${this.now().toISOString()}`,
      requestId
    }, { since });
    if (!result.created) {
      return { counted: false, summary: await this.reconcile(post.id) };
    }
    return { counted: result.created, summary: await this.reconcile(post.id) };
  }

  async setReaction(postId, reactionType, active, actorContext, { requestId = null } = {}) {
    const actor = assertActorContext(actorContext);
    const post = await this.assertEngageablePost(postId);
    const result = await this.reactionRepository.setActive(post.id, reactionType, active, actor);
    if (result.changed) {
      const eventType = `${reactionType}_${active ? 'added' : 'removed'}`;
      await this.eventRepository.appendIfAbsent({
        postId: post.id,
        actorUserId: actor.userId,
        eventType,
        dedupeKey: `${eventType}:${post.id}:${actor.userId}:${result.reaction.updatedAt}`,
        requestId
      });
    }
    return {
      changed: result.changed,
      active: result.reaction?.active === true,
      summary: await this.reconcile(post.id)
    };
  }

  async listComments(postId, query, actorContext) {
    assertActorContext(actorContext);
    const post = await this.assertEngageablePost(postId);
    return this.commentRepository.listActiveByPost(post.id, query);
  }

  async createComment(postId, body, actorContext, { requestId = null } = {}) {
    const actor = assertActorContext(actorContext);
    const post = await this.assertEngageablePost(postId);
    const policy = await this.policyLoader();
    const normalizedBody = normalizeCommentBody(body, policy.limits.commentLength);
    const comment = await this.commentRepository.create({
      postId: post.id,
      body: normalizedBody
    }, actor);
    await this.eventRepository.appendIfAbsent({
      postId: post.id,
      actorUserId: actor.userId,
      eventType: 'comment_created',
      targetId: comment.id,
      dedupeKey: `comment_created:${comment.id}`,
      requestId
    });
    return { comment: publicComment(comment), summary: await this.reconcile(post.id) };
  }

  async removeComment(postId, commentId, actorContext, { requestId = null } = {}) {
    const actor = assertActorContext(actorContext);
    const post = await this.assertEngageablePost(postId);
    const comment = await this.commentRepository.findById(commentId);
    if (!comment || comment.postId !== post.id) {
      throw new RepositoryContractError('community_comment_not_found', 'Community comment not found.', 404);
    }
    const result = await this.commentRepository.remove(commentId, actor);
    if (result.changed) {
      await this.eventRepository.appendIfAbsent({
        postId: post.id,
        actorUserId: actor.userId,
        eventType: 'comment_removed',
        targetId: commentId,
        dedupeKey: `comment_removed:${commentId}`,
        requestId
      });
    }
    return { changed: result.changed, summary: await this.reconcile(post.id) };
  }

  async setComparisonVote(postId, comparisonSlotId, actorContext, { requestId = null } = {}) {
    const actor = assertActorContext(actorContext);
    const post = await this.assertEngageablePost(postId);
    if (post.postType !== 'comparison') {
      throw new RepositoryContractError(
        'comparison_vote_post_invalid',
        'Votes are available only for comparison posts.'
      );
    }
    if (post.ownerUserId === actor.userId) {
      throw new RepositoryContractError(
        'comparison_owner_vote_forbidden',
        'A comparison owner cannot vote on their own post.',
        409
      );
    }
    const allowedSlotIds = comparisonSlotIds(post);
    if (allowedSlotIds.size && !allowedSlotIds.has(comparisonSlotId)) {
      throw new RepositoryContractError('comparison_vote_slot_invalid', 'Comparison result slot is invalid.');
    }
    const result = await this.voteRepository.setVote(post.id, comparisonSlotId, actor);
    if (result.changed) {
      const eventType = result.previousSlotId ? 'comparison_vote_changed' : 'comparison_vote_added';
      await this.eventRepository.appendIfAbsent({
        postId: post.id,
        actorUserId: actor.userId,
        eventType,
        targetId: comparisonSlotId,
        dedupeKey: `${eventType}:${post.id}:${actor.userId}:${result.vote.updatedAt}`,
        requestId,
        metadata: { comparisonSlotId }
      });
    }
    return {
      changed: result.changed,
      comparisonSlotId: result.vote?.comparisonSlotId || null,
      summary: await this.reconcile(post.id)
    };
  }

  async removeComparisonVote(postId, actorContext, { requestId = null } = {}) {
    const actor = assertActorContext(actorContext);
    const post = await this.assertEngageablePost(postId);
    if (post.postType !== 'comparison') {
      throw new RepositoryContractError('comparison_vote_post_invalid', 'Votes are available only for comparison posts.');
    }
    const result = await this.voteRepository.removeVote(post.id, actor);
    if (result.changed) {
      await this.eventRepository.appendIfAbsent({
        postId: post.id,
        actorUserId: actor.userId,
        eventType: 'comparison_vote_removed',
        targetId: result.vote?.comparisonSlotId || null,
        dedupeKey: `comparison_vote_removed:${post.id}:${actor.userId}:${result.vote.updatedAt}`,
        requestId
      });
    }
    return { changed: result.changed, summary: await this.reconcile(post.id) };
  }

  async recordSuccessfulRemix({
    postId,
    generatedJobId,
    templateId = null,
    requestId = null
  }, actorContext) {
    const actor = assertActorContext(actorContext);
    const post = await this.assertEngageablePost(postId);
    const jobId = String(generatedJobId || '').trim();
    if (!jobId) {
      throw new RepositoryContractError('community_remix_job_required', 'A completed generation job is required.');
    }
    const result = await this.eventRepository.appendIfAbsent({
      postId: post.id,
      actorUserId: actor.userId,
      eventType: 'remix_succeeded',
      targetId: jobId,
      dedupeKey: `remix_succeeded:${post.id}:${actor.userId}:${jobId}`,
      requestId,
      metadata: {
        generatedJobId: jobId,
        sourcePostId: post.id,
        templateId: templateId || post.id
      }
    });
    return { created: result.created, summary: await this.reconcile(post.id) };
  }

  async reconcile(postId) {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw new RepositoryContractError('community_post_not_found', 'Community post not found.', 404);
    }
    const [events, reactions, comments, votes] = await Promise.all([
      this.eventRepository.listByPost(postId),
      this.reactionRepository.listActiveByPost(postId),
      this.commentRepository.listActiveRecordsByPost(postId),
      this.voteRepository.listActiveByPost(postId)
    ]);
    const summary = {
      viewCount: events.filter(event => event.eventType === 'view').length,
      likeCount: reactions.filter(item => item.reactionType === 'like').length,
      saveCount: reactions.filter(item => item.reactionType === 'save').length,
      commentCount: comments.length,
      remixSuccessCount: events.filter(event => event.eventType === 'remix_succeeded').length,
      comparisonVoteCount: votes.length,
      updatedAt: this.now().toISOString()
    };
    const aggregates = buildDailyAggregates(post, { events, reactions, comments, votes }, summary.updatedAt);
    await Promise.all([
      this.aggregateRepository.replaceForPost(postId, aggregates),
      this.postRepository.updateEngagementSummary(postId, summary)
    ]);
    return summary;
  }

  async assertEngageablePost(postId) {
    const post = await this.postRepository.findById(postId);
    if (!post
      || post.visibility !== 'public'
      || !['active', 'published', 'reported'].includes(post.status)) {
      throw new RepositoryContractError(
        'community_engagement_target_unavailable',
        'This Community post is not available for engagement.',
        404
      );
    }
    return post;
  }
}

function normalizeCommentBody(value, maxLength) {
  const body = String(value || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
  if (!body) {
    throw new RepositoryContractError('community_comment_body_required', 'Enter a comment before posting.');
  }
  if (body.length > Number(maxLength)) {
    throw new RepositoryContractError(
      'community_comment_too_long',
      `Community comments cannot exceed ${maxLength} characters.`
    );
  }
  return body;
}

function normalizeAnonymousSessionHash(value) {
  const hash = String(value || '').trim();
  return /^[a-f0-9]{32,128}$/i.test(hash) ? hash : null;
}

function publicComment(comment) {
  return {
    id: comment.id,
    postId: comment.postId,
    author: { displayName: comment.actorDisplayName },
    body: comment.body,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt
  };
}

function comparisonSlotIds(post) {
  const snapshot = post.workflowSnapshot?.comparison
    || post.comparisonSnapshot
    || post.metadata?.comparison;
  const slots = snapshot?.slots || snapshot?.results || [];
  return new Set(Array.isArray(slots)
    ? slots.map(item => String(item?.slotId || item?.id || '')).filter(Boolean)
    : []);
}

function buildDailyAggregates(post, state, updatedAt) {
  const days = new Map();
  const day = timestamp => {
    const utcDate = String(timestamp || '').slice(0, 10);
    if (!days.has(utcDate)) {
      days.set(utcDate, {
        postId: post.id,
        utcDate,
        uniqueViewCount: 0,
        likeNetCount: 0,
        saveNetCount: 0,
        activeCommentCount: 0,
        remixSuccessCount: 0,
        comparisonVoteNetCount: 0,
        eligibleEventCount: 0,
        updatedAt
      });
    }
    return days.get(utcDate);
  };

  for (const event of state.events) {
    const aggregate = day(event.occurredAt);
    if (event.eventType === 'view') aggregate.uniqueViewCount += 1;
    if (event.eventType === 'remix_succeeded') aggregate.remixSuccessCount += 1;
    if (event.actorUserId !== post.ownerUserId) aggregate.eligibleEventCount += 1;
  }
  for (const reaction of state.reactions) {
    const aggregate = day(reaction.updatedAt || reaction.createdAt);
    if (reaction.reactionType === 'like') aggregate.likeNetCount += 1;
    if (reaction.reactionType === 'save') aggregate.saveNetCount += 1;
  }
  for (const comment of state.comments) day(comment.createdAt).activeCommentCount += 1;
  for (const vote of state.votes) day(vote.updatedAt || vote.createdAt).comparisonVoteNetCount += 1;
  return [...days.values()].filter(item => item.utcDate);
}

export const communityEngagementService = new CommunityEngagementService();
