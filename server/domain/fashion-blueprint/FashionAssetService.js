import { referenceAssetService } from '../assets/ReferenceAssetService.js';

export class FashionAssetService {
  constructor({ referenceService = referenceAssetService } = {}) {
    this.referenceService = referenceService;
  }

  async storeReference(input, actorContext) {
    const reference = await this.referenceService.storeReference(input, actorContext, {
      namespace: 'fashion-references',
      assetType: 'fashion_reference'
    });
    return {
      ...reference,
      assetId: reference.referenceId
    };
  }

  async resolveOwnedReference(reference, actorContext) {
    const assetId = String(reference?.assetId || '').trim();
    if (!assetId || !actorContext?.userId) return null;
    const asset = await this.referenceService.repository.findByIdForOwner(
      assetId,
      actorContext.userId
    );
    if (!asset || asset.status === 'deleted' || asset.assetType !== 'fashion_reference') {
      return null;
    }
    return {
      assetId: asset.id,
      imageUrl: asset.publicUrl,
      thumbnailUrl: asset.thumbnailUrl || asset.publicUrl,
      width: asset.width || null,
      height: asset.height || null
    };
  }
}

export const fashionAssetService = new FashionAssetService();
