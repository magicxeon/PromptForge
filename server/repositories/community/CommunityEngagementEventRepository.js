import crypto from 'node:crypto';
import { resolveDataFile } from '../../config/paths.js';
import { mutateJsonFile, readJsonFile } from '../json/jsonFileStore.js';
import { RepositoryContractError } from '../repositoryContracts.js';

const EVENT_FALLBACK = [];
const EVENT_TYPES = new Set([
  'view',
  'like_added',
  'like_removed',
  'save_added',
  'save_removed',
  'comment_created',
  'comment_removed',
  'remix_started',
  'remix_succeeded',
  'comparison_vote_added',
  'comparison_vote_changed',
  'comparison_vote_removed'
]);

export class CommunityEngagementEventRepository {
  constructor({
    eventsFile = resolveDataFile('communityEngagementEvents'),
    now = () => new Date()
  } = {}) {
    this.eventsFile = eventsFile;
    this.now = now;
  }

  async readAll() {
    const events = await readJsonFile(this.eventsFile, EVENT_FALLBACK);
    return Array.isArray(events) ? events.map(normalizeEvent) : [];
  }

  async appendIfAbsent(eventInput = {}) {
    const prepared = createEvent(eventInput, this.now());
    return mutateJsonFile(this.eventsFile, EVENT_FALLBACK, async events => {
      assertEventStore(events);
      const duplicate = events.find(event => event.dedupeKey === prepared.dedupeKey);
      if (duplicate) return { event: normalizeEvent(duplicate), created: false };
      events.push(prepared);
      return { event: normalizeEvent(prepared), created: true };
    });
  }

  async appendViewIfNotRecent(eventInput = {}, { since } = {}) {
    const prepared = createEvent({ ...eventInput, eventType: 'view' }, this.now());
    const sinceTime = Date.parse(since || '') || Number(since) || 0;
    return mutateJsonFile(this.eventsFile, EVENT_FALLBACK, async events => {
      assertEventStore(events);
      const duplicate = events.find(value => {
        const event = normalizeEvent(value);
        return event.postId === prepared.postId
          && event.eventType === 'view'
          && event.actorUserId === prepared.actorUserId
          && event.anonymousSessionHash === prepared.anonymousSessionHash
          && (Date.parse(event.occurredAt || '') || 0) >= sinceTime;
      });
      if (duplicate) return { event: normalizeEvent(duplicate), created: false };
      events.push(prepared);
      return { event: normalizeEvent(prepared), created: true };
    });
  }

  async findRecent({
    postId,
    eventType,
    actorUserId = null,
    anonymousSessionHash = null,
    since
  }) {
    const sinceTime = Date.parse(since || '') || Number(since) || 0;
    const events = await this.readAll();
    return events.find(event =>
      event.postId === postId
      && event.eventType === eventType
      && event.actorUserId === actorUserId
      && event.anonymousSessionHash === anonymousSessionHash
      && (Date.parse(event.occurredAt || '') || 0) >= sinceTime
    ) || null;
  }

  async listByPost(postId, { since = null, until = null, eventTypes = null } = {}) {
    const sinceTime = since ? Date.parse(since) : Number.NEGATIVE_INFINITY;
    const untilTime = until ? Date.parse(until) : Number.POSITIVE_INFINITY;
    const allowedTypes = Array.isArray(eventTypes) ? new Set(eventTypes) : null;
    return (await this.readAll()).filter(event => {
      const occurredAt = Date.parse(event.occurredAt || '') || 0;
      return event.postId === postId
        && occurredAt >= sinceTime
        && occurredAt <= untilTime
        && (!allowedTypes || allowedTypes.has(event.eventType));
    });
  }
}

function createEvent(input, now) {
  const postId = String(input.postId || '').trim();
  const eventType = String(input.eventType || '').trim();
  const dedupeKey = String(input.dedupeKey || '').trim();
  if (!postId) {
    throw new RepositoryContractError('community_engagement_post_required', 'A Community post ID is required.');
  }
  if (!EVENT_TYPES.has(eventType)) {
    throw new RepositoryContractError('community_engagement_event_invalid', 'Community engagement event type is invalid.');
  }
  if (!dedupeKey) {
    throw new RepositoryContractError('community_engagement_dedupe_required', 'An engagement dedupe key is required.');
  }
  return {
    id: `engevt_${crypto.randomUUID()}`,
    schemaVersion: 1,
    postId,
    actorUserId: input.actorUserId || null,
    anonymousSessionHash: input.anonymousSessionHash || null,
    eventType,
    targetId: input.targetId ? String(input.targetId) : null,
    dedupeKey,
    occurredAt: normalizeDate(input.occurredAt, now),
    requestId: input.requestId ? String(input.requestId) : null,
    metadata: normalizeMetadata(input.metadata)
  };
}

function normalizeEvent(value = {}) {
  return {
    id: String(value.id || ''),
    schemaVersion: Number(value.schemaVersion) || 1,
    postId: String(value.postId || ''),
    actorUserId: value.actorUserId || null,
    anonymousSessionHash: value.anonymousSessionHash || null,
    eventType: String(value.eventType || ''),
    targetId: value.targetId || null,
    dedupeKey: String(value.dedupeKey || ''),
    occurredAt: normalizeDate(value.occurredAt, new Date()),
    requestId: value.requestId || null,
    metadata: normalizeMetadata(value.metadata)
  };
}

function normalizeMetadata(value) {
  if (!value || typeof value !== 'object') return {};
  const allowed = ['comparisonSlotId', 'generatedJobId', 'sourcePostId', 'templateId'];
  return Object.fromEntries(allowed
    .filter(key => typeof value[key] === 'string' && value[key].trim())
    .map(key => [key, value[key].trim()]));
}

function normalizeDate(value, fallback) {
  const parsed = value ? new Date(value) : fallback;
  return Number.isNaN(parsed.getTime()) ? fallback.toISOString() : parsed.toISOString();
}

function assertEventStore(events) {
  if (!Array.isArray(events)) throw new TypeError('Community engagement events must be an array.');
}

export const communityEngagementEventRepo = new CommunityEngagementEventRepository();
