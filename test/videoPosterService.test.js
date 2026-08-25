import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { VideoPosterService } from '../server/domain/assets/VideoPosterService.js';

test('VideoPosterService extracts a representative frame and writes a bounded WebP', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'video-poster-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }));
  const videoPath = path.join(directory, 'source.mp4');
  const posterPath = path.join(directory, 'poster.webp');
  await fs.writeFile(videoPath, Buffer.from('video-fixture'));
  let request = null;
  const service = new VideoPosterService({
    ffmpegPath: 'fixture-ffmpeg',
    width: 320,
    runProcess: async (command, args) => {
      request = { command, args };
      await sharp({ create: { width: 640, height: 360, channels: 3, background: '#2f6f8f' } })
        .png()
        .toFile(args.at(-1));
    }
  });

  const result = await service.generatePoster({ videoPath, posterPath, durationSeconds: 10 });
  const metadata = await sharp(await fs.readFile(posterPath)).metadata();
  assert.equal(request.command, 'fixture-ffmpeg');
  assert.equal(request.args[request.args.indexOf('-ss') + 1], '1.500');
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 320);
  assert.equal(result.mimeType, 'image/webp');
  assert.ok(result.sizeBytes > 0);
});

test('VideoPosterService reports an unavailable FFmpeg executable with a stable code', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'video-poster-missing-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }));
  const videoPath = path.join(directory, 'source.mp4');
  await fs.writeFile(videoPath, Buffer.from('video-fixture'));
  const service = new VideoPosterService({
    runProcess: async () => { throw Object.assign(new Error('missing'), { code: 'ENOENT' }); }
  });
  await assert.rejects(
    service.generatePoster({ videoPath, posterPath: path.join(directory, 'poster.webp') }),
    error => error.code === 'video_poster_ffmpeg_unavailable'
  );
});
