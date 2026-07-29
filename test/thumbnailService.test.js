import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import {
  PREVIEW_PROFILE,
  ThumbnailService
} from '../server/domain/generation/thumbnailService.js';

test('thumbnail service creates metadata and cleans up the derived image', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'thumbnail-service-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const outputsDir = path.join(directory, 'outputs');
  const thumbnailDir = path.join(outputsDir, 'thumbnails');
  await fs.mkdir(outputsDir, { recursive: true });
  await sharp({ create: { width: 1600, height: 1200, channels: 3, background: '#2a8f9d' } })
    .png()
    .toFile(path.join(outputsDir, 'job_test.png'));
  const service = new ThumbnailService({ outputsDir, thumbnailDir });
  const item = { id: 'job_test', imageUrl: '/outputs/job_test.png' };
  const metadata = await service.createForHistoryItem(item);
  assert.equal(metadata.thumbnailProfile, PREVIEW_PROFILE);
  assert.equal(metadata.thumbnailUrl, '/outputs/thumbnails/job_test.webp');
  assert.equal(metadata.thumbnailWidth, 1280);
  assert.equal(metadata.thumbnailHeight, 960);
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 1200);
  assert.ok(metadata.thumbnailBytes > 0);
  await service.removeForHistoryItem({ ...item, ...metadata });
  await assert.rejects(fs.access(path.join(thumbnailDir, 'job_test.webp')));
});
