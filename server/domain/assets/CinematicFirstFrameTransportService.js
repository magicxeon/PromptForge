import { loadVerifiedStoryboardAssetContent } from './CinematicStoryboardAssetService.js';
import { loadVideoReferenceAssetContent } from './VideoReferenceAssetContent.js';
import { googleCloudProviderAssetStorage } from '../../repositories/assets/GoogleCloudProviderAssetStorage.js';

export class CinematicFirstFrameTransportService {
  constructor({ storage = googleCloudProviderAssetStorage, sourceLoader = loadVerifiedStoryboardAssetContent, environment = process.env } = {}) {
    this.storage = storage;
    this.sourceLoader = sourceLoader;
    const configuredTtl = Number(environment.CINEMATIC_PROVIDER_ASSET_VIDEO_URL_TTL_SECONDS);
    this.urlTtlSeconds = Number.isInteger(configuredTtl) && configuredTtl >= 176400 && configuredTtl <= 604800
      ? configuredTtl : 259200;
  }

  async resolve({ sourceAsset, ownerUserId, expectedContentHash }) {
    if (!ownerUserId || sourceAsset?.ownerUserId !== ownerUserId) {
      throw Object.assign(new Error('The approved Storyboard source is not owned by this actor.'), {
        code: 'cinematic_video_reference_unavailable', statusCode: 409
      });
    }
    // Source verification failures must never fall back to another transport.
    const verified = sourceAsset.assetType === 'character_look_sheet'
      ? await loadVideoReferenceAssetContent(sourceAsset) : await this.sourceLoader(sourceAsset);
    const mimeType = verified.mimeType || sourceAsset.mimeType;
    if (verified.contentHash !== expectedContentHash) {
      throw Object.assign(new Error('The approved Storyboard image content changed.'), {
        code: 'cinematic_video_reference_content_changed', statusCode: 409
      });
    }
    try {
      const handoff = await this.storage.publish({
        ownerUserId, sourceAssetId: sourceAsset.id, contentHash: verified.contentHash,
        bytes: verified.bytes, mimeType,
        reuseExisting: true, urlTtlSeconds: this.urlTtlSeconds
      });
      return { value: handoff.sourceUrl, transport: { mode: 'gcs_url', fallbackCode: null } };
    } catch {
      return {
        value: `data:${mimeType};base64,${verified.bytes.toString('base64')}`,
        transport: { mode: 'base64', fallbackCode: 'video_reference_gcs_unavailable' }
      };
    }
  }
}

export const cinematicFirstFrameTransportService = new CinematicFirstFrameTransportService();
