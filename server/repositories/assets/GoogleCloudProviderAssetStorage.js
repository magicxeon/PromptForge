import crypto from 'node:crypto';
import { Storage } from '@google-cloud/storage';

const DEFAULT_PREFIX = 'modelark-aigc-handoff';
const DEFAULT_TTL_SECONDS = 3600;

export class GoogleCloudProviderAssetStorage {
  constructor({
    environment = process.env,
    storage = null,
    clock = () => new Date()
  } = {}) {
    this.environment = environment;
    this.bucketName = String(environment.CINEMATIC_PROVIDER_ASSET_GCS_BUCKET || '').trim();
    this.prefix = normalizePrefix(environment.CINEMATIC_PROVIDER_ASSET_GCS_PREFIX || DEFAULT_PREFIX);
    this.ttlSeconds = boundedInteger(
      environment.CINEMATIC_PROVIDER_ASSET_SIGNED_URL_TTL_SECONDS,
      300,
      21600,
      DEFAULT_TTL_SECONDS
    );
    this.storage = storage || new Storage();
    this.clock = clock;
  }

  assertConfigured() {
    if (!this.bucketName) {
      throw storageError(
        'video_provider_asset_storage_not_configured',
        'Configure the private GCS provider Asset handoff bucket before using Seedance with this Character frame.',
        503
      );
    }
  }

  async publish({ ownerUserId, sourceAssetId, contentHash, bytes, mimeType }) {
    this.assertConfigured();
    if (!Buffer.isBuffer(bytes) || !bytes.length) {
      throw storageError('video_provider_asset_source_unavailable', 'The approved Storyboard source bytes are unavailable.', 409);
    }
    const objectKey = this.#objectKey({ ownerUserId, sourceAssetId, contentHash, mimeType });
    const file = this.storage.bucket(this.bucketName).file(objectKey);
    try {
      await file.save(bytes, {
        resumable: false,
        validation: 'crc32c',
        metadata: {
          contentType: mimeType || 'image/png',
          cacheControl: 'private, max-age=0, no-store',
          metadata: { contentHash: String(contentHash) }
        }
      });
      const expiresAt = new Date(this.clock().getTime() + this.ttlSeconds * 1000);
      const [sourceUrl] = await file.getSignedUrl({ version: 'v4', action: 'read', expires: expiresAt });
      if (!/^https:\/\//i.test(sourceUrl)) throw new Error('Signed URL is not HTTPS.');
      return { objectKey, sourceUrl, expiresAt: expiresAt.toISOString() };
    } catch (cause) {
      throw storageError(
        'video_provider_asset_storage_failed',
        'The approved Storyboard source could not be prepared for ModelArk Asset registration.',
        502,
        cause
      );
    }
  }

  async cleanup(objectKey) {
    if (!this.bucketName || !isOwnedObjectKey(objectKey, this.prefix)) return false;
    try {
      await this.storage.bucket(this.bucketName).file(objectKey).delete({ ignoreNotFound: true });
      return true;
    } catch {
      return false;
    }
  }

  #objectKey({ ownerUserId, sourceAssetId, contentHash, mimeType }) {
    const ownerScope = crypto.createHash('sha256').update(String(ownerUserId || '')).digest('hex').slice(0, 20);
    const assetId = safeSegment(sourceAssetId, 'asset');
    const hash = /^[a-f0-9]{32,128}$/i.test(String(contentHash || ''))
      ? String(contentHash).toLowerCase()
      : crypto.createHash('sha256').update(String(contentHash || '')).digest('hex');
    return `${this.prefix}/${ownerScope}/${assetId}/${hash}.${extensionFor(mimeType)}`;
  }
}

function normalizePrefix(value) {
  const prefix = String(value || DEFAULT_PREFIX).replace(/^\/+|\/+$/g, '');
  if (!prefix || prefix.split('/').some(part => !/^[a-zA-Z0-9._-]+$/.test(part))) {
    throw storageError('video_provider_asset_storage_config_invalid', 'The provider Asset GCS prefix is invalid.', 500);
  }
  return prefix;
}

function safeSegment(value, fallback) {
  const segment = String(value || '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  return segment || fallback;
}

function extensionFor(mimeType) {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/webp') return 'webp';
  return 'png';
}

function isOwnedObjectKey(value, prefix) {
  const objectKey = String(value || '').replace(/\\/g, '/');
  return objectKey.startsWith(`${prefix}/`) && !objectKey.split('/').includes('..');
}

function boundedInteger(value, minimum, maximum, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number >= minimum && number <= maximum ? number : fallback;
}

function storageError(code, message, statusCode, cause = null) {
  return Object.assign(new Error(message, cause ? { cause } : undefined), {
    code,
    statusCode,
    retryable: code === 'video_provider_asset_storage_failed'
  });
}

export const googleCloudProviderAssetStorage = new GoogleCloudProviderAssetStorage();
