import type { CharacterSummary } from '../profiles/schemas/profileSchemas';
import type { requestCharacterHandoff } from '../profiles/api/profileApi';

export type SceneCharacterHandoff = Awaited<ReturnType<typeof requestCharacterHandoff>>;
export function isSceneCharacterEligible(item: CharacterSummary, templateMode = false) {
  return item.handoffAvailable && Boolean(item.characterProfileVersionId)
    && item.destinationCapabilities.includes('scene_builder')
    && (!templateMode || item.outfitBehavior === 'replaceable' || item.characterType === 'reusable_model');
}
export function isSceneCharacterHandoffValid(item: CharacterSummary, handoff: SceneCharacterHandoff, templateMode = false) {
  return isSceneCharacterEligible(item, templateMode)
    && handoff.characterProfileId === item.id && handoff.destination === 'scene_builder'
    && handoff.characterProfileContext.characterProfileId === item.id
    && handoff.characterProfileVersionId === item.characterProfileVersionId
    && handoff.characterProfileContext.characterProfileVersionId === item.characterProfileVersionId
    && (!templateMode || handoff.outfitBehavior === 'replaceable') && Boolean(handoff.characterReferenceUrl)
    && handoff.characterProfileContext.purpose === 'character_usage';
}
export function isTemplateCharacterEligible(item: CharacterSummary) {
  return isSceneCharacterEligible(item, true);
}
export function isTemplateCharacterHandoffValid(item: CharacterSummary, handoff: SceneCharacterHandoff) {
  return isSceneCharacterHandoffValid(item, handoff, true);
}
