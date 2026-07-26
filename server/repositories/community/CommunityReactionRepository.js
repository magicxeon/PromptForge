import { resolveDataFile } from '../../config/paths.js';
import { mutateJsonFile, readJsonFile } from '../json/jsonFileStore.js';
import { assertActorContext, RepositoryContractError } from '../repositoryContracts.js';

const REACTION_FALLBACK = [];
const REACTION_TYPES = new Set(['like', 'save']);

export class CommunityReactionRepository {
  constructor({
    reactionsFile = resolveDataFile('communityReactions'),
    now = () => new Date()
  } = {}) {
    this.reactionsFile = reactionsFile;
    this.now = now;
  }

  async readAll() {
    const reactions = await readJsonFile(this.reactionsFile, REACTION_FALLBACK);
    return Array.isArray(reactions) ? reactions.map(normalizeReaction) : [];
  }

  async find(postId, actorUserId, reactionType) {
    return (await this.readAll()).find(item =>
      item.postId === postId
      && item.actorUserId === actorUserId
      && item.reactionType === reactionType
    ) || null;
  }

  async setActive(postId, reactionType, active, actorContext) {
    const actor = assertActorContext(actorContext);
    const normalizedType = normalizeReactionType(reactionType);
    const normalizedPostId = String(postId || '').trim();
    if (!normalizedPostId) {
      throw new RepositoryContractError('community_engagement_post_required', 'A Community post ID is required.');
    }

    return mutateJsonFile(this.reactionsFile, REACTION_FALLBACK, async reactions => {
      assertReactionStore(reactions);
      const index = reactions.findIndex(item =>
        item.postId === normalizedPostId
        && item.actorUserId === actor.userId
        && item.reactionType === normalizedType
      );
      const timestamp = this.now().toISOString();
      const current = index >= 0 ? normalizeReaction(reactions[index]) : null;
      const nextActive = active === true;
      if (current?.active === nextActive || (!current && !nextActive)) {
        return { reaction: current, changed: false, previousActive: current?.active === true };
      }
      const next = {
        postId: normalizedPostId,
        actorUserId: actor.userId,
        reactionType: normalizedType,
        active: nextActive,
        createdAt: current?.createdAt || timestamp,
        updatedAt: timestamp
      };
      if (index >= 0) reactions[index] = next;
      else reactions.push(next);
      return { reaction: normalizeReaction(next), changed: true, previousActive: current?.active === true };
    });
  }

  async listActiveByPost(postId) {
    return (await this.readAll()).filter(item => item.postId === postId && item.active);
  }
}

function normalizeReactionType(value) {
  const type = String(value || '').trim();
  if (!REACTION_TYPES.has(type)) {
    throw new RepositoryContractError('community_reaction_type_invalid', 'Community reaction type is invalid.');
  }
  return type;
}

function normalizeReaction(value = {}) {
  return {
    postId: String(value.postId || ''),
    actorUserId: String(value.actorUserId || ''),
    reactionType: normalizeReactionType(value.reactionType),
    active: value.active === true,
    createdAt: value.createdAt || null,
    updatedAt: value.updatedAt || value.createdAt || null
  };
}

function assertReactionStore(value) {
  if (!Array.isArray(value)) throw new TypeError('Community reactions must be an array.');
}

export const communityReactionRepo = new CommunityReactionRepository();
