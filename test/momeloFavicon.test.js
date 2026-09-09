import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('favicon reuses the Vite-managed Momelo brand mark without changing bootstrap', async () => {
  const html = await readFile(new URL('../web/index.html', import.meta.url), 'utf8');
  assert.match(html, /rel="icon" type="image\/svg\+xml" href="\/src\/assets\/brand\/momelo-mark.svg"/);
  assert.match(html, /src="\/src\/main.tsx"/);
  const svg = await readFile(new URL('../web/src/assets/brand/momelo-mark.svg', import.meta.url), 'utf8');
  assert.match(svg, /<svg/);
});
