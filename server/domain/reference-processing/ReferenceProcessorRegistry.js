import { assetRepo } from '../../repositories/assets/AssetRepository.js';
import { OUTPUTS_DIR } from '../../config/paths.js';
import {
  deterministicProcessorVersions,
  processDeterministicImage
} from './processors/deterministicImageProcessor.js';
import {
  ReferenceProcessingError,
  stableFingerprint
} from './referenceProcessingContracts.js';

export class ReferenceProcessorRegistry {
  constructor({
    repository = assetRepo,
    outputsDirectory = OUTPUTS_DIR
  } = {}) {
    this.repository = repository;
    this.outputsDirectory = outputsDirectory;
  }

  getKnownProcessorIds() {
    return Object.keys(deterministicProcessorVersions);
  }

  async process(input, {
    actorContext,
    policyVersion
  }) {
    const ownerUserId = String(actorContext?.userId || '').trim();
    if (!ownerUserId) {
      throw new ReferenceProcessingError(
        'reference_access_denied',
        'An active actor is required to process references.',
        401
      );
    }
    const asset = await this.repository.findByPublicUrlForOwner(input.value, ownerUserId);
    if (asset) {
      try {
        return await processDeterministicImage({
          asset,
          actorContext,
          repository: this.repository,
          outputsDirectory: this.outputsDirectory,
          policyVersion
        });
      } catch (error) {
        throw new ReferenceProcessingError(
          'reference_processing_failed',
          'The reference image could not be normalized.',
          422,
          { role: input.role, reason: error.code || 'image_processing_failed' }
        );
      }
    }

    if (input.value.startsWith('/outputs/references/')
      || input.value.startsWith('/outputs/reference-processed/')) {
      throw new ReferenceProcessingError(
        'reference_access_denied',
        'The reference image is unavailable to the active actor.',
        403,
        { role: input.role }
      );
    }

    return {
      sourceAssetId: null,
      derivativeAssetId: null,
      imageUrl: input.value,
      contentFingerprint: stableFingerprint({
        sourceKind: input.source.kind,
        sourceId: input.source.id,
        value: input.value
      }),
      width: null,
      height: null,
      processorIds: [],
      processorVersions: {},
      // Canonical History, Template and Character sources are already stored
      // outputs and are resolved by their owning authorization service later.
      // They do not need an upload derivative and should not show a false
      // preprocessing warning in the UI.
      fallback: input.source.kind === 'asset'
    };
  }
}
