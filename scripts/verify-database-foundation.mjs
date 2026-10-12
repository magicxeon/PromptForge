import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const groups = { contracts: 'test/databaseFoundation.test.js', postgres: 'scripts/database/qualify-postgres.mjs' };
const args = process.argv.slice(2);
const selected = args.length === 1 && args[0] === '--all' ? Object.keys(groups)
  : args.length === 2 && args[0] === '--group' && Object.hasOwn(groups, args[1]) ? [args[1]] : null;
if (!selected) {
  console.error('Usage: --group contracts|postgres OR --all');
  process.exitCode = 2;
} else {
  for (const group of selected) {
    console.log(`[${group}] ${group === 'postgres' ? 'Explicit disposable PostgreSQL only; no service startup.' : 'Isolated injected-client tests; no database connection.'}`);
    const result = spawnSync(process.execPath, ['--test', groups[group]], {
      cwd: fileURLToPath(new URL('../', import.meta.url)), stdio: 'inherit', windowsHide: true,
    });
    if (result.error || result.status !== 0) { process.exitCode = 1; break; }
  }
}
