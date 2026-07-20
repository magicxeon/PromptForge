import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dedupeResolvedReferenceImages,
  normalizeReferenceJobIds
} from '../server/domain/generation/referenceUtils.js';

test('normalizes duplicate and empty lineage job IDs', () => {
  assert.deepEqual(
    normalizeReferenceJobIds(['job_a', null, 'job_a', ' job_b ', '', 'job_c']),
    ['job_a', 'job_b']
  );
  assert.deepEqual(normalizeReferenceJobIds(null), []);
});

test('sends identical reference image bytes only once across roles and slots', () => {
  const unique = dedupeResolvedReferenceImages([
    ['characterA', 'data:image/png;base64,AAA'],
    ['characterB', 'AAA'],
    ['faceA', 'BBB'],
    ['styleA', 'AAA'],
    ['styleB', 'CCC']
  ]);

  assert.equal(unique.characterA, 'data:image/png;base64,AAA');
  assert.equal(unique.characterB, null);
  assert.equal(unique.faceA, 'BBB');
  assert.equal(unique.styleA, null);
  assert.equal(unique.styleB, 'CCC');
});

test('preserves the first role occurrence as reference priority', () => {
  const unique = dedupeResolvedReferenceImages([
    ['characterA', null],
    ['faceA', 'SAME'],
    ['styleA', 'SAME']
  ]);

  assert.equal(unique.characterA, null);
  assert.equal(unique.faceA, 'SAME');
  assert.equal(unique.styleA, null);
});
