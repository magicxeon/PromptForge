// Opt-in entry outside test discovery. Never import application bootstrap or dotenv.
import test from 'node:test';
import assert from 'node:assert/strict';
import { runMigrations } from '../../server/repositories/postgres/migrations.js';
import { withDisposableAuthDatabase } from './fixtures.mjs';
import { installNetworkGuard } from './network-guard.mjs';
import { identityMigrations, identitySchema } from '../../server/repositories/identity/identityMigrations.js';
import { PostgresIdentityRepository } from '../../server/repositories/identity/PostgresIdentityRepository.js';
import { createHmac, randomUUID } from 'node:crypto';

test('authentication disposable PostgreSQL fixture lifecycle (no Identity DDL)', { timeout: 45000 }, async t => {
  const restore = installNetworkGuard({ databaseEnv: process.env });
  try {
    await withDisposableAuthDatabase(process.env, async outer => {
      const sentinel = `"${outer.schema}"."preserved"`;
      await outer.database.query(`CREATE TABLE ${sentinel} (id integer PRIMARY KEY)`);
      await outer.database.query(`INSERT INTO ${sentinel} VALUES (1)`);
      let innerSchema;
      await t.test('shared migration engine applies fixture-only migrations and schema is removed on success', async () => {
        await withDisposableAuthDatabase(process.env, async ({ database, schema }) => {
          innerSchema = schema;
          const migrations = [{ id: '0001_fixture_probe', sql: `CREATE TABLE "${schema}"."fixture_probe" (id text PRIMARY KEY)` }];
          assert.deepEqual((await runMigrations(database, migrations, { mode: 'status', schema })).pending, ['0001_fixture_probe']);
          assert.deepEqual((await runMigrations(database, migrations, { mode: 'apply', schema })).newlyApplied, ['0001_fixture_probe']);
          await database.query(`INSERT INTO "${schema}"."fixture_probe" VALUES ($1)`, ['fixture_actor']);
          assert.deepEqual((await database.query(`SELECT id FROM "${schema}"."fixture_probe"`)).rows, [{ id: 'fixture_actor' }]);
          assert.deepEqual((await runMigrations(database, migrations, { mode: 'apply', schema })).newlyApplied, []);
        });
        assert.equal((await outer.database.query('SELECT to_regnamespace($1) AS schema', [innerSchema])).rows[0].schema, null);
      });
      await t.test('failed fixture work cleans its schema while independent sentinel survives', async () => {
        const failure = new Error('injected authentication fixture failure');
        await assert.rejects(withDisposableAuthDatabase(process.env, async ({ database, schema }) => {
          innerSchema = schema;
          await database.query(`CREATE TABLE "${schema}"."partial_fixture" (id integer)`);
          throw failure;
        }), error => error === failure);
        assert.equal((await outer.database.query('SELECT to_regnamespace($1) AS schema', [innerSchema])).rows[0].schema, null);
        assert.deepEqual((await outer.database.query(`SELECT id FROM ${sentinel}`)).rows, [{ id: 1 }]);
      });
    });
  } finally { restore(); }
});

