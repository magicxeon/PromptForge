import { RepositoryContractError } from '../../repositories/repositoryContracts.js';

const ELEVATED_ROLES = new Set(['admin', 'support']);
const PUBLIC_FEED_STATUSES = new Set(['active', 'published']);

export function isElevatedActor(actorContext = {}) {
  return ELEVATED_ROLES.has(actorContext?.role);
}

export function isCommunityPostOwner(post = {}, actorContext = {}) {
  if (!post || !actorContext) return false;
  if (post.ownerUserId && actorContext.userId) return post.ownerUserId === actorContext.userId;
  return Boolean(post.ownerUsername && actorContext.username && post.ownerUsername === actorContext.username);
}

export function isCommunityPostFeedVisible(post = {}) {
  return post.visibility === 'public' && PUBLIC_FEED_STATUSES.has(post.status);
}

export function assertCanViewCommunityPost(post, actorContext, { directLink = false } = {}) {
  if (!post) {
    throw unavailablePostError();
  }

  if (isElevatedActor(actorContext) || isCommunityPostOwner(post, actorContext)) return;
  if (post.status === 'hidden' || post.status === 'removed' || post.status === 'owner_unpublished') {
    throw unavailablePostError();
  }
  if (post.visibility === 'private') throw unavailablePostError();
  if (post.visibility === 'unlisted' && !directLink) throw unavailablePostError();
  if (post.visibility === 'members_only' && !actorContext?.userId) throw unavailablePostError();
  if (!PUBLIC_FEED_STATUSES.has(post.status)) throw unavailablePostError();
}

export function assertCanEditCommunityPost(post, actorContext) {
  if (!isCommunityPostOwner(post, actorContext)) {
    throw new RepositoryContractError('community_post_forbidden', 'You do not have permission to edit this post.', 403);
  }
}

export function assertCanModerateCommunityPost(post, actorContext, action, reason) {
  if (!isElevatedActor(actorContext)) {
    throw new RepositoryContractError('community_moderation_forbidden', 'Only admin or support can moderate a post.', 403);
  }
  if (!['hide', 'remove'].includes(action)) {
    throw new RepositoryContractError('community_moderation_action_invalid', 'Moderation action must be hide or remove.');
  }
  if (!String(reason || '').trim()) {
    throw new RepositoryContractError('community_moderation_reason_required', 'A moderation reason is required.');
  }
  if (!post) throw unavailablePostError();
}

function unavailablePostError() {
  return new RepositoryContractError('community_post_unavailable', 'This community post is unavailable.', 404);
}
