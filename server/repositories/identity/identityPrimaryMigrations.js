import { identitySchema } from './identityMigrations.js';
export function identityPrimaryMigrations(schema = 'public') {
  const s = identitySchema(schema);
  return [
    {
      id: '0009_identity_primary_authentication',
      sql: `
CREATE TABLE ${s}.identity_primary_proofs (
 context_id text PRIMARY KEY REFERENCES ${s}.identity_context_metadata(context_id) ON DELETE CASCADE,
 proof_ref text NOT NULL UNIQUE CHECK(proof_ref ~ '^[A-Za-z0-9_-]{1,128}$'),
 account_id text NOT NULL REFERENCES ${s}.identity_accounts(id), security_version integer NOT NULL CHECK(security_version>0),
 method text NOT NULL CHECK(method='password'), credential_digest text NOT NULL CHECK(credential_digest ~ '^[a-f0-9]{64}$'),
 key_version integer NOT NULL CHECK(key_version>0), verified_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL CHECK(expires_at>verified_at AND expires_at<=verified_at+interval '5 minutes'),
 transaction_id text NOT NULL, consumed_at timestamptz CHECK(consumed_at>=verified_at AND consumed_at<expires_at)
);
CREATE FUNCTION ${s}.identity_primary_proof_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $guard$
DECLARE c ${s}.identity_contexts%ROWTYPE;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF OLD.consumed_at IS NOT NULL OR NEW.consumed_at IS NULL OR ROW(NEW.context_id,NEW.proof_ref,NEW.account_id,NEW.security_version,NEW.method,NEW.credential_digest,NEW.key_version,NEW.verified_at,NEW.expires_at,NEW.transaction_id) IS DISTINCT FROM ROW(OLD.context_id,OLD.proof_ref,OLD.account_id,OLD.security_version,OLD.method,OLD.credential_digest,OLD.key_version,OLD.verified_at,OLD.expires_at,OLD.transaction_id) THEN RAISE EXCEPTION 'Primary proof immutable' USING ERRCODE='23514'; END IF;
 ELSE
  SELECT * INTO c FROM ${s}.identity_contexts WHERE id=NEW.context_id;
  IF c.id IS NULL OR c.purpose<>'login' OR c.status<>'pending' OR c.account_id IS DISTINCT FROM NEW.account_id OR c.security_version IS DISTINCT FROM NEW.security_version OR NEW.expires_at>c.expires_at OR NEW.consumed_at IS NOT NULL OR NEW.transaction_id<>pg_current_xact_id()::text THEN RAISE EXCEPTION 'Primary proof scope invalid' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $guard$;
CREATE TRIGGER identity_primary_proof_guard BEFORE INSERT OR UPDATE ON ${s}.identity_primary_proofs FOR EACH ROW EXECUTE FUNCTION ${s}.identity_primary_proof_guard();
`,
    },
  ];
}
