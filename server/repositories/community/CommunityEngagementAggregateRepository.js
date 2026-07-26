import { resolveDataFile } from '../../config/paths.js';
import { mutateJsonFile, readJsonFile } from '../json/jsonFileStore.js';

const AGGREGATE_FALLBACK = [];

export class CommunityEngagementAggregateRepository {
  constructor({
    aggregatesFile = resolveDataFile('communityEngagementDailyAggregates')
  } = {}) {
    this.aggregatesFile = aggregatesFile;
  }

  async readAll() {
    const aggregates = await readJsonFile(this.aggregatesFile, AGGREGATE_FALLBACK);
    return Array.isArray(aggregates) ? aggregates.map(normalizeAggregate) : [];
  }

  async listByPost(postId, { sinceDate = null, untilDate = null } = {}) {
    return (await this.readAll()).filter(item =>
      item.postId === postId
      && (!sinceDate || item.utcDate >= sinceDate)
      && (!untilDate || item.utcDate <= untilDate)
    );
  }

  async replaceForPost(postId, nextAggregates = []) {
    return mutateJsonFile(this.aggregatesFile, AGGREGATE_FALLBACK, async aggregates => {
      if (!Array.isArray(aggregates)) {
        throw new TypeError('Community engagement aggregates must be an array.');
      }
      const retained = aggregates.filter(item => item.postId !== postId);
      aggregates.splice(0, aggregates.length, ...retained, ...nextAggregates.map(normalizeAggregate));
      return nextAggregates.map(normalizeAggregate);
    });
  }
}

function normalizeAggregate(value = {}) {
  return {
    postId: String(value.postId || ''),
    utcDate: String(value.utcDate || ''),
    uniqueViewCount: nonNegative(value.uniqueViewCount),
    likeNetCount: nonNegative(value.likeNetCount),
    saveNetCount: nonNegative(value.saveNetCount),
    activeCommentCount: nonNegative(value.activeCommentCount),
    remixSuccessCount: nonNegative(value.remixSuccessCount),
    comparisonVoteNetCount: nonNegative(value.comparisonVoteNetCount),
    eligibleEventCount: nonNegative(value.eligibleEventCount),
    updatedAt: value.updatedAt || null
  };
}

function nonNegative(value) {
  return Number.isFinite(Number(value)) ? Math.max(0, Math.trunc(Number(value))) : 0;
}

export const communityEngagementAggregateRepo = new CommunityEngagementAggregateRepository();
