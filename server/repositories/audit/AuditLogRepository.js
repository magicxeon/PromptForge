import { resolveDataFile } from '../../config/paths.js';
import { readJsonFile, mutateJsonFile } from '../json/jsonFileStore.js';
import { assertActorContext, createPage, normalizeListQuery } from '../repositoryContracts.js';
import { applyRecordDefaults } from '../schemaVersioning.js';
import { stripEmbeddedBase64 } from '../recordNormalizer.js';
import { paginateRepositoryRecords } from '../RepositoryCursor.js';
import { mockUserRepo } from '../identity/MockUserRepository.js';

const AUDIT_FALLBACK = [];

export class AuditLogRepository {
  constructor({
    auditFile = resolveDataFile('auditLogs'),
    userRepository = mockUserRepo,
    cursorSecret = process.env.AUDIT_CURSOR_SECRET || 'local-audit-cursor'
  } = {}) {
    this.auditFile = auditFile;
    this.userRepository = userRepository;
    this.cursorSecret = cursorSecret;
  }

  async readRaw() {
    const data = await readJsonFile(this.auditFile, AUDIT_FALLBACK);
    return Array.isArray(data) ? data : [];
  }

  async appendEvent(eventInput = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const now = new Date().toISOString();

    const record = {
      ...applyRecordDefaults(stripEmbeddedBase64(eventInput), {
        idPrefix: 'audit',
        ownerUserId: actor.userId,
        ownerUsername: actor.username,
        visibility: 'admin_only',
        status: 'active',
        now
      }),
      actorUserId: actor.userId,
      actorRole: actor.role || 'user',
      action: String(eventInput.action || 'system_event'),
      targetType: String(eventInput.targetType || 'unknown'),
      targetId: String(eventInput.targetId || 'unknown'),
      reason: eventInput.reason || null,
      beforeSnapshot: stripEmbeddedBase64(eventInput.beforeSnapshot || null),
      afterSnapshot: stripEmbeddedBase64(eventInput.afterSnapshot || null),
      requestId: eventInput.requestId || null,
      ipHash: eventInput.ipHash || null
    };

    return mutateJsonFile(this.auditFile, AUDIT_FALLBACK, async events => {
      if (!Array.isArray(events)) throw new TypeError('Audit events data must be an array.');
      events.push(record);
      return structuredClone(record);
    });
  }

  async findByActor(actorUserId, query = {}) {
    const normalizedQuery = normalizeListQuery(query);
    const events = (await this.readRaw())
      .filter(event => event.actorUserId === actorUserId);
    const page = paginateRepositoryRecords(
      events,
      normalizedQuery,
      JSON.stringify({ actorUserId, sort: normalizedQuery.sort }),
      this.cursorSecret
    );

    return createPage(page.items, page);
  }
}

export const auditLogRepo = new AuditLogRepository();
