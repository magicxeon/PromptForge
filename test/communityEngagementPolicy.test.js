import assert from 'node:assert/strict';
import test from 'node:test';
import {
  loadCommunityEngagementPolicy,
  normalizeRankingPeriod,
  normalizeRankingSort,
  validateCommunityEngagementPolicy
} from '../server/domain/community/communityEngagementPolicy.js';

test('Community-12 policy loads one versioned scoring contract', async () => {
  const policy = await loadCommunityEngagementPolicy({ forceReload: true });
  assert.equal(policy.algorithmVersion, 'community_engagement_v1');
  assert.equal(policy.weights.activeLikes, 3);
  assert.equal(policy.periodHours.week, 168);
  assert.equal(validateCommunityEngagementPolicy(policy), true);
  assert.equal(normalizeRankingPeriod('year'), 'year');
  assert.equal(normalizeRankingSort('trending'), 'trending');
  assert.throws(() => normalizeRankingPeriod('lifetime'), /week, month, or year/);
  assert.throws(() => normalizeRankingSort('popular'), /latest, top, or trending/);
});
