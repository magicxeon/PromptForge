import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const catalogs = [
  'client/i18n/locales/en/admin.json',
  'client/i18n/locales/th/admin.json'
];

test('Admin catalogs use the configured single-brace interpolation contract', async () => {
  for (const file of catalogs) {
    const source = await readFile(file, 'utf8');
    assert.equal(source.includes('{{'), false, `${file} contains unsupported double-brace interpolation`);
    const catalog = JSON.parse(source);
    assert.match(catalog['admin.pagination.total'], /\{count\}/);
    assert.match(catalog['admin.overview.activeAttention'], /\{active\}/);
    assert.match(catalog['admin.overview.activeAttention'], /\{attention\}/);
  }
});
