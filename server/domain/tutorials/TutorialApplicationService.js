import { randomUUID } from 'node:crypto';
import { TutorialCatalogRepository } from '../../repositories/tutorials/TutorialCatalogRepository.js';
import { learningAccessPolicy } from '../content-access/LearningAccessPolicy.js';
import {
  LearningError, assertDraft, assignUnitIds, catalogPage, matchRevision, notFound,
  revisionCommand, typeForId, validateListQuery, validateMetadata, validatePatch
} from '../content-access/catalogContract.js';

const TYPES = ['tutorial'];

export class TutorialApplicationService {
  constructor({ repository = new TutorialCatalogRepository(), policy = learningAccessPolicy } = {}) {
    this.repository = repository;
    this.policy = policy;
  }

  async list(query, actor) {
    this.policy.assertCatalogAccess(actor);
    const filters = validateListQuery(query, 'tutorial');
    return catalogPage(await this.repository.listForActor(actor), filters);
  }

  async get(id, actor) {
    this.policy.assertCatalogAccess(actor);
    if (!TYPES.includes(typeForId(id))) notFound();
    const record = await this.repository.findForActor(id, actor);
    if (!record) notFound();
    return record;
  }

  async create(input, actor) {
    this.policy.assertCatalogAccess(actor);
    const metadata = validateMetadata(assignUnitIds(validateMetadata(input, TYPES), randomUUID), TYPES);
    const now = new Date().toISOString();
    return this.repository.create({
      ...metadata, id: `${metadata.type}_${randomUUID()}`, ownerUserId: actor.userId,
      status: 'draft', revision: 1, createdAt: now, updatedAt: now
    }, actor);
  }

  async patch(id, input, actor) {
    const existing = await this.get(id, actor);
    validatePatch(input, existing, TYPES);
    return this.repository.mutateForActor(id, actor, record => {
      if (!record) notFound();
      matchRevision(record, input.revision);
      assertDraft(record);
      const metadata = validateMetadata(assignUnitIds(validatePatch(input, record, TYPES), randomUUID), TYPES);
      return { ...record, ...metadata, revision: record.revision + 1, updatedAt: new Date().toISOString() };
    });
  }

  async remove(id, input, actor) {
    await this.get(id, actor);
    const revision = revisionCommand(input);
    await this.repository.mutateForActor(id, actor, record => {
      if (!record) notFound();
      matchRevision(record, revision);
      assertDraft(record);
      return null;
    });
  }

  async publish(id, input, actor) {
    const record = await this.get(id, actor);
    matchRevision(record, revisionCommand(input));
    assertDraft(record);
    // No trusted Assets readiness integration exists in the metadata-only increment.
    throw new LearningError('learning_assets_not_ready', 'Verified ready media is required before publication.', 409);
  }
}