test('Identity PostgreSQL constraints, concurrent writes, guarded mutations and replay', { timeout: 45000 }, async t => {
  const restore = installNetworkGuard({ databaseEnv: process.env });
  try {
    await withDisposableAuthDatabase(process.env, async ({ database, schema }) => {
      const migrations = identityMigrations(schema);
      const s = identitySchema(schema);
      const repo = new PostgresIdentityRepository({ database, schema });
      const account = id => ({ id, status: 'active', displayName: 'Fixture actor' });
      const email = (id, accountId, canonicalEmail) => ({ id, accountId, canonicalEmail, deliveryEmail: canonicalEmail, verifiedAt: new Date() });
      const fp = value => createHmac('sha256', 'fixture-only-dedicated-key-32bytes').update('identity:v1\0').update(value).digest('hex');
      const expiresAt = () => new Date(Date.now() + 300000);
      const operation = (scopeId, key = 'operation_fixture_1') => ({ scopeType: 'account', scopeId,
        operation: 'fixture_mutation', key, fingerprint: fp(key), keyVersion: 1, expectedSecurityVersion: 1, expiresAt: expiresAt() });
      await t.test('reviewed Identity migration is explicit, atomic and replayable', async () => {
        assert.deepEqual((await runMigrations(database, migrations, { mode: 'apply', schema })).newlyApplied, ['0001_identity_foundation']);
        assert.deepEqual((await runMigrations(database, migrations, { mode: 'apply', schema })).newlyApplied, []);
        const tables = (await database.query('SELECT tablename FROM pg_tables WHERE schemaname=$1', [schema])).rows;
        assert.equal(tables.filter(row => row.tablename.startsWith('identity_')).length, 17);
        assert.throws(() => identityMigrations('public"; DROP SCHEMA public; --'), { code: 'IDENTITY_SCHEMA_INVALID' });
        assert.throws(() => new PostgresIdentityRepository({ database, schema: 'Public' }), { code: 'IDENTITY_SCHEMA_INVALID' });
      });
      await t.test('separate connections competing for canonical email leave one account and binding', async () => {
        const pids = new Set();
        let release;
        const barrier = new Promise(resolve => { release = resolve; });
        const results = await Promise.allSettled(['email_a', 'email_b'].map(id => repo.transaction(async (r, tx) => {
          pids.add((await tx.query('SELECT pg_backend_pid() AS pid')).rows[0].pid);
          if (pids.size === 2) release();
          await barrier;
          await r.createAccount(account(id));
          await r.addEmailBinding(email(`binding_${id}`, id, 'one@example.invalid'));
        })));
        assert.equal(pids.size, 2);
        assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
        assert.equal(results.find(r => r.status === 'rejected').reason.sqlState, '23505');
        assert.equal((await database.query(`SELECT count(*)::int AS n FROM ${s}.identity_accounts WHERE id IN ('email_a','email_b')`)).rows[0].n, 1);
        assert.ok(['email_a', 'email_b'].includes((await repo.findAccountByEmail('one@example.invalid')).id));
      });
      await t.test('same provider app-scoped subject has one winner and no loser account', async () => {
        const results = await Promise.allSettled(['social_a', 'social_b'].map(id => repo.transaction(async r => {
          await r.createAccount(account(id));
          await r.addExternalBinding({ id: `ext_${id}`, accountId: id, provider: 'google', issuerScope: 'fixture-client', subject: 'subject_one' });
        })));
        assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
        assert.equal(results.find(r => r.status === 'rejected').reason.sqlState, '23505');
        const winner = await repo.findAccountByExternal({ provider: 'google', issuerScope: 'fixture-client', subject: 'subject_one' });
        assert.ok(winner);
        assert.equal((await database.query(`SELECT count(*)::int AS n FROM ${s}.identity_accounts WHERE id IN ('social_a','social_b')`)).rows[0].n, 1);
        assert.equal(await repo.findAccountByExternal({ provider: 'google', issuerScope: 'different-client', subject: 'subject_one' }), null);
      });
      await t.test('FK, status, verified email, retention uniqueness and expiry checks reject malformed durable state', async () => {
        await assert.rejects(repo.transaction(r => r.createAccount({ ...account('bad_status'), status: 'administrator' })), { sqlState: '23514' });
        await assert.rejects(repo.transaction(r => r.addEmailBinding(email('orphan', 'missing', 'orphan@example.invalid'))), { sqlState: '23503' });
        await repo.transaction(r => r.createAccount(account('constraints')));
        await assert.rejects(repo.transaction(r => r.addEmailBinding({ ...email('unverified', 'constraints', 'unverified@example.invalid'), verifiedAt: null })), { sqlState: '23502' });
        await assert.rejects(repo.transaction(r => r.addEmailBinding(email('not_canonical', 'constraints', 'Upper@example.invalid'))), { sqlState: '23514' });
        await repo.transaction(r => r.addEmailBinding(email('retained', 'constraints', 'retained@example.invalid')));
        await database.query(`UPDATE ${s}.identity_email_bindings SET status='retained',login_enabled=false,recovery_enabled=false WHERE id='retained'`);
        await assert.rejects(repo.transaction(r => r.addEmailBinding(email('duplicate_retained', 'constraints', 'retained@example.invalid'))), { sqlState: '23505' });
        assert.equal(await repo.findAccountByEmail('retained@example.invalid'), null);
        await assert.rejects(database.query(`INSERT INTO ${s}.identity_rate_buckets (digest,key_version,purpose,count,expires_at) VALUES ($1,1,'login',0,now()-interval '1 second')`, [fp('expired')]), { sqlState: '23514' });
        const secret = 'never_print_fixture_email@example.invalid';
        await assert.rejects(repo.transaction(r => r.addEmailBinding(email('orphan2', secret, 'private@example.invalid'))), error => {
          assert.equal(error.sqlState, '23503');
          assert.doesNotMatch(JSON.stringify(error) + error.message, /never_print|private@example/);
          return true;
        });
      });
      await t.test('same-key concurrent retry returns one safe persisted result and invokes work once', async () => {
        await repo.transaction(r => r.createAccount(account('operation_actor')));
        let calls = 0;
        const input = operation('operation_actor');
        const results = await Promise.all([1, 2].map(() => repo.runOperation(input, async r => {
          calls++;
          await r.addExternalBinding({ id: 'idempotent_external', accountId: 'operation_actor', provider: 'facebook', issuerScope: 'fixture-app', subject: 'replay' });
          return { nextAction: 'sign_in', accountId: 'operation_actor' };
        })));
        assert.equal(calls, 1);
        assert.deepEqual(results.map(r => r.replayed).sort(), [false, true]);
        assert.equal(results[0].operationId, results[1].operationId);
        assert.deepEqual(results[0].result, results[1].result);
        for (const changed of [{ fingerprint: fp('different secret body') }, { keyVersion: 2 }]) {
          await assert.rejects(repo.runOperation({ ...input, ...changed }, () => { calls++; }), { code: 'IDENTITY_IDEMPOTENCY_CONFLICT' });
        }
        assert.equal(calls, 1);
        const saved = (await database.query(`SELECT * FROM ${s}.identity_operations WHERE id=$1`, [results[0].operationId])).rows[0];
        assert.equal(saved.fingerprint, input.fingerprint);
        assert.equal(saved.status, 'succeeded');
        assert.equal(saved.result_account_id, 'operation_actor');
        assert.equal(Object.hasOwn(saved, 'payload'), false);
      });
      await t.test('unapproved replay fields abort operation and domain mutation atomically', async () => {
        await assert.rejects(repo.runOperation(operation('operation_actor', 'invalid_result_key'), async r => {
          await r.createAccount(account('secret_result_rollback'));
          return { nextAction: 'sign_in', token: 'forbidden-secret' };
        }), { code: 'IDENTITY_OPERATION_RESULT_INVALID' });
        assert.equal(await repo.findAccount('secret_result_rollback'), null);
        assert.equal((await database.query(`SELECT count(*)::int AS n FROM ${s}.identity_operations WHERE idempotency_key='invalid_result_key'`)).rows[0].n, 0);
      });
      await t.test('stale version rejects before callback and concurrent status changes have one winner', async () => {
        const results = await Promise.allSettled(['suspended', 'disabled'].map(status => repo.transaction(r =>
          r.advanceSecurityVersion({ accountId: 'operation_actor', expectedSecurityVersion: 1, status }))));
        assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
        assert.equal(results.find(r => r.status === 'rejected').reason.code, 'IDENTITY_SECURITY_VERSION_CONFLICT');
        let calls = 0;
        await assert.rejects(repo.runOperation(operation('operation_actor'), () => { calls++; }), { code: 'IDENTITY_SECURITY_VERSION_CONFLICT' });
        assert.equal(calls, 0);
        assert.equal((await repo.findAccount('operation_actor')).securityVersion, 2);
        await assert.rejects(repo.transaction(async r => {
          await r.createAccount(account('stale_partial_write'));
          await r.advanceSecurityVersion({ accountId: 'operation_actor', expectedSecurityVersion: 1 });
        }), { code: 'IDENTITY_SECURITY_VERSION_CONFLICT' });
        assert.equal(await repo.findAccount('stale_partial_write'), null);
      });
      await t.test('aborted enrollment retries with same operation create exactly one stable account', async () => {
        const context = 'context_fixture_enroll';
        await database.query(`INSERT INTO ${s}.identity_contexts (id,purpose,digest,key_version,browser_digest,expires_at)
          VALUES ($1,'registration',$2,1,$3,$4)`, [context, fp('context'), fp('browser'), expiresAt()]);
        const input = { ...operation(context), scopeType: 'context', expectedSecurityVersion: undefined };
        const failure = new Error('injected after binding');
        let calls = 0;
        const work = async r => {
          calls++;
          await r.createAccount(account('preserved_opaque_id'));
          await r.addEmailBinding(email('retry_email', 'preserved_opaque_id', 'retry@example.invalid'));
          if (calls === 1) throw failure;
          return { nextAction: 'sign_in', accountId: 'preserved_opaque_id' };
        };
        await assert.rejects(repo.runOperation(input, work), error => error === failure);
        assert.equal(await repo.findAccount('preserved_opaque_id'), null);
        assert.equal((await database.query(`SELECT count(*)::int AS n FROM ${s}.identity_operations WHERE context_id=$1`, [context])).rows[0].n, 0);
        const result = await repo.runOperation(input, work);
        assert.equal(result.replayed, false);
        assert.equal((await repo.runOperation(input, work)).replayed, true);
        assert.equal(calls, 2);
        assert.equal((await repo.findAccountByEmail('retry@example.invalid')).id, 'preserved_opaque_id');
      });
      await t.test('security advance revokes old session and grants atomically; rollback preserves all', async () => {
        await repo.transaction(r => r.createAccount(account('revocation_actor')));
        await database.query(`INSERT INTO ${s}.identity_sessions
          (id,account_id,digest,key_version,method,assurance,security_version,idle_expires_at,absolute_expires_at)
          VALUES ('old_session','revocation_actor',$1,1,'password','single_factor',1,now()+interval '1 hour',now()+interval '1 day')`, [fp('session')]);
        await database.query(`INSERT INTO ${s}.identity_contexts (id,account_id,purpose,digest,key_version,browser_digest,security_version,expires_at)
          VALUES ('old_context','revocation_actor','password_reset',$1,1,$2,1,$3)`, [fp('oldcontext'), fp('browser2'), expiresAt()]);
        await assert.rejects(repo.transaction(async r => {
          await r.advanceSecurityVersion({ accountId: 'revocation_actor', expectedSecurityVersion: 1 });
          throw new Error('abort revocation');
        }), /abort revocation/);
        assert.equal((await repo.findAccount('revocation_actor')).securityVersion, 1);
        assert.equal((await database.query(`SELECT revoked_at FROM ${s}.identity_sessions WHERE id='old_session'`)).rows[0].revoked_at, null);
        await repo.transaction(r => r.advanceSecurityVersion({ accountId: 'revocation_actor', expectedSecurityVersion: 1 }));
        assert.ok((await database.query(`SELECT revoked_at FROM ${s}.identity_sessions WHERE id='old_session'`)).rows[0].revoked_at);
        assert.equal((await database.query(`SELECT status FROM ${s}.identity_contexts WHERE id='old_context'`)).rows[0].status, 'revoked');
      });
      await t.test('child INSERT and UPDATE enforce purpose, owner, exact context, version and browser bindings', async () => {
        for (const id of ['scope_a', 'scope_b']) await repo.transaction(r => r.createAccount(account(id)));
        // Test-only insert builder: keys below are fixed source literals, never request data.
        const insert = async (table, fields) => {
          const keys = Object.keys(fields);
          await database.query(`INSERT INTO ${s}.${table} (${keys.join(',')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(',')})`, Object.values(fields));
        };
        const context = async (id, owner, purpose = 'link', version = 1) => insert('identity_contexts', {
          id, account_id: owner, purpose, digest: fp(id), key_version: 1, browser_digest: fp(`browser_${id}`),
          security_version: owner ? version : null, expires_at: expiresAt(),
        });
        await context('ctx_a', 'scope_a');
        await context('ctx_a_other', 'scope_a');
        await context('ctx_a_old', 'scope_a', 'link', 2);
        await context('ctx_b', 'scope_b');
        await context('ctx_login', null, 'login');
        const op = async (id, owner, ctx, extra = {}) => insert('identity_operations', {
          id, account_id: owner, context_id: owner ? null : ctx, binding_context_id: owner ? ctx : null,
          scope_type: owner ? 'account' : 'context', scope_id: owner ?? ctx, operation: 'binding_fixture',
          idempotency_key: `operation_key_${id}`, fingerprint: fp(id), key_version: 1,
          security_version: owner ? 1 : null, expires_at: expiresAt(), ...extra,
        });
        await op('op_a', 'scope_a', 'ctx_a');
        await op('op_a_other', 'scope_a', 'ctx_a_other');
        await op('op_a_unbound', 'scope_a', null);
        await op('op_b', 'scope_b', 'ctx_b');
        await op('op_login', null, 'ctx_login');
        await assert.rejects(op('op_foreign_ctx', 'scope_a', 'ctx_b'), { sqlState: '23514' });
        await assert.rejects(op('op_old_ctx', 'scope_a', 'ctx_a_old'), { sqlState: '23514' });
        await assert.rejects(op('op_foreign_result', 'scope_a', 'ctx_a', { result_account_id: 'scope_b' }), { sqlState: '23514' });

        const challenge = { id: 'scope_challenge', context_id: 'ctx_a', account_id: 'scope_a', security_version: 1,
          purpose: 'link_email', target_digest: fp('target'), digest: fp('code'), key_version: 1, expires_at: expiresAt(), resend_at: new Date(Date.now() + 1000) };
        await insert('identity_challenges', challenge); // AUTH-002 link_email -> link context.
        for (const change of [{ context_id: 'ctx_b' }, { account_id: 'scope_b' }, { security_version: 2 }, { purpose: 'login' }]) {
          await assert.rejects(insert('identity_challenges', { ...challenge, id: randomUUID(), ...change }), { sqlState: '23514' });
        }
        await insert('identity_challenges', { ...challenge, id: 'unbound_login_challenge', context_id: 'ctx_login', account_id: null, security_version: null, purpose: 'login' });
        for (const purpose of ['registration', 'password_reset', 'email_change_new', 'reauthentication']) {
          const owner = purpose === 'registration' ? null : 'scope_a';
          await context(`ctx_${purpose}`, owner, purpose);
          await insert('identity_challenges', { ...challenge, id: `challenge_${purpose}`, context_id: `ctx_${purpose}`,
            account_id: owner, security_version: owner ? 1 : null, purpose });
        }
        await context('ctx_unbound_link', null);
        await assert.rejects(insert('identity_challenges', { ...challenge, id: 'unauthenticated_link', context_id: 'ctx_unbound_link', account_id: null, security_version: null }), { sqlState: '23514' });
        const pending = { id: 'scope_pending', account_id: 'scope_a', context_id: 'ctx_a', operation_id: 'op_a',
          kind: 'email', proposed_email: 'future@example.invalid', security_version: 1, expires_at: expiresAt() };
        await insert('identity_pending_bindings', pending);
        for (const change of [{ account_id: 'scope_b' }, { context_id: 'ctx_b' }, { security_version: 2 },
          { operation_id: 'op_b' }, { operation_id: 'op_a_other' }, { operation_id: 'op_a_unbound' }]) {
          await assert.rejects(insert('identity_pending_bindings', { ...pending, id: randomUUID(), ...change }), { sqlState: '23514' });
        }
        const receipt = { id: 'scope_receipt', context_id: 'ctx_a', operation_id: 'op_a', digest: fp('receipt'),
          key_version: 1, browser_digest: fp('browser_ctx_a'), expires_at: expiresAt() };
        await insert('identity_operation_receipts', receipt);
        for (const change of [{ context_id: 'ctx_b' }, { operation_id: 'op_b' }, { operation_id: 'op_a_other' },
          { operation_id: 'op_a_unbound' }, { browser_digest: fp('wrong_browser') }]) {
          await assert.rejects(insert('identity_operation_receipts', { ...receipt, id: randomUUID(), digest: fp(randomUUID()), ...change }), { sqlState: '23514' });
        }
        await insert('identity_operation_receipts', { ...receipt, id: 'unbound_receipt', context_id: 'ctx_login', operation_id: 'op_login', digest: fp('unbound_receipt'), browser_digest: fp('browser_ctx_login') });
        const social = { id: 'scope_social', context_id: 'ctx_a', operation_id: 'op_a', provider: 'google', intent: 'link',
          account_id: 'scope_a', security_version: 1, digest: fp('social'), key_version: 1, expires_at: expiresAt(),
          protected_verifier: 'fixture-encrypted-verifier', nonce_digest: fp('social_nonce') };
        await insert('identity_social_exchanges', social);
        for (const change of [{ context_id: 'ctx_b' }, { account_id: 'scope_b' }, { security_version: 2 },
          { operation_id: 'op_a_other' }, { operation_id: 'op_b' }, { operation_id: 'op_a_unbound' }]) {
          await assert.rejects(insert('identity_social_exchanges', { ...social, id: randomUUID(), digest: fp(randomUUID()), ...change }), { sqlState: '23514' });
        }
        await insert('identity_social_exchanges', { ...social, id: 'unbound_social', context_id: 'ctx_login', operation_id: 'op_login', intent: 'login', account_id: null, security_version: null, digest: fp('unbound_social') });
        for (const field of ['protected_verifier', 'nonce_digest']) {
          await assert.rejects(database.query(`UPDATE ${s}.identity_social_exchanges SET ${field}=NULL WHERE id='scope_social'`), { sqlState: '23514' });
          await assert.rejects(database.query(`UPDATE ${s}.identity_social_exchanges SET ${field}=$1 WHERE id='scope_social'`,
            [field === 'nonce_digest' ? fp('replaced_nonce') : 'replaced-verifier']), { sqlState: '23514' });
        }
        for (const terminal of ['succeeded', 'failed', 'interrupted']) {
          const id = `terminal_${terminal}`;
          await op(`op_${id}`, 'scope_a', 'ctx_a');
          await insert('identity_social_exchanges', { ...social, id, operation_id: `op_${id}`, digest: fp(id) });
          await database.query(`UPDATE ${s}.identity_social_exchanges SET status='exchange_claimed',claim_expires_at=$2 WHERE id=$1`, [id, expiresAt()]);
          await assert.rejects(database.query(`UPDATE ${s}.identity_social_exchanges SET protected_verifier=NULL,nonce_digest=NULL WHERE id=$1`, [id]), { sqlState: '23514' });
          await database.query(`UPDATE ${s}.identity_social_exchanges SET status=$2,claim_expires_at=NULL,protected_verifier=NULL,nonce_digest=NULL WHERE id=$1`, [id, terminal]);
          assert.deepEqual((await database.query(`SELECT protected_verifier,nonce_digest FROM ${s}.identity_social_exchanges WHERE id=$1`, [id])).rows[0], { protected_verifier: null, nonce_digest: null });
          for (const [field, value] of [['protected_verifier', social.protected_verifier], ['nonce_digest', social.nonce_digest]]) {
            await assert.rejects(database.query(`UPDATE ${s}.identity_social_exchanges SET ${field}=$2 WHERE id=$1`, [id, value]), { sqlState: '23514' });
          }
        }

        // Updating an already-valid row cannot switch it to another valid scope.
        const edits = [
          ['identity_challenges', 'scope_challenge', 'context_id', 'ctx_a_other'],
          ['identity_challenges', 'scope_challenge', 'account_id', 'scope_b'],
          ['identity_challenges', 'scope_challenge', 'security_version', 2],
          ['identity_challenges', 'scope_challenge', 'purpose', 'login'],
          ['identity_pending_bindings', 'scope_pending', 'operation_id', 'op_a_other'],
          ['identity_pending_bindings', 'scope_pending', 'account_id', 'scope_b'],
          ['identity_pending_bindings', 'scope_pending', 'security_version', 2],
          ['identity_pending_bindings', 'scope_pending', 'context_id', 'ctx_a_other'],
          ['identity_operation_receipts', 'scope_receipt', 'operation_id', 'op_b'],
          ['identity_operation_receipts', 'scope_receipt', 'context_id', 'ctx_a_other'],
          ['identity_operation_receipts', 'scope_receipt', 'browser_digest', fp('wrong_browser')],
          ['identity_social_exchanges', 'scope_social', 'operation_id', 'op_a_other'],
          ['identity_social_exchanges', 'scope_social', 'account_id', 'scope_b'],
          ['identity_social_exchanges', 'scope_social', 'security_version', 2],
          ['identity_social_exchanges', 'scope_social', 'context_id', 'ctx_a_other'],
          ['identity_contexts', 'ctx_a', 'account_id', 'scope_b'],
          ['identity_contexts', 'ctx_a', 'security_version', 2],
          ['identity_contexts', 'ctx_a', 'purpose', 'login'],
          ['identity_contexts', 'ctx_a', 'browser_digest', fp('wrong_browser')],
          ['identity_operations', 'op_a', 'binding_context_id', 'ctx_a_other'],
          ['identity_operations', 'op_a', 'fingerprint', fp('changed_payload')],
          ['identity_operations', 'op_a', 'key_version', 2],
          ['identity_operations', 'op_a', 'security_version', 2],
          ['identity_operations', 'op_a', 'scope_id', 'scope_b'],
          ['identity_operations', 'op_a', 'result_account_id', 'scope_b'],
        ];
        for (const [table, id, field, value] of edits) {
          await assert.rejects(database.query(`UPDATE ${s}.${table} SET ${field}=$2 WHERE id=$1`, [id, value]), { sqlState: '23514' }, `${table}.${field}`);
        }
        // Repository metadata agrees with the same constraints, including replay.
        const input = { ...operation('scope_a', 'bound_operation_key'), bindingContextId: 'ctx_a' };
        await repo.runOperation(input, () => ({ nextAction: 'sign_in', accountId: 'scope_a' }));
        await assert.rejects(repo.runOperation({ ...input, bindingContextId: 'ctx_a_other' }, () => ({ nextAction: 'sign_in' })), { code: 'IDENTITY_IDEMPOTENCY_CONFLICT' });
        await assert.rejects(repo.runOperation({ ...input, bindingContextId: 'ctx_b' }, () => ({ nextAction: 'sign_in' })), { code: 'IDENTITY_CONTEXT_UNAVAILABLE' });
        await assert.rejects(repo.runOperation({ ...input, key: 'foreign_result_key' }, async r => {
          await r.createAccount(account('foreign_result_rollback'));
          return { nextAction: 'sign_in', accountId: 'scope_b' };
        }), { code: 'IDENTITY_OPERATION_RESULT_INVALID' });
        assert.equal(await repo.findAccount('foreign_result_rollback'), null);
        // Revocation updates historical children without comparing them to the
        // advanced account version; the restricted read-only receipt survives.
        await repo.transaction(r => r.advanceSecurityVersion({ accountId: 'scope_a', expectedSecurityVersion: 1 }));
        for (const [table, id, status] of [['identity_challenges','scope_challenge','revoked'], ['identity_pending_bindings','scope_pending','revoked'], ['identity_social_exchanges','scope_social','interrupted']]) {
          assert.equal((await database.query(`SELECT status FROM ${s}.${table} WHERE id=$1`, [id])).rows[0].status, status);
        }
        assert.equal((await database.query(`SELECT revoked_at FROM ${s}.identity_operation_receipts WHERE id='scope_receipt'`)).rows[0].revoked_at, null);
        assert.deepEqual((await database.query(`SELECT protected_verifier,nonce_digest FROM ${s}.identity_social_exchanges WHERE id='scope_social'`)).rows[0], { protected_verifier: null, nonce_digest: null });
        await database.query(`UPDATE ${s}.identity_operations SET status='succeeded',next_action='sign_in',result_account_id='scope_a' WHERE id='op_a'`);
      });
      await t.test('lookup and expiry indexes exist; operation expiry and transaction lifetime fail closed', async () => {
        const indexes = (await database.query('SELECT indexname FROM pg_indexes WHERE schemaname=$1', [schema])).rows.map(r => r.indexname);
        for (const name of ['identity_email_owner_idx','identity_session_owner_idx','identity_context_expiry_idx','identity_operation_expiry_idx','identity_outbox_delivery_idx']) assert.ok(indexes.includes(name), name);
        const input = { ...operation('constraints', 'expired_operation_key'), expiresAt: new Date(Date.now() + 100000) };
        await repo.runOperation(input, () => ({ nextAction: 'sign_in' }));
        await database.query(`UPDATE ${s}.identity_operations SET created_at=now()-interval '2 hours', expires_at=now()-interval '1 hour' WHERE idempotency_key=$1`, [input.key]);
        await assert.rejects(repo.runOperation(input, () => { throw new Error('must not execute'); }), { code: 'IDENTITY_OPERATION_EXPIRED' });
        let handle;
        await repo.transaction(r => { handle = r; });
        await assert.rejects(handle.createAccount(account(randomUUID())), { code: 'DATABASE_TRANSACTION_CLOSED' });
      });
    });
  } finally { restore(); }
});
