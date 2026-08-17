import { resolveDataFile } from '../../config/paths.js';
import { mutateJsonFile, readJsonFile } from '../json/jsonFileStore.js';
import { RepositoryContractError } from '../repositoryContracts.js';

const EMPTY_RELEASES = [];
const EMPTY_STATE = {
  schemaVersion: 1,
  activeReleaseId: null,
  previousReleaseId: null,
  revision: 0,
  updatedAt: null
};

export class AttributeCatalogReleaseRepository {
  constructor({
    releasesFile = resolveDataFile('attributeCatalogReleases'),
    stateFile = resolveDataFile('attributeCatalogState')
  } = {}) {
    this.releasesFile = releasesFile;
    this.stateFile = stateFile;
  }

  async list() {
    const records = await readJsonFile(this.releasesFile, EMPTY_RELEASES);
    return Array.isArray(records) ? structuredClone(records) : [];
  }

  async findById(releaseId) {
    const release = (await this.list()).find(item => item.id === releaseId);
    if (!release) {
      throw new RepositoryContractError(
        'attribute_catalog_release_not_found',
        'Attribute Catalog release not found.',
        404
      );
    }
    return release;
  }

  async append(release) {
    return mutateJsonFile(this.releasesFile, EMPTY_RELEASES, releases => {
      if (!Array.isArray(releases)) throw new TypeError('Attribute Catalog releases data must be an array.');
      if (releases.some(item => item.id === release.id)) {
        throw new RepositoryContractError(
          'attribute_catalog_release_exists',
          'Attribute Catalog release already exists.',
          409
        );
      }
      releases.push(structuredClone(release));
      return structuredClone(release);
    });
  }

  async getState() {
    const state = await readJsonFile(this.stateFile, EMPTY_STATE);
    return { ...structuredClone(EMPTY_STATE), ...(state || {}) };
  }

  async activate(releaseId, expectedRevision) {
    await this.findById(releaseId);
    return mutateJsonFile(this.stateFile, EMPTY_STATE, state => {
      const current = { ...EMPTY_STATE, ...(state || {}) };
      if (current.revision !== expectedRevision) {
        throw new RepositoryContractError(
          'attribute_catalog_state_conflict',
          'The active Attribute Catalog release changed. Refresh before retrying.',
          409
        );
      }
      const next = {
        schemaVersion: 1,
        activeReleaseId: releaseId,
        previousReleaseId: current.activeReleaseId,
        revision: current.revision + 1,
        updatedAt: new Date().toISOString()
      };
      Object.assign(state, next);
      return structuredClone(next);
    });
  }
}

export const attributeCatalogReleaseRepository = new AttributeCatalogReleaseRepository();
