import { resolveDataFile } from '../../config/paths.js';
import { readJsonFile, mutateJsonFile } from '../json/jsonFileStore.js';
import {
  assertActorContext,
  createPage,
  normalizeListQuery,
  pickAllowedValue,
  RepositoryContractError,
  VISIBILITY
} from '../repositoryContracts.js';
import { decodeRepositoryCursor, encodeRepositoryCursor } from '../RepositoryCursor.js';
import { normalizeCommunityPostRecord, stripEmbeddedBase64 } from '../recordNormalizer.js';
import { applyRecordDefaults } from '../schemaVersioning.js';
import { mockUserRepo } from '../identity/MockUserRepository.js';

const POST_FALLBACK = [];

export class CommunityPostRepository {
  constructor({
    postsFile = resolveDataFile('communityPosts'),
    userRepository = mockUserRepo,
    cursorSecret = process.env.COMMUNITY_POST_CURSOR_SECRET || 'local-community-post-cursor'
  } = {}) {
    this.postsFile = postsFile;
    this.userRepository = userRepository;
    this.cursorSecret = cursorSecret;
  }

  async readRaw() {
    const posts = await readJsonFile(this.postsFile, POST_FALLBACK);
    return Array.isArray(posts) ? posts : [];
  }

  async readAll() {
    const posts = await this.readRaw();
    return Promise.all(posts.map(post => normalizeCommunityPostRecord(post, this.userRepository)));
  }

  async findById(id) {
    if (!id) return null;
    const post = (await this.readRaw()).find(item => item.id === id);
    return post ? normalizeCommunityPostRecord(post, this.userRepository) : null;
  }

  async findByIdForOwner(id, ownerUserId) {
    const post = await this.findById(id);
    return post?.ownerUserId === ownerUserId ? post : null;
  }

  async findByOwner(ownerUserId, query = {}) {
    const normalizedQuery = normalizeListQuery(query);
    const scope = JSON.stringify({ ownerUserId, sort: normalizedQuery.sort });
    const cursor = normalizedQuery.cursor
      ? decodeRepositoryCursor(normalizedQuery.cursor, scope, this.cursorSecret)
      : null;
    let posts = (await this.readAll())
      .filter(post => post.ownerUserId === ownerUserId && post.status !== 'deleted')
      .sort((left, right) => comparePosts(left, right, normalizedQuery.sort));

    if (cursor) posts = posts.filter(post => comparePosts(post, cursor, normalizedQuery.sort) > 0);
    return toPage(posts, normalizedQuery.limit, scope, this.cursorSecret, normalizedQuery.sort);
  }

  async listPublic(query = {}, viewerContext = null) {
    const normalizedQuery = normalizeListQuery(query);
    const scope = JSON.stringify({
      sort: normalizedQuery.sort,
      visibility: normalizedQuery.filters.visibility || VISIBILITY.PUBLIC,
      viewer: viewerContext?.userId || 'anonymous'
    });
    const cursor = normalizedQuery.cursor
      ? decodeRepositoryCursor(normalizedQuery.cursor, scope, this.cursorSecret)
      : null;
    let posts = (await this.readAll())
      .filter(isVisiblePublicPost)
      .sort((left, right) => comparePosts(left, right, normalizedQuery.sort));

    if (cursor) posts = posts.filter(post => comparePosts(post, cursor, normalizedQuery.sort) > 0);
    return toPage(posts, normalizedQuery.limit, scope, this.cursorSecret, normalizedQuery.sort);
  }

  async findPublicById(id) {
    const post = await this.findById(id);
    if (!post || !isVisiblePublicPost(post)) return null;
    return post;
  }

  async create(recordInput = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const title = String(recordInput.title || '').trim();
    if (!title) {
      throw new RepositoryContractError('post_title_required', 'A community post title is required.');
    }

    const now = new Date().toISOString();
    const record = applyRecordDefaults({
      ...stripEmbeddedBase64(recordInput),
      title,
      description: typeof recordInput.description === 'string' ? recordInput.description.trim() : '',
      sceneTemplateSnapshot: stripEmbeddedBase64(recordInput.sceneTemplateSnapshot || null),
      officialTags: normalizeStringArray(recordInput.officialTags),
      customTags: normalizeStringArray(recordInput.customTags),
      categoryCodes: normalizeStringArray(recordInput.categoryCodes),
      counts: recordInput.counts && typeof recordInput.counts === 'object' ? recordInput.counts : {},
      workflowSnapshot: recordInput.workflowSnapshot && typeof recordInput.workflowSnapshot === 'object'
        ? stripEmbeddedBase64(recordInput.workflowSnapshot)
        : {}
    }, {
      idPrefix: 'post',
      ownerUserId: actor.userId,
      ownerUsername: actor.username,
      visibility: pickAllowedValue(
        recordInput.visibility,
        [VISIBILITY.PUBLIC, VISIBILITY.UNLISTED, VISIBILITY.MEMBERS_ONLY, VISIBILITY.PRIVATE],
        VISIBILITY.PUBLIC
      ),
      status: pickAllowedValue(
        recordInput.status,
        ['draft', 'published', 'reported', 'hidden', 'removed', 'owner_unpublished'],
        'published'
      ),
      now
    });

    return mutateJsonFile(this.postsFile, POST_FALLBACK, async posts => {
      if (!Array.isArray(posts)) throw new TypeError('Community posts data must be an array.');
      posts.unshift(record);
      return normalizeCommunityPostRecord(record, this.userRepository);
    });
  }

