import { identitySchema } from './identityMigrations.js';

export function identityChallengeMigrations(schema = 'public') {
  const s = identitySchema(schema);
  return [{ id: '0004_identity_challenges', sql: `
ALTER TABLE ${s}.identity_challenges ADD COLUMN issue_operation_id text UNIQUE REFERENCES ${s}.identity_operations(id);
ALTER TABLE ${s}.identity_challenges ADD COLUMN target_key_version integer CHECK (target_key_version > 0);
ALTER TABLE ${s}.identity_challenges ADD COLUMN target_id text CHECK (length(target_id) BETWEEN 1 AND 128 AND target_id ~ '^[A-Za-z0-9_-]+$');
ALTER TABLE ${s}.identity_challenges ADD CONSTRAINT identity_challenge_issue_fields CHECK (
  (issue_operation_id IS NULL AND target_key_version IS NULL AND target_id IS NULL) OR
  (issue_operation_id IS NOT NULL AND target_key_version IS NOT NULL AND target_id IS NOT NULL));
ALTER TABLE ${s}.identity_challenges ADD CONSTRAINT identity_challenge_failure_bound CHECK (issue_operation_id IS NULL OR attempts<=5);
CREATE INDEX identity_challenge_target_pending_idx ON ${s}.identity_challenges(target_digest,purpose,account_id,id) WHERE status='pending';
CREATE FUNCTION ${s}.identity_challenge_issue_authority() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $guard$
DECLARE o ${s}.identity_operations%ROWTYPE;
BEGIN
  IF TG_OP='UPDATE' AND ROW(NEW.issue_operation_id,NEW.target_key_version,NEW.target_id,NEW.created_at,NEW.expires_at,NEW.resend_at)
    IS DISTINCT FROM ROW(OLD.issue_operation_id,OLD.target_key_version,OLD.target_id,OLD.created_at,OLD.expires_at,OLD.resend_at) THEN
    RAISE EXCEPTION 'Identity challenge issue authority rejected' USING ERRCODE='23514';
  END IF;
  IF TG_OP='UPDATE' AND (NEW.attempts<OLD.attempts OR NEW.attempts>OLD.attempts+1
    OR OLD.status IN ('consumed','superseded','revoked','expired','locked') AND NEW.status IS DISTINCT FROM OLD.status) THEN
    RAISE EXCEPTION 'Identity challenge transition rejected' USING ERRCODE='23514';
  END IF;
  IF NEW.issue_operation_id IS NOT NULL THEN
    SELECT * INTO o FROM ${s}.identity_operations WHERE id=NEW.issue_operation_id;
    IF NOT FOUND OR o.operation<>'challenge_issue' OR NEW.context_id IS DISTINCT FROM COALESCE(o.binding_context_id,o.context_id)
      OR NEW.account_id IS DISTINCT FROM o.account_id OR NEW.security_version IS DISTINCT FROM o.security_version
      OR NEW.expires_at>o.expires_at THEN
      RAISE EXCEPTION 'Identity challenge issue scope rejected' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $guard$;
CREATE TRIGGER identity_challenge_issue_authority BEFORE INSERT OR UPDATE ON ${s}.identity_challenges
FOR EACH ROW EXECUTE FUNCTION ${s}.identity_challenge_issue_authority();
` }];
}
