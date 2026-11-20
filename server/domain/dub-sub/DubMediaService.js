import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createWriteStream, promises as fs } from "node:fs";
import path from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { VideoMediaProbeService } from "../assets/VideoMediaProbeService.js";
import { dubError } from "../../repositories/dub-sub/DubProjectRepository.js";

const exec = promisify(execFile);
const safeFormats = [
  "-protocol_whitelist",
  "file,pipe",
  "-format_whitelist",
  "mov,matroska,webm",
];
export async function mediaCommand(args, options = {}) {
  try {
    return await exec(
      process.env.FFMPEG_PATH || "ffmpeg",
      ["-nostdin", "-hide_banner", "-v", "error", ...args],
      {
        timeout: 600_000,
        windowsHide: true,
        maxBuffer: 4 * 1024 * 1024,
        ...options,
      },
    );
  } catch (error) {
    throw dubError(
      error.code === "ENOENT"
        ? "dub_ffmpeg_unavailable"
        : "dub_media_processing_failed",
      503,
    );
  }
}
export const videoInput = (filename) => [...safeFormats, "-i", filename];

export async function boundedCopy(stream, dest, maxBytes, verify) {
  let size = 0;
  const guard = new Transform({
    transform(chunk, encoding, next) {
      size += chunk.length;
      next(size > maxBytes ? dubError("dub_file_too_large", 413) : null, chunk);
    },
  });
  await pipeline(stream, guard, createWriteStream(dest, { flags: "wx" }));
  await verify?.();
}

export async function prepareMedia(stream, dir, verify) {
  await fs.mkdir(dir, { recursive: true });
  const source = path.join(dir, "media");
  await boundedCopy(stream, source, 512 * 1024 * 1024, verify);
  const fd = await fs.open(source, "r");
  const header = Buffer.alloc(12);
  try {
    await fd.read(header, 0, 12, 0);
  } finally {
    await fd.close();
  }
  const mp4 = header.toString("ascii", 4, 8) === "ftyp";
  const webm = header.readUInt32BE(0) === 0x1a45dfa3;
  if (!mp4 && !webm) throw dubError("dub_unsupported_video", 415);
  let videoStream;
  const probe = new VideoMediaProbeService({
    runProcess: async (command, args, options) => {
      const result = await exec(command, [...safeFormats, ...args], options);
      videoStream = JSON.parse(result.stdout).streams.find(
        (stream) => stream.codec_type === "video",
      );
      return result;
    },
  });
  const info = await probe.probe({ videoPath: source });
  if (info.durationSeconds > 4 * 3600 || info.width * info.height > 8192 * 8192)
    throw dubError("dub_video_limit", 413);
  await mediaCommand([
    ...videoInput(source),
    "-frames:v",
    "1",
    "-vf",
    "scale=320:320:force_original_aspect_ratio=decrease",
    path.join(dir, "poster.jpg"),
  ]);
  const durationMs = Math.round(info.durationSeconds * 1000);
  let peaks = [];
  if (info.hasAudio) {
    const bucket = Math.max(1, Math.ceil((info.durationSeconds * 8000) / 1600));
    const filter =
      "aresample=8000,aformat=channel_layouts=mono,asetnsamples=n=" +
      bucket +
      ",astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.Peak_level:file=-";
    const { stdout } = await mediaCommand([
      ...videoInput(source),
      "-vn",
      "-af",
      filter,
      "-f",
      "null",
      "-",
    ]);
    peaks = [
      ...stdout.matchAll(/lavfi\.astats\.Overall\.Peak_level=(-?[\d.]+|-inf)/g),
    ].map(([, db]) =>
      db === "-inf" ? 0 : Math.min(1, 10 ** (Number(db) / 20)),
    );
  }
  await fs.writeFile(
    path.join(dir, "peaks.json"),
    JSON.stringify({ durationMs, peaks }),
  );
  const rotation = Number(
    videoStream?.side_data_list?.find((data) => data.rotation !== undefined)
      ?.rotation ||
      videoStream?.tags?.rotate ||
      0,
  );
  const rotated = Math.abs(rotation) % 180 === 90;
  return {
    durationMs,
    width: rotated ? info.height : info.width,
    height: rotated ? info.width : info.height,
    fps: info.fps,
    hasAudio: info.hasAudio,
    audioCodec: info.audioCodec,
    mediaType: mp4 ? "video/mp4" : "video/webm",
    videoCodec: info.videoCodec,
    pixelFormat: info.pixelFormat,
    colorTransfer: videoStream?.color_transfer || null,
  };
}
