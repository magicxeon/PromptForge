import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { access, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
const pythonExecutable = existsSync('D:/applications/momelo-post-processing/venv/Scripts/python.exe')
  ? 'D:/applications/momelo-post-processing/venv/Scripts/python.exe'
  : 'python';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptsDirectory, '..');
const runtimeLockPath = path.join(
  os.tmpdir(),
  `model-prompt-forge-dev-${createHash('sha1').update(rootDirectory).digest('hex').slice(0, 12)}.json`
);
const children = new Set();
let stopping = false;

const nodemonEntry = path.join(
  rootDirectory,
  'node_modules',
  'nodemon',
  'bin',
  'nodemon.js'
);
const viteEntry = path.join(
  rootDirectory,
  'node_modules',
  'vite',
  'bin',
  'vite.js'
);
const postProcessingEntry = path.join(
  rootDirectory, 'post-processing-service', 'scripts', 'start_service.py'
);

await stopPreviousDevSession();

if (process.argv.includes('--stop-existing')) {
  if (await isApiReady()) {
    console.log('Stopping an untracked ModelPromptForge API on port 6500...');
    if (!restartExistingApi()) {
      throw new Error(
        'The existing ModelPromptForge API could not be stopped. Close its terminal and run this script again.'
      );
    }
    await waitForApiStop();
  }
  process.exit(0);
}

await Promise.all([assertFile(nodemonEntry), assertFile(viteEntry), assertFile(postProcessingEntry)]);
await writeRuntimeLock();

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
process.on('exit', () => {
  terminateChildren();
  releaseRuntimeLock();
});

if (await isApiReady()) {
  console.log('Restarting the existing ModelPromptForge API on port 6500...');
  if (!restartExistingApi()) {
    throw new Error(
      'The existing ModelPromptForge API could not be stopped. Close its terminal and run this script again.'
    );
  }
  await waitForApiStop();
}

const postPort = 6501;
const postEnv = {
  ...process.env,
  POST_PROCESSING_HOST: '127.0.0.1',
  POST_PROCESSING_PORT: String(postPort),
  POST_PROCESSING_PILOT_ENABLED: 'true',
  POST_PROCESSING_URL: 'http://127.0.0.1:' + postPort,
  POST_PROCESSING_INTERNAL_TOKEN: process.env.POST_PROCESSING_INTERNAL_TOKEN || 'dev-internal-token-change-in-production-32bytes'
};
console.log('Starting Post-Processing API (Python FastAPI) on ' + postEnv.POST_PROCESSING_URL + '...');
const postProcess = spawn(pythonExecutable, [postProcessingEntry], {
  cwd: path.join(rootDirectory, 'post-processing-service'),
  env: postEnv,
  stdio: 'inherit',
  windowsHide: true
});
children.add(postProcess);
postProcess.once('exit', () => children.delete(postProcess));

if (!await waitForService(postProcess, postPort)) {
  console.error('Post-Processing API did not become ready.');
  stop(1);
}

console.log('Starting ModelPromptForge API on http://localhost:6500...');
const apiProcess = startNode(nodemonEntry, ['server/server.js'], rootDirectory, postEnv);
const ready = await waitForApi(apiProcess);
if (!ready) {
  console.error('API server did not become ready on port 6500.');
  stop(1);
}

console.log('Starting React development server on http://localhost:5173...');
const webProcess = startNode(viteEntry, [], path.join(rootDirectory, 'web'));

const exitCode = await waitForFirstExit(
  [postProcess, apiProcess, webProcess].filter(Boolean)
);
stop(exitCode);

function startNode(entry, args, cwd, env = process.env) {
  const child = spawn(process.execPath, [entry, ...args], {
    cwd,
    env,
    stdio: 'inherit',
    windowsHide: true
  });
  children.add(child);
  child.once('exit', () => children.delete(child));
  return child;
}

async function waitForService(child, port) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) return false;
    try {
      const response = await fetch('http://127.0.0.1:' + port + '/health', {
        signal: AbortSignal.timeout(1000)
      });
      if (response.ok) return true;
    } catch { /* Wait for startup. */ }
    await delay(400);
  }
  return false;
}

