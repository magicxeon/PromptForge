import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ApprovedVisualAssetService } from '../server/domain/assets/ApprovedVisualAssetService.js';

test('ApprovedVisualAssetService persists bounded preview and thumbnail provenance', async t => {
  const outputsDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-attribute-visual-'));
  t.after(() => fs.rm(outputsDirectory, { recursive: true, force: true }));
  const created = [];
  const service = new ApprovedVisualAssetService({
    outputsDirectory,
    presentationService: {
      renderOutputUrl: async (imageUrl, profileId) => {
        assert.equal(imageUrl, '/outputs/source.jpg');
        return {
          buffer: Buffer.from(profileId),
          contentType: 'image/webp',
          contentLength: Buffer.byteLength(profileId),
          width: profileId.includes('thumbnail') ? 320 : 768,
          height: profileId.includes('thumbnail') ? 320 : 768
        };
      }
    },
    repository: {
      create: async (record, actor) => {
        created.push({ record, actor });
        return { id: `ast_${created.length}`, ...record };
      }
    }
  });

  const result = await service.createApprovedSet({
    sourceJobId: 'job_visual_1',
    imageUrl: '/outputs/source.jpg',
    mimeType: 'image/jpeg'
  }, { userId: 'usr_admin', username: 'admin' });

  assert.equal(created.length, 2);
  assert.equal(result.original.imageUrl, '/outputs/source.jpg');
  assert.equal(result.preview.assetId, 'ast_1');
  assert.equal(result.thumbnail.assetId, 'ast_2');
  assert.match(result.preview.contentHash, /^[a-f0-9]{64}$/);
  assert.equal((await fs.stat(path.join(outputsDirectory, created[0].record.storageKey))).isFile(), true);
  assert.equal(created.every(item => item.record.sourceJobId === 'job_visual_1'), true);
});
