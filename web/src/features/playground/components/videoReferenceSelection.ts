import type {
  PlaygroundVideoReference,
  VideoGenerationInput,
} from '../../generation/api/videoGenerationApi';
import type { VideoModelCapability } from '../../generation/schemas/videoGenerationSchemas';
import type {
  CharacterLook,
  CharacterSummary,
} from '../../profiles/schemas/profileSchemas';
import type { PlaygroundVideoOperation } from './videoModelSelection';
import type { TrustedVideoSource } from '../api/trustedVideoSources';

export type VideoLookSheet = {
  characterName?: string;
  url: string;
  generated?: boolean;
  name: string;
  assetId?: string;
  lookId?: string;
  versionId?: string;
  characterProfileId?: string;
  characterProfileVersionId?: string;
};
export type VideoReferenceSelection = {
  lookSheets?: VideoLookSheet[];
  trustedLooks?: NamedTrustedVideoSource[];
  operation: PlaygroundVideoOperation;
  referenceImageUrl: string | null;
  character: CharacterSummary | null;
  lookSheet: VideoLookSheet | null;
  trustedFrame?: TrustedVideoSource | null;
  trustedLook?: NamedTrustedVideoSource | null;
};

export type NamedTrustedVideoSource = TrustedVideoSource & { characterName?: string };
export const selectedLooks = (value: VideoReferenceSelection) => value.lookSheets ?? (value.lookSheet ? [value.lookSheet] : []);
export const selectedTrustedLooks = (value: VideoReferenceSelection): NamedTrustedVideoSource[] => value.trustedLooks ?? (value.trustedLook ? [value.trustedLook] : []);

export function lookNameProblem(looks: Array<{ characterName?: string }>) {
  const names = looks.map(look => look.characterName?.trim().toLowerCase()).filter(Boolean);
  return looks.some(look => (look.characterName?.length || 0) > 80 || [...(look.characterName || '')].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127))
    || new Set(names).size !== names.length ? 'playground.video.references.invalidNames' : null;
}

export function approvedVideoLooks(
  looks: CharacterLook[],
  character: CharacterSummary,
) {
  return looks.flatMap((look) => {
    const version = look.versions.find(
      (item) =>
        item.id === look.approvedVersionId && item.status === 'approved',
    );
    if (
      look.lifecycleStatus === 'retired' ||
      look.sourceCharacterProfileVersionId !==
        character.characterProfileVersionId ||
      !version?.approvedSheetAsset
    )
      return [];
    return [
      {
        name: look.name,
        lookId: look.id,
        versionId: version.id,
        characterProfileId: character.id,
        characterProfileVersionId: character.characterProfileVersionId || undefined,
        url: `/api/character-profiles/${encodeURIComponent(character.id)}/looks/${encodeURIComponent(look.id)}/versions/${encodeURIComponent(version.id)}/media/sheet`,
      },
    ];
  });
}

export function buildVideoReferenceSelection(
  selection: VideoReferenceSelection,
  model: VideoModelCapability | null,
) {
  const inputMode: NonNullable<VideoGenerationInput['inputMode']> =
    selection.operation === 'character_to_video'
      ? 'multimodal_reference'
      : selection.operation;
  const references: PlaygroundVideoReference[] = [];
  if (model?.playgroundReferencePolicy?.kind === 'trusted_generated_only') {
    const sources = [];
    if (inputMode !== 'text_to_video' && selection.trustedFrame) {
      sources.push(selection.trustedFrame);
      references.push({ generationId: selection.trustedFrame.id, purpose: 'opening_frame',
        role: inputMode === 'image_to_video' ? 'first_frame' : 'reference_image' });
    }
    const looks = inputMode === 'multimodal_reference' ? selectedTrustedLooks(selection) : [];
    for (const look of looks) {
      sources.push(look);
      references.push({ generationId: look.id, purpose: 'generated_look', role: 'reference_image', characterName: look.characterName?.trim() || undefined });
    }
    const reason = !model.inputModes.includes(inputMode) ? 'playground.video.references.unsupportedMode'
      : inputMode === 'image_to_video' && !selection.trustedFrame ? 'playground.video.references.needFrame'
      : inputMode === 'multimodal_reference' && !looks.length ? 'playground.video.references.needLook'
      : sources.some(source => !source.eligible || source.policyVersion !== model.playgroundReferencePolicy?.version
        || !source.expiresAt || Date.parse(source.expiresAt) <= Date.now()) ? 'playground.video.trusted.unavailable'
      : new Set(sources.map(source => source.id)).size !== sources.length ? 'playground.video.trusted.duplicate'
      : references.length > model.referenceImageLimit || (references.length > 1 && !model.supportsOrderedImageReferences)
        ? 'playground.video.references.unsupportedCount' : lookNameProblem(looks);
    return { inputMode, references, reason, ready: !reason };
  }
  if (inputMode !== 'text_to_video' && selection.referenceImageUrl)
    references.push({
      role: inputMode === 'image_to_video' ? 'first_frame' : 'reference_image',
      purpose: 'opening_frame',
      referenceImageUrl: selection.referenceImageUrl,
    });
  const looks = inputMode === 'multimodal_reference' ? selectedLooks(selection) : [];
  const look = looks[0];
  const character = inputMode === 'multimodal_reference' ? selection.character : null;
  // Legacy pinned Looks carry Character attribution, not a second identity image.
  if (character && !look) references.push({
    role: 'reference_image', purpose: 'character_reference', characterProfileId: character.id,
  });
  for (const look of looks)
    references.push({
      characterName: look.characterName?.trim() || undefined,
      role: 'reference_image',
      referenceImageUrl: look.url,
      ...(look.lookId
        ? {
            purpose: 'character_look' as const,
            characterProfileId: look.characterProfileId || selection.character?.id,
            characterLookId: look.lookId,
            characterLookVersionId: look.versionId,
          }
        : { purpose: look.generated ? 'generated_look' as const : 'look_sheet_upload' as const, assetId: look.assetId }),
    });
  const modes = model?.inputModes.length
    ? model.inputModes
    : model?.operations.map((value) =>
        value === 'character_to_video' ? 'multimodal_reference' : value,
      );
  const reason = lookNameProblem(looks) || (
    character && looks.some(item => !item.lookId)
      ? 'playground.video.references.identityConflict'
      : !model || !modes?.includes(inputMode)
      ? 'playground.video.references.unsupportedMode'
      : references.length > model.referenceImageLimit ||
          (references.length > 1 && !model.supportsOrderedImageReferences)
        ? 'playground.video.references.unsupportedCount'
        : inputMode === 'image_to_video' && !references.length
          ? 'playground.video.references.needFrame'
          : inputMode === 'multimodal_reference' && !look && !character
            ? 'playground.video.references.needIdentity'
            : new Set(references.map(row => row.referenceImageUrl || row.characterProfileId)).size !== references.length
              ? 'playground.video.trusted.duplicate' : null);
  return { inputMode, references, reason, ready: !reason };
}
