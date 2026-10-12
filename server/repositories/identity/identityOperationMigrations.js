import { identitySchema } from './identityMigrations.js';

export function identityOperationMigrations(schema = 'public') {
  const s = identitySchema(schema);
  return [{ id: '0003_identity_operations', sql: `
ALTER TABLE ${s}.identity_operations ADD COLUMN receipt_issuances integer NOT NULL DEFAULT 0 CHECK (receipt_issuances BETWEEN 0 AND 3);
CREATE UNIQUE INDEX identity_receipt_current_idx ON ${s}.identity_operation_receipts(operation_id,browser_digest) WHERE revoked_at IS NULL;
ALTER TABLE ${s}.identity_notification_outbox ALTER COLUMN protected_payload DROP NOT NULL;
ALTER TABLE ${s}.identity_notification_outbox ADD COLUMN challenge_id text REFERENCES ${s}.identity_challenges(id);
ALTER TABLE ${s}.identity_notification_outbox ADD COLUMN generation integer NOT NULL DEFAULT 0 CHECK (generation >= 0);
ALTER TABLE ${s}.identity_notification_outbox ADD CONSTRAINT identity_outbox_erasure CHECK (
  (status IN ('pending','leased') AND protected_payload IS NOT NULL) OR
  (status IN ('sent','failed','expired') AND protected_payload IS NULL));
ALTER TABLE ${s}.identity_notification_outbox ADD CONSTRAINT identity_outbox_attempt_bound CHECK (attempts <= 4);
ALTER TABLE ${s}.identity_notification_outbox ADD CONSTRAINT identity_outbox_purpose CHECK (
  (purpose='challenge_code' AND challenge_id IS NOT NULL) OR (purpose='security_notification' AND challenge_id IS NULL));
ALTER TABLE ${s}.identity_notification_outbox ADD CONSTRAINT identity_outbox_lifetime CHECK (expires_at<=created_at+interval '5 minutes');
CREATE FUNCTION ${s}.identity_operation_lifetime() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $guard$
BEGIN
  IF NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
    OR NEW.receipt_issuances < OLD.receipt_issuances OR NEW.receipt_issuances > OLD.receipt_issuances+1
    OR (OLD.status <> 'pending' AND ROW(NEW.status,NEW.next_action,NEW.result_account_id) IS DISTINCT FROM ROW(OLD.status,OLD.next_action,OLD.result_account_id)) THEN
    RAISE EXCEPTION 'Identity operation transition rejected' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $guard$;
CREATE TRIGGER identity_operation_lifetime BEFORE UPDATE ON ${s}.identity_operations FOR EACH ROW EXECUTE FUNCTION ${s}.identity_operation_lifetime();
CREATE FUNCTION ${s}.identity_receipt_lifetime() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $guard$
BEGIN
  IF TG_OP='UPDATE' AND (NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
    OR (OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at)) THEN
    RAISE EXCEPTION 'Identity receipt transition rejected' USING ERRCODE='23514';
  END IF;
  IF NEW.expires_at > (SELECT expires_at FROM ${s}.identity_operations WHERE id=NEW.operation_id) THEN
    RAISE EXCEPTION 'Identity receipt expiry rejected' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $guard$;
CREATE TRIGGER identity_receipt_lifetime BEFORE INSERT OR UPDATE ON ${s}.identity_operation_receipts FOR EACH ROW EXECUTE FUNCTION ${s}.identity_receipt_lifetime();
CREATE FUNCTION ${s}.identity_outbox_authority() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $guard$
BEGIN
  IF TG_OP='UPDATE' THEN
    IF ROW(NEW.id,NEW.operation_id,NEW.delivery_key,NEW.purpose,NEW.key_version,NEW.challenge_id,NEW.created_at,NEW.expires_at)
      IS DISTINCT FROM ROW(OLD.id,OLD.operation_id,OLD.delivery_key,OLD.purpose,OLD.key_version,OLD.challenge_id,OLD.created_at,OLD.expires_at)
      OR (NEW.protected_payload IS DISTINCT FROM OLD.protected_payload AND NOT (OLD.protected_payload IS NOT NULL AND NEW.protected_payload IS NULL AND NEW.status IN ('sent','failed','expired')))
      OR (OLD.status IN ('sent','failed','expired') AND NEW.status IS DISTINCT FROM OLD.status) THEN
      RAISE EXCEPTION 'Identity delivery authority rejected' USING ERRCODE='23514';
    END IF;
    IF NEW.attempts IS DISTINCT FROM OLD.attempts OR NEW.generation IS DISTINCT FROM OLD.generation THEN
      IF NOT (NEW.status='leased' AND OLD.status IN ('pending','leased') AND NEW.attempts=OLD.attempts+1 AND NEW.generation=OLD.generation+1) THEN
        RAISE EXCEPTION 'Identity delivery attempt rejected' USING ERRCODE='23514';
      END IF;
    END IF;
  END IF;
  IF NEW.challenge_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ${s}.identity_challenges c JOIN ${s}.identity_operations o
    ON o.id=NEW.operation_id WHERE c.id=NEW.challenge_id AND c.context_id=COALESCE(o.binding_context_id,o.context_id)
    AND NEW.expires_at<=c.expires_at) THEN
    RAISE EXCEPTION 'Identity delivery challenge rejected' USING ERRCODE='23514';
  END IF;
  IF NEW.expires_at > (SELECT expires_at FROM ${s}.identity_operations WHERE id=NEW.operation_id) THEN
    RAISE EXCEPTION 'Identity delivery expiry rejected' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $guard$;
CREATE TRIGGER identity_outbox_authority BEFORE INSERT OR UPDATE ON ${s}.identity_notification_outbox FOR EACH ROW EXECUTE FUNCTION ${s}.identity_outbox_authority();
CREATE FUNCTION ${s}.identity_social_transition() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $guard$
BEGIN
  IF NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
    OR (OLD.status IN ('succeeded','failed','interrupted') AND NEW.status IS DISTINCT FROM OLD.status)
    OR (OLD.status='exchange_claimed' AND NEW.status='initiated') THEN
    RAISE EXCEPTION 'Identity social transition rejected' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $guard$;
CREATE TRIGGER identity_social_transition BEFORE UPDATE ON ${s}.identity_social_exchanges FOR EACH ROW EXECUTE FUNCTION ${s}.identity_social_transition();
` }];
}
