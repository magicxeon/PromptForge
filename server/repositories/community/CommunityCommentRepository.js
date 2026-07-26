import crypto from 'node:crypto';
import { resolveDataFile } from '../../config/paths.js';
import { mutateJsonFile, readJsonFile } from '../json/jsonFileStore.js';
import {
  assertActorContext,
  createPage,
  normalizeListQuery,
  RepositoryContractError
} from '../repositoryContracts.js';
import { paginateRepositoryRecords } from '../RepositoryCursor.js';

const COMMENT_FALLBACK = [];

export class CommunityCommentRepository {
  constructor({
    commentsFile = resolveDataFile('communityComments'),
    cursorSecret = process.env.COMMUNITY_COMMENT_CURSOR_SECRET || 'local-community-comment-cursor',
    now = () => new Date()
  } = {}) {
    this.commentsFile = commentsFile;
    this.cursorSecret = cursorSecret;
    this.now = now;
  }

  async readAll() {
    const comments = await readJsonFile(this.commentsFile, COMMENT_FALLBACK);
    return Array.isArray(comments) ? comments.map(normalizeComment) : [];
  }

  async findById(commentId) {
    return (await this.readAll()).find(item => item.id === commentId) || null;
  }

  async listActiveByPost(postId, query = {}) {
    const normalizedQuery = normalizeListQuery(query);
    const comments = (await this.readAll()).filter(item =>
      item.postId === postId && item.status === 'active'
    );
    const page = paginateRepositoryRecords(
      comments,
      { ...normalizedQuery, sort: 'oldest' },
      JSON.stringify({ postId, status: 'active', sort: 'oldest' }),
      this.cursorSecret
    );
    return createPage(page.items.map(toPublicComment), page);
  }

  async create({ postId, body }, actorContext) {
    const actor = assertActorContext(actorContext);
    const normalizedPostId = String(postId || '').trim();
    if (!normalizedPostId) {
      throw new RepositoryContractError('community_engagement_post_required', 'A Community post ID is required.');
    }
    const timestamp = this.now().toISOString();
    const record = {
      id: `comment_${crypto.randomUUID()}`,
      schemaVersion: 1,
      postId: normalizedPostId,
      actorUserId: actor.userId,
      actorDisplayName: actor.displayName || actor.username || 'Community member',
      body,
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null
    };
    return mutateJsonFile(this.commentsFile, COMMENT_FALLBACK, async comments => {
      assertCommentStore(comments);
      comments.push(record);
      return normalizeComment(record);
    });
  }

  async remove(commentId, actorContext) {
    const actor = assertActorContext(actorContext);
    return mutateJsonFile(this.commentsFile, COMMENT_FALLBACK, async comments => {
      assertCommentStore(comments);
      const index = comments.findIndex(item => item.id === commentId);
      if (index < 0) {
        throw new RepositoryContractError('community_comment_not_found', 'Community comment not found.', 404);
      }
      const current = normalizeComment(comments[index]);
      if (current.actorUserId !== actor.userId && !['admin', 'support'].includes(actor.role)) {
        throw new RepositoryContractError('community_comment_forbidden', 'You cannot remove this comment.', 403);
      }
      if (current.status === 'removed') return { comment: current, changed: false };
      const timestamp = this.now().toISOString();
      const next = {
        ...comments[index],
        status: 'removed',
        body: '',
        updatedAt: timestamp,
        deletedAt: timestamp
      };
      comments[index] = next;
      return { comment: normalizeComment(next), changed: true };
    });
  }

  async listActiveRecordsByPost(postId) {
    return (await this.readAll()).filter(item =>
      item.postId === postId && item.status === 'active'
    );
  }
}

function normalizeComment(value = {}) {
  return {
    id: String(value.id || ''),
    schemaVersion: Number(value.schemaVersion) || 1,
    postId: String(value.postId || ''),
    actorUserId: String(value.actorUserId || ''),
    actorDisplayName: String(value.actorDisplayName || 'Community member'),
    body: String(value.body || ''),
    status: ['active', 'hidden', 'removed'].includes(value.status) ? value.status : 'active',
    createdAt: value.createdAt || null,
    updatedAt: value.updatedAt || value.createdAt || null,
    deletedAt: value.deletedAt || null
  };
}

function toPublicComment(comment) {
  return {
    id: comment.id,
    postId: comment.postId,
    author: {
      displayName: comment.actorDisplayName
    },
    body: comment.body,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt
  };
}

function assertCommentStore(value) {
  if (!Array.isArray(value)) throw new TypeError('Community comments must be an array.');
}

export const communityCommentRepo = new CommunityCommentRepository();
