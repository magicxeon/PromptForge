const CHARACTER_HANDOFF_STATE_KEY = 'mpfCharacterHandoff';

export type CharacterNavigationHandoff = {
  destination: 'fashion_blueprint' | 'scene_builder' | 'playground_image';
  characterReferenceUrl: string;
  characterType?: string;
  outfitBehavior?: string;
  characterProfileContext: Record<string, unknown>;
  [key: string]: unknown;
};

export function createCharacterHandoffNavigationState(
  handoff: CharacterNavigationHandoff
) {
  return { [CHARACTER_HANDOFF_STATE_KEY]: handoff };
}

export function readCharacterHandoffNavigationState(
  state: unknown,
  destination: CharacterNavigationHandoff['destination']
): CharacterNavigationHandoff | null {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return null;
  const candidate = (state as Record<string, unknown>)[CHARACTER_HANDOFF_STATE_KEY];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
  const handoff = candidate as Record<string, unknown>;
  const context = handoff.characterProfileContext;
  if (handoff.destination !== destination
    || typeof handoff.characterReferenceUrl !== 'string'
    || !handoff.characterReferenceUrl.trim()
    || !context
    || typeof context !== 'object'
    || Array.isArray(context)
    || (context as Record<string, unknown>).purpose !== 'character_usage'
    || typeof (context as Record<string, unknown>).characterProfileId !== 'string'
    || typeof (context as Record<string, unknown>).characterProfileVersionId !== 'string') {
    return null;
  }
  return handoff as CharacterNavigationHandoff;
}
