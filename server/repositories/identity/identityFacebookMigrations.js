import { identitySchema } from './identityMigrations.js';
export function identityFacebookMigrations(schema = 'public') {
  const s = identitySchema(schema);
  return [{ id: '0013_identity_facebook', sql: `
ALTER TABLE ${s}.identity_social_metadata ADD COLUMN issuer_scope text;
UPDATE ${s}.identity_social_metadata m SET issuer_scope='https://accounts.google.com'
 FROM ${s}.identity_social_exchanges e WHERE e.id=m.exchange_id AND e.provider='google';
ALTER TABLE ${s}.identity_social_metadata ALTER COLUMN issuer_scope SET NOT NULL;
ALTER TABLE ${s}.identity_social_metadata ADD CHECK(issuer_scope='https://accounts.google.com' OR issuer_scope ~ '^https://www[.]facebook[.]com/[0-9]{1,255}$');
DO $constraints$ DECLARE item record; BEGIN
 FOR item IN SELECT conname FROM pg_constraint WHERE conrelid='${s}.identity_social_metadata'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%issuer = %' LOOP
  EXECUTE format('ALTER TABLE ${s}.identity_social_metadata DROP CONSTRAINT %I', item.conname);
 END LOOP;
END $constraints$;
ALTER TABLE ${s}.identity_social_metadata ADD CHECK(issuer IS NULL OR issuer='https://accounts.google.com' OR issuer ~ '^https://www[.]facebook[.]com/[0-9]{1,255}$');
CREATE OR REPLACE FUNCTION ${s}.identity_social_metadata_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $guard$
DECLARE c ${s}.identity_contexts%ROWTYPE; e ${s}.identity_social_exchanges%ROWTYPE; a ${s}.identity_contexts%ROWTYPE; target ${s}.identity_contexts%ROWTYPE;
BEGIN
 SELECT * INTO c FROM ${s}.identity_contexts WHERE id=NEW.context_id;
 SELECT * INTO e FROM ${s}.identity_social_exchanges WHERE id=NEW.exchange_id;
 IF NOT ((e.provider='google' AND NEW.issuer_scope='https://accounts.google.com') OR (e.provider='facebook' AND NEW.issuer_scope ~ '^https://www[.]facebook[.]com/[0-9]{1,255}$')) OR
  (NEW.issuer IS NOT NULL AND NEW.issuer IS DISTINCT FROM NEW.issuer_scope) THEN RAISE EXCEPTION 'Social expected issuer mismatch' USING ERRCODE='23514'; END IF;
 IF NEW.issuer IS NOT NULL AND NOT ((e.provider='google' AND NEW.issuer='https://accounts.google.com') OR (e.provider='facebook' AND NEW.issuer ~ '^https://www[.]facebook[.]com/[0-9]{1,255}$')) THEN RAISE EXCEPTION 'Social issuer/provider mismatch' USING ERRCODE='23514'; END IF;
 IF c.id IS NULL OR e.id IS NULL OR e.context_id<>c.id OR NEW.expires_at>LEAST(c.expires_at,e.expires_at) THEN RAISE EXCEPTION 'Social metadata scope invalid' USING ERRCODE='23514'; END IF;
 IF NEW.original_action_context_id IS NOT NULL THEN
  SELECT * INTO a FROM ${s}.identity_contexts WHERE id=NEW.original_action_context_id;
  IF a.id IS NULL OR a.purpose<>'reauthentication' OR c.purpose<>'reauthentication' OR a.account_id IS DISTINCT FROM c.account_id OR a.security_version IS DISTINCT FROM c.security_version OR a.browser_digest<>c.browser_digest OR NEW.expires_at>a.expires_at OR NOT EXISTS(SELECT 1 FROM ${s}.identity_context_metadata WHERE context_id=a.id AND action_session_id=NEW.original_session_id) THEN RAISE EXCEPTION 'Social reauthentication scope invalid' USING ERRCODE='23514'; END IF;
 ELSIF c.purpose<>'login' THEN RAISE EXCEPTION 'Social login scope invalid' USING ERRCODE='23514'; END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.context_id,NEW.exchange_id,NEW.original_action_context_id,NEW.original_session_id,NEW.expires_at,NEW.return_path,NEW.protection_key_version,NEW.issuer_scope) IS DISTINCT FROM ROW(OLD.context_id,OLD.exchange_id,OLD.original_action_context_id,OLD.original_session_id,OLD.expires_at,OLD.return_path,OLD.protection_key_version,OLD.issuer_scope) OR
   (OLD.subject IS NOT NULL AND ROW(NEW.subject,NEW.issuer,NEW.email_authoritative,NEW.verified_at,NEW.verification_transaction) IS DISTINCT FROM ROW(OLD.subject,OLD.issuer,OLD.email_authoritative,OLD.verified_at,OLD.verification_transaction)) OR
   (OLD.target_context_id IS NOT NULL AND NEW.target_context_id IS DISTINCT FROM OLD.target_context_id) OR
   (OLD.result_session_id IS NOT NULL AND NEW.result_session_id IS DISTINCT FROM OLD.result_session_id) OR
   (OLD.consumed_at IS NOT NULL AND NEW.consumed_at IS DISTINCT FROM OLD.consumed_at) OR
   (OLD.next_action IS NOT NULL AND ROW(NEW.next_action,NEW.result_session_id) IS DISTINCT FROM ROW(OLD.next_action,OLD.result_session_id)) THEN RAISE EXCEPTION 'Social metadata immutable' USING ERRCODE='23514'; END IF;
 END IF;
 IF NEW.subject IS NOT NULL AND (NEW.verified_at>=NEW.expires_at OR (TG_OP='INSERT' OR OLD.subject IS NULL) AND (e.status<>'exchange_claimed' OR NEW.verification_transaction<>pg_current_xact_id()::text)) THEN RAISE EXCEPTION 'Social proof not claimed' USING ERRCODE='23514'; END IF;
 IF NEW.consumed_at IS NOT NULL AND (NEW.subject IS NULL OR NEW.consumed_at>=NEW.expires_at) THEN RAISE EXCEPTION 'Social proof consumption invalid' USING ERRCODE='23514'; END IF;
 IF NEW.target_context_id IS NOT NULL THEN
  SELECT * INTO target FROM ${s}.identity_contexts WHERE id=NEW.target_context_id;
  IF target.id IS NULL OR target.browser_digest<>c.browser_digest OR target.expires_at>NEW.expires_at OR
   (e.intent='reauthentication' AND target.id IS DISTINCT FROM NEW.original_action_context_id) OR
   (e.intent='login' AND target.purpose NOT IN ('login','registration')) OR
   (target.purpose='login' AND NOT EXISTS(SELECT 1 FROM ${s}.identity_external_bindings WHERE provider=e.provider AND issuer_scope=NEW.issuer AND subject=NEW.subject AND account_id=target.account_id)) OR
   (target.purpose='registration' AND target.account_id IS NOT NULL) THEN RAISE EXCEPTION 'Social target invalid' USING ERRCODE='23514'; END IF;
 END IF;
 IF NEW.result_session_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM ${s}.identity_sessions WHERE id=NEW.result_session_id AND authentication_context_id=NEW.target_context_id AND method=e.provider) THEN RAISE EXCEPTION 'Social session result invalid' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $guard$;
CREATE TABLE ${s}.identity_facebook_events (
 id text PRIMARY KEY, issuer text NOT NULL, kind text NOT NULL CHECK(kind IN ('deauthorization','deletion_request')),
 fingerprint text NOT NULL CHECK(fingerprint ~ '^[a-f0-9]{64}$'), subject_digest text NOT NULL CHECK(subject_digest ~ '^[a-f0-9]{64}$'), occurred_at timestamptz NOT NULL,
 confirmation_code text NOT NULL UNIQUE, received_at timestamptz NOT NULL, expires_at timestamptz NOT NULL,
 UNIQUE(issuer,kind,fingerprint), CHECK(expires_at>received_at AND expires_at<=received_at+interval '24 hours')
);
CREATE INDEX identity_facebook_events_expiry_idx ON ${s}.identity_facebook_events(expires_at,id);
CREATE INDEX identity_facebook_events_subject_idx ON ${s}.identity_facebook_events(issuer,subject_digest,received_at);
CREATE FUNCTION ${s}.identity_facebook_event_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $guard$
BEGIN RAISE EXCEPTION 'Facebook event receipt immutable' USING ERRCODE='23514'; END $guard$;
CREATE TRIGGER identity_facebook_event_immutable BEFORE UPDATE ON ${s}.identity_facebook_events FOR EACH ROW EXECUTE FUNCTION ${s}.identity_facebook_event_immutable();
` }];
}
