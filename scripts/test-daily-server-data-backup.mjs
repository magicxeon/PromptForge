import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const result = spawnSync('powershell.exe', [
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  'scripts\\test-backup-server-data.ps1',
], { cwd: root, stdio: 'inherit' });

if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
