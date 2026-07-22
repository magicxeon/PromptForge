import { resolveDataFile } from '../../config/paths.js';
import { readJsonFile, mutateJsonFile } from '../json/jsonFileStore.js';
import {
  assertActorContext,
  createPage,
  normalizeListQuery,
  pickAllowedValue,
  RepositoryContractError,
  VISIBILITY
} from '../repositoryContracts.js';
import { applyRecordDefaults } from '../schemaVersioning.js';
import { normalizeOwnedRepositoryRecord, stripEmbeddedBase64 } from '../recordNormalizer.js';
import { paginateRepositoryRecords } from '../RepositoryCursor.js';
import { mockUserRepo } from '../identity/MockUserRepository.js';

const GALLERY_FALLBACK = [];

export class CommunityGalleryRepository {
  constructor({
    galleryFile = resolveDataFile('communityGallery'),
    userRepository = mockUserRepo,
    cursorSecret = process.env.COMMUNITY_GALLERY_CURSOR_SECRET || 'local-community-gallery-cursor'
  } = {}) {
    this.galleryFile = galleryFile;
    this.userRepository = userRepository;
    this.cursorSecret = cursorSecret;
  }

  async readRaw() {
    const data = await readJsonFile(this.galleryFile, GALLERY_FALLBACK);
    return Array.isArray(data) ? data : [];
  }

  async readAll() {
    const items = await this.readRaw();
    return Promise.all(items.map(item => normalizeOwnedRepositoryRecord(
      item,
      this.userRepository,
      { visibility: VISIBILITY.PRIVATE, status: 'active' }
    )));
  }

  async findById(id) {
    if (!id) return null;
    const items = await this.readAll();
    const item = items.find(galleryItem => galleryItem.id === id);
    return item ? structuredClone(item) : null;
  }

  async findPublicById(id) {
    const item = await this.findById(id);
    if (!item || item.visibility !== VISIBILITY.PUBLIC || item.status !== 'active') return null;
    return structuredClone(item);
  }

  async listPublic(query = {}) {
    const normalizedQuery = normalizeListQuery(query);
    const items = (await this.readAll())
      .filter(item => item.visibility === VISIBILITY.PUBLIC && item.status === 'active');
    const page = paginateRepositoryRecords(
      items,
      normalizedQuery,
      JSON.stringify({ visibility: VISIBILITY.PUBLIC, sort: normalizedQuery.sort }),
      this.cursorSecret
    );

    return createPage(page.items, page);
  }

  async create(recordInput = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const now = new Date().toISOString();

    const record = applyRecordDefaults({
      creatorProfileId: recordInput.creatorProfileId || null,
      sourceGenerationResultId: recordInput.sourceGenerationResultId || null,
      imageAssetId: recordInput.imageAssetId || null,
      title: recordInput.title || '',
      description: recordInput.description || '',
      reusePolicy: recordInput.reusePolicy || 'view_only',
      sceneBuilderHandoffSnapshot: stripEmbeddedBase64(recordInput.sceneBuilderHandoffSnapshot || null)
    }, {
      idPrefix: 'gal',
      ownerUserId: actor.userId,
      ownerUsername: actor.username,
      visibility: pickAllowedValue(
        recordInput.visibility,
        [VISIBILITY.PRIVATE, VISIBILITY.PUBLIC, VISIBILITY.UNLISTED, VISIBILITY.MEMBERS_ONLY],
        VISIBILITY.PRIVATE
      ),
      status: 'active',
      now
    });

    return mutateJsonFile(this.galleryFile, GALLERY_FALLBACK, async items => {
      if (!Array.isArray(items)) throw new TypeError('Community gallery data must be an array.');
      items.unshift(record);
      return structuredClone(record);
    });
  }
}

export const communityGalleryRepo = new CommunityGalleryRepository();
