import archiver from 'archiver';
import { promises as fs, createReadStream } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { OUTPUTS_DIR } from '../../config/paths.js';
import { assetRepo } from '../../repositories/assets/AssetRepository.js';

export class VideoClipBundleService {
  constructor({ assetRepository = assetRepo, outputsDirectory = OUTPUTS_DIR, maxBytes = 128 * 1024 * 1024 } = {}) {
    Object.assign(this, { assetRepository, outputsDirectory, maxBytes });
  }

  async prepare(items, actor) {
    if (!actor?.userId || items.length > 128) throw unavailable();
    const root = await fs.realpath(this.outputsDirectory).catch(() => { throw unavailable(); });
    const files = [];
    let sizeBytes = 0;
    for (const item of items) {
      const asset = await this.assetRepository.findByIdForOwner(item.assetId, actor.userId);
      if (!asset || asset.status !== 'active' || asset.assetType !== 'cinematic_video_output'
        || !['video/mp4', 'video/webm'].includes(asset.mimeType) || !asset.metadata?.contentHash
        || asset.metadata?.technicalProbe?.status !== 'passed') throw unavailable();
      const filePath = await fs.realpath(path.resolve(root, asset.storageKey)).catch(() => null);
      const relative = filePath && path.relative(root, filePath);
      if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw unavailable();
      const stat = await fs.stat(filePath).catch(() => { throw unavailable(); });
      if (!stat.isFile() || stat.size < 1 || stat.size !== asset.sizeBytes) throw unavailable();
      sizeBytes += stat.size;
      if (sizeBytes > this.maxBytes) throw Object.assign(new Error('Selected clips exceed the 128 MB ZIP limit. Download individual clips instead.'), { code: 'cinematic_clip_bundle_too_large', statusCode: 413 });
      const hash = crypto.createHash('sha256');
      try { for await (const chunk of createReadStream(filePath)) hash.update(chunk); }
      catch { throw unavailable(); }
      if (hash.digest('hex') !== asset.metadata.contentHash) throw unavailable();
      const name = `Scene-${String(item.sceneNumber).padStart(2, '0')}_Shot-${String(item.shotNumber).padStart(2, '0')}_Take-${String(item.takeNumber).padStart(2, '0')}.${asset.mimeType === 'video/webm' ? 'webm' : 'mp4'}`;
      files.push({ filePath, name, sizeBytes: stat.size, assetId: asset.id, shotId: item.shotId, attemptId: item.attemptId });
    }
    return { files, sizeBytes };
  }

  stream(plan, manifest, destination) {
    const archive = archiver('zip', { store: true });
    const cancel = () => archive.abort();
    destination.once('close', cancel);
    archive.on('error', () => destination.destroy(new Error('Clip ZIP could not be completed.')));
    archive.on('warning', () => destination.destroy(new Error('A selected clip became unavailable.')));
    archive.once('end', () => destination.removeListener('close', cancel));
    archive.pipe(destination);
    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
    for (const file of plan.files) archive.file(file.filePath, { name: file.name });
    void archive.finalize().catch(() => destination.destroy());
  }
}

function unavailable() {
  return Object.assign(new Error('A selected clip is unavailable or has changed. Review the selected Takes.'), { code: 'cinematic_clip_bundle_unavailable', statusCode: 409 });
}

export const videoClipBundleService = new VideoClipBundleService();
