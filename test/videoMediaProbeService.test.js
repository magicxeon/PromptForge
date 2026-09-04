import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  normalizeProbePayload,
  VideoMediaProbeService
} from '../server/domain/assets/VideoMediaProbeService.js';

test('VideoMediaProbeService normalizes typed video and audio evidence without raw ffprobe payload', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'video-probe-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const videoPath = path.join(directory, 'clip.mp4');
  await fs.writeFile(videoPath, 'fixture');
  let command = null;
  const service = new VideoMediaProbeService({
    ffprobePath: 'fixture-ffprobe',
    runProcess: async (binary, args) => {
      command = { binary, args };
      return { stdout: JSON.stringify(probeFixture()) };
    }
  });

  const result = await service.probe({ videoPath });
  assert.equal(command.binary, 'fixture-ffprobe');
  assert.deepEqual(command.args.slice(0, 6), ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams']);
  assert.equal(command.args.at(-1), videoPath);
  assert.equal(result.status, 'passed');
  assert.equal(result.durationSeconds, 4.004);
  assert.equal(result.fps, 24);
  assert.equal(result.width, 720);
  assert.equal(result.height, 1280);
  assert.equal(result.videoCodec, 'h264');
  assert.equal(result.hasAudio, true);
  assert.equal(result.audioCodec, 'aac');
  assert.equal('streams' in result, false);
});

test('normalizeProbePayload rejects corrupt or zero-duration media', () => {
  assert.throws(
    () => normalizeProbePayload({ format: { duration: '4.0' }, streams: [] }, 10),
    error => error.code === 'video_probe_stream_missing'
  );
  assert.throws(
    () => normalizeProbePayload({
      format: { duration: '0' },
      streams: [{ codec_type: 'video', width: 720, height: 1280, avg_frame_rate: '24/1' }]
    }, 10),
    error => error.code === 'video_probe_metadata_invalid'
  );
});

function probeFixture() {
  return {
    format: { format_name: 'mov,mp4,m4a,3gp,3g2,mj2', duration: '4.004', size: '1200000', start_time: '0.000000' },
    streams: [
      {
        codec_type: 'video', codec_name: 'h264', profile: 'High', pix_fmt: 'yuv420p',
        width: 720, height: 1280, display_aspect_ratio: '9:16', avg_frame_rate: '24/1',
        time_base: '1/12288', start_time: '0.000000', nb_frames: '96'
      },
      { codec_type: 'audio', codec_name: 'aac', channels: 2 }
    ]
  };
}
