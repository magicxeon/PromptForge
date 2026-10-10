import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { root } from './contracts.mjs';

const parse = spawnSync(process.env.PYTHON_BIN || 'python', ['-c',
  "import pathlib,tomllib; files=list(pathlib.Path('.codex').rglob('*.toml')); configs=[tomllib.loads(p.read_text(encoding='utf-8')) for p in files]; print('PASS TOML parse:',len(configs),'files')"
], { cwd: root, windowsHide: true, encoding: 'utf8', timeout: 10000 });
if (parse.error || parse.status !== 0) {
  console.error('TOML parsing failed. This optional probe requires Python 3.11+ (PYTHON_BIN) and valid .codex TOML files.');
  process.exit(1);
}
console.log(parse.stdout.trim());

// Explicit local configuration probe: never send thread/start or turn/start.
const child = spawn(process.env.CODEX_BIN || 'codex', ['app-server', '--stdio', '--strict-config'], {
  cwd: root, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe']
});
let buffer = '';
let answered = false;
const timeout = setTimeout(() => {
  console.error('Codex configuration probe timed out. No model turn was started.');
  process.exitCode = 1;
  child.kill();
}, 15000);
const send = message => child.stdin.write(`${JSON.stringify(message)}\n`);
child.stderr.on('data', () => {}); // Do not print personal configuration/startup diagnostics.
child.stdin.on('error', () => {});
child.on('error', error => {
  console.error(`Cannot start local Codex: ${error.code || 'startup failure'}`);
  process.exitCode = 1;
  clearTimeout(timeout);
});
child.on('exit', (code, signal) => {
  clearTimeout(timeout);
  if (!answered || code !== 0 || signal) {
    console.error('Codex probe did not complete with a clean process exit.');
    process.exitCode = 1;
  }
});
child.stdout.on('data', data => {
  buffer += data;
  if (buffer.length > 2 * 1024 * 1024) { process.exitCode = 1; child.kill(); return; }
  let newline;
  while ((newline = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, newline);
    buffer = buffer.slice(newline + 1);
    let message;
    try { message = JSON.parse(line); } catch { continue; }
    if (message.error) {
      console.error(`Codex configuration request failed (${message.error.code}).`);
      process.exitCode = 1;
      child.stdin.end();
      return;
    }
    if (message.id === 1) {
      send({ method: 'initialized' });
      send({ id: 2, method: 'config/read', params: { cwd: root, includeLayers: true } });
    }
    if (message.id === 2) {
      answered = true;
      const config = message.result?.config;
      const agents = config?.agents;
      const projectLayer = message.result?.layers?.find(layer =>
        layer.name?.type === 'project' && typeof layer.name.dotCodexFolder === 'string' &&
        path.resolve(layer.name.dotCodexFolder).toLowerCase() === path.join(root, '.codex').toLowerCase());
      const projectLoaded = Boolean(projectLayer && !projectLayer.disabledReason);
      console.log(JSON.stringify({
        configRead: 'passed',
        concurrency: agents?.max_concurrent_threads_per_session ?? agents?.max_threads,
        projectLayerLoaded: projectLoaded,
        customProfileSpawn: 'not tested; open a fresh trusted session'
      }, null, 2));
      if (!projectLoaded || (agents?.max_concurrent_threads_per_session ?? agents?.max_threads) !== 2 || agents?.enabled !== true) {
        console.error('Project concurrency was not loaded. Check project trust in your Codex client.');
        process.exitCode = 1;
      }
      child.stdin.end();
    }
  }
});
send({ id: 1, method: 'initialize', params: {
  clientInfo: { name: 'momelo-agent-config-check', version: '1.0' },
  capabilities: { experimentalApi: true }
} });