async function availablePort(preferred) {
  const probe = port => new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const chosen = server.address().port;
      server.close(() => resolve(chosen));
    });
  });
  try { return await probe(preferred); } catch { return probe(0); }
}

async function waitForApi(apiChild) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (apiChild.exitCode !== null) return false;
    if (await isApiReady()) return true;
    await delay(500);
  }
  return false;
}

async function isApiReady() {
  try {
    const response = await fetch(
      'http://localhost:6500/api/community/features',
      { signal: AbortSignal.timeout(1_000) }
    );
    return response.status >= 200 && response.status < 500;
  } catch {
    return false;
  }
}

function restartExistingApi() {
  if (process.platform !== 'win32') return false;
  const result = spawnSync('netstat', ['-ano', '-p', 'tcp'], {
    encoding: 'utf8',
    windowsHide: true
  });
  if (result.status !== 0) return false;
  const pids = new Set(
    String(result.stdout || '')
      .split(/\r?\n/)
      .map(line => line.trim().match(/^TCP\s+\S+:6500\s+\S+\s+LISTENING\s+(\d+)$/i)?.[1])
      .filter(Boolean)
  );
  if (pids.size === 0) return false;
  for (const pid of pids) {
    const stopped = spawnSync('taskkill', ['/PID', pid, '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true
    });
    if (stopped.status !== 0) return false;
  }
  return true;
}

async function waitForApiStop() {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (!await isApiReady()) return;
    await delay(200);
  }
  throw new Error('The previous ModelPromptForge API did not stop within 10 seconds.');
}

function waitForFirstExit(processes) {
  return Promise.race(processes.map(child => new Promise(resolve => {
    child.once('exit', code => resolve(Number.isInteger(code) ? code : 0));
  })));
}

function stop(code) {
  if (stopping) return;
  stopping = true;
  console.log('\nStopping ModelPromptForge development services...');
  terminateChildren();
  process.exitCode = code;
  setTimeout(() => process.exit(code), 100).unref();
}

function terminateChildren() {
  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue;
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true
      });
    } else {
      child.kill('SIGTERM');
    }
  }
  children.clear();
}

async function stopPreviousDevSession() {
  if (!existsSync(runtimeLockPath)) return;
  let previousPid = null;
  try {
    previousPid = Number(JSON.parse(readFileSync(runtimeLockPath, 'utf8')).pid);
  } catch {
    rmSync(runtimeLockPath, { force: true });
    return;
  }
  if (!Number.isInteger(previousPid) || previousPid <= 0 || previousPid === process.pid) {
    rmSync(runtimeLockPath, { force: true });
    return;
  }
  if (process.platform !== 'win32') {
    throw new Error('Automatic development-session restart currently requires Windows.');
  }
  console.log(`Stopping previous development launcher PID ${previousPid}...`);
  const stopped = spawnSync('taskkill', ['/PID', String(previousPid), '/T', '/F'], {
    stdio: 'ignore',
    windowsHide: true
  });
  if (stopped.status !== 0 && isProcessRunning(previousPid)) {
    throw new Error(
      `Previous development launcher PID ${previousPid} could not be stopped.`
    );
  }
  rmSync(runtimeLockPath, { force: true });
}

async function writeRuntimeLock() {
  await writeFile(runtimeLockPath, JSON.stringify({
    pid: process.pid,
    rootDirectory,
    startedAt: new Date().toISOString()
  }), 'utf8');
}

function releaseRuntimeLock() {
  if (!existsSync(runtimeLockPath)) return;
  try {
    const lock = JSON.parse(readFileSync(runtimeLockPath, 'utf8'));
    if (Number(lock.pid) === process.pid) rmSync(runtimeLockPath, { force: true });
  } catch {
    rmSync(runtimeLockPath, { force: true });
  }
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function assertFile(filePath) {
  try {
    await access(filePath);
  } catch {
    throw new Error(
      `Development dependency is unavailable: ${filePath}. Run npm install first.`
    );
  }
}

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}
