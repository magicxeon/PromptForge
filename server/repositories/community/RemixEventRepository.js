import { resolveDataFile } from '../../config/paths.js';
import { readJsonFile, mutateJsonFile } from '../json/jsonFileStore.js';
import { assertActorContext, createPage, normalizeListQuery } from '../repositoryContracts.js';
import { normalizeRemixEventRecord } from '../recordNormalizer.js';
import { applyRecordDefaults } from '../schemaVersioning.js';
import { mockUserRepo } from '../identity/MockUserRepository.js';

const REMIX_FALLBACK = [];

export class RemixEventRepository {
  constructor({
    eventsFile = resolveDataFile('remixEvents'),
    userRepository = mockUserRepo
  } = {}) {
    this.eventsFile = eventsFile;
    this.userRepository = userRepository;
  }

  async readAll() {
    const events = await readJsonFile(this.eventsFile, REMIX_FALLBACK);
    if (!Array.isArray(events)) return [];
    return Promise.all(events.map(event => normalizeRemixEventRecord(event, this.userRepository)));
  }

  async appendEvent(eventInput = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const now = new Date().toISOString();
    const record = {
      ...applyRecordDefaults(eventInput, {
        idPrefix: 'remix',
        ownerUserId: actor.userId,
        ownerUsername: actor.username,
        visibility: 'private',
        status: 'active',
        now
      }),
      actorUserId: actor.userId,
      actorUsername: actor.username,
      sourcePostId: eventInput.sourcePostId || null,
      templateId: eventInput.templateId || null,
      generatedJobId: eventInput.generatedJobId || null,
      replacementSummary: eventInput.replacementSummary && typeof eventInput.replacementSummary === 'object'
        ? structuredClone(eventInput.replacementSummary)
        : {},
      timestamp: Date.now()
    };

    return mutateJsonFile(this.eventsFile, REMIX_FALLBACK, async events => {
      if (!Array.isArray(events)) throw new TypeError('Remix events data must be an array.');
      events.push(record);
      return normalizeRemixEventRecord(record, this.userRepository);
    });
  }

  async findByOwner(ownerUserId, query = {}) {
    const { limit } = normalizeListQuery(query);
    const events = (await this.readAll())
      .filter(event => event.actorUserId === ownerUserId)
      .sort((left, right) => Date.parse(right.createdAt || '') - Date.parse(left.createdAt || ''));
    return createPage(events.slice(0, limit), { hasMore: events.length > limit, totalApprox: events.length });
  }
}

export const communityRemixRepo = new RemixEventRepository();

