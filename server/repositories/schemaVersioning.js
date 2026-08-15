export const CURRENT_SCHEMA_VERSION = 1;

export function createPrefixedId(prefix) {
  const safePrefix = String(prefix || 'rec').replace(/[^a-z0-9_]/gi, '').toLowerCase() || 'rec';
  return `${safePrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function applyRecordDefaults(record = {}, {
  idPrefix,
  ownerUserId = null,
  ownerUsername = null,
  visibility = 'private',
  status = 'active',
  now = new Date().toISOString()
} = {}) {
  const clonedRecord = structuredClone(record);
  delete clonedRecord.id;
  delete clonedRecord.schemaVersion;
  delete clonedRecord.ownerUserId;
  delete clonedRecord.ownerUsername;
  delete clonedRecord.createdAt;
  delete clonedRecord.updatedAt;
  delete clonedRecord.deletedAt;
  return {
    ...clonedRecord,
    id: createPrefixedId(idPrefix),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    ownerUserId: ownerUserId || null,
    ownerUsername: ownerUsername || null,
    visibility,
    status,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    metadata: record.metadata && typeof record.metadata === 'object'
      ? structuredClone(record.metadata)
      : {}
  };
}
