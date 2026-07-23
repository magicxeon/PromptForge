import assert from 'node:assert/strict';
import test from 'node:test';
import { validateI18nCatalogs } from '../scripts/validate-i18n-catalogs.js';

test('i18n Catalog Parity Validation', async t => {
  const result = await validateI18nCatalogs();
  if (result.errors.length > 0) {
    console.error('i18n catalog validation errors:');
    result.errors.forEach(err => console.error(`  - ${err}`));
  }
  assert.equal(result.valid, true, 'All i18n translation catalogs must pass parity validation');
});
