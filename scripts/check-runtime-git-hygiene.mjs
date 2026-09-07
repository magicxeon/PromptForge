import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const cwd = fileURLToPath(new URL('../', import.meta.url));
const git = (...args) => execFileSync('git', ['-c', `safe.directory=${cwd.replaceAll('\\', '/').replace(/\/$/, '')}`, ...args], { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const runtime = git('ls-files', '-z', '--', 'server/data').split('\0')
  .filter(file => file && file !== 'server/data/README.md');
const staged = git('diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z').split('\0').filter(Boolean);
const signed = [];
for (const file of staged) {
  if (!/\.(?:json|[cm]?js|tsx?|md|txt|ya?ml|env)$/i.test(file)) continue;
  const text = git('show', `:${file}`);
  if (/[?&](?:X-Tos-(?:Credential|Signature)|X-Amz-(?:Credential|Signature)|X-Goog-(?:Credential|Signature))=[^\s"'<>]{8,}/i.test(text)) signed.push(file);
}
if (runtime.length || signed.length) {
  console.error('Runtime/credential-bearing paths must not be committed (contents withheld):');
  for (const file of new Set([...runtime, ...signed])) console.error(file);
  process.exit(1);
}
console.log('No tracked runtime stores or staged signed-URL credentials found. Historical commits are not scanned.');
