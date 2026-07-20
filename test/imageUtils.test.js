import assert from 'node:assert/strict';
import test from 'node:test';
import { mimeTypeFromFilename, resolveImageOutputType } from '../server/domain/generation/imageUtils.js';

test('resolves provider output MIME type and file extension', () => {
  assert.deepEqual(resolveImageOutputType({ mimeType: 'image/jpeg' }), {
    mimeType: 'image/jpeg',
    extension: 'jpg'
  });
  assert.deepEqual(resolveImageOutputType({ outputFormat: 'webp' }), {
    mimeType: 'image/webp',
    extension: 'webp'
  });
  assert.deepEqual(resolveImageOutputType({}), {
    mimeType: 'image/png',
    extension: 'png'
  });
});

test('infers reference MIME type from persisted output filename', () => {
  assert.equal(mimeTypeFromFilename('job_1.jpg'), 'image/jpeg');
  assert.equal(mimeTypeFromFilename('job_2.png'), 'image/png');
});
