import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RepositoryContractError } from '../../repositories/repositoryContracts.js';

const CONFIG_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../config/community-engagement-policy.json'
);
const PERIODS = new Set(['week', 'month', 'year']);
let cachedPolicy = null;

export async function loadCommunityEngagementPolicy({ forceReload = false } = {}) {
  if (cachedPolicy && !forceReload) return structuredClone(cachedPolicy);
  const policy = JSON.parse(await readFile(CONFIG_FILE, 'utf8'));
  validateCommunityEngagementPolicy(policy);
  cachedPolicy = policy;
  return structuredClone(cachedPolicy);
}

export function validateCommunityEngagementPolicy(policy) {
  if (!policy || typeof policy !== 'object') {
    throw new TypeError('Community engagement policy must be an object.');
  }
  if (!Number.isInteger(Number(policy.schemaVersion)) || !String(policy.algorithmVersion || '').trim()) {
    throw new TypeError('Community engagement policy version fields are required.');
  }
  for (const period of PERIODS) {
    assertPositive(policy.periodHours?.[period], `periodHours.${period}`);
    assertPositive(policy.halfLifeHours?.[period], `halfLifeHours.${period}`);
  }
  for (const key of [
    'uniqueViews',
    'activeLikes',
    'activeSaves',
    'eligibleActiveComments',
    'successfulRemixes',
    'activeComparisonVotes'
  ]) {
    assertNonNegative(policy.weights?.[key], `weights.${key}`);
  }
  assertPositive(policy.trendingExponent, 'trendingExponent');
  assertPositive(policy.limits?.commentLength, 'limits.commentLength');
  assertPositive(policy.limits?.eligibleCommentsPerActorPostDay, 'limits.eligibleCommentsPerActorPostDay');
  assertPositive(policy.limits?.viewDedupeHours, 'limits.viewDedupeHours');
  return true;
}

export function normalizeRankingPeriod(value) {
  const period = String(value || 'week').trim();
  if (!PERIODS.has(period)) {
    throw new RepositoryContractError(
      'community_ranking_period_invalid',
      'Ranking period must be week, month, or year.'
    );
  }
  return period;
}

export function normalizeRankingSort(value) {
  const sort = String(value || 'latest').trim();
  if (!['latest', 'top', 'trending'].includes(sort)) {
    throw new RepositoryContractError(
      'community_ranking_sort_invalid',
      'Community sort must be latest, top, or trending.'
    );
  }
  return sort;
}

function assertPositive(value, pathName) {
  if (!Number.isFinite(Number(value)) || Number(value) <= 0) {
    throw new TypeError(`Community engagement policy "${pathName}" must be positive.`);
  }
}

function assertNonNegative(value, pathName) {
  if (!Number.isFinite(Number(value)) || Number(value) < 0) {
    throw new TypeError(`Community engagement policy "${pathName}" must be non-negative.`);
  }
}
