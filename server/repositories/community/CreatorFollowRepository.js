import { resolveDataFile } from '../../config/paths.js';
import { readJsonFile, mutateJsonFile } from '../json/jsonFileStore.js';
import { assertActorContext } from '../repositoryContracts.js';
import { applyRecordDefaults } from '../schemaVersioning.js';

const FOLLOW_FALLBACK = [];

export class CreatorFollowRepository {
  constructor({ followsFile = resolveDataFile('creatorFollows') } = {}) {
    this.followsFile = followsFile;
  }

  async readAll() {
    const follows = await readJsonFile(this.followsFile, FOLLOW_FALLBACK);
    return Array.isArray(follows) ? follows.map(normalizeFollow) : [];
  }

  async isFollowing(followerUserId, creatorProfileId) {
    return (await this.readAll()).some(
      follow => follow.followerUserId === followerUserId
        && follow.creatorProfileId === creatorProfileId
        && follow.status === 'active'
    );
  }

  async countByCreatorProfileId(creatorProfileId) {
    return (await this.readAll()).filter(
      follow => follow.creatorProfileId === creatorProfileId && follow.status === 'active'
    ).length;
  }

  async follow(creatorProfileId, actorContext) {
    const actor = assertActorContext(actorContext);
    return mutateJsonFile(this.followsFile, FOLLOW_FALLBACK, async follows => {
      assertFollowStore(follows);
      const existing = follows.find(
        follow => follow.followerUserId === actor.userId
          && follow.creatorProfileId === creatorProfileId
      );
      if (existing) {
        if (existing.status !== 'active') {
          existing.status = 'active';
          existing.deletedAt = null;
          existing.updatedAt = new Date().toISOString();
        }
        return { follow: normalizeFollow(existing), created: false };
      }
      const now = new Date().toISOString();
      const record = applyRecordDefaults({
        followerUserId: actor.userId,
        creatorProfileId
      }, {
        idPrefix: 'follow',
        visibility: 'private',
        status: 'active',
        now
      });
      follows.push(record);
      return { follow: normalizeFollow(record), created: true };
    });
  }

  async unfollow(creatorProfileId, actorContext) {
    const actor = assertActorContext(actorContext);
    return mutateJsonFile(this.followsFile, FOLLOW_FALLBACK, async follows => {
      assertFollowStore(follows);
      const existing = follows.find(
        follow => follow.followerUserId === actor.userId
          && follow.creatorProfileId === creatorProfileId
          && follow.status === 'active'
      );
      if (!existing) return { removed: false };
      existing.status = 'deleted';
      existing.deletedAt = new Date().toISOString();
      existing.updatedAt = existing.deletedAt;
      return { removed: true };
    });
  }
}

function normalizeFollow(value = {}) {
  return {
    id: String(value.id || ''),
    schemaVersion: Number(value.schemaVersion) || 1,
    followerUserId: String(value.followerUserId || ''),
    creatorProfileId: String(value.creatorProfileId || ''),
    status: value.status || 'active',
    createdAt: value.createdAt || null,
    updatedAt: value.updatedAt || value.createdAt || null,
    deletedAt: value.deletedAt || null
  };
}

function assertFollowStore(follows) {
  if (!Array.isArray(follows)) throw new TypeError('Creator follow data must be an array.');
}

export const creatorFollowRepo = new CreatorFollowRepository();
