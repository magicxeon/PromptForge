import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

test('processing icons have one shared owner and preserve reduced-motion policy', async () => {
  async function inspect(dir) {
    for (const item of await readdir(dir, { withFileTypes: true })) {
      const file = `${dir}/${item.name}`;
      if (item.isDirectory()) await inspect(file);
      else if (file.endsWith('.tsx') && !file.endsWith('.test.tsx') && !file.endsWith('/ProcessingSpinner.tsx')) {
        const source = await readFile(file, 'utf8');
        assert.equal(/\bLoader(?:Circle|2)\b/.test(source), false, file);
      }
    }
  }
  await inspect('web/src');
  const source = await readFile('web/src/components/ui/ProcessingSpinner.tsx', 'utf8');
  assert.ok(source.includes('var(--theme-warning)'));
  assert.ok(source.includes('motion-reduce:animate-none'));
});
