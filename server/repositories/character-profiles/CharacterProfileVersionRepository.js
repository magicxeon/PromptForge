import { resolveDataFile } from '../../config/paths.js';
import { readJsonFile, mutateJsonFile } from '../json/jsonFileStore.js';
import { RepositoryContractError } from '../repositoryContracts.js';
import { applyRecordDefaults } from '../schemaVersioning.js';
import { stripEmbeddedBase64 } from '../recordNormalizer.js';

const FALLBACK = [];

export class CharacterProfileVersionRepository {
  constructor({ versionsFile = resolveDataFile('characterProfileVersions') } = {}) {
    this.versionsFile = versionsFile;
  }

  async readAll() {
    const data = await readJsonFile(this.versionsFile, FALLBACK);
    if (!Array.isArray(data)) throw new TypeError('Character Profile versions data must be an array.');
    return data.map(item => structuredClone(item));
  }

  async findById(id) {
    return (await this.readAll()).find(item => item.id === id) || null;
  }

  async listByProfileId(characterProfileId) {
    return (await this.readAll())
      .filter(item => item.characterProfileId === characterProfileId)
      .sort((a, b) => Number(b.versionNumber) - Number(a.versionNumber));
  }

  async create(input = {}, actorContext) {
    const now = new Date().toISOString();
    const record = applyRecordDefaults({
      characterProfileId: input.characterProfileId,
      versionNumber: 1,
      sourceMode: 'character-sheet',
      characterType: normalizeCharacterType(input.characterType),
      structuredCharacterSnapshot: stripEmbeddedBase64(input.structuredCharacterSnapshot || {}),
      sourceGenerationResultIds: [...new Set((input.sourceGenerationResultIds || []).filter(Boolean))],
      canonicalHeadshotAssetId: input.canonicalHeadshotAssetId || null,
      canonicalCharacterSheetAssetId: input.canonicalCharacterSheetAssetId || null,
      canonicalCastingExportAssetId: null,
      castingFrontPreviewUrl: null,
      castingFacePreviewUrl: null,
      castingExportGenerationResultId: null,
      castingExportLayoutVersion: 'character-casting-three-view-v2',
      castingUniformPolicyVersion: 'casting-uniform-white-v1',
      providerModelSnapshot: null,
      promptSnapshotHash: null,
      consentDeclarationVersion: null,
      approvedAt: null
    }, {
      idPrefix: 'charver',
      ownerUserId: actorContext.userId,
      ownerUsername: actorContext.username,
      visibility: 'private',
      status: 'draft',
      now
    });
    return mutateJsonFile(this.versionsFile, FALLBACK, async items => {
      assertStore(items);
      const sourceIds = [...new Set((input.sourceGenerationResultIds || []).filter(Boolean))];
      const existing = items.find(item =>
        item.characterProfileId === input.characterProfileId
        && normalizeCharacterType(item.characterType) === normalizeCharacterType(input.characterType)
        && JSON.stringify(item.sourceGenerationResultIds || []) === JSON.stringify(sourceIds)
      );
      if (existing) return structuredClone(existing);
      const profileVersions = items.filter(item => item.characterProfileId === input.characterProfileId);
      record.versionNumber = profileVersions.length
        ? Math.max(...profileVersions.map(item => Number(item.versionNumber) || 0)) + 1
        : 1;
      items.unshift(record);
      return structuredClone(record);
    });
  }

  async attachCastingResult(id, patch = {}) {
    return mutateJsonFile(this.versionsFile, FALLBACK, async items => {
      assertStore(items);
      const index = items.findIndex(item => item.id === id);
      if (index < 0) {
        throw new RepositoryContractError('character_profile_version_not_found', 'Character version not found.', 404);
      }
      if (items[index].status === 'approved') {
        throw new RepositoryContractError(
          'character_profile_version_immutable',
          'Approved Character versions cannot be replaced.',
          409
        );
      }
      items[index] = {
        ...items[index],
        castingExportGenerationResultId: patch.generationResultId,
        canonicalCastingExportAssetId: patch.assetId || patch.generationResultId,
        castingFrontPreviewUrl: patch.castingFrontPreviewUrl || null,
        castingFacePreviewUrl: patch.castingFacePreviewUrl || null,
        castingExportLayoutVersion: patch.castingExportLayoutVersion
          || items[index].castingExportLayoutVersion,
        castingUniformPolicyVersion: patch.castingUniformPolicyVersion
          || items[index].castingUniformPolicyVersion,
        providerModelSnapshot: stripEmbeddedBase64(patch.providerModelSnapshot || null),
        promptSnapshotHash: patch.promptSnapshotHash || null,
        status: 'review',
        updatedAt: new Date().toISOString()
      };
      return structuredClone(items[index]);
    });
  }

  async approve(id, consentDeclarationVersion) {
    return mutateJsonFile(this.versionsFile, FALLBACK, async items => {
      assertStore(items);
      const index = items.findIndex(item => item.id === id);
      if (index < 0 || !items[index].castingExportGenerationResultId
        || items[index].status !== 'review') {
        throw new RepositoryContractError(
          'character_casting_export_required',
          'A successful casting export is required before approval.',
          409
        );
      }
      const now = new Date().toISOString();
      items[index] = {
        ...items[index],
        status: 'approved',
        approvedAt: now,
        consentDeclarationVersion: consentDeclarationVersion || null,
        updatedAt: now
      };
      return structuredClone(items[index]);
    });
  }

  async approveStyled(id, consentDeclarationVersion) {
    return mutateJsonFile(this.versionsFile, FALLBACK, async items => {
      assertStore(items);
      const index = items.findIndex(item => item.id === id);
      if (index < 0 || !items[index].canonicalCharacterSheetAssetId
        || items[index].status !== 'draft'
        || normalizeCharacterType(items[index].characterType) !== 'styled_character') {
        throw new RepositoryContractError(
          'styled_character_source_required',
          'An owned Styled Character Sheet is required before approval.',
          409
        );
      }
      const now = new Date().toISOString();
      items[index] = {
        ...items[index],
        status: 'approved',
        approvedAt: now,
        consentDeclarationVersion: consentDeclarationVersion || null,
        updatedAt: now
      };
      return structuredClone(items[index]);
    });
  }
}

function assertStore(value) {
  if (!Array.isArray(value)) throw new TypeError('Character Profile versions data must be an array.');
}

function normalizeCharacterType(value) {
  return value === 'styled_character' ? 'styled_character' : 'reusable_model';
}

export const characterProfileVersionRepo = new CharacterProfileVersionRepository();
