import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

function duplicateKeys(source) {
  const duplicates = [];
  const visit = node => {
    if (ts.isObjectLiteralExpression(node)) {
      const seen = new Set();
      for (const property of node.properties) {
        const key = property.name?.text;
        if (seen.has(key)) duplicates.push(key);
        seen.add(key);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(ts.parseJsonText('catalog.json', source));
  return duplicates;
}

test('Cinematic reference catalogs introduce no duplicate raw keys beyond documented HEAD debt, with EN/TH parity', t => {
  const baselineDuplicates = ['cinematic.enhance.generateStory', 'cinematic.enhance.applyStory',
    'cinematic.enhance.rolesPreserved', 'cinematic.roles.source', 'cinematic.roles.empty',
    'cinematic.roles.operationTitle', 'cinematic.roles.operationDescription', 'cinematic.roles.generate',
    'cinematic.roles.apply', 'cinematic.roles.applyNote', 'cinematic.save.idle',
    'cinematic.save.saved', 'cinematic.save.failed'];
  assert.deepEqual(duplicateKeys('{"key":1,"key":2,"nested":{"a":1,"a":2}}'), ['key', 'a']);
  const catalogs = ['en', 'th'].map(locale => {
    const text = fs.readFileSync(new URL(`../client/i18n/locales/${locale}/cinematic.json`, import.meta.url), 'utf8');
    const known = [...baselineDuplicates, ...(locale === 'th' ? ['cinematic.produce.modelAuthorizationTitle',
      'cinematic.produce.modelAuthorizationDescription', 'cinematic.produce.sourceCheckModel'] : [])];
    const duplicates = duplicateKeys(text);
    assert.deepEqual(duplicates.filter(key => !known.includes(key)), [], `${locale}: new duplicate JSON keys`);
    t.diagnostic(`${locale}: ${duplicates.length} pre-existing HEAD duplicate keys remain outside reference ownership`);
    return JSON.parse(text);
  });
  assert.deepEqual(Object.keys(catalogs[0]).sort(), Object.keys(catalogs[1]).sort());
  for (const key of Object.keys(catalogs[0])) {
    const variables = value => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
    assert.deepEqual(variables(catalogs[0][key]), variables(catalogs[1][key]), key);
  }
});
