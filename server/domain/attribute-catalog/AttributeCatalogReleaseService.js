import { createPrefixedId } from '../../repositories/schemaVersioning.js';
import { catalogFingerprint, compileCatalogRelease } from './attributeCatalogContracts.js';
import { RepositoryContractError } from '../../repositories/repositoryContracts.js';
import { attributeCatalogReleaseRepository } from '../../repositories/attribute-catalog/AttributeCatalogReleaseRepository.js';

export class AttributeCatalogReleaseService {
  constructor({ releaseRepository = attributeCatalogReleaseRepository } = {}) {
    this.releaseRepository = releaseRepository;
    this.compiledCache = new Map();
  }

  async publish({ draft, validation, actor, reason }) {
    if (!validation?.valid) {
      throw new RepositoryContractError(
        'attribute_catalog_validation_failed',
        'The Attribute Catalog draft must pass validation before publication.',
        409
      );
    }
    const id = createPrefixedId('attrrel');
    const publishedAt = new Date().toISOString();
    const bundle = {
      ...structuredClone(draft.bundle),
      catalogRelease: {
        id,
        schemaVersion: 1,
        publishedAt
      }
    };
    const release = {
      schemaVersion: 1,
      id,
      status: 'published',
      sourceDraftId: draft.id,
      sourceDraftRevision: draft.revision,
      bundleFingerprint: catalogFingerprint(bundle),
      inventoryFingerprint: draft.inventoryFingerprint || null,
      validation,
      reason,
      publishedByUserId: actor.userId,
      publishedByUsername: actor.username,
      publishedAt,
      bundle
    };
    await this.releaseRepository.append(release);
    return release;
  }

  async getCompiledActiveBundle() {
    const state = await this.releaseRepository.getState();
    if (!state.activeReleaseId) return null;
    const release = await this.releaseRepository.findById(state.activeReleaseId);
    let bundle = this.compiledCache.get(release.id);
    if (!bundle) {
      bundle = compileCatalogRelease(release);
      this.compiledCache.set(release.id, bundle);
      while (this.compiledCache.size > 2) {
        this.compiledCache.delete(this.compiledCache.keys().next().value);
      }
    }
    return { bundle: structuredClone(bundle), release, state };
  }
}

export const attributeCatalogReleaseService = new AttributeCatalogReleaseService();
