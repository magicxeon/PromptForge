import { spawnSync } from 'node:child_process';

const group = process.argv.find(value => value.startsWith('--group='))?.slice(8) || 'all';
const allowed = new Set(['config', 'api', 'mask', 'cinematic', 'security', 'all']);
if (!allowed.has(group)) {
  console.error('Choose --group=config, api, mask, cinematic, security or all.');
  process.exit(2);
}
const args = ['--test'];
if (group !== 'all') args.push('--test-name-pattern', '\\[' + group + '\\]');
args.push('test/postProcessingService.test.js');
const result = spawnSync(process.execPath, args, {
  stdio: 'inherit',
  windowsHide: true
});
process.exit(result.status ?? 1);
