import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { characterProfileRepo } from '../../repositories/character-profiles/CharacterProfileRepository.js';
import { characterProfileVersionRepo } from '../../repositories/character-profiles/CharacterProfileVersionRepository.js';
import { generationResultRepo } from '../../repositories/generation/GenerationResultRepository.js';
import { assertActorContext, RepositoryContractError } from '../../repositories/repositoryContracts.js';
import { getCharacterCastingPolicy } from './characterCastingPolicy.js';
import { OUTPUTS_DIR } from '../../config/paths.js';
import { CHARACTER_TYPE, normalizeCharacterType } from './characterTypePolicy.js';

export class CharacterCastingExportService {
  constructor({
    profileRepository = characterProfileRepo,
    versionRepository = characterProfileVersionRepo,
    generationResultRepository = generationResultRepo
  } = {}) {
    this.profileRepository = profileRepository;
    this.versionRepository = versionRepository;
    this.generationResultRepository = generationResultRepository;
  }

  async createPlan(profileId, input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const profile = await this.profileRepository.findByIdForOwner(profileId, actor.userId);
    if (!profile || ['archived', 'blocked'].includes(profile.status)) {
      throw new RepositoryContractError('character_profile_not_found', 'Character Profile not found.', 404);
    }
    if (normalizeCharacterType(profile.characterType) !== CHARACTER_TYPE.REUSABLE_MODEL) {
      throw new RepositoryContractError(
        'character_casting_conversion_required',
        'Styled Characters keep their original outfit. Create a Reusable Model version before generating a Casting Export.',
        409
      );
    }
    if (profile.status === 'approved') {
      throw new RepositoryContractError(
        'character_new_version_required',
        'Create a new Character version before replacing an approved casting export.',
        409
      );
    }
    const version = await this.versionRepository.findById(input.characterProfileVersionId || profile.activeVersionId);
    if (!version || version.characterProfileId !== profile.id || version.ownerUserId !== actor.userId) {
      throw new RepositoryContractError('character_profile_version_not_found', 'Character version not found.', 404);
    }
    if (normalizeCharacterType(version.characterType) !== CHARACTER_TYPE.REUSABLE_MODEL) {
      throw new RepositoryContractError(
        'character_casting_conversion_required',
        'A Reusable Model version is required for Casting Export.',
        409
      );
    }
    const policy = getCharacterCastingPolicy();
    const referenceGenerationResultId = version.canonicalCharacterSheetAssetId
      || version.sourceGenerationResultIds?.[0]
      || null;
    const referenceResult = await this.generationResultRepository.findByIdForOwner(
      referenceGenerationResultId,
      actor.userId
    );
    if (!referenceResult?.imageUrl) {
      throw new RepositoryContractError(
        'character_casting_reference_missing',
        'The source Character Sheet image is unavailable.',
        409
      );
    }
    await this.profileRepository.updateSystem(profile.id, { status: 'export_pending' });
    return {
      characterProfileId: profile.id,
      characterProfileVersionId: version.id,
      layoutId: policy.layoutId,
      uniformPolicyId: policy.uniformPolicyId,
      outputCount: policy.outputCount,
      aspectRatio: policy.aspectRatio,
      promptDirective: policy.promptDirective,
      referenceGenerationResultId,
      referenceImageUrl: referenceResult.imageUrl,
      structuredCharacterSnapshot: castingCharacterSnapshot(version.structuredCharacterSnapshot),
      generationMetadata: {
        purpose: 'character_casting_export',
        characterProfileId: profile.id,
        characterProfileVersionId: version.id,
        useCase: 'general',
        sourceType: 'direct_generation',
        characterType: CHARACTER_TYPE.REUSABLE_MODEL,
        outfitBehavior: 'replaceable'
      }
    };
  }

  async validateGenerationContext(context, actorContext) {
    if (context?.purpose !== 'character_casting_export') return;
    const actor = assertActorContext(actorContext);
    const profile = await this.profileRepository.findByIdForOwner(context.characterProfileId, actor.userId);
    const version = await this.versionRepository.findById(context.characterProfileVersionId);
    if (!profile || !version || version.characterProfileId !== profile.id
      || version.ownerUserId !== actor.userId
      || !['draft', 'review'].includes(version.status)
      || !['draft', 'export_pending', 'review'].includes(profile.status)) {
      throw new RepositoryContractError(
        'character_casting_context_invalid',
        'Character casting export context is invalid or expired.',
        409
      );
    }
  }

  async handleCompletedGeneration({ job, historyEntry }) {
    const metadata = job?.options?.characterProfileContext;
    if (metadata?.purpose !== 'character_casting_export') return null;
    const profile = await this.profileRepository.findById(metadata.characterProfileId);
    const version = await this.versionRepository.findById(metadata.characterProfileVersionId);
    if (!profile || !version || version.characterProfileId !== profile.id
      || profile.ownerUserId !== job.options.payerUserId) {
      return null;
    }
    const derivatives = await createCastingDerivatives(job.outputFilePath, profile.id, version.id)
      .catch(error => {
        console.warn(`[Character Casting] Derivative creation failed for ${job.id}:`, error.message);
        return {};
      });
    const policy = getCharacterCastingPolicy();
    const attached = await this.versionRepository.attachCastingResult(version.id, {
      generationResultId: job.id,
      assetId: job.id,
      castingExportLayoutVersion: policy.layoutId,
      castingUniformPolicyVersion: policy.uniformPolicyId,
      providerModelSnapshot: {
        providerId: job.provider,
        modelId: job.submodel,
        resolution: job.options.imageResolution || null,
        providerConfigVersion: job.options.providerConfigVersion || null
      },
      promptSnapshotHash: crypto.createHash('sha256').update(job.prompt || '').digest('hex'),
      ...derivatives
    });
    await this.profileRepository.updateSystem(profile.id, {
      status: 'review',
      activeVersionId: attached.id
    });
    return historyEntry;
  }

