import { createPostgresDatabase } from '../../server/repositories/postgres/database.js';
import { runMigrations } from '../../server/repositories/postgres/migrations.js';
import { migrations } from './registry.mjs';

const args = process.argv.slice(2);
let database;
try {
  if (args.length !== 4 || args[0] !== '--mode' || !['status', 'apply'].includes(args[1])
    || args[2] !== '--target-env' || args[3] !== 'DATABASE_URL') {
    throw Object.assign(new Error(), { code: 'Usage: --mode status|apply --target-env DATABASE_URL' });
  }
  database = createPostgresDatabase();
  console.log(JSON.stringify(await runMigrations(database, migrations, { mode: args[1] })));
} catch (error) {
  console.error(error.code === 'DATABASE_CONFIG_INVALID' || error.code?.startsWith('DATABASE_')
    || error.code?.startsWith('Usage:') ? error.code : 'DATABASE_OPERATION_FAILED');
  process.exitCode = 1;
} finally {
  if (database) await database.close().catch(() => { console.error('DATABASE_CLOSE_FAILED'); process.exitCode = 1; });
}
