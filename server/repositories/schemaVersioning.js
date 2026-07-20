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
  const createdAt = record.createdAt || now;
  return {
    ...structuredClone(record),
    id: record.id || createPrefixedId(idPrefix),
    schemaVersion: Number(record.schemaVersion) || CURRENT_SCHEMA_VERSION,
    ownerUserId: record.ownerUserId || ownerUserId || null,
    ownerUsername: record.ownerUsername || ownerUsername || null,
    visibility: record.visibility || visibility,
    status: record.status || status,
    createdAt,
    updatedAt: record.updatedAt || now,
    deletedAt: record.deletedAt || null,
    metadata: record.metadata && typeof record.metadata === 'object'
      ? structuredClone(record.metadata)
      : {}
  };
}

