// Audit-owned schema; Identity is an explicit registry prerequisite.
export function auditSchema(schema = 'public') {
  if (typeof schema !== 'string' || !/^[a-z][a-z0-9_]{0,62}$/.test(schema)) {
    throw Object.assign(new Error('Invalid Audit schema.'), { code: 'AUDIT_SCHEMA_INVALID' });
  }
  return `"${schema}"`;
}

export function securityAuditMigrations(schema = 'public') {
  const s = auditSchema(schema);
  return [{ id: '0002_security_audit', sql: `
CREATE TABLE ${s}.audit_security_events (
  event_id text PRIMARY KEY CHECK (event_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  actor_type text NOT NULL CHECK (actor_type IN ('account','system-security')),
  account_id text REFERENCES ${s}.identity_accounts(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  action text NOT NULL CHECK (action IN ('registration','email_verification','password_login','otp_login','challenge_issue','challenge_verify','password_reset','password_change','social_login','method_link','method_unlink','session_create','session_revoke','logout','logout_all','reauthentication','mfa_enroll','mfa_verify','mfa_disable','mfa_recovery','account_status','rate_limit')),
  outcome text NOT NULL CHECK (outcome IN ('succeeded','denied','failed')),
  occurred_at timestamptz NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  request_fingerprint text NOT NULL CHECK (request_fingerprint ~ '^[a-f0-9]{64}$'),
  target_fingerprint text NOT NULL CHECK (target_fingerprint ~ '^[a-f0-9]{64}$'),
  peer_fingerprint text NOT NULL CHECK (peer_fingerprint ~ '^[a-f0-9]{64}$'),
  peer_key_version integer NOT NULL CHECK (peer_key_version > 0),
  metadata jsonb NOT NULL CHECK (jsonb_typeof(metadata)='object' AND octet_length(metadata::text)<=512),
  CHECK ((actor_type='account' AND account_id IS NOT NULL) OR (actor_type='system-security' AND account_id IS NULL))
);
CREATE INDEX audit_security_account_time_idx ON ${s}.audit_security_events(account_id, occurred_at, event_id);
CREATE INDEX audit_security_time_idx ON ${s}.audit_security_events(occurred_at, event_id);
CREATE FUNCTION ${s}.reject_security_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='Security audit records are immutable.'; END;
$$;
CREATE TRIGGER audit_security_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON ${s}.audit_security_events
FOR EACH STATEMENT EXECUTE FUNCTION ${s}.reject_security_audit_mutation();
` }];
}
