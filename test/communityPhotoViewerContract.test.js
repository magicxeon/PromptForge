import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const viewerPath = new URL('../client/community/communityPhotoViewer.js', import.meta.url);

test('Community Photo Viewer keeps permission-aware actions inside the full page', async () => {
  const source = await readFile(viewerPath, 'utf8');

  assert.doesNotMatch(source, /openLightbox/);
  assert.doesNotMatch(source, /Create Character/i);
  assert.doesNotMatch(source, /Remix this image/i);
  assert.match(source, /post\.templateAvailability === true/);
  assert.match(source, /collection\.disabled = true/);
  assert.match(source, /requestFullscreen/);
  assert.match(source, /download = safeDownloadName/);
});
