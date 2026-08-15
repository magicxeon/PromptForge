import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CommunityPostRepository } from '../../server/repositories/community/CommunityPostRepository.js';
import { CommunityEngagementEventRepository } from '../../server/repositories/community/CommunityEngagementEventRepository.js';
import { CommunityReactionRepository } from '../../server/repositories/community/CommunityReactionRepository.js';
import { CommunityCommentRepository } from '../../server/repositories/community/CommunityCommentRepository.js';
import { CommunityComparisonVoteRepository } from '../../server/repositories/community/CommunityComparisonVoteRepository.js';
import { CommunityEngagementAggregateRepository } from '../../server/repositories/community/CommunityEngagementAggregateRepository.js';
import { MockUserRepository } from '../../server/repositories/identity/MockUserRepository.js';
import { CommunityEngagementService } from '../../server/domain/community/CommunityEngagementService.js';
import { CommunityRankingService } from '../../server/domain/community/CommunityRankingService.js';

export const engagementPolicyFixture = Object.freeze({
  schemaVersion: 1,
  algorithmVersion: 'community_engagement_v1',
  periodHours: { week: 168, month: 720, year: 8760 },
  halfLifeHours: { week: 48, month: 168, year: 2160 },
  weights: {
    uniqueViews: 1,
    activeLikes: 3,
    activeSaves: 4,
    eligibleActiveComments: 5,
    successfulRemixes: 8,
    activeComparisonVotes: 2
  },
  trendingExponent: 1.2,
  limits: {
    commentLength: 1000,
    eligibleCommentsPerActorPostDay: 3,
    viewDedupeHours: 24
  },
  taxonomyMultipliers: {
    highConfidenceOrAdminConfirmed: 1,
    creatorConfirmedMediumConfidence: 0.85,
    ineligible: 0
  }
});

export async function createCommunityEngagementFixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'community-12-'));
  const usersFile = path.join(directory, 'users.json');
  await fs.writeFile(usersFile, JSON.stringify([
    {
      id: 'usr_alice',
      username: 'user_alice',
      displayName: 'Alice',
      role: 'creator',
      status: 'active'
    },
    {
      id: 'usr_bob',
      username: 'user_bob',
      displayName: 'Bob',
      role: 'user',
      status: 'active'
    },
    {
      id: 'usr_admin',
      username: 'admin_demo',
      displayName: 'Admin',
      role: 'admin',
      status: 'active'
    }
  ]), 'utf8');

  const actors = {
    alice: {
      userId: 'usr_alice',
      username: 'user_alice',
      displayName: 'Alice',
      role: 'creator'
    },
    bob: {
      userId: 'usr_bob',
      username: 'user_bob',
      displayName: 'Bob',
      role: 'user'
    },
    admin: {
      userId: 'usr_admin',
      username: 'admin_demo',
      displayName: 'Admin',
      role: 'admin'
    }
  };
  const clock = { value: new Date() };
  const now = () => new Date(clock.value);
  const userRepository = new MockUserRepository({ usersFile });
  const postRepository = new CommunityPostRepository({
    postsFile: path.join(directory, 'posts.json'),
    userRepository,
    cursorSecret: 'community-12-posts'
  });
  const eventRepository = new CommunityEngagementEventRepository({
    eventsFile: path.join(directory, 'events.json'),
    now
  });
  const reactionRepository = new CommunityReactionRepository({
    reactionsFile: path.join(directory, 'reactions.json'),
    now
  });
  const commentRepository = new CommunityCommentRepository({
    commentsFile: path.join(directory, 'comments.json'),
    cursorSecret: 'community-12-comments',
    now
  });
  const voteRepository = new CommunityComparisonVoteRepository({
    votesFile: path.join(directory, 'votes.json'),
    now
  });
  const aggregateRepository = new CommunityEngagementAggregateRepository({
    aggregatesFile: path.join(directory, 'aggregates.json')
  });
  const policyLoader = async () => structuredClone(engagementPolicyFixture);
  const engagementService = new CommunityEngagementService({
    postRepository,
    eventRepository,
    reactionRepository,
    commentRepository,
    voteRepository,
    aggregateRepository,
    policyLoader,
    now
  });
  const rankingService = new CommunityRankingService({
    postRepository,
    eventRepository,
    reactionRepository,
    commentRepository,
    voteRepository,
    policyLoader,
    now
  });

  return {
    directory,
    actors,
    clock,
    postRepository,
    eventRepository,
    reactionRepository,
    commentRepository,
    voteRepository,
    aggregateRepository,
    engagementService,
    rankingService,
    advanceHours(hours) {
      clock.value = new Date(clock.value.getTime() + Number(hours) * 60 * 60 * 1000);
    },
    cleanup() {
      return fs.rm(directory, { recursive: true, force: true });
    }
  };
}
