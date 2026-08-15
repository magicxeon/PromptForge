export const RECORD_STATUS = Object.freeze({
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  DELETED: 'deleted',
  DISABLED: 'disabled',
  FAILED: 'failed',
  HIDDEN: 'hidden',
  PUBLISHED: 'published',
  REMOVED: 'removed'
});

export const VISIBILITY = Object.freeze({
  ADMIN_ONLY: 'admin_only',
  MEMBERS_ONLY: 'members_only',
  PRIVATE: 'private',
  PUBLIC: 'public',
  UNLISTED: 'unlisted'
});

export const REUSE_POLICY = Object.freeze({
  REMIX_ALLOWED: 'remix_allowed',
  TEMPLATE_ALLOWED: 'template_allowed',
  USE_TEMPLATE: 'use_template',
  VIEW_ONLY: 'view_only'
});

export const PROMPT_VISIBILITY = Object.freeze({
  FULL: 'full',
  HIDDEN: 'hidden',
  REMIX_ONLY: 'remix_only'
});

export class RepositoryContractError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.name = 'RepositoryContractError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function assertActorContext(actorContext) {
  if (!actorContext || typeof actorContext !== 'object' || !actorContext.userId) {
    throw new RepositoryContractError('actor_context_required', 'A valid actor context is required.', 401);
  }
  return actorContext;
}

export function assertOwnerScope(record, ownerUserId) {
  if (!record || record.ownerUserId !== ownerUserId) {
    throw new RepositoryContractError('record_not_found', 'The requested record is not available.', 404);
  }
  return record;
}

export function normalizeListQuery(query = {}, { defaultLimit = 24, maxLimit = 50 } = {}) {
  const requestedLimit = Number(query.limit);
  return {
    limit: Math.min(maxLimit, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : defaultLimit)),
    cursor: typeof query.cursor === 'string' && query.cursor.trim() ? query.cursor.trim() : null,
    sort: ['newest', 'oldest', 'trending', 'updated'].includes(query.sort) ? query.sort : 'newest',
    filters: query.filters && typeof query.filters === 'object' ? structuredClone(query.filters) : {}
  };
}

export function createPage(items, { nextCursor = null, hasMore = false, totalApprox } = {}) {
  const page = {
    items: Array.isArray(items) ? items.map(item => structuredClone(item)) : [],
    nextCursor: nextCursor || null,
    hasMore: hasMore === true
  };
  if (Number.isFinite(totalApprox)) page.totalApprox = totalApprox;
  return page;
}

export function pickAllowedValue(value, allowedValues, fallback) {
  return Array.isArray(allowedValues) && allowedValues.includes(value) ? value : fallback;
}
