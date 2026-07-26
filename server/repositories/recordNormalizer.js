import { CURRENT_SCHEMA_VERSION } from './schemaVersioning.js';

export function normalizeEpochOrIsoDate(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  const date = typeof value === 'number' ? new Date(value) : new Date(String(value));
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

export async function resolveOwnerFromLegacy(record = {}, mockUserRepository) {
  const ownerUserId = record.ownerUserId || record.owner_user_id || null;
  const ownerUsername = record.ownerUsername || record.owner_username || record.username || null;

  if (ownerUserId) {
    if (ownerUsername) return { ownerUserId, ownerUsername };
    const owner = await mockUserRepository?.findById?.(ownerUserId);
    return { ownerUserId, ownerUsername: owner?.username || null };
  }

  if (ownerUsername) {
    const owner = await mockUserRepository?.findByUsername?.(ownerUsername);
    if (owner) return { ownerUserId: owner.id, ownerUsername: owner.username };
  }

  return { ownerUserId: 'usr_demo', ownerUsername: 'user_demo' };
}

export function stripEmbeddedBase64(value) {
  if (typeof value === 'string') {
    return value.trim().startsWith('data:image/') ? null : value;
  }
  if (Array.isArray(value)) return value.map(stripEmbeddedBase64);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, stripEmbeddedBase64(item)]));
}

export async function normalizeGenerationHistoryRecord(historyItem = {}, mockUserRepository) {
  const owner = await resolveOwnerFromLegacy(historyItem, mockUserRepository);
  const createdAt = normalizeEpochOrIsoDate(historyItem.createdAt ?? historyItem.timestamp, null);
  const sceneTemplateSnapshot = stripEmbeddedBase64(historyItem.sceneTemplateSnapshot || null);
  return {
    ...structuredClone(historyItem),
    id: historyItem.id || historyItem.jobId || null,
    schemaVersion: Number(historyItem.schemaVersion) || CURRENT_SCHEMA_VERSION,
    ownerUserId: owner.ownerUserId,
    ownerUsername: owner.ownerUsername,
    visibility: historyItem.visibility || 'private',
    status: historyItem.status || 'completed',
    createdAt,
    updatedAt: normalizeEpochOrIsoDate(historyItem.updatedAt, createdAt),
    deletedAt: historyItem.deletedAt ? normalizeEpochOrIsoDate(historyItem.deletedAt) : null,
    metadata: historyItem.metadata && typeof historyItem.metadata === 'object'
      ? structuredClone(historyItem.metadata)
      : {},
    sceneTemplateSnapshot
  };
}

export async function normalizeCommunityPostRecord(post = {}, mockUserRepository) {
  const owner = await resolveOwnerFromLegacy(post, mockUserRepository);
  const ownerUser = owner.ownerUserId
    ? await mockUserRepository?.findById?.(owner.ownerUserId)
    : null;
  const createdAt = normalizeEpochOrIsoDate(post.createdAt, null);
  const engagementSummary = normalizeCommunityEngagementSummary(
    post.engagementSummary,
    post.counts,
    post.updatedAt || createdAt
  );
  return {
    ...structuredClone(post),
    id: post.id || null,
    schemaVersion: Number(post.schemaVersion) || CURRENT_SCHEMA_VERSION,
    postType: normalizeCommunityPostType(post.postType, post),
    ownerUserId: owner.ownerUserId,
    ownerUsername: owner.ownerUsername,
    creatorProfileId: post.creatorProfileId || ownerUser?.activeCreatorProfileId || null,
    sourceGenerationResultId: post.sourceGenerationResultId || post.sourceGenerationId || null,
    sourceSceneTemplateSnapshotId: post.sourceSceneTemplateSnapshotId || null,
    sourceComparisonSetId: post.sourceComparisonSetId || null,
    visibility: post.visibility || 'public',
    status: post.status || 'published',
    createdAt,
    updatedAt: normalizeEpochOrIsoDate(post.updatedAt, createdAt),
    deletedAt: post.deletedAt ? normalizeEpochOrIsoDate(post.deletedAt) : null,
    metadata: post.metadata && typeof post.metadata === 'object' ? structuredClone(post.metadata) : {},
    sceneTemplateSnapshot: stripEmbeddedBase64(post.sceneTemplateSnapshot || null),
    sharedPromptSnapshot: stripEmbeddedBase64(post.sharedPromptSnapshot || null),
    providerModelSnapshot: stripEmbeddedBase64(post.providerModelSnapshot || null),
    workflowSnapshot: stripEmbeddedBase64(post.workflowSnapshot || {}),
    engagementSummary
  };
}

