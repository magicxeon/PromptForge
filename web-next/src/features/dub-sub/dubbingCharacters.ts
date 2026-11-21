import { voiceApi } from "../../../../web/src/features/voice-studio/api/voiceStudioApi";
import type { VoiceCharacter } from "../../../../web/src/features/voice-studio/schemas/voiceStudioSchemas";
import { assertIdentityEpoch } from "../../../../web/src/lib/auth/actorStore";
import { getIdentitySnapshot } from "../../lib/canonical";

export async function activeCharacters() {
  const characters: VoiceCharacter[] = [];
  const { epoch } = getIdentitySnapshot();
  let cursor: string | undefined;
  do {
    assertIdentityEpoch(epoch);
    const page = await voiceApi.characters(cursor);
    characters.push(...page.items.filter(item => !item.archivedAt));
    cursor = page.nextCursor || undefined;
  } while (cursor);
  return characters;
}
