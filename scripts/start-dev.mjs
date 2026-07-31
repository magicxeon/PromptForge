import { spawn, spawnSync } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptsDirectory, '..');
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

await Promise.all([assertFile(nodemonEntry), assertFile(viteEntry)]);

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
process.on('exit', terminateChildren);

let apiProcess = null;
if (await isApiReady()) {
  console.log('ModelPromptForge API is already available on http://localhost:6500.');
  console.log('The existing API process will be reused and left running on exit.');
} else {
  console.log('Starting ModelPromptForge API on http://localhost:6500...');
  apiProcess = startNode(nodemonEntry, ['server/server.js'], rootDirectory);
  const ready = await waitForApi(apiProcess);
  if (!ready) {
    console.error('API server did not become ready on port 6500.');
    stop(1);
  }
}

console.log('Starting React development server on http://localhost:5173...');
const webProcess = startNode(viteEntry, [], path.join(rootDirectory, 'web'));

const exitCode = await waitForFirstExit(
  [apiProcess, webProcess].filter(Boolean)
);
stop(exitCode);

function startNode(entry, args, cwd) {
  const child = spawn(process.execPath, [entry, ...args], {
    cwd,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true
  });
  children.add(child);
  child.once('exit', () => children.delete(child));
  return child;
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
