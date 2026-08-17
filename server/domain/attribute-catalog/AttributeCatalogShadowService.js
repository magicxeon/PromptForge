import {
  catalogFingerprint,
  compileCatalogRelease,
  createShadowCatalogRelease,
  validateInventory
} from './attributeCatalogContracts.js';
import { attributeCatalogSourceRepository } from '../../repositories/attribute-catalog/AttributeCatalogSourceRepository.js';

export class AttributeCatalogShadowService {
  constructor({ sourceRepository = attributeCatalogSourceRepository } = {}) {
    this.sourceRepository = sourceRepository;
  }

  async inspectLegacyBundle(bundle) {
    const inventory = await this.sourceRepository.createInventory();
    const validation = validateInventory(inventory);
    const release = createShadowCatalogRelease({ bundle, inventory });
    const compiledBundle = compileCatalogRelease(release);
    const shadowFingerprint = catalogFingerprint(compiledBundle);
    return {
      inventory,
      validation,
      release,
      parity: {
        equal: release.bundleFingerprint === shadowFingerprint,
        legacyFingerprint: release.bundleFingerprint,
        shadowFingerprint
      }
    };
  }
}

export const attributeCatalogShadowService = new AttributeCatalogShadowService();
