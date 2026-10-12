import { identitySchema } from './identityMigrations.js';
export function identitySocialMigrations(schema = 'public') {
  const s = identitySchema(schema);
  return [
    {
      id: '0012_identity_social',
      sql: `
ALTER TABLE ${s}.identity_social_exchanges DROP CONSTRAINT identity_social_exchanges_intent_check;
ALTER TABLE ${s}.identity_social_exchanges ADD CHECK(intent IN ('login','link','reauthentication'));
DO $constraints$ DECLARE item record; BEGIN
 FOR item IN SELECT conname FROM pg_constraint WHERE conrelid='${s}.identity_social_exchanges'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%intent = %' LOOP
  EXECUTE format('ALTER TABLE ${s}.identity_social_exchanges DROP CONSTRAINT %I', item.conname);
 END LOOP;
END $constraints$;
ALTER TABLE ${s}.identity_social_exchanges ADD CHECK((intent='login' AND account_id IS NULL AND security_version IS NULL) OR (intent IN ('link','reauthentication') AND account_id IS NOT NULL AND security_version IS NOT NULL));
CREATE TABLE ${s}.identity_social_metadata (
 context_id text PRIMARY KEY REFERENCES ${s}.identity_context_metadata(context_id) ON DELETE CASCADE,
 exchange_id text NOT NULL UNIQUE REFERENCES ${s}.identity_social_exchanges(id),
 original_action_context_id text REFERENCES ${s}.identity_contexts(id),
 original_session_id text REFERENCES ${s}.identity_sessions(id),
 return_path text NOT NULL CHECK(return_path IN ('/','/playground','/profiles','/settings','/studio')),
 protection_key_version integer NOT NULL CHECK(protection_key_version>0),
 target_context_id text UNIQUE REFERENCES ${s}.identity_contexts(id),
 result_session_id text UNIQUE REFERENCES ${s}.identity_sessions(id),
 subject text CHECK(octet_length(subject) BETWEEN 1 AND 255),
 issuer text CHECK(issuer='https://accounts.google.com'),
 email_authoritative boolean, next_action text CHECK(next_action IN ('authenticated','complete_registration','verify_email','sign_in_existing','reauthenticated')),
 verified_at timestamptz, verification_transaction text, consumed_at timestamptz,
 expires_at timestamptz NOT NULL,
 CHECK((subject IS NULL AND issuer IS NULL AND verified_at IS NULL AND verification_transaction IS NULL AND email_authoritative IS NULL) OR
 (subject IS NOT NULL AND issuer IS NOT NULL AND verified_at IS NOT NULL AND verification_transaction IS NOT NULL AND email_authoritative IS NOT NULL)),
 CHECK((original_action_context_id IS NULL)=(original_session_id IS NULL))
);
CREATE INDEX identity_social_target_idx ON ${s}.identity_social_metadata(target_context_id);
CREATE FUNCTION ${s}.identity_social_metadata_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $guard$
DECLARE c ${s}.identity_contexts%ROWTYPE; e ${s}.identity_social_exchanges%ROWTYPE; a ${s}.identity_contexts%ROWTYPE; target ${s}.identity_contexts%ROWTYPE;
BEGIN
 SELECT * INTO c FROM ${s}.identity_contexts WHERE id=NEW.context_id;
 SELECT * INTO e FROM ${s}.identity_social_exchanges WHERE id=NEW.exchange_id;
 IF c.id IS NULL OR e.id IS NULL OR e.context_id<>c.id OR NEW.expires_at>LEAST(c.expires_at,e.expires_at) THEN RAISE EXCEPTION 'Social metadata scope invalid' USING ERRCODE='23514'; END IF;
 IF NEW.original_action_context_id IS NOT NULL THEN
  SELECT * INTO a FROM ${s}.identity_contexts WHERE id=NEW.original_action_context_id;
  IF a.id IS NULL OR a.purpose<>'reauthentication' OR c.purpose<>'reauthentication' OR a.account_id IS DISTINCT FROM c.account_id OR a.security_version IS DISTINCT FROM c.security_version OR a.browser_digest<>c.browser_digest OR NEW.expires_at>a.expires_at OR NOT EXISTS(SELECT 1 FROM ${s}.identity_context_metadata WHERE context_id=a.id AND action_session_id=NEW.original_session_id) THEN RAISE EXCEPTION 'Social reauthentication scope invalid' USING ERRCODE='23514'; END IF;
 ELSIF c.purpose<>'login' THEN RAISE EXCEPTION 'Social login scope invalid' USING ERRCODE='23514'; END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.context_id,NEW.exchange_id,NEW.original_action_context_id,NEW.original_session_id,NEW.expires_at,NEW.return_path,NEW.protection_key_version) IS DISTINCT FROM ROW(OLD.context_id,OLD.exchange_id,OLD.original_action_context_id,OLD.original_session_id,OLD.expires_at,OLD.return_path,OLD.protection_key_version) OR
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
   (target.purpose='login' AND NOT EXISTS(SELECT 1 FROM ${s}.identity_external_bindings WHERE provider='google' AND issuer_scope=NEW.issuer AND subject=NEW.subject AND account_id=target.account_id)) OR
   (target.purpose='registration' AND target.account_id IS NOT NULL) THEN RAISE EXCEPTION 'Social target invalid' USING ERRCODE='23514'; END IF;
 END IF;
 IF NEW.result_session_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM ${s}.identity_sessions WHERE id=NEW.result_session_id AND authentication_context_id=NEW.target_context_id AND method='google') THEN RAISE EXCEPTION 'Social session result invalid' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $guard$;
CREATE TRIGGER identity_social_metadata_guard BEFORE INSERT OR UPDATE ON ${s}.identity_social_metadata FOR EACH ROW EXECUTE FUNCTION ${s}.identity_social_metadata_guard();
ALTER TABLE ${s}.identity_enrollment_proofs ALTER COLUMN challenge_id DROP NOT NULL;
ALTER TABLE ${s}.identity_enrollment_proofs ADD COLUMN social_exchange_id text UNIQUE REFERENCES ${s}.identity_social_exchanges(id);
ALTER TABLE ${s}.identity_enrollment_proofs DROP CONSTRAINT identity_enrollment_proofs_source_kind_check;
ALTER TABLE ${s}.identity_enrollment_proofs ADD CHECK(source_kind IN ('registration','login_exchange','social'));
ALTER TABLE ${s}.identity_enrollment_proofs ADD CHECK((source_kind='social' AND challenge_id IS NULL AND social_exchange_id IS NOT NULL) OR (source_kind<>'social' AND challenge_id IS NOT NULL));
CREATE OR REPLACE FUNCTION ${s}.identity_enrollment_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $guard$
DECLARE c ${s}.identity_contexts%ROWTYPE; p ${s}.identity_challenges%ROWTYPE; original ${s}.identity_contexts%ROWTYPE; e ${s}.identity_enrollment_exchanges%ROWTYPE; m ${s}.identity_social_metadata%ROWTYPE; se ${s}.identity_social_exchanges%ROWTYPE;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF OLD.status<>'verified' OR ROW(NEW.context_id,NEW.challenge_id,NEW.verified_at,NEW.expires_at,NEW.source_kind,NEW.social_exchange_id) IS DISTINCT FROM ROW(OLD.context_id,OLD.challenge_id,OLD.verified_at,OLD.expires_at,OLD.source_kind,OLD.social_exchange_id) THEN RAISE EXCEPTION 'Enrollment proof immutable' USING ERRCODE='23514'; END IF;
 ELSE
  SELECT * INTO c FROM ${s}.identity_contexts WHERE id=NEW.context_id;
  IF c.id IS NULL OR c.purpose<>'registration' OR c.account_id IS NOT NULL OR c.security_version IS NOT NULL OR c.status<>'pending' OR NEW.expires_at>c.expires_at OR NEW.status<>'verified' THEN RAISE EXCEPTION 'Enrollment source invalid' USING ERRCODE='23514'; END IF;
  IF NEW.social_exchange_id IS NOT NULL THEN
   SELECT * INTO m FROM ${s}.identity_social_metadata WHERE exchange_id=NEW.social_exchange_id;
   SELECT * INTO se FROM ${s}.identity_social_exchanges WHERE id=NEW.social_exchange_id;
   SELECT * INTO original FROM ${s}.identity_contexts WHERE id=m.context_id;
   IF m.context_id IS NULL OR m.target_context_id IS DISTINCT FROM c.id OR m.subject IS NULL OR se.intent<>'login' OR se.status NOT IN ('exchange_claimed','succeeded') OR original.browser_digest<>c.browser_digest OR NEW.expires_at>LEAST(m.expires_at,se.expires_at) OR (NEW.source_kind='social' AND m.email_authoritative IS DISTINCT FROM true) THEN RAISE EXCEPTION 'Social enrollment scope invalid' USING ERRCODE='23514'; END IF;
  END IF;
  IF NEW.source_kind<>'social' THEN
   SELECT * INTO p FROM ${s}.identity_challenges WHERE id=NEW.challenge_id;
   IF p.id IS NULL OR p.status<>'consumed' OR p.delivery_status<>'sent' OR NEW.expires_at>p.expires_at THEN RAISE EXCEPTION 'Enrollment challenge invalid' USING ERRCODE='23514'; END IF;
   IF NEW.source_kind='registration' THEN
    IF p.context_id<>c.id OR p.purpose<>'registration' THEN RAISE EXCEPTION 'Registration scope invalid' USING ERRCODE='23514'; END IF;
   ELSE
    SELECT * INTO e FROM ${s}.identity_enrollment_exchanges WHERE target_context_id=c.id;
    SELECT * INTO original FROM ${s}.identity_contexts WHERE id=p.context_id;
    IF e.source_context_id IS NULL OR e.challenge_id<>p.id OR e.source_context_id<>p.context_id OR e.outcome<>'registration' OR original.purpose<>'login' OR original.account_id IS NOT NULL OR original.status<>'consumed' OR p.purpose<>'login' OR p.account_id IS NOT NULL OR original.browser_digest<>c.browser_digest OR NEW.expires_at>LEAST(original.expires_at,e.expires_at) THEN RAISE EXCEPTION 'Login exchange invalid' USING ERRCODE='23514'; END IF;
   END IF;
  END IF;
 END IF;
 RETURN NEW;
END $guard$;
`,
    },
  ];
}
