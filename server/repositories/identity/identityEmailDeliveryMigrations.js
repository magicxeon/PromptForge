import { identitySchema } from './identityMigrations.js';

export function identityEmailDeliveryMigrations(schema = 'public') {
  const s = identitySchema(schema);
  return [
    {
      id: '0005_identity_email_delivery',
      sql: `
ALTER TABLE ${s}.identity_notification_outbox ADD COLUMN recipient_digest text CHECK (recipient_digest ~ '^[a-f0-9]{64}$');
ALTER TABLE ${s}.identity_notification_outbox ADD COLUMN recipient_key_version integer CHECK (recipient_key_version>0);
ALTER TABLE ${s}.identity_notification_outbox ADD COLUMN template_purpose text;
ALTER TABLE ${s}.identity_notification_outbox ADD COLUMN locale text CHECK (locale IN ('en','th'));
ALTER TABLE ${s}.identity_notification_outbox ADD COLUMN callback_expires_at timestamptz;
CREATE FUNCTION ${s}.identity_mail_aliases_valid(aliases jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $guard$
DECLARE a jsonb; versions int[] := '{}'; digests text[] := '{}'; v int;
BEGIN
  IF jsonb_typeof(aliases) IS DISTINCT FROM 'array' OR jsonb_array_length(aliases) NOT BETWEEN 1 AND 8 THEN RETURN false; END IF;
  FOR a IN SELECT value FROM jsonb_array_elements(aliases) LOOP
    IF jsonb_typeof(a) IS DISTINCT FROM 'object' OR NOT(a ? 'version' AND a ? 'digest') OR
      (SELECT count(*) FROM jsonb_object_keys(a))<>2 OR jsonb_typeof(a->'version') IS DISTINCT FROM 'number' OR
      NOT((a->>'version') ~ '^[1-9][0-9]{0,8}$') OR jsonb_typeof(a->'digest') IS DISTINCT FROM 'string' OR
      NOT((a->>'digest') ~ '^[a-f0-9]{64}$') THEN RETURN false; END IF;
    v := (a->>'version')::int;
    IF v=ANY(versions) OR (a->>'digest')=ANY(digests) THEN RETURN false; END IF;
    versions:=array_append(versions,v); digests:=array_append(digests,a->>'digest');
  END LOOP;
  RETURN true;
END $guard$;
ALTER TABLE ${s}.identity_notification_outbox ADD COLUMN recipient_aliases jsonb;
ALTER TABLE ${s}.identity_notification_outbox ADD CONSTRAINT identity_mail_metadata CHECK (
  (recipient_digest IS NULL AND recipient_key_version IS NULL AND template_purpose IS NULL AND locale IS NULL AND recipient_aliases IS NULL) OR
  (recipient_digest IS NOT NULL AND recipient_key_version IS NOT NULL AND template_purpose IS NOT NULL AND callback_expires_at IS NOT NULL AND template_purpose IN
    ('registration','login','password_reset','email_change_new','link_email','reauthentication','password_changed','email_changed','method_linked','method_unlinked','mfa_changed','sessions_revoked')
    AND locale IS NOT NULL AND callback_expires_at=created_at+interval '24 hours'
    AND recipient_aliases IS NOT NULL AND ${s}.identity_mail_aliases_valid(recipient_aliases)
    AND recipient_aliases @> jsonb_build_array(jsonb_build_object('version',recipient_key_version,'digest',recipient_digest))));
CREATE INDEX identity_mail_callback_expiry_idx ON ${s}.identity_notification_outbox(callback_expires_at,id) WHERE recipient_digest IS NOT NULL;
CREATE FUNCTION ${s}.identity_mail_metadata_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $guard$
BEGIN
  IF NEW.callback_expires_at IS DISTINCT FROM OLD.callback_expires_at OR
    (ROW(NEW.recipient_digest,NEW.recipient_key_version,NEW.template_purpose,NEW.locale,NEW.recipient_aliases)
     IS DISTINCT FROM ROW(OLD.recipient_digest,OLD.recipient_key_version,OLD.template_purpose,OLD.locale,OLD.recipient_aliases)
     AND NOT (OLD.recipient_digest IS NOT NULL AND NEW.recipient_digest IS NULL AND NEW.recipient_key_version IS NULL AND NEW.template_purpose IS NULL AND NEW.locale IS NULL AND NEW.recipient_aliases IS NULL)) THEN
    RAISE EXCEPTION 'Identity email metadata immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $guard$;
CREATE TRIGGER identity_mail_metadata_guard BEFORE UPDATE ON ${s}.identity_notification_outbox FOR EACH ROW EXECUTE FUNCTION ${s}.identity_mail_metadata_guard();
CREATE TABLE ${s}.identity_email_events (
  provider_scope text NOT NULL CHECK (provider_scope ~ '^[A-Za-z0-9_-]{1,64}$'),
  event_id text NOT NULL CHECK (event_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  delivery_id text NOT NULL REFERENCES ${s}.identity_notification_outbox(id),
  event_type text NOT NULL CHECK (event_type IN ('delivered','bounce','complaint')),
  occurred_at timestamptz NOT NULL, fingerprint text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL, expires_at timestamptz NOT NULL CHECK (expires_at=created_at+interval '24 hours'),
  PRIMARY KEY(provider_scope,event_id)
);
CREATE INDEX identity_email_event_expiry_idx ON ${s}.identity_email_events(expires_at,provider_scope,event_id);
CREATE TABLE ${s}.identity_email_suppressions (
  recipient_digest text PRIMARY KEY CHECK (recipient_digest ~ '^[a-f0-9]{64}$'),
  key_version integer NOT NULL CHECK (key_version>0),
  created_at timestamptz NOT NULL, expires_at timestamptz NOT NULL CHECK (expires_at=created_at+interval '24 hours')
);
CREATE INDEX identity_email_suppression_expiry_idx ON ${s}.identity_email_suppressions(expires_at,recipient_digest);
CREATE TABLE ${s}.identity_email_suppression_aliases (
  recipient_digest text PRIMARY KEY CHECK (recipient_digest ~ '^[a-f0-9]{64}$'),
  key_version integer NOT NULL CHECK(key_version>0),
  group_digest text NOT NULL REFERENCES ${s}.identity_email_suppressions(recipient_digest) ON DELETE CASCADE,
  UNIQUE(group_digest,key_version)
);
CREATE INDEX identity_email_suppression_alias_group_idx ON ${s}.identity_email_suppression_aliases(group_digest);
CREATE FUNCTION ${s}.identity_email_record_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $guard$
BEGIN RAISE EXCEPTION 'Identity email record immutable' USING ERRCODE='23514'; END $guard$;
CREATE TRIGGER identity_email_event_immutable BEFORE UPDATE ON ${s}.identity_email_events FOR EACH ROW EXECUTE FUNCTION ${s}.identity_email_record_immutable();
CREATE TRIGGER identity_email_suppression_immutable BEFORE UPDATE ON ${s}.identity_email_suppressions FOR EACH ROW EXECUTE FUNCTION ${s}.identity_email_record_immutable();
CREATE TRIGGER identity_email_suppression_alias_immutable BEFORE UPDATE ON ${s}.identity_email_suppression_aliases FOR EACH ROW EXECUTE FUNCTION ${s}.identity_email_record_immutable();
`,
    },
  ];
}
