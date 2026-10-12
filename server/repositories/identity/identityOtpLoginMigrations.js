import { identitySchema } from './identityMigrations.js';
export function identityOtpLoginMigrations(schema = 'public') {
  const s = identitySchema(schema);
  return [
    {
      id: '0010_identity_otp_login',
      sql: `
CREATE TABLE ${s}.identity_otp_primary_proofs (
 context_id text PRIMARY KEY REFERENCES ${s}.identity_context_metadata(context_id) ON DELETE CASCADE,
 proof_ref text NOT NULL UNIQUE CHECK(proof_ref ~ '^[A-Za-z0-9_-]{1,128}$'), challenge_id text NOT NULL UNIQUE REFERENCES ${s}.identity_challenges(id),
 account_id text NOT NULL REFERENCES ${s}.identity_accounts(id), security_version integer NOT NULL CHECK(security_version>0),
 expires_at timestamptz NOT NULL, transaction_id text NOT NULL, consumed_at timestamptz
);
CREATE FUNCTION ${s}.identity_otp_primary_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $guard$
DECLARE c ${s}.identity_contexts%ROWTYPE; p ${s}.identity_challenges%ROWTYPE;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF OLD.consumed_at IS NOT NULL OR NEW.consumed_at IS NULL OR NEW.consumed_at>=OLD.expires_at OR ROW(NEW.context_id,NEW.proof_ref,NEW.challenge_id,NEW.account_id,NEW.security_version,NEW.expires_at,NEW.transaction_id) IS DISTINCT FROM ROW(OLD.context_id,OLD.proof_ref,OLD.challenge_id,OLD.account_id,OLD.security_version,OLD.expires_at,OLD.transaction_id) THEN RAISE EXCEPTION 'OTP proof immutable' USING ERRCODE='23514'; END IF;
 ELSE
  SELECT * INTO c FROM ${s}.identity_contexts WHERE id=NEW.context_id;
  SELECT * INTO p FROM ${s}.identity_challenges WHERE id=NEW.challenge_id;
  IF c.id IS NULL OR p.id IS NULL OR c.purpose<>'login' OR c.status<>'pending' OR c.account_id IS DISTINCT FROM NEW.account_id OR c.security_version IS DISTINCT FROM NEW.security_version OR p.context_id<>c.id OR p.purpose<>'login' OR p.status<>'consumed' OR p.delivery_status<>'sent' OR p.account_id IS DISTINCT FROM c.account_id OR p.security_version IS DISTINCT FROM c.security_version OR NEW.expires_at>LEAST(c.expires_at,p.expires_at) OR NEW.transaction_id<>pg_current_xact_id()::text OR NEW.consumed_at IS NOT NULL THEN RAISE EXCEPTION 'OTP proof scope invalid' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $guard$;
CREATE TRIGGER identity_otp_primary_guard BEFORE INSERT OR UPDATE ON ${s}.identity_otp_primary_proofs FOR EACH ROW EXECUTE FUNCTION ${s}.identity_otp_primary_guard();
CREATE TABLE ${s}.identity_enrollment_exchanges (
 source_context_id text PRIMARY KEY REFERENCES ${s}.identity_contexts(id),
 challenge_id text NOT NULL UNIQUE REFERENCES ${s}.identity_challenges(id),
 target_context_id text UNIQUE REFERENCES ${s}.identity_contexts(id),
 outcome text NOT NULL CHECK(outcome IN ('registration','handoff')),
 expires_at timestamptz NOT NULL,
 CHECK((outcome='registration' AND target_context_id IS NOT NULL) OR (outcome='handoff' AND target_context_id IS NULL))
);
CREATE TABLE ${s}.identity_login_offers (
 context_id text PRIMARY KEY REFERENCES ${s}.identity_context_metadata(context_id) ON DELETE CASCADE,
 challenge_id text NOT NULL UNIQUE REFERENCES ${s}.identity_challenges(id), expires_at timestamptz NOT NULL
);
CREATE TRIGGER identity_login_offer_immutable BEFORE UPDATE ON ${s}.identity_login_offers FOR EACH ROW EXECUTE FUNCTION ${s}.identity_email_record_immutable();
CREATE FUNCTION ${s}.identity_login_exchange_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $guard$
DECLARE c ${s}.identity_contexts%ROWTYPE; p ${s}.identity_challenges%ROWTYPE; target ${s}.identity_contexts%ROWTYPE; offer ${s}.identity_login_offers%ROWTYPE;
BEGIN
 IF TG_TABLE_NAME='identity_login_offers' THEN
  SELECT * INTO c FROM ${s}.identity_contexts WHERE id=NEW.context_id;
 ELSE
  SELECT * INTO c FROM ${s}.identity_contexts WHERE id=NEW.source_context_id;
 END IF;
 SELECT * INTO p FROM ${s}.identity_challenges WHERE id=NEW.challenge_id;
 IF c.id IS NULL OR p.id IS NULL OR c.purpose<>'login' OR c.account_id IS NOT NULL OR c.security_version IS NOT NULL OR c.status<>'pending' OR p.context_id<>c.id OR p.purpose<>'login' OR p.account_id IS NOT NULL OR p.status<>'consumed' OR p.delivery_status<>'sent' OR p.target_id<>c.target_binding OR NEW.expires_at>LEAST(c.expires_at,p.expires_at) OR NEW.expires_at<=GREATEST(c.created_at,p.created_at) THEN RAISE EXCEPTION 'Login offer source invalid' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME='identity_enrollment_exchanges' THEN
  SELECT * INTO offer FROM ${s}.identity_login_offers WHERE context_id=c.id;
  IF offer.context_id IS NULL OR offer.challenge_id<>p.id OR NEW.expires_at>offer.expires_at THEN RAISE EXCEPTION 'Login offer missing' USING ERRCODE='23514'; END IF;
  IF NEW.outcome='registration' THEN
   SELECT * INTO target FROM ${s}.identity_contexts WHERE id=NEW.target_context_id;
   IF target.id IS NULL OR target.purpose<>'registration' OR target.account_id IS NOT NULL OR target.security_version IS NOT NULL OR target.status<>'pending' OR target.browser_digest<>c.browser_digest OR target.expires_at>NEW.expires_at THEN RAISE EXCEPTION 'Login offer target invalid' USING ERRCODE='23514'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $guard$;
CREATE TRIGGER identity_login_offer_guard BEFORE INSERT ON ${s}.identity_login_offers FOR EACH ROW EXECUTE FUNCTION ${s}.identity_login_exchange_guard();
CREATE TRIGGER identity_login_exchange_guard BEFORE INSERT ON ${s}.identity_enrollment_exchanges FOR EACH ROW EXECUTE FUNCTION ${s}.identity_login_exchange_guard();
CREATE TRIGGER identity_enrollment_exchange_immutable BEFORE UPDATE OR DELETE ON ${s}.identity_enrollment_exchanges FOR EACH ROW EXECUTE FUNCTION ${s}.identity_email_record_immutable();
ALTER TABLE ${s}.identity_enrollment_proofs ADD COLUMN source_kind text NOT NULL DEFAULT 'registration' CHECK(source_kind IN ('registration','login_exchange'));
CREATE OR REPLACE FUNCTION ${s}.identity_enrollment_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $guard$
DECLARE c ${s}.identity_contexts%ROWTYPE; p ${s}.identity_challenges%ROWTYPE; original ${s}.identity_contexts%ROWTYPE; e ${s}.identity_enrollment_exchanges%ROWTYPE;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF OLD.status<>'verified' OR ROW(NEW.context_id,NEW.challenge_id,NEW.verified_at,NEW.expires_at,NEW.source_kind) IS DISTINCT FROM ROW(OLD.context_id,OLD.challenge_id,OLD.verified_at,OLD.expires_at,OLD.source_kind) THEN RAISE EXCEPTION 'Enrollment proof immutable' USING ERRCODE='23514'; END IF;
 ELSE
  SELECT * INTO c FROM ${s}.identity_contexts WHERE id=NEW.context_id;
  SELECT * INTO p FROM ${s}.identity_challenges WHERE id=NEW.challenge_id;
  IF c.id IS NULL OR p.id IS NULL OR c.purpose<>'registration' OR c.account_id IS NOT NULL OR c.security_version IS NOT NULL OR c.status<>'pending' OR p.status<>'consumed' OR p.delivery_status<>'sent' OR NEW.expires_at>LEAST(c.expires_at,p.expires_at) OR NEW.status<>'verified' THEN RAISE EXCEPTION 'Enrollment source invalid' USING ERRCODE='23514'; END IF;
  IF NEW.source_kind='registration' THEN
   IF p.context_id<>c.id OR p.purpose<>'registration' THEN RAISE EXCEPTION 'Registration scope invalid' USING ERRCODE='23514'; END IF;
  ELSE
   SELECT * INTO e FROM ${s}.identity_enrollment_exchanges WHERE target_context_id=c.id;
   SELECT * INTO original FROM ${s}.identity_contexts WHERE id=p.context_id;
   IF e.source_context_id IS NULL OR e.challenge_id<>p.id OR e.source_context_id<>p.context_id OR e.outcome<>'registration' OR original.purpose<>'login' OR original.account_id IS NOT NULL OR original.status<>'consumed' OR p.purpose<>'login' OR p.account_id IS NOT NULL OR original.browser_digest<>c.browser_digest OR NEW.expires_at>LEAST(original.expires_at,e.expires_at) THEN RAISE EXCEPTION 'Login exchange invalid' USING ERRCODE='23514'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $guard$;
`,
    },
  ];
}
