import { identitySchema } from './identityMigrations.js';
export function identityActorMigrations(schema = 'public') {
  const s = identitySchema(schema);
  return [
    {
      id: '0007_identity_actor_preferences',
      sql: `
ALTER TABLE ${s}.identity_accounts ADD COLUMN confirm_credit_usage boolean NOT NULL DEFAULT true;
CREATE TABLE ${s}.identity_status_operations (
 id text PRIMARY KEY CHECK(id ~ '^[a-f0-9]{64}$'), actor_id text NOT NULL REFERENCES ${s}.identity_accounts(id),
 target_id text NOT NULL REFERENCES ${s}.identity_accounts(id), fingerprint text NOT NULL CHECK(fingerprint ~ '^[a-f0-9]{64}$'),key_version integer NOT NULL CHECK(key_version>0),
 previous_status text NOT NULL CHECK(previous_status IN ('active','suspended','disabled','closed')),
 status text NOT NULL CHECK(status IN ('active','suspended','disabled','closed')),
 security_version integer NOT NULL CHECK(security_version>0), created_at timestamptz NOT NULL,
 CHECK(actor_id<>target_id)
);
CREATE TRIGGER identity_status_operation_immutable BEFORE UPDATE OR DELETE ON ${s}.identity_status_operations
 FOR EACH ROW EXECUTE FUNCTION ${s}.identity_email_record_immutable();
`,
    },
  ];
}
