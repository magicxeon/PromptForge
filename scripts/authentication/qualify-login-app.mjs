import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDisposableDatabaseConfig } from '../../server/config/database.js';

// The full application imports JSON owners. Confine every mutable owner to a
// fresh temporary tree BEFORE importing them, and enforce this in a child.
readDisposableDatabaseConfig(process.env);
const project = fileURLToPath(new URL('../../', import.meta.url));
const parent = await fs.realpath(os.tmpdir());
const owned = await fs.mkdtemp(path.join(parent, 'mpf-login-app-'));
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  /^(path|systemroot|windir|temp|tmp)$/i.test(key)));
Object.assign(env, { NODE_ENV: 'development', MPF_AUTH_FIXTURE_NETWORK: 'postgres-http',
  MPF_TEST_DATABASE_DISPOSABLE: 'true', MPF_TEST_DATABASE_URL: process.env.MPF_TEST_DATABASE_URL,
  MPF_LOGIN_APP_FIXTURE_ROOT: owned });
let exitCode = 1;
try {
  const child = spawn(process.execPath, ['--permission', '--allow-fs-read=*',
    `--allow-fs-write=${owned}`, '--allow-addons', '--experimental-test-isolation=none',
    '--import', './scripts/authentication/network-preload.mjs', '--test',
    './scripts/authentication/qualify-login-integration.mjs'],
  { cwd: project, env, stdio: 'inherit', windowsHide: true });
  const deadline = setTimeout(() => child.kill(), 90000);
  try {
    exitCode = await new Promise((resolve, reject) => {
      child.once('error', reject); child.once('exit', code => resolve(code ?? 1));
    });
  } finally { clearTimeout(deadline); }
} finally {
  const actual = await fs.realpath(owned);
  if (actual !== owned || path.dirname(actual) !== parent
    || !path.basename(actual).startsWith('mpf-login-app-')
    || (await fs.lstat(owned)).isSymbolicLink()) throw new Error('Owned fixture cleanup containment failed.');
  await fs.rm(actual, { recursive: true });
}
process.exitCode = exitCode;
