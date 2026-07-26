import { buildCommunityPostPublicView } from './communityPostPublicView.js';
import { communityPostRepo } from '../../repositories/community/CommunityPostRepository.js';
import { communityEngagementEventRepo } from '../../repositories/community/CommunityEngagementEventRepository.js';
import { communityReactionRepo } from '../../repositories/community/CommunityReactionRepository.js';
import { communityCommentRepo } from '../../repositories/community/CommunityCommentRepository.js';
import { communityComparisonVoteRepo } from '../../repositories/community/CommunityComparisonVoteRepository.js';
import {
  loadCommunityEngagementPolicy,
  normalizeRankingPeriod,
  normalizeRankingSort
} from './communityEngagementPolicy.js';

export class CommunityRankingService {
  constructor({
    postRepository = communityPostRepo,
    eventRepository = communityEngagementEventRepo,
    reactionRepository = communityReactionRepo,
    commentRepository = communityCommentRepo,
    voteRepository = communityComparisonVoteRepo,
    policyLoader = loadCommunityEngagementPolicy,
    now = () => new Date()
  } = {}) {
    this.postRepository = postRepository;
    this.eventRepository = eventRepository;
    this.reactionRepository = reactionRepository;
    this.commentRepository = commentRepository;
    this.voteRepository = voteRepository;
    this.policyLoader = policyLoader;
    this.now = now;
  }

  async listRankedPosts({
    sort = 'latest',
    period = 'week',
    officialTag = null,
    limit = 24
  } = {}) {
    const normalizedSort = normalizeRankingSort(sort);
    const normalizedPeriod = normalizeRankingPeriod(period);
    const policy = await this.policyLoader();
    const windowEnd = this.now();
    const windowStart = new Date(
      windowEnd.getTime() - Number(policy.periodHours[normalizedPeriod]) * 60 * 60 * 1000
    );
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 24));
    const posts = (await this.postRepository.readAll()).filter(post =>
      post.visibility === 'public'
      && ['active', 'published', 'reported'].includes(post.status)
    );

    const scored = await Promise.all(posts.map(async post => {
      const metrics = await this.calculateWindowMetrics(post, windowStart, windowEnd, policy);
      const rawScore = calculateRawScore(metrics, policy.weights);
      const taxonomyMultiplier = taxonomyEligibility(post, officialTag, normalizedSort, policy);
      const moderationMultiplier = moderationEligibility(post);
      const postAgeHours = Math.max(
        0,
        (windowEnd.getTime() - (Date.parse(post.createdAt || '') || windowEnd.getTime())) / 3_600_000
      );
      const trendingScore = rawScore
        * taxonomyMultiplier
        * moderationMultiplier
        / Math.pow(
          1 + postAgeHours / Number(policy.halfLifeHours[normalizedPeriod]),
          Number(policy.trendingExponent)
        );
      return {
        post,
        metrics,
        rawScore,
        trendingScore,
        eligible: moderationMultiplier > 0 && (!officialTag || taxonomyMultiplier > 0)
      };
    }));

    const filtered = scored
      .filter(item => item.eligible)
      .sort((left, right) => compareRanked(left, right, normalizedSort));

    return {
      items: filtered.slice(0, safeLimit).map((item, index) => ({
        ...buildCommunityPostPublicView(item.post),
        ranking: {
          rank: index + 1,
          score: roundScore(normalizedSort === 'trending' ? item.trendingScore : item.rawScore),
          metrics: item.metrics
        }
      })),
      ranking: {
        sort: normalizedSort,
        period: normalizedPeriod,
        officialTag: officialTag || null,
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
        algorithmVersion: policy.algorithmVersion,
        calculatedAt: windowEnd.toISOString()
      },
      nextCursor: null,
      hasMore: filtered.length > safeLimit
    };
  }

  async calculateWindowMetrics(post, windowStart, windowEnd, policy) {
    const [events, reactions, comments, votes] = await Promise.all([
      this.eventRepository.listByPost(post.id, {
        since: windowStart.toISOString(),
        until: windowEnd.toISOString()
      }),
      this.reactionRepository.listActiveByPost(post.id),
      this.commentRepository.listActiveRecordsByPost(post.id),
      this.voteRepository.listActiveByPost(post.id)
    ]);
    const inWindow = value => {
      const timestamp = Date.parse(value || '') || 0;
      return timestamp >= windowStart.getTime() && timestamp <= windowEnd.getTime();
    };
    const eligibleActor = actorUserId => actorUserId && actorUserId !== post.ownerUserId;
    const viewKeys = new Set(events
      .filter(event => event.eventType === 'view' && eligibleActor(event.actorUserId || event.anonymousSessionHash))
      .map(event => event.actorUserId || event.anonymousSessionHash));
    const eligibleComments = capEligibleComments(
      comments.filter(comment =>
        eligibleActor(comment.actorUserId) && inWindow(comment.createdAt)
      ),
      Number(policy.limits.eligibleCommentsPerActorPostDay)
    );
    return {
      uniqueViews: viewKeys.size,
      activeLikes: reactions.filter(item =>
        item.reactionType === 'like'
        && eligibleActor(item.actorUserId)
        && inWindow(item.updatedAt || item.createdAt)
      ).length,
      activeSaves: reactions.filter(item =>
        item.reactionType === 'save'
        && eligibleActor(item.actorUserId)
        && inWindow(item.updatedAt || item.createdAt)
      ).length,
      eligibleActiveComments: eligibleComments,
      successfulRemixes: events.filter(event =>
        event.eventType === 'remix_succeeded' && eligibleActor(event.actorUserId)
      ).length,
      activeComparisonVotes: votes.filter(item =>
        eligibleActor(item.actorUserId) && inWindow(item.updatedAt || item.createdAt)
      ).length
    };
  }
}

