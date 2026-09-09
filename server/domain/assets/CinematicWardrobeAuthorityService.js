import { assetRepo } from '../../repositories/assets/AssetRepository.js';
import { assertActorContext, RepositoryContractError } from '../../repositories/repositoryContracts.js';

const MODES = new Set(['character_default', 'uploaded']);

export class CinematicWardrobeAuthorityService {
  constructor({ assetRepository = assetRepo } = {}) {
    this.assetRepository = assetRepository;
  }

  async authorizeLook(input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const mode = String(input.mode || 'character_default').trim();
    if (!MODES.has(mode)) {
      throw new RepositoryContractError('cinematic_wardrobe_mode_invalid', 'Wardrobe mode is invalid.', 400);
    }
    const requestedAssetIds = mode === 'uploaded'
      ? [...new Set((Array.isArray(input.assetIds) ? input.assetIds : []).map(value => String(value || '').trim()).filter(Boolean))]
      : [];
    if (mode === 'uploaded' && (!requestedAssetIds.length || requestedAssetIds.length > 4)) {
      throw new RepositoryContractError('cinematic_wardrobe_assets_required', 'An uploaded Look requires between one and four owned Assets.', 409);
    }
    const assets = [];
    for (const assetId of requestedAssetIds) {
      const asset = await this.assetRepository.findByIdForOwner(assetId, actor.userId);
      if (!asset || asset.status === 'deleted') {
        throw new RepositoryContractError('cinematic_wardrobe_asset_forbidden', 'Wardrobe Asset is unavailable.', 403);
      }
      assets.push({ id: asset.id, assetType: asset.assetType, contentHash: asset.contentHash || null });
    }
    return { mode, assets };
  }

  async importGeneratedSheet(source, actorContext) {
    const actor = assertActorContext(actorContext);
    if (source?.ownerUserId !== actor.userId || !source.id || !source.contentHash) {
      throw new RepositoryContractError('cinematic_wardrobe_asset_forbidden', 'Generated sheet is unavailable.', 403);
    }
    return this.assetRepository.create({
      assetType: 'character_look_sheet', storageKey: source.storageKey,
      publicUrl: source.publicUrl, mimeType: source.mimeType,
      width: source.width, height: source.height, sizeBytes: source.sizeBytes,
      sourceJobId: source.id, deduplicateSource: true,
      metadata: { contentHash: source.contentHash, trustedGenerationId: source.id,
        providerOutputProvenance: source.providerOutputProvenance }
    }, actor);
  }
}

export const cinematicWardrobeAuthorityService = new CinematicWardrobeAuthorityService();