  async approve(profileId, input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const profile = await this.profileRepository.findByIdForOwner(profileId, actor.userId);
    if (!profile) {
      throw new RepositoryContractError('character_profile_not_found', 'Character Profile not found.', 404);
    }
    if (normalizeCharacterType(profile.characterType) !== CHARACTER_TYPE.REUSABLE_MODEL) {
      throw new RepositoryContractError(
        'character_casting_conversion_required',
        'Styled Characters must be converted before Casting Export approval.',
        409
      );
    }
    const version = await this.versionRepository.findById(input.characterProfileVersionId || profile.activeVersionId);
    if (!version || version.characterProfileId !== profile.id || version.ownerUserId !== actor.userId) {
      throw new RepositoryContractError('character_profile_version_not_found', 'Character version not found.', 404);
    }
    const result = await this.generationResultRepository.findByIdForOwner(
      version.castingExportGenerationResultId,
      actor.userId
    );
    if (!result) {
      throw new RepositoryContractError('character_casting_export_required', 'Casting export result not found.', 409);
    }
    if (!version.castingFrontPreviewUrl || !version.castingFacePreviewUrl) {
      const sourcePath = resolveOutputFilePath(result.imageUrl);
      const derivatives = await createCastingDerivatives(sourcePath, profile.id, version.id)
        .catch(error => {
          console.warn(`[Character Casting] Approval derivative creation failed for ${result.id}:`, error.message);
          return {};
        });
      if (Object.keys(derivatives).length) {
        await this.versionRepository.attachCastingResult(version.id, {
          generationResultId: result.id,
          assetId: version.canonicalCastingExportAssetId || result.id,
          castingExportLayoutVersion: version.castingExportLayoutVersion,
          castingUniformPolicyVersion: version.castingUniformPolicyVersion,
          providerModelSnapshot: version.providerModelSnapshot,
          promptSnapshotHash: version.promptSnapshotHash,
          ...derivatives
        });
      }
    }
    const approved = await this.versionRepository.approve(
      version.id,
      input.consentDeclarationVersion || null
    );
    const updated = await this.profileRepository.updateSystem(profile.id, {
      status: 'approved',
      activeVersionId: approved.id
    });
    return { profile: updated, version: approved };
  }
}

export const characterCastingExportService = new CharacterCastingExportService();

function castingCharacterSnapshot(snapshot = {}) {
  const allowedGroups = new Set(['Character', 'Face', 'Hair', 'Skin', 'Body']);
  const sourceSelections = snapshot.selections || {};
  return {
    ...structuredClone(snapshot),
    selections: Object.fromEntries(Object.entries(sourceSelections).filter(([fieldName, selection]) =>
      selection
      && allowedGroups.has(selection.group)
      && fieldName !== 'Sheet Layout'
    ))
  };
}

async function createCastingDerivatives(sourcePath, profileId, versionId) {
  if (!sourcePath) return {};
  const sharp = (await import('sharp')).default;
  const source = await fs.readFile(sourcePath);
  const metadata = await sharp(source).metadata();
  const width = Number(metadata.width || 0);
  const height = Number(metadata.height || 0);
  if (width < 4 || height < 4) return {};
  const tileWidth = Math.floor(width / 3);
  const tileHeight = height;
  const safeProfile = String(profileId).replace(/[^a-z0-9_-]/gi, '');
  const safeVersion = String(versionId).replace(/[^a-z0-9_-]/gi, '');
  const relativeDir = path.join('character-profiles', safeProfile, safeVersion);
  const targetDir = path.join(OUTPUTS_DIR, relativeDir);
  await fs.mkdir(targetDir, { recursive: true });
  const frontPath = path.join(targetDir, 'front.webp');
  const facePath = path.join(targetDir, 'face.webp');
  await sharp(source)
    .extract({ left: 0, top: 0, width: tileWidth, height: tileHeight })
    .resize({ width: 640, height: 800, fit: 'contain', background: '#f3f4f6' })
    .webp({ quality: 84 })
    .toFile(frontPath);
  const faceHeight = Math.max(1, Math.floor(tileHeight * 0.42));
  await sharp(source)
    .extract({ left: 0, top: 0, width: tileWidth, height: faceHeight })
    .resize({ width: 320, height: 320, fit: 'cover', position: 'top' })
    .webp({ quality: 86 })
    .toFile(facePath);
  const baseUrl = `/outputs/${relativeDir.replaceAll('\\', '/')}`;
  return {
    castingFrontPreviewUrl: `${baseUrl}/front.webp`,
    castingFacePreviewUrl: `${baseUrl}/face.webp`
  };
}

function resolveOutputFilePath(imageUrl) {
  if (typeof imageUrl !== 'string' || !imageUrl.startsWith('/outputs/')) return null;
  const relative = imageUrl.slice('/outputs/'.length).replaceAll('/', path.sep);
  const candidate = path.resolve(OUTPUTS_DIR, relative);
  const root = path.resolve(OUTPUTS_DIR);
  return candidate.startsWith(`${root}${path.sep}`) ? candidate : null;
}