function calculateRawScore(metrics, weights) {
  return (
    Number(weights.uniqueViews) * Math.log1p(metrics.uniqueViews)
    + Number(weights.activeLikes) * metrics.activeLikes
    + Number(weights.activeSaves) * metrics.activeSaves
    + Number(weights.eligibleActiveComments) * metrics.eligibleActiveComments
    + Number(weights.successfulRemixes) * metrics.successfulRemixes
    + Number(weights.activeComparisonVotes) * metrics.activeComparisonVotes
  );
}

function taxonomyEligibility(post, officialTag, sort, policy) {
  if (!officialTag) return 1;
  const codes = sort === 'trending'
    ? post.trendingCategoryCodes
    : (post.categoryCodes?.length ? post.categoryCodes : post.officialTags);
  if (!Array.isArray(codes) || !codes.includes(officialTag)) return 0;
  if (post.taxonomyReviewStatus === 'admin_confirmed' || Number(post.taxonomyConfidence) >= 0.8) {
    return Number(policy.taxonomyMultipliers.highConfidenceOrAdminConfirmed);
  }
  if (post.taxonomyReviewStatus === 'creator_confirmed' && Number(post.taxonomyConfidence) >= 0.5) {
    return Number(policy.taxonomyMultipliers.creatorConfirmedMediumConfidence);
  }
  return Number(policy.taxonomyMultipliers.ineligible);
}

function moderationEligibility(post) {
  if (post.visibility !== 'public') return 0;
  if (!['active', 'published'].includes(post.status)) return 0;
  if (['flagged', 'hidden', 'removed'].includes(post.moderationStatus)) return 0;
  return 1;
}

function capEligibleComments(comments, cap) {
  const counts = new Map();
  let eligible = 0;
  for (const comment of comments) {
    const day = String(comment.createdAt || '').slice(0, 10);
    const key = `${comment.actorUserId}:${day}`;
    const current = counts.get(key) || 0;
    if (current >= cap) continue;
    counts.set(key, current + 1);
    eligible += 1;
  }
  return eligible;
}

function compareRanked(left, right, sort) {
  if (sort === 'latest') {
    return (Date.parse(right.post.createdAt || '') || 0) - (Date.parse(left.post.createdAt || '') || 0);
  }
  const leftScore = sort === 'trending' ? left.trendingScore : left.rawScore;
  const rightScore = sort === 'trending' ? right.trendingScore : right.rawScore;
  if (rightScore !== leftScore) return rightScore - leftScore;
  return (Date.parse(right.post.createdAt || '') || 0) - (Date.parse(left.post.createdAt || '') || 0);
}

function roundScore(value) {
  return Math.round(Number(value || 0) * 10000) / 10000;
}

export const communityRankingService = new CommunityRankingService();