  async updatePresentationById(id, presentation = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const allowedVisibility = [VISIBILITY.PUBLIC, VISIBILITY.UNLISTED, VISIBILITY.MEMBERS_ONLY, VISIBILITY.PRIVATE];

    return mutateJsonFile(this.postsFile, POST_FALLBACK, async posts => {
      if (!Array.isArray(posts)) throw new TypeError('Community posts data must be an array.');
      const index = posts.findIndex(post => post.id === id);
      if (index < 0) throw new RepositoryContractError('community_post_not_found', 'Community post not found.', 404);

      const current = posts[index];
      if (current.ownerUserId !== actor.userId) {
        throw new RepositoryContractError('community_post_forbidden', 'You do not have permission to edit this post.', 403);
      }

      const next = {
        ...current,
        title: typeof presentation.title === 'string' && presentation.title.trim() ? presentation.title.trim() : current.title,
        description: typeof presentation.description === 'string' ? presentation.description.trim() : current.description,
        officialTags: presentation.officialTags === undefined ? current.officialTags : normalizeStringArray(presentation.officialTags),
        customTags: presentation.customTags === undefined ? current.customTags : normalizeStringArray(presentation.customTags),
        categoryCodes: presentation.categoryCodes === undefined ? current.categoryCodes : normalizeStringArray(presentation.categoryCodes),
        visibility: presentation.visibility === undefined
          ? current.visibility
          : pickAllowedValue(presentation.visibility, allowedVisibility, current.visibility),
        updatedAt: new Date().toISOString()
      };
      posts[index] = next;
      return normalizeCommunityPostRecord(next, this.userRepository);
    });
  }

  async setModerationStatus(id, action, reason, actorContext) {
    const actor = assertActorContext(actorContext);
    if (!['admin', 'support'].includes(actor.role)) {
      throw new RepositoryContractError('community_moderation_forbidden', 'Only admin or support can moderate a post.', 403);
    }
    const status = action === 'hide' ? 'hidden' : action === 'remove' ? 'removed' : null;
    if (!status) throw new RepositoryContractError('community_moderation_action_invalid', 'Moderation action must be hide or remove.');

    return mutateJsonFile(this.postsFile, POST_FALLBACK, async posts => {
      if (!Array.isArray(posts)) throw new TypeError('Community posts data must be an array.');
      const index = posts.findIndex(post => post.id === id);
      if (index < 0) throw new RepositoryContractError('community_post_not_found', 'Community post not found.', 404);
      const current = posts[index];
      const next = {
        ...current,
        status,
        moderation: {
          action,
          reason: String(reason).trim(),
          actorUserId: actor.userId,
          moderatedAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      };
      posts[index] = next;
      return normalizeCommunityPostRecord(next, this.userRepository);
    });
  }
}

function toPage(posts, limit, scope, secret, sort) {
  const items = posts.slice(0, limit);
  const hasMore = posts.length > limit;
  const last = items.at(-1);
  const nextCursor = hasMore && last
    ? encodeRepositoryCursor({ id: last.id, createdAt: last.createdAt, updatedAt: last.updatedAt }, scope, secret)
    : null;
  return createPage(items, { nextCursor, hasMore, totalApprox: posts.length });
}

function comparePosts(left, right, sort) {
  const field = sort === 'updated' ? 'updatedAt' : 'createdAt';
  const leftTime = Date.parse(left?.[field] || '') || 0;
  const rightTime = Date.parse(right?.[field] || '') || 0;
  const difference = sort === 'oldest' ? leftTime - rightTime : rightTime - leftTime;
  if (difference !== 0) return difference;
  return sort === 'oldest'
    ? String(left?.id || '').localeCompare(String(right?.id || ''))
    : String(right?.id || '').localeCompare(String(left?.id || ''));
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean))];
}

function isVisiblePublicPost(post) {
  return post.visibility === VISIBILITY.PUBLIC && ['active', 'published'].includes(post.status);
}

export const communityPostRepo = new CommunityPostRepository();
