import { identitySchema } from './identityMigrations.js';
import { assertLivePostgresTransaction } from '../postgres/database.js';
export class PostgresIdentityResetRepository {
  constructor({ database, schema = 'public' }) {
    this.database = database;
    this.s = identitySchema(schema);
  }
  transaction(work) {
    return this.database.transaction((tx) => work(this.bind(tx), tx));
  }
  credential(email) {
    return this.transaction((r) => r.credential(email));
  }
  bind(tx) {
    assertLivePostgresTransaction(tx);
    const s = this.s,
      one = async (sql, args) => (await tx.query(sql, args)).rows[0];
    return Object.freeze({
      credential: (email) =>
        one(
          `SELECT a.id,a.status,a.security_version,e.canonical_email,e.delivery_email,e.verified_at,e.recovery_enabled,e.status AS email_status,p.protected_hash,p.algorithm,p.version AS password_version FROM ${s}.identity_email_bindings e JOIN ${s}.identity_accounts a ON a.id=e.account_id LEFT JOIN ${s}.identity_password_credentials p ON p.account_id=a.id WHERE e.canonical_email=$1`,
          [email]
        ),
      source: (id) => one(`SELECT * FROM ${s}.identity_challenges WHERE id=$1`, [id]),
      async replace(i) {
        const result = await tx.query(
          `UPDATE ${s}.identity_password_credentials SET protected_hash=$2,algorithm='argon2id',version=1,changed_at=$3 WHERE account_id=$1 AND protected_hash=$4 AND algorithm='argon2id' AND version=1 RETURNING account_id`,
          [i.accountId, i.passwordHash, i.now, i.originalHash]
        );
        if (result.rowCount !== 1) throw new Error('Reset credential unavailable.');
      },
    });
  }
}
