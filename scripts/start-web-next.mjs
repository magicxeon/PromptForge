import { spawn, spawnSync } from 'node:child_process';
import { closeSync, existsSync, openSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { developmentApiEnvironment, developmentApiReady } from './authentication/development-startup.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vite = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const config = path.join(root, 'web-next', 'vite.config.ts');
const port = 6502;
const apiPort = 6500;
const apiLog = path.join(os.tmpdir(), `mpf-web-next-api-${createHash('sha256').update(root).digest('hex').slice(0, 12)}.log`);

// Probe the same IPv4 interface used by Vite; EADDRINUSE includes wildcard listeners.
function portAvailable(targetPort = port) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', error => error.code === 'EADDRINUSE' ? resolve(false) : reject(error));
    probe.listen({ port: targetPort, host: '127.0.0.1', exclusive: true }, () => probe.close(() => resolve(true)));
  });
}

async function apiReady() {
  if (!await developmentApiReady()) return false;
  try {
    const response = await fetch(`http://127.0.0.1:${apiPort}/api/auth/config`, {
      signal: AbortSignal.timeout(1000), redirect: 'error'
    });
    if (!response.ok) return false;
    const config = await response.json();
    return config?.contractVersion === 1 && ['session', 'development_bypass'].includes(config.authMode);
  } catch { return false; }
}

async function ensureBackend() {
  if (await apiReady()) {
    console.log('Reusing existing API on port 6500.');
    return;
  }
  let apiChild;
  let spawnError;
  if (await portAvailable(apiPort)) {
    const envFile = path.join(root, '.env');
    const fileEnv = existsSync(envFile) ? dotenv.parse(readFileSync(envFile)) : {};
    const env = developmentApiEnvironment(process.env, fileEnv);
    if (Number(env.PORT ?? fileEnv.PORT ?? apiPort) !== apiPort) {
      throw new Error('The Image Playground expects API port 6500. Correct PORT in the existing backend configuration.');
    }
    console.log(`Starting existing API on port 6500. Startup log: ${apiLog}`);
    const log = openSync(apiLog, 'a');
    try {
      // Keep the shared API alive when the frontend terminal closes.
      apiChild = spawn(process.execPath, [path.join(root, 'scripts', 'start-web-next-api.mjs')], {
        cwd: root, env, detached: true, windowsHide: true, stdio: ['ignore', log, log]
      });
      apiChild.once('error', error => { spawnError = error; });
    } finally { closeSync(log); }
  } else {
    console.log('Waiting for the existing service on port 6500 to become ready...');
  }
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (spawnError || apiChild && apiChild.exitCode !== null) break;
    if (await apiReady()) {
      apiChild?.unref();
      console.log('API ready: /api/health and /api/auth/config responded successfully.');
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  // Only clean up the unsuccessful process created by this invocation; never kill another API.
  if (apiChild?.pid && apiChild.exitCode === null) apiChild.kill('SIGTERM');
  throw new Error(`API on port 6500 is not ready; frontend was not started. ${apiChild ? `Inspect ${apiLog}.` : 'Inspect the existing backend terminal.'}`);
}

async function clearPreviousListener(targetPort) {
  if (await portAvailable(targetPort)) return;
  if (process.platform !== 'win32') {
    throw new Error(`Port ${targetPort} is busy. Close the existing service terminal before starting again.`);
  }
  const result = spawnSync('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', path.join(root, 'scripts', 'stop-web-next-port.ps1'), '-Port', String(targetPort)
  ], {
    windowsHide: true,
    stdio: 'inherit',
    env: { ...process.env, MPF_WEB_NEXT_NODE: process.execPath, MPF_WEB_NEXT_VITE: vite, MPF_WEB_NEXT_CONFIG: config,
      MPF_WEB_NEXT_API: path.join(root, 'scripts', 'start-web-next-api.mjs') }
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Port ${targetPort} cleanup was refused or failed. No new frontend was started.`);
  const deadline = Date.now() + 10_000;
  while (!await portAvailable(targetPort)) {
    if (Date.now() >= deadline) throw new Error(`Port ${targetPort} is still busy after stopping the previous service.`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

try {
  if (process.argv.slice(2).some(arg => !['--stop','--restart-api'].includes(arg))) {
    throw new Error('Usage: node scripts/start-web-next.mjs [--stop | --restart-api]');
  }
  if (!process.argv.includes('--stop') && (!existsSync(vite) || !existsSync(config))) {
    throw new Error('Frontend dependencies/config are missing. Run npm.cmd install from the repository root.');
  }
  if (process.argv.includes('--stop')) {
    await clearPreviousListener(port);
    console.log(`Port ${port} is clear. API port 6500 was not touched.`);
  } else {
    await clearPreviousListener(port);
    if (process.argv.includes('--restart-api')) await clearPreviousListener(apiPort);
    await ensureBackend();
    console.log(`Starting Image Playground at http://localhost:${port} (API: port 6500).`);
    // Explicit absolute markers let the next invocation identify this exact workspace's listener.
    const envFile = path.join(root, '.env');
    const proxySecret = process.env.WEB_NEXT_PROXY_SECRET ??
      (existsSync(envFile) ? dotenv.parse(readFileSync(envFile)).WEB_NEXT_PROXY_SECRET : undefined);
    const child = spawn(process.execPath, [vite, '--config', config, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
      cwd: path.join(root, 'web-next'), stdio: 'inherit', windowsHide: true,
      env: { ...process.env, ...(proxySecret ? { WEB_NEXT_PROXY_SECRET: proxySecret } : {}) }
    });
    const stop = () => { if (child.exitCode === null) child.kill('SIGTERM'); };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    process.once('exit', stop);
    child.once('error', error => { console.error(error.message); process.exitCode = 1; });
    child.once('exit', code => { process.exitCode = code ?? 0; });
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
