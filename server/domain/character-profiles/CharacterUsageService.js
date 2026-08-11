import { characterUsageRepo } from '../../repositories/character-profiles/CharacterUsageRepository.js';
import { characterProfileRepo } from '../../repositories/character-profiles/CharacterProfileRepository.js';
import { characterProfileVersionRepo } from '../../repositories/character-profiles/CharacterProfileVersionRepository.js';
import { assertActorContext, RepositoryContractError } from '../../repositories/repositoryContracts.js';
import { canReuseCharacterProfile } from './characterProfilePolicy.js';
import {
  assertCharacterDestination,
  getCharacterTypeCapabilities,
  normalizeCharacterType,
  resolveCanonicalCharacterAsset
} from './characterTypePolicy.js';
import {
  normalizeCharacterIdentityMetadata,
  normalizeCharacterIdentityText
} from './characterIdentityMetadata.js';

export class CharacterUsageService {
  constructor({
    usageRepository = characterUsageRepo,
    profileRepository = characterProfileRepo,
    versionRepository = characterProfileVersionRepo
  } = {}) {
    this.usageRepository = usageRepository;
    this.profileRepository = profileRepository;
    this.versionRepository = versionRepository;
  }

  async handleCompletedGeneration({ job }) {
    const context = job?.options?.characterProfileContext;
    if (!context?.characterProfileId || context.purpose === 'character_casting_export') return null;
    const profile = await this.profileRepository.findById(context.characterProfileId);
    const version = await this.versionRepository.findById(context.characterProfileVersionId);
    if (!profile || !version || version.characterProfileId !== profile.id) return null;
    return this.usageRepository.createIdempotent({
      characterProfileId: profile.id,
      characterProfileVersionId: version.id,
      consumerUserId: job.options.payerUserId,
      useCase: context.useCase,
      sourceType: context.sourceType,
      sourceId: context.sourceId,
      generationJobId: job.id,
      successfulOutputCount: 1,
      idempotencyKey: `character-usage:${job.id}:${profile.id}`
    });
  }

  async validateGenerationContext(context, actorContext) {
    if (!context || context.purpose === 'character_casting_export') return context || null;
    const actor = assertActorContext(actorContext);
    const profile = await this.profileRepository.findById(context.characterProfileId);
    const version = await this.versionRepository.findById(context.characterProfileVersionId);
    const characterType = normalizeCharacterType(profile?.characterType);
    const capabilities = profile ? getCharacterTypeCapabilities(characterType) : null;
    const destination = context.sourceType === 'fashion_blueprint'
      ? 'fashion_blueprint'
      : 'scene_builder';
    const canonicalAssetId = version
      ? resolveCanonicalCharacterAsset(version, characterType)
      : null;
    const canonicalFaceAssetId = version?.canonicalFaceAssetId
      || version?.canonicalHeadshotAssetId
      || version?.castingFacePreviewUrl
      || null;
    const identityMetadata = normalizeCharacterIdentityMetadata(
      version?.identityMetadata,
      version?.structuredCharacterSnapshot
    );
    if (!profile || !version || version.characterProfileId !== profile.id
      || version.status !== 'approved'
      || !canonicalAssetId
      || !canReuseCharacterProfile(profile, actor)) {
      throw new RepositoryContractError(
        'character_usage_context_invalid',
        'Character selection is no longer available.',
        409
      );
    }
    assertCharacterDestination(characterType, destination);
    return {
      ...context,
      authorizedCharacterReferenceAssetId: canonicalAssetId,
      authorizedCharacterFaceReferenceAssetId: canonicalFaceAssetId,
      authorizedCharacterFaceReferenceUrl: version.castingFacePreviewUrl || null,
      authorizedCharacterFrontReferenceUrl: version.castingFrontPreviewUrl || null,
      identityPack: {
        characterProfileId: profile.id,
        characterProfileVersionId: version.id,
        canonicalThreeViewAssetId: canonicalAssetId,
        canonicalFaceAssetId,
        ageRange: identityMetadata.ageRange || null,
        characterType,
        outfitBehavior: capabilities.outfitBehavior,
        identityPolicyVersion: 'character-identity-pack-v2',
        status: version.identityPackStatus || (canonicalFaceAssetId
          ? 'identity_pack_ready'
          : 'identity_pack_legacy_fallback')
      },
      identityMetadata,
      characterType,
      outfitBehavior: capabilities.outfitBehavior,
      displayNameSnapshot: profile.displayName,
      personalitySummarySnapshot: normalizeCharacterIdentityText(profile.personalitySummary || ''),
      intendedUsesSnapshot: [...(profile.intendedUses || [])],
      attribution: {
        characterProfileId: profile.id,
        ownerUserId: profile.ownerUserId,
        ownerUsername: profile.ownerUsernameSnapshot || profile.ownerUsername || null,
        displayName: profile.displayName
      }
    };
  }

  async getStats(characterProfileId) {
    return this.usageRepository.aggregate(characterProfileId);
  }
}

export const characterUsageService = new CharacterUsageService();