export function normalizeCommunityPostType(value, post = {}) {
  if (['image', 'template', 'comparison'].includes(value)) return value;
  if (post.sourceComparisonSetId) return 'comparison';
  if (post.sourceType === 'scene_template' || post.sceneTemplateSnapshot) return 'template';
  return 'image';
}

export function normalizeCommunityEngagementSummary(value = {}, legacyCounts = {}, updatedAt = null) {
  const summary = value && typeof value === 'object' ? value : {};
  const counts = legacyCounts && typeof legacyCounts === 'object' ? legacyCounts : {};
  return {
    viewCount: nonNegativeCount(summary.viewCount ?? counts.views),
    likeCount: nonNegativeCount(summary.likeCount ?? counts.likes),
    saveCount: nonNegativeCount(summary.saveCount ?? counts.saves),
    commentCount: nonNegativeCount(summary.commentCount ?? counts.comments),
    remixSuccessCount: nonNegativeCount(summary.remixSuccessCount ?? counts.remixes ?? counts.uses),
    comparisonVoteCount: nonNegativeCount(summary.comparisonVoteCount ?? counts.votes),
    updatedAt: normalizeEpochOrIsoDate(summary.updatedAt, normalizeEpochOrIsoDate(updatedAt, null))
  };
}

function nonNegativeCount(value) {
  return Number.isFinite(Number(value)) ? Math.max(0, Math.trunc(Number(value))) : 0;
}

export async function normalizeCollectionRecord(collection = {}, mockUserRepository) {
  const owner = await resolveOwnerFromLegacy(collection, mockUserRepository);
  const createdAt = normalizeEpochOrIsoDate(collection.createdAt, null);
  return {
    ...structuredClone(collection),
    schemaVersion: Number(collection.schemaVersion) || CURRENT_SCHEMA_VERSION,
    ownerUserId: owner.ownerUserId,
    ownerUsername: owner.ownerUsername,
    visibility: collection.visibility || 'private',
    status: collection.status || 'active',
    createdAt,
    updatedAt: normalizeEpochOrIsoDate(collection.updatedAt, createdAt),
    deletedAt: collection.deletedAt ? normalizeEpochOrIsoDate(collection.deletedAt) : null,
    metadata: collection.metadata && typeof collection.metadata === 'object'
      ? structuredClone(collection.metadata)
      : {}
  };
}

export async function normalizeOwnedRepositoryRecord(record = {}, mockUserRepository, defaults = {}) {
  const owner = await resolveOwnerFromLegacy(record, mockUserRepository);
  const sanitized = stripEmbeddedBase64(record);
  const createdAt = normalizeEpochOrIsoDate(record.createdAt ?? record.timestamp, null);
  return {
    ...structuredClone(sanitized),
    id: record.id || null,
    schemaVersion: Number(record.schemaVersion) || CURRENT_SCHEMA_VERSION,
    ownerUserId: owner.ownerUserId,
    ownerUsername: owner.ownerUsername,
    visibility: record.visibility || defaults.visibility || 'private',
    status: record.status || defaults.status || 'active',
    createdAt,
    updatedAt: normalizeEpochOrIsoDate(record.updatedAt, createdAt),
    deletedAt: record.deletedAt ? normalizeEpochOrIsoDate(record.deletedAt) : null,
    metadata: sanitized.metadata && typeof sanitized.metadata === 'object'
      ? structuredClone(sanitized.metadata)
      : {}
  };
}

export async function normalizeRemixEventRecord(event = {}, mockUserRepository) {
  const actor = await resolveOwnerFromLegacy({
    ownerUserId: event.actorUserId,
    ownerUsername: event.actorUsername || event.username
  }, mockUserRepository);
  const createdAt = normalizeEpochOrIsoDate(event.createdAt ?? event.timestamp, null);
  return {
    ...structuredClone(event),
    id: event.id || null,
    schemaVersion: Number(event.schemaVersion) || CURRENT_SCHEMA_VERSION,
    actorUserId: actor.ownerUserId,
    actorUsername: actor.ownerUsername,
    createdAt,
    metadata: event.metadata && typeof event.metadata === 'object' ? structuredClone(event.metadata) : {}
  };
}
