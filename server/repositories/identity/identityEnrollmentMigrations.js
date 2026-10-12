import { identitySchema } from './identityMigrations.js';
export function identityEnrollmentMigrations(schema = 'public') {
  const s = identitySchema(schema);
  return [
    {
      id: '0008_identity_enrollment',
      sql: `
CREATE TABLE ${s}.identity_enrollment_proofs (
 context_id text PRIMARY KEY REFERENCES ${s}.identity_contexts(id),
 challenge_id text NOT NULL UNIQUE REFERENCES ${s}.identity_challenges(id),
 verified_at timestamptz NOT NULL, expires_at timestamptz NOT NULL CHECK(expires_at>verified_at),
 status text NOT NULL DEFAULT 'verified' CHECK(status IN ('verified','activated','handoff')),
 result_account_id text UNIQUE REFERENCES ${s}.identity_accounts(id), activation_transaction text,
 CHECK((status='activated' AND result_account_id IS NOT NULL AND activation_transaction IS NOT NULL) OR (status<>'activated' AND result_account_id IS NULL AND activation_transaction IS NULL))
);
CREATE TABLE ${s}.identity_legal_acceptances (
 account_id text PRIMARY KEY REFERENCES ${s}.identity_accounts(id),
 terms_version text NOT NULL CHECK(terms_version ~ '^[A-Za-z0-9._-]{1,128}$'),
 privacy_version text NOT NULL CHECK(privacy_version ~ '^[A-Za-z0-9._-]{1,128}$'),
 accepted_at timestamptz NOT NULL, context_id text NOT NULL UNIQUE REFERENCES ${s}.identity_contexts(id)
);
CREATE TRIGGER identity_legal_immutable BEFORE UPDATE OR DELETE ON ${s}.identity_legal_acceptances FOR EACH ROW EXECUTE FUNCTION ${s}.identity_email_record_immutable();
CREATE FUNCTION ${s}.identity_enrollment_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $guard$
DECLARE c ${s}.identity_contexts%ROWTYPE; p ${s}.identity_challenges%ROWTYPE;
BEGIN
 IF TG_OP='UPDATE' THEN
   IF OLD.status<>'verified' OR ROW(NEW.context_id,NEW.challenge_id,NEW.verified_at,NEW.expires_at) IS DISTINCT FROM ROW(OLD.context_id,OLD.challenge_id,OLD.verified_at,OLD.expires_at) THEN RAISE EXCEPTION 'Enrollment proof immutable' USING ERRCODE='23514'; END IF;
 ELSE
   SELECT * INTO c FROM ${s}.identity_contexts WHERE id=NEW.context_id;
   SELECT * INTO p FROM ${s}.identity_challenges WHERE id=NEW.challenge_id;
   IF c.id IS NULL OR p.id IS NULL OR c.purpose<>'registration' OR c.account_id IS NOT NULL OR c.security_version IS NOT NULL OR c.status<>'pending' OR p.context_id<>c.id OR p.purpose<>'registration' OR p.status<>'consumed' OR p.delivery_status<>'sent' OR NEW.expires_at>LEAST(c.expires_at,p.expires_at) OR NEW.status<>'verified' THEN RAISE EXCEPTION 'Enrollment source invalid' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $guard$;
CREATE TRIGGER identity_enrollment_guard BEFORE INSERT OR UPDATE ON ${s}.identity_enrollment_proofs FOR EACH ROW EXECUTE FUNCTION ${s}.identity_enrollment_guard();
`,
    },
  ];
}
