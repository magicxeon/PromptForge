import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { OUTPUTS_DIR } from '../../config/paths.js';

export async function loadVideoReferenceAssetContent(asset, { outputsDirectory = OUTPUTS_DIR } = {}) {
  const key = String(asset?.storageKey || '').replace(/\\/g, '/');
  const fail = () => Object.assign(new Error('The original video reference image is unavailable or changed.'), {
    code: 'video_reference_content_invalid', statusCode: 409
  });
  if (!key || key.split('/').includes('..') || asset?.status === 'deleted') throw fail();
  const root = await fs.realpath(outputsDirectory);
  const file = await fs.realpath(path.resolve(root, key)).catch(() => { throw fail(); });
  const relative = path.relative(root, file);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw fail();
  const handle = await fs.open(file, 'r');
  let bytes;
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size <= 0 || stat.size > 30 * 1024 * 1024) throw fail();
    bytes = await handle.readFile();
    if (bytes.length !== stat.size) throw fail();
  } finally { await handle.close(); }
  const contentHash = crypto.createHash('sha256').update(bytes).digest('hex');
  const expectedHash = asset.metadata?.contentHash || asset.contentHash;
  if (expectedHash && expectedHash !== contentHash) throw fail();
  const metadata = await sharp(bytes, { limitInputPixels: 36000000 }).metadata().catch(() => { throw fail(); });
  const mimeType = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[metadata.format];
  if (!mimeType || (metadata.pages || 1) > 1) throw fail();
  return { bytes, contentHash, sizeBytes: bytes.length, width: metadata.width, height: metadata.height, mimeType };
}

export function fingerprintLookVideoReference({ assetId, characterLookVersionId, contentHash }) {
  return crypto.createHash('sha256').update(JSON.stringify([assetId, characterLookVersionId, contentHash])).digest('hex');
}
