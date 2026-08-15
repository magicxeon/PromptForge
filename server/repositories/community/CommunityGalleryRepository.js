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
const GALLERY_REUSE_POLICIES = Object.freeze([
  'none',
  'view_only',
  'use_as_template',
  'remix_with_required_replacements'
]);

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
    return createPublicGallerySummary(item);
  }

  async findByOwner(ownerUserId, query = {}) {
    if (!ownerUserId) {
      throw new RepositoryContractError(
        'gallery_owner_required',
        'An owner user ID is required to list gallery items.'
      );
    }
    const normalizedQuery = normalizeListQuery(query);
    const items = (await this.readAll())
      .filter(item => item.ownerUserId === ownerUserId && item.status !== 'deleted');
    const page = paginateRepositoryRecords(
      items,
      normalizedQuery,
      JSON.stringify({ ownerUserId, sort: normalizedQuery.sort }),
      this.cursorSecret
    );
    return createPage(page.items, page);
  }

  async listPublic(query = {}) {
    const normalizedQuery = normalizeListQuery(query);
    const items = (await this.readAll())
      .filter(item =>
        item.visibility === VISIBILITY.PUBLIC
        && item.status === 'active'
        && (!normalizedQuery.filters.creatorProfileId
          || item.creatorProfileId === normalizedQuery.filters.creatorProfileId)
      );
    const page = paginateRepositoryRecords(
      items,
      normalizedQuery,
      JSON.stringify({
        visibility: VISIBILITY.PUBLIC,
        creatorProfileId: normalizedQuery.filters.creatorProfileId || null,
        sort: normalizedQuery.sort
      }),
      this.cursorSecret
    );

    return createPage(page.items.map(createPublicGallerySummary), page);
  }

  async create(recordInput = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const now = new Date().toISOString();

    const record = applyRecordDefaults({
      creatorProfileId: recordInput.creatorProfileId || null,
      sourceGenerationResultId: recordInput.sourceGenerationResultId || null,
      sourceCommunityPostId: recordInput.sourceCommunityPostId || null,
      imageAssetId: recordInput.imageAssetId || null,
      thumbnailAssetId: recordInput.thumbnailAssetId || null,
      title: recordInput.title || '',
      description: recordInput.description || '',
      officialTags: normalizeStringArray(recordInput.officialTags),
      customTags: normalizeStringArray(recordInput.customTags),
      reusePolicy: pickAllowedValue(
        recordInput.reusePolicy,
        GALLERY_REUSE_POLICIES,
        'view_only'
      ),
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

function createPublicGallerySummary(item) {
  return {
    id: item.id,
    ownerUsername: item.ownerUsername || null,
    creatorProfileId: item.creatorProfileId || null,
    title: item.title || '',
    description: item.description || '',
    reusePolicy: item.reusePolicy || 'view_only',
    handoffAvailable: Boolean(
      hasHandoffSnapshot(item.sceneBuilderHandoffSnapshot)
      && ['use_as_template', 'remix_with_required_replacements'].includes(item.reusePolicy)
    ),
    officialTags: normalizeStringArray(item.officialTags),
    customTags: normalizeStringArray(item.customTags),
    visibility: VISIBILITY.PUBLIC,
    status: item.status,
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null
  };
}

function hasHandoffSnapshot(value) {
  return Boolean(value && typeof value === 'object' && Object.keys(value).length);
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .filter(item => typeof item === 'string')
      .map(item => item.trim())
      .filter(Boolean)
  )];
}

export const communityGalleryRepo = new CommunityGalleryRepository();
