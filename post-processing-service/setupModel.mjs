import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPostProcessingConfig } from './config/serviceConfig.mjs';

export async function ensureFaceModel({ fetchImpl = fetch, config = loadPostProcessingConfig() } = {}) {
  const target = config.runtime.modelPath;
  const directory = path.dirname(target);
  const model = config.policy.model;
  if (existsSync(target)) {
    const bytes = await readFile(target);
    if (createHash('sha256').update(bytes).digest('hex') === model.sha256) return true;
    throw new Error('Local Face Landmarker model checksum changed; refusing to replace it automatically.');
  }
  await mkdir(directory, { recursive: true });
  const temporary = target + '.' + process.pid + '.partial';
  try {
    const response = await fetchImpl(model.downloadUrl, { signal: AbortSignal.timeout(model.downloadTimeoutMs) });
    if (!response.ok || Number(response.headers.get('content-length')) > model.maxDownloadBytes) {
      throw new Error('Model download failed.');
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > model.maxDownloadBytes
      || createHash('sha256').update(bytes).digest('hex') !== model.sha256) {
      throw new Error('Model download checksum did not match the pinned bundle.');
    }
    await writeFile(temporary, bytes, { flag: 'wx' });
    await rename(temporary, target);
    return true;
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await ensureFaceModel();
    console.log('Face Landmarker model ready.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
