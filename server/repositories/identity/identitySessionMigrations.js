import { identitySchema } from './identityMigrations.js';
export function identitySessionMigrations(schema = 'public') {
  const s = identitySchema(schema);
  return [
    {
      id: '0006_identity_sessions_contexts',
      sql: `
CREATE TABLE ${s}.identity_browsers (
 id text PRIMARY KEY CHECK(id ~ '^[A-Za-z0-9_-]{1,128}$'), digest text NOT NULL UNIQUE CHECK(digest ~ '^[a-f0-9]{64}$'),
 key_version integer NOT NULL CHECK(key_version>0), generation integer NOT NULL DEFAULT 1 CHECK(generation>0),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','logged_out')),
 created_at timestamptz NOT NULL, expires_at timestamptz NOT NULL CHECK(expires_at>created_at AND expires_at<=created_at+interval '5 minutes')
);
CREATE INDEX identity_browser_expiry_idx ON ${s}.identity_browsers(expires_at,id);
CREATE TABLE ${s}.identity_context_metadata (
 context_id text PRIMARY KEY REFERENCES ${s}.identity_contexts(id),
 browser_id text NOT NULL REFERENCES ${s}.identity_browsers(id) ON DELETE CASCADE,
 generation integer NOT NULL CHECK(generation>0), key_version integer NOT NULL CHECK(key_version>0),
 protected_payload text CHECK(octet_length(protected_payload) BETWEEN 1 AND 4096),
 expires_at timestamptz NOT NULL
);
CREATE INDEX identity_context_metadata_browser_idx ON ${s}.identity_context_metadata(browser_id,context_id);
ALTER TABLE ${s}.identity_sessions ADD COLUMN idle_duration_ms bigint CHECK(idle_duration_ms IN (1800000,86400000,604800000));
ALTER TABLE ${s}.identity_sessions ADD COLUMN remembered boolean NOT NULL DEFAULT false;
ALTER TABLE ${s}.identity_sessions ADD COLUMN device_label text NOT NULL DEFAULT 'Browser' CHECK(device_label IN ('Browser','Desktop browser','Mobile browser','Tablet browser'));
ALTER TABLE ${s}.identity_sessions ADD COLUMN authentication_context_id text UNIQUE REFERENCES ${s}.identity_contexts(id);
ALTER TABLE ${s}.identity_sessions ADD COLUMN proof_digest text UNIQUE CHECK(proof_digest ~ '^[a-f0-9]{64}$');
CREATE FUNCTION ${s}.identity_session_metadata_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $guard$
BEGIN
 IF ROW(NEW.id,NEW.account_id,NEW.digest,NEW.key_version,NEW.method,NEW.assurance,NEW.security_version,NEW.created_at,NEW.absolute_expires_at,NEW.idle_duration_ms,NEW.remembered,NEW.device_label,NEW.authentication_context_id,NEW.proof_digest)
 IS DISTINCT FROM ROW(OLD.id,OLD.account_id,OLD.digest,OLD.key_version,OLD.method,OLD.assurance,OLD.security_version,OLD.created_at,OLD.absolute_expires_at,OLD.idle_duration_ms,OLD.remembered,OLD.device_label,OLD.authentication_context_id,OLD.proof_digest)
 OR (OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at)
 OR NEW.last_active_at<OLD.last_active_at OR NEW.idle_expires_at<OLD.idle_expires_at THEN
 RAISE EXCEPTION 'Session authority immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $guard$;
CREATE TRIGGER identity_session_metadata_guard BEFORE UPDATE ON ${s}.identity_sessions FOR EACH ROW EXECUTE FUNCTION ${s}.identity_session_metadata_guard();
CREATE FUNCTION ${s}.identity_context_metadata_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $guard$
BEGIN
 IF ROW(NEW.context_id,NEW.browser_id,NEW.generation,NEW.key_version,NEW.expires_at) IS DISTINCT FROM ROW(OLD.context_id,OLD.browser_id,OLD.generation,OLD.key_version,OLD.expires_at)
 OR (NEW.protected_payload IS DISTINCT FROM OLD.protected_payload AND NEW.protected_payload IS NOT NULL) THEN
 RAISE EXCEPTION 'Context metadata immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $guard$;
CREATE TRIGGER identity_context_metadata_guard BEFORE UPDATE ON ${s}.identity_context_metadata FOR EACH ROW EXECUTE FUNCTION ${s}.identity_context_metadata_guard();
`,
    },
  ];
}
