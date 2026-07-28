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
}

export const fashionAssetService = new FashionAssetService();
