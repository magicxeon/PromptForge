// Identity-owned DDL. Execution belongs exclusively to the shared migration runner.
export function identitySchema(schema = 'public') {
  if (typeof schema !== 'string' || !/^[a-z][a-z0-9_]{0,62}$/.test(schema)) {
    const error = new Error('Invalid Identity schema.');
    error.code = 'IDENTITY_SCHEMA_INVALID';
    throw error;
  }
  return `"${schema}"`;
}

export function identityMigrations(schema = 'public') {
  const s = identitySchema(schema);
  const id = "text CHECK (length(id) BETWEEN 1 AND 128 AND id ~ '^[A-Za-z0-9_-]+$')";
  const digest = "text CHECK (digest ~ '^[a-f0-9]{64}$')";
  const sql = `
CREATE TABLE ${s}.identity_accounts (
  id ${id} PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('pending','active','suspended','disabled','closed')),
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 80),
  security_version integer NOT NULL DEFAULT 1 CHECK (security_version > 0),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE ${s}.identity_email_bindings (
  id ${id} PRIMARY KEY, account_id text NOT NULL REFERENCES ${s}.identity_accounts(id),
  canonical_email text NOT NULL UNIQUE CHECK (octet_length(canonical_email) BETWEEN 3 AND 254 AND canonical_email = lower(canonical_email) AND canonical_email !~ '[[:space:]]' AND position('@' in canonical_email) > 1),
  delivery_email text NOT NULL CHECK (octet_length(delivery_email) BETWEEN 3 AND 254),
  verified_at timestamptz NOT NULL,
  login_enabled boolean NOT NULL DEFAULT true, recovery_enabled boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','retained')),
  CHECK (status = 'active' OR (NOT login_enabled AND NOT recovery_enabled))
);
CREATE INDEX identity_email_owner_idx ON ${s}.identity_email_bindings(account_id, id);
CREATE TABLE ${s}.identity_external_bindings (
  id ${id} PRIMARY KEY, account_id text NOT NULL REFERENCES ${s}.identity_accounts(id),
  provider text NOT NULL CHECK (provider IN ('google','facebook')),
  issuer_scope text NOT NULL CHECK (octet_length(issuer_scope) BETWEEN 1 AND 512),
  subject text NOT NULL CHECK (octet_length(subject) BETWEEN 1 AND 512),
  linked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, issuer_scope, subject)
);
CREATE INDEX identity_external_owner_idx ON ${s}.identity_external_bindings(account_id, id);
CREATE TABLE ${s}.identity_password_credentials (
  account_id text PRIMARY KEY REFERENCES ${s}.identity_accounts(id),
  protected_hash text NOT NULL CHECK (octet_length(protected_hash) BETWEEN 1 AND 2048),
  algorithm text NOT NULL CHECK (length(algorithm) BETWEEN 1 AND 32),
  version integer NOT NULL CHECK (version > 0), changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE ${s}.identity_contexts (
  id ${id} PRIMARY KEY, account_id text REFERENCES ${s}.identity_accounts(id),
  purpose text NOT NULL CHECK (purpose IN ('preauth','registration','login','password_reset','email_change_new','link','reauthentication','mfa','enrollment')),
  digest ${digest} NOT NULL UNIQUE, key_version integer NOT NULL CHECK (key_version > 0),
  browser_digest text NOT NULL CHECK (browser_digest ~ '^[a-f0-9]{64}$'),
  security_version integer CHECK (security_version > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','consumed','revoked','expired')),
  target_binding text CHECK (octet_length(target_binding) <= 512),
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
  CHECK (expires_at > created_at), CHECK ((account_id IS NULL) = (security_version IS NULL))
);
CREATE INDEX identity_context_owner_idx ON ${s}.identity_contexts(account_id, id);
CREATE INDEX identity_context_expiry_idx ON ${s}.identity_contexts(expires_at, id);
CREATE TABLE ${s}.identity_challenges (
  id ${id} PRIMARY KEY, context_id text NOT NULL REFERENCES ${s}.identity_contexts(id),
  account_id text REFERENCES ${s}.identity_accounts(id), security_version integer CHECK (security_version > 0),
  purpose text NOT NULL CHECK (purpose IN ('registration','login','password_reset','email_change_new','link_email','reauthentication')),
  target_digest text NOT NULL CHECK (target_digest ~ '^[a-f0-9]{64}$'),
  digest ${digest} NOT NULL, key_version integer NOT NULL CHECK (key_version > 0),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 100),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','consumed','superseded','revoked','expired','locked')),
  delivery_status text NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending','sent','failed')),
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, resend_at timestamptz NOT NULL,
  CHECK (expires_at > created_at), CHECK (resend_at >= created_at), CHECK ((account_id IS NULL) = (security_version IS NULL))
);
CREATE INDEX identity_challenge_owner_idx ON ${s}.identity_challenges(account_id, id);
CREATE INDEX identity_challenge_context_idx ON ${s}.identity_challenges(context_id, id);
CREATE INDEX identity_challenge_expiry_idx ON ${s}.identity_challenges(expires_at, id);
CREATE TABLE ${s}.identity_sessions (
  id ${id} PRIMARY KEY, account_id text NOT NULL REFERENCES ${s}.identity_accounts(id),
  digest ${digest} NOT NULL UNIQUE, key_version integer NOT NULL CHECK (key_version > 0),
  method text NOT NULL CHECK (method IN ('password','email_otp','google','facebook')),
  assurance text NOT NULL CHECK (assurance IN ('single_factor','mfa')),
  security_version integer NOT NULL CHECK (security_version > 0),
  created_at timestamptz NOT NULL DEFAULT now(), last_active_at timestamptz NOT NULL DEFAULT now(),
  idle_expires_at timestamptz NOT NULL, absolute_expires_at timestamptz NOT NULL, revoked_at timestamptz,
  CHECK (created_at <= last_active_at AND last_active_at <= absolute_expires_at),
  CHECK (idle_expires_at > created_at AND idle_expires_at <= absolute_expires_at)
);
CREATE INDEX identity_session_owner_idx ON ${s}.identity_sessions(account_id, created_at, id);
CREATE INDEX identity_session_expiry_idx ON ${s}.identity_sessions(absolute_expires_at, id);
CREATE TABLE ${s}.identity_operations (
  id ${id} PRIMARY KEY,
  account_id text REFERENCES ${s}.identity_accounts(id), context_id text REFERENCES ${s}.identity_contexts(id),
  binding_context_id text REFERENCES ${s}.identity_contexts(id),
  scope_type text NOT NULL CHECK (scope_type IN ('account','context')), scope_id text NOT NULL,
  operation text NOT NULL CHECK (operation ~ '^[a-z][a-z0-9_]{0,63}$'),
  idempotency_key text NOT NULL CHECK (idempotency_key ~ '^[A-Za-z0-9_-]{16,128}$'),
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'), key_version integer NOT NULL CHECK (key_version > 0),
  security_version integer CHECK (security_version > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','succeeded','failed','expired')),
  next_action text CHECK (next_action ~ '^[a-z][a-z0-9_]{0,63}$'),
  result_account_id text REFERENCES ${s}.identity_accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
  UNIQUE(scope_type, scope_id, operation, idempotency_key),
  CHECK (expires_at > created_at),
  CHECK (scope_type <> 'account' OR result_account_id IS NULL OR result_account_id = account_id),
  CHECK ((scope_type = 'account' AND account_id = scope_id AND account_id IS NOT NULL AND context_id IS NULL AND security_version IS NOT NULL)
      OR (scope_type = 'context' AND context_id = scope_id AND context_id IS NOT NULL AND account_id IS NULL AND security_version IS NULL AND binding_context_id IS NULL))
);
CREATE INDEX identity_operation_expiry_idx ON ${s}.identity_operations(expires_at, id);
CREATE TABLE ${s}.identity_operation_receipts (
  id ${id} PRIMARY KEY, operation_id text NOT NULL REFERENCES ${s}.identity_operations(id),
  context_id text NOT NULL REFERENCES ${s}.identity_contexts(id),
  digest ${digest} NOT NULL UNIQUE, key_version integer NOT NULL CHECK (key_version > 0),
  browser_digest text NOT NULL CHECK (browser_digest ~ '^[a-f0-9]{64}$'),
  revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
  CHECK (expires_at > created_at)
);
CREATE INDEX identity_receipt_context_idx ON ${s}.identity_operation_receipts(context_id, id);
CREATE INDEX identity_receipt_expiry_idx ON ${s}.identity_operation_receipts(expires_at, id);
CREATE TABLE ${s}.identity_pending_bindings (
  id ${id} PRIMARY KEY, account_id text NOT NULL REFERENCES ${s}.identity_accounts(id),
  context_id text NOT NULL REFERENCES ${s}.identity_contexts(id), operation_id text NOT NULL REFERENCES ${s}.identity_operations(id),
  kind text NOT NULL CHECK (kind IN ('email','external')),
  proposed_email text CHECK (octet_length(proposed_email) <= 254),
  provider text CHECK (provider IN ('google','facebook')), issuer_scope text CHECK (octet_length(issuer_scope) <= 512), subject text CHECK (octet_length(subject) <= 512),
  security_version integer NOT NULL CHECK (security_version > 0), version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','consumed','revoked','expired')),
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
  CHECK (expires_at > created_at),
  CHECK ((kind = 'email' AND proposed_email IS NOT NULL AND provider IS NULL AND issuer_scope IS NULL AND subject IS NULL)
    OR (kind = 'external' AND proposed_email IS NULL AND provider IS NOT NULL AND issuer_scope IS NOT NULL AND subject IS NOT NULL))
);
CREATE INDEX identity_pending_owner_idx ON ${s}.identity_pending_bindings(account_id, id);
CREATE INDEX identity_pending_expiry_idx ON ${s}.identity_pending_bindings(expires_at, id);
CREATE TABLE ${s}.identity_social_exchanges (
  id ${id} PRIMARY KEY, context_id text NOT NULL REFERENCES ${s}.identity_contexts(id),
  operation_id text NOT NULL UNIQUE REFERENCES ${s}.identity_operations(id),
  provider text NOT NULL CHECK (provider IN ('google','facebook')),
  intent text NOT NULL CHECK (intent IN ('login','link')),
  account_id text REFERENCES ${s}.identity_accounts(id), security_version integer CHECK (security_version > 0),
  digest ${digest} NOT NULL UNIQUE, key_version integer NOT NULL CHECK (key_version > 0),
  protected_verifier text CHECK (octet_length(protected_verifier) BETWEEN 1 AND 4096),
  nonce_digest text CHECK (nonce_digest ~ '^[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated','exchange_claimed','succeeded','failed','interrupted')),
  claim_expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
  CHECK (expires_at > created_at), CHECK ((status = 'exchange_claimed') = (claim_expires_at IS NOT NULL)),
  CHECK ((intent = 'login' AND account_id IS NULL AND security_version IS NULL)
    OR (intent = 'link' AND account_id IS NOT NULL AND security_version IS NOT NULL))
);
CREATE INDEX identity_social_context_idx ON ${s}.identity_social_exchanges(context_id, id);
CREATE INDEX identity_social_expiry_idx ON ${s}.identity_social_exchanges(expires_at, id);
CREATE TABLE ${s}.identity_mfa_factors (
  id ${id} PRIMARY KEY, account_id text NOT NULL REFERENCES ${s}.identity_accounts(id),
  protected_secret text NOT NULL CHECK (octet_length(protected_secret) BETWEEN 1 AND 4096), key_version integer NOT NULL CHECK (key_version > 0),
  confirmed_at timestamptz, last_used_step bigint CHECK (last_used_step >= 0),
  security_version integer NOT NULL CHECK (security_version > 0), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX identity_factor_owner_idx ON ${s}.identity_mfa_factors(account_id, id);
CREATE TABLE ${s}.identity_recovery_codes (
  id ${id} PRIMARY KEY, factor_id text NOT NULL REFERENCES ${s}.identity_mfa_factors(id),
  digest ${digest} NOT NULL UNIQUE, key_version integer NOT NULL CHECK (key_version > 0), consumed_at timestamptz
);
CREATE INDEX identity_recovery_factor_idx ON ${s}.identity_recovery_codes(factor_id, id);
CREATE TABLE ${s}.identity_role_memberships (
  account_id text NOT NULL REFERENCES ${s}.identity_accounts(id), role text NOT NULL CHECK (role ~ '^[a-z][a-z0-9_]{0,63}$'),
  granted_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(account_id, role)
);
CREATE TABLE ${s}.identity_terms_acceptances (
  account_id text NOT NULL REFERENCES ${s}.identity_accounts(id), document text NOT NULL CHECK (document IN ('terms','privacy','marketing')),
  version text NOT NULL CHECK (length(version) BETWEEN 1 AND 128), accepted_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL CHECK (length(source) BETWEEN 1 AND 64), PRIMARY KEY(account_id, document, version)
);
CREATE TABLE ${s}.identity_rate_buckets (
  digest ${digest} PRIMARY KEY, key_version integer NOT NULL CHECK (key_version > 0),
  purpose text NOT NULL CHECK (length(purpose) BETWEEN 1 AND 64), count integer NOT NULL CHECK (count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL CHECK (expires_at > created_at)
);
CREATE INDEX identity_rate_expiry_idx ON ${s}.identity_rate_buckets(expires_at);
CREATE TABLE ${s}.identity_notification_outbox (
  id ${id} PRIMARY KEY, operation_id text NOT NULL REFERENCES ${s}.identity_operations(id),
  delivery_key text NOT NULL UNIQUE CHECK (length(delivery_key) BETWEEN 1 AND 128),
  purpose text NOT NULL CHECK (length(purpose) BETWEEN 1 AND 64),
  protected_payload text NOT NULL CHECK (octet_length(protected_payload) BETWEEN 1 AND 8192), key_version integer NOT NULL CHECK (key_version > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','leased','sent','failed','expired')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 100), lease_expires_at timestamptz,
  available_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
  CHECK (expires_at > created_at), CHECK ((status = 'leased') = (lease_expires_at IS NOT NULL))
);
CREATE INDEX identity_outbox_delivery_idx ON ${s}.identity_notification_outbox(status, available_at, id);
CREATE INDEX identity_outbox_expiry_idx ON ${s}.identity_notification_outbox(expires_at, id);

-- Authority fields are immutable after issue. Status, attempts, delivery and
-- revocation can advance without comparing historical grants to today's account
-- version. New domain work still locks/checks the current account version.
CREATE FUNCTION ${s}.identity_guard_context() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $guard$
BEGIN
  IF ROW(NEW.id,NEW.account_id,NEW.purpose,NEW.digest,NEW.key_version,NEW.browser_digest,NEW.security_version,NEW.target_binding)
    IS DISTINCT FROM ROW(OLD.id,OLD.account_id,OLD.purpose,OLD.digest,OLD.key_version,OLD.browser_digest,OLD.security_version,OLD.target_binding) THEN
    RAISE EXCEPTION 'Identity context authority is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $guard$;
CREATE TRIGGER identity_context_authority BEFORE UPDATE ON ${s}.identity_contexts
FOR EACH ROW EXECUTE FUNCTION ${s}.identity_guard_context();

CREATE FUNCTION ${s}.identity_guard_operation() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $guard$
DECLARE c ${s}.identity_contexts%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF ROW(NEW.id,NEW.account_id,NEW.context_id,NEW.binding_context_id,NEW.scope_type,NEW.scope_id,NEW.operation,NEW.idempotency_key,NEW.fingerprint,NEW.key_version,NEW.security_version)
      IS DISTINCT FROM ROW(OLD.id,OLD.account_id,OLD.context_id,OLD.binding_context_id,OLD.scope_type,OLD.scope_id,OLD.operation,OLD.idempotency_key,OLD.fingerprint,OLD.key_version,OLD.security_version) THEN
      RAISE EXCEPTION 'Identity operation authority is immutable' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF NEW.scope_type = 'context' OR NEW.binding_context_id IS NOT NULL THEN
    SELECT * INTO c FROM ${s}.identity_contexts WHERE id=COALESCE(NEW.binding_context_id,NEW.context_id);
    IF NOT FOUND OR c.account_id IS DISTINCT FROM NEW.account_id OR c.security_version IS DISTINCT FROM NEW.security_version THEN
      RAISE EXCEPTION 'Identity operation context mismatch' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END $guard$;
CREATE TRIGGER identity_operation_authority BEFORE INSERT OR UPDATE ON ${s}.identity_operations
FOR EACH ROW EXECUTE FUNCTION ${s}.identity_guard_operation();

CREATE FUNCTION ${s}.identity_guard_child() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $guard$
DECLARE c ${s}.identity_contexts%ROWTYPE; o ${s}.identity_operations%ROWTYPE;
BEGIN
  SELECT * INTO c FROM ${s}.identity_contexts WHERE id=NEW.context_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Identity child context missing' USING ERRCODE = '23514'; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.context_id IS DISTINCT FROM OLD.context_id THEN
      RAISE EXCEPTION 'Identity child context is immutable' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF TG_TABLE_NAME = 'identity_challenges' THEN
    -- Challenge purposes map one-to-one, except authenticated link_email uses
    -- the existing link context. Generic preauth never substitutes for a purpose.
    IF c.account_id IS DISTINCT FROM NEW.account_id OR c.security_version IS DISTINCT FROM NEW.security_version
      OR (NEW.purpose='link_email' AND NEW.account_id IS NULL)
      OR c.purpose <> (CASE WHEN NEW.purpose='link_email' THEN 'link' ELSE NEW.purpose END) THEN
      RAISE EXCEPTION 'Identity challenge scope mismatch' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'UPDATE' THEN
      IF ROW(NEW.account_id,NEW.security_version,NEW.purpose,NEW.target_digest,NEW.digest,NEW.key_version)
        IS DISTINCT FROM ROW(OLD.account_id,OLD.security_version,OLD.purpose,OLD.target_digest,OLD.digest,OLD.key_version) THEN
        RAISE EXCEPTION 'Identity challenge authority is immutable' USING ERRCODE = '23514';
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO o FROM ${s}.identity_operations WHERE id=NEW.operation_id;
  IF NOT FOUND OR NEW.context_id IS DISTINCT FROM COALESCE(o.binding_context_id,o.context_id)
    OR c.account_id IS DISTINCT FROM o.account_id OR c.security_version IS DISTINCT FROM o.security_version THEN
    RAISE EXCEPTION 'Identity child operation scope mismatch' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.operation_id IS DISTINCT FROM OLD.operation_id THEN
      RAISE EXCEPTION 'Identity child operation is immutable' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF TG_TABLE_NAME = 'identity_operation_receipts' THEN
    IF NEW.browser_digest IS DISTINCT FROM c.browser_digest THEN
      RAISE EXCEPTION 'Identity receipt browser mismatch' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'UPDATE' THEN
      IF ROW(NEW.browser_digest,NEW.digest,NEW.key_version) IS DISTINCT FROM ROW(OLD.browser_digest,OLD.digest,OLD.key_version) THEN
        RAISE EXCEPTION 'Identity receipt authority is immutable' USING ERRCODE = '23514';
      END IF;
    END IF;
  ELSE
    IF c.account_id IS DISTINCT FROM NEW.account_id OR c.security_version IS DISTINCT FROM NEW.security_version THEN
      RAISE EXCEPTION 'Identity child owner mismatch' USING ERRCODE = '23514';
    END IF;
    IF TG_TABLE_NAME = 'identity_pending_bindings' THEN
      IF (NEW.kind='email' AND c.purpose NOT IN ('email_change_new','link')) OR (NEW.kind='external' AND c.purpose<>'link') THEN
        RAISE EXCEPTION 'Identity binding purpose mismatch' USING ERRCODE = '23514';
      END IF;
      IF TG_OP = 'UPDATE' THEN
        IF ROW(NEW.account_id,NEW.security_version,NEW.kind,NEW.proposed_email,NEW.provider,NEW.issuer_scope,NEW.subject)
          IS DISTINCT FROM ROW(OLD.account_id,OLD.security_version,OLD.kind,OLD.proposed_email,OLD.provider,OLD.issuer_scope,OLD.subject) THEN
          RAISE EXCEPTION 'Identity pending binding authority is immutable' USING ERRCODE = '23514';
        END IF;
      END IF;
    ELSIF TG_TABLE_NAME = 'identity_social_exchanges' THEN
      IF c.purpose <> NEW.intent THEN
        RAISE EXCEPTION 'Identity social purpose mismatch' USING ERRCODE = '23514';
      END IF;
      IF TG_OP = 'UPDATE' THEN
        IF ROW(NEW.account_id,NEW.security_version,NEW.provider,NEW.intent,NEW.digest,NEW.key_version)
          IS DISTINCT FROM ROW(OLD.account_id,OLD.security_version,OLD.provider,OLD.intent,OLD.digest,OLD.key_version) THEN
          RAISE EXCEPTION 'Identity social authority is immutable' USING ERRCODE = '23514';
        END IF;
        -- Transient proof material may be erased only at a terminal outcome.
        -- Replacement and restoration are forbidden, even after termination.
        IF NEW.protected_verifier IS DISTINCT FROM OLD.protected_verifier THEN
          IF NOT (OLD.protected_verifier IS NOT NULL AND NEW.protected_verifier IS NULL
            AND NEW.status IN ('succeeded','failed','interrupted')) THEN
            RAISE EXCEPTION 'Identity social verifier change forbidden' USING ERRCODE = '23514';
          END IF;
        END IF;
        IF NEW.nonce_digest IS DISTINCT FROM OLD.nonce_digest THEN
          IF NOT (OLD.nonce_digest IS NOT NULL AND NEW.nonce_digest IS NULL
            AND NEW.status IN ('succeeded','failed','interrupted')) THEN
            RAISE EXCEPTION 'Identity social nonce change forbidden' USING ERRCODE = '23514';
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $guard$;
CREATE TRIGGER identity_challenge_scope BEFORE INSERT OR UPDATE ON ${s}.identity_challenges
FOR EACH ROW EXECUTE FUNCTION ${s}.identity_guard_child();
CREATE TRIGGER identity_pending_scope BEFORE INSERT OR UPDATE ON ${s}.identity_pending_bindings
FOR EACH ROW EXECUTE FUNCTION ${s}.identity_guard_child();
CREATE TRIGGER identity_receipt_scope BEFORE INSERT OR UPDATE ON ${s}.identity_operation_receipts
FOR EACH ROW EXECUTE FUNCTION ${s}.identity_guard_child();
CREATE TRIGGER identity_social_scope BEFORE INSERT OR UPDATE ON ${s}.identity_social_exchanges
FOR EACH ROW EXECUTE FUNCTION ${s}.identity_guard_child();
`;
  return Object.freeze([Object.freeze({ id: '0001_identity_foundation', sql })]);
}
