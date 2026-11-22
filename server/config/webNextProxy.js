import { randomBytes, createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, lstatSync } from 'node:fs';
import { tmpdir, userInfo } from 'node:os';
import path from 'node:path';

const submissions = new Set(['/api/generate', '/api/comparisons', '/api/generation/video/tasks', '/api/voice-studio/custom-voices']);
const estimates = new Set(['/api/credits/estimate', '/api/comparisons/estimate', '/api/generation/video/quote', '/api/voice-studio/custom-voices/quotes']);
export function webNextCreditRoute(method, pathname) {
  if (method === 'GET' && pathname === '/api/web-next/config') return 'config';
  if (method === 'GET' && pathname === '/api/generation/video/capabilities') return 'catalog';
  if (method !== 'POST') return null;
  if (/^\/api\/cinematic\/projects\/[\w-]+\/(?:writing\/quotes|chapter-outline\/proposals|full-story\/chapters|chapter-proposals|scene-proposals|scenes\/[\w-]+\/shot-proposals)$/.test(pathname)) return 'submit';
  if (/^\/api\/dub-sub\/projects\/[\w-]+\/dubbing-batches(?:\/[\w-]+\/advance)?$/.test(pathname)) return 'submit';
  if (submissions.has(pathname) || /^\/api\/voice-studio\/documents\/[\w-]+\/rows\/[\w-]+\/generations$/.test(pathname)) return 'submit';
  if (estimates.has(pathname) || /^\/api\/voice-studio\/documents\/[\w-]+\/rows\/[\w-]+\/quotes$/.test(pathname)) return 'estimate';
  return null;
}

// Server-to-server credential for this checkout's loopback preview. Never imported by browser code.
export function webNextProxyKey(checkout, env = process.env) {
  if (env.WEB_NEXT_PROXY_SECRET) {
    if (env.WEB_NEXT_PROXY_SECRET.length < 32) throw new Error('Invalid web-next proxy configuration.');
    return env.WEB_NEXT_PROXY_SECRET;
  }
  if (env.NODE_ENV === 'production') return null;
  const scope = createHash('sha256').update(path.resolve(checkout) + '\0' + userInfo().username).digest('hex').slice(0, 24);
  const dir = path.join(tmpdir(), 'mpf-web-next-' + scope);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const stat = lstatSync(dir);
  if (!stat.isDirectory() || (typeof process.getuid === 'function' &&
    (stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0))) throw new Error('Unsafe web-next proxy directory.');
  const file = path.join(dir, 'proxy.key');
  try { writeFileSync(file, randomBytes(32).toString('hex'), {flag:'wx', mode:0o600}); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  const key = readFileSync(file, 'utf8');
  if (!/^[0-9a-f]{64}$/.test(key)) throw new Error('Invalid web-next proxy configuration.');
  return key;
}
