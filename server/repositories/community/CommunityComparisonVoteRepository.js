import { resolveDataFile } from '../../config/paths.js';
import { mutateJsonFile, readJsonFile } from '../json/jsonFileStore.js';
import { assertActorContext, RepositoryContractError } from '../repositoryContracts.js';

const VOTE_FALLBACK = [];

export class CommunityComparisonVoteRepository {
  constructor({
    votesFile = resolveDataFile('communityComparisonVotes'),
    now = () => new Date()
  } = {}) {
    this.votesFile = votesFile;
    this.now = now;
  }

  async readAll() {
    const votes = await readJsonFile(this.votesFile, VOTE_FALLBACK);
    return Array.isArray(votes) ? votes.map(normalizeVote) : [];
  }

  async find(postId, actorUserId) {
    return (await this.readAll()).find(item =>
      item.postId === postId && item.actorUserId === actorUserId
    ) || null;
  }

  async setVote(postId, comparisonSlotId, actorContext) {
    const actor = assertActorContext(actorContext);
    const slotId = String(comparisonSlotId || '').trim();
    if (!slotId) {
      throw new RepositoryContractError('comparison_vote_slot_required', 'Select a comparison result before voting.');
    }
    return mutateJsonFile(this.votesFile, VOTE_FALLBACK, async votes => {
      assertVoteStore(votes);
      const index = votes.findIndex(item => item.postId === postId && item.actorUserId === actor.userId);
      const current = index >= 0 ? normalizeVote(votes[index]) : null;
      if (current?.active && current.comparisonSlotId === slotId) {
        return { vote: current, changed: false, previousSlotId: current.comparisonSlotId };
      }
      const timestamp = this.now().toISOString();
      const next = {
        postId,
        actorUserId: actor.userId,
        comparisonSlotId: slotId,
        active: true,
        createdAt: current?.createdAt || timestamp,
        updatedAt: timestamp
      };
      if (index >= 0) votes[index] = next;
      else votes.push(next);
      return {
        vote: normalizeVote(next),
        changed: true,
        previousSlotId: current?.active ? current.comparisonSlotId : null
      };
    });
  }

  async removeVote(postId, actorContext) {
    const actor = assertActorContext(actorContext);
    return mutateJsonFile(this.votesFile, VOTE_FALLBACK, async votes => {
      assertVoteStore(votes);
      const index = votes.findIndex(item => item.postId === postId && item.actorUserId === actor.userId);
      if (index < 0 || votes[index].active !== true) {
        return { vote: index >= 0 ? normalizeVote(votes[index]) : null, changed: false };
      }
      votes[index] = {
        ...votes[index],
        active: false,
        updatedAt: this.now().toISOString()
      };
      return { vote: normalizeVote(votes[index]), changed: true };
    });
  }

  async listActiveByPost(postId) {
    return (await this.readAll()).filter(item => item.postId === postId && item.active);
  }
}

function normalizeVote(value = {}) {
  return {
    postId: String(value.postId || ''),
    actorUserId: String(value.actorUserId || ''),
    comparisonSlotId: String(value.comparisonSlotId || ''),
    active: value.active === true,
    createdAt: value.createdAt || null,
    updatedAt: value.updatedAt || value.createdAt || null
  };
}

function assertVoteStore(value) {
  if (!Array.isArray(value)) throw new TypeError('Community comparison votes must be an array.');
}

export const communityComparisonVoteRepo = new CommunityComparisonVoteRepository();
