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
import { normalizeOwnedRepositoryRecord, stripEmbeddedBase64 } from '../recordNormalizer.js';
import { applyRecordDefaults } from '../schemaVersioning.js';
import { paginateRepositoryRecords } from '../RepositoryCursor.js';
import { mockUserRepo } from '../identity/MockUserRepository.js';

const SNAPSHOT_FALLBACK = [];

export class SceneTemplateSnapshotRepository {
  constructor({
    snapshotsFile = resolveDataFile('sceneTemplateSnapshots'),
    userRepository = mockUserRepo,
    cursorSecret = process.env.SCENE_TEMPLATE_CURSOR_SECRET || 'local-scene-template-cursor'
  } = {}) {
    this.snapshotsFile = snapshotsFile;
    this.userRepository = userRepository;
    this.cursorSecret = cursorSecret;
  }

  async readRaw() {
    const data = await readJsonFile(this.snapshotsFile, SNAPSHOT_FALLBACK);
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
    const item = items.find(snapshot => snapshot.id === id);
    return item ? structuredClone(item) : null;
  }

  async findByIdForOwner(id, ownerUserId) {
    const item = await this.findById(id);
    return item?.ownerUserId === ownerUserId ? item : null;
  }

  async findByOwner(ownerUserId, query = {}) {
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

  async create(recordInput = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const now = new Date().toISOString();
    const authoringMode = recordInput.authoringMode || 'guided';
    if (!['guided', 'manual'].includes(authoringMode)) {
      throw new RepositoryContractError('invalid_authoring_mode', 'Scene template authoring mode is invalid.');
    }

    const record = applyRecordDefaults({
      ...stripEmbeddedBase64(recordInput),
      sourceGenerationResultId: recordInput.sourceGenerationResultId || null,
      authoringMode,
      finalPromptSnapshot: recordInput.finalPromptSnapshot || '',
      structuredSelectionsSnapshot: recordInput.structuredSelectionsSnapshot || {},
      manualPromptText: recordInput.manualPromptText || null,
      referenceSlotMapping: stripEmbeddedBase64(recordInput.referenceSlotMapping || {}),
      replaceableVariables: Array.isArray(recordInput.replaceableVariables) ? recordInput.replaceableVariables : [],
      providerModelSnapshot: recordInput.providerModelSnapshot || {},
      generationSettingsSnapshot: recordInput.generationSettingsSnapshot || {},
      sharePolicySnapshot: recordInput.sharePolicySnapshot || {}
    }, {
      idPrefix: 'stpl',
      ownerUserId: actor.userId,
      ownerUsername: actor.username,
      visibility: pickAllowedValue(
        recordInput.visibility,
        [VISIBILITY.PRIVATE, VISIBILITY.PUBLIC, VISIBILITY.UNLISTED],
        VISIBILITY.PRIVATE
      ),
      status: 'active',
      now
    });

    return mutateJsonFile(this.snapshotsFile, SNAPSHOT_FALLBACK, async items => {
      if (!Array.isArray(items)) throw new TypeError('Scene template snapshots data must be an array.');
      items.unshift(record);
      return structuredClone(record);
    });
  }
}

export const sceneTemplateSnapshotRepo = new SceneTemplateSnapshotRepository();
