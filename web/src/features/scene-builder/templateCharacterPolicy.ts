import type { CharacterSummary } from '../profiles/schemas/profileSchemas';
import type { requestCharacterHandoff } from '../profiles/api/profileApi';

export type SceneCharacterHandoff = Awaited<ReturnType<typeof requestCharacterHandoff>>;
export function isTemplateCharacterEligible(item: CharacterSummary) {
  return item.handoffAvailable && Boolean(item.characterProfileVersionId)
    && item.destinationCapabilities.includes('scene_builder')
    && (item.outfitBehavior === 'replaceable' || item.characterType === 'reusable_model');
}
export function isTemplateCharacterHandoffValid(item: CharacterSummary, handoff: SceneCharacterHandoff) {
  return handoff.characterProfileId === item.id && handoff.destination === 'scene_builder'
    && handoff.outfitBehavior === 'replaceable' && Boolean(handoff.characterReferenceUrl)
    && handoff.characterProfileContext.purpose === 'character_usage';
}
