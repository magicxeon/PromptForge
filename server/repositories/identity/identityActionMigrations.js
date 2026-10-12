import { identitySchema } from './identityMigrations.js';
export function identityActionMigrations(schema = 'public') {
  const s = identitySchema(schema);
  return [
    {
      id: '0011_identity_action_assurance',
      sql: `
ALTER TABLE ${s}.identity_context_metadata
 ADD COLUMN action_name text CHECK(action_name IN ('password_reset','password_change','email_change','method_link','method_unlink','mfa_enroll','mfa_disable','logout_all')),
 ADD COLUMN action_target text CHECK(action_target ~ '^[A-Za-z0-9_-]{1,128}$'),
 ADD COLUMN action_session_id text REFERENCES ${s}.identity_sessions(id),
 ADD COLUMN assurance_proof_ref text CHECK(assurance_proof_ref ~ '^[A-Za-z0-9_-]{1,128}$'),
 ADD COLUMN assurance_method text CHECK(assurance_method IN ('password','email_otp','google','facebook','mfa')),
 ADD COLUMN assurance_level text CHECK(assurance_level IN ('single_factor','mfa')),
 ADD COLUMN assurance_verified_at timestamptz,
 ADD COLUMN assurance_expires_at timestamptz,
 ADD COLUMN assurance_consumed_at timestamptz,
 ADD CONSTRAINT identity_action_pair CHECK((action_name IS NULL AND action_target IS NULL AND action_session_id IS NULL) OR (action_name IS NOT NULL AND action_target IS NOT NULL)),
 ADD CONSTRAINT identity_assurance_complete CHECK(
  (assurance_proof_ref IS NULL AND assurance_method IS NULL AND assurance_level IS NULL AND assurance_verified_at IS NULL AND assurance_expires_at IS NULL AND assurance_consumed_at IS NULL) OR
  (action_name IS NOT NULL AND assurance_proof_ref IS NOT NULL AND assurance_method IS NOT NULL AND assurance_level IS NOT NULL AND assurance_verified_at IS NOT NULL AND assurance_expires_at IS NOT NULL AND assurance_expires_at>assurance_verified_at AND assurance_expires_at<=expires_at AND assurance_expires_at<=assurance_verified_at+interval '5 minutes' AND (assurance_consumed_at IS NULL OR (assurance_consumed_at>=assurance_verified_at AND assurance_consumed_at<assurance_expires_at)))) ;
CREATE UNIQUE INDEX identity_assurance_proof_unique ON ${s}.identity_context_metadata(assurance_proof_ref) WHERE assurance_proof_ref IS NOT NULL;
CREATE FUNCTION ${s}.identity_action_metadata_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $guard$
DECLARE c ${s}.identity_contexts%ROWTYPE; se ${s}.identity_sessions%ROWTYPE;
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.assurance_proof_ref IS NOT NULL THEN RAISE EXCEPTION 'Assurance must follow proof' USING ERRCODE='23514'; END IF;
  IF NEW.action_name IS NOT NULL THEN
   SELECT * INTO c FROM ${s}.identity_contexts WHERE id=NEW.context_id;
   IF c.account_id IS NULL OR c.status<>'pending' OR c.target_binding<>NEW.action_target OR (NEW.action_name='password_reset' AND (c.purpose<>'password_reset' OR NEW.action_session_id IS NOT NULL)) OR (NEW.action_name<>'password_reset' AND (c.purpose<>'reauthentication' OR NEW.action_session_id IS NULL)) THEN RAISE EXCEPTION 'Action scope invalid' USING ERRCODE='23514'; END IF;
   IF NEW.action_session_id IS NOT NULL THEN
    SELECT * INTO se FROM ${s}.identity_sessions WHERE id=NEW.action_session_id;
    IF se.id IS NULL OR se.account_id<>c.account_id OR se.security_version<>c.security_version OR se.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'Action session invalid' USING ERRCODE='23514'; END IF;
   END IF;
  END IF;
 ELSE
  IF ROW(NEW.action_name,NEW.action_target,NEW.action_session_id) IS DISTINCT FROM ROW(OLD.action_name,OLD.action_target,OLD.action_session_id)
   OR (OLD.assurance_proof_ref IS NOT NULL AND ROW(NEW.assurance_proof_ref,NEW.assurance_method,NEW.assurance_level,NEW.assurance_verified_at,NEW.assurance_expires_at) IS DISTINCT FROM ROW(OLD.assurance_proof_ref,OLD.assurance_method,OLD.assurance_level,OLD.assurance_verified_at,OLD.assurance_expires_at))
   OR (OLD.assurance_consumed_at IS NOT NULL AND NEW.assurance_consumed_at IS DISTINCT FROM OLD.assurance_consumed_at) THEN RAISE EXCEPTION 'Action assurance immutable' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $guard$;
CREATE TRIGGER identity_action_metadata_guard BEFORE INSERT OR UPDATE ON ${s}.identity_context_metadata FOR EACH ROW EXECUTE FUNCTION ${s}.identity_action_metadata_guard();
`,
    },
  ];
}
