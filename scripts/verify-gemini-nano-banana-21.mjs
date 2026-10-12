import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const groups = {
  adapter: { pattern: '^(adapter:|Gemini)', files: ['test/geminiNanoBanana21.test.js','test/geminiProvider.test.js'] },
  pricing: { pattern: '^(pricing:|CreditPricingPolicyService)', files: ['test/geminiNanoBanana21.test.js','test/creditPricingPolicy.test.js'] },
  catalog: { pattern: '^(catalog:|provider|project|Provider)', files: ['test/geminiNanoBanana21.test.js','test/providerRegistry.test.js'] },
};
const group = args.length === 1 && args[0] === '--all' ? 'all'
  : args.length === 2 && args[0] === '--group' && Object.hasOwn(groups, args[1]) ? args[1] : null;
if (!group) {
  console.error('Usage: --group adapter|pricing|catalog OR --all');
  process.exitCode = 2;
} else {
  const project = fileURLToPath(new URL('../', import.meta.url));
  const parent = await fs.realpath(os.tmpdir());
  const owned = await fs.mkdtemp(path.join(parent, 'mpf-nano21-'));
  const setup = pathToFileURL(path.join(project, 'scripts/authentication/setup-development.mjs')).href;
  const auth = pathToFileURL(path.join(project, 'server/config/authPolicy.js')).href;
  const preload = path.join(owned, 'fixture-preload.mjs');
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(path|systemroot|windir|temp|tmp)$/i.test(key)));
  Object.assign(env, { NODE_ENV: 'test', MPF_AUTH_FIXTURE_NETWORK: 'offline', MPF_NANO21_FIXTURE_ROOT: owned });
  try {
    // Generated fixture bootstrap redirects existing runtime owners before tests
    // import them. Credentials and application/provider environment are absent.
    await fs.writeFile(preload, `import { setupDevelopmentFixture } from ${JSON.stringify(setup)};\nimport { initializeAuthRuntime } from ${JSON.stringify(auth)};\nawait setupDevelopmentFixture(${JSON.stringify(owned)});\ninitializeAuthRuntime({ NODE_ENV: 'development', AUTH_DEV_BYPASS_ENABLED: 'true', PORT: '6500' }, ${JSON.stringify(owned)});\n`);
    const selection = group === 'all' ? { files: [...new Set(Object.values(groups).flatMap(value => value.files))] } : groups[group];
    const child = spawn(process.execPath, ['--permission', '--allow-fs-read=*', `--allow-fs-write=${owned}`,
      '--allow-addons', '--experimental-test-isolation=none', '--import', './scripts/authentication/network-preload.mjs',
      '--import', pathToFileURL(preload).href, '--test', ...(selection.pattern ? ['--test-name-pattern', selection.pattern] : []), ...selection.files],
    { cwd: project, env, stdio: 'inherit', windowsHide: true });
    const deadline = setTimeout(() => child.kill(), 60000);
    try {
      process.exitCode = await new Promise((resolve, reject) => {
        child.once('error', reject); child.once('exit', code => resolve(code ?? 1));
      });
    } finally { clearTimeout(deadline); }
  } finally {
    const actual = await fs.realpath(owned);
    if (actual !== owned || path.dirname(actual) !== parent || !path.basename(actual).startsWith('mpf-nano21-')
      || (await fs.lstat(owned)).isSymbolicLink()) throw new Error('Fixture cleanup containment failed.');
    await fs.rm(actual, { recursive: true });
  }
}
