import { voiceApi } from "../../../../web/src/features/voice-studio/api/voiceStudioApi";
import type { CustomVoice, VoiceCharacter } from "../../../../web/src/features/voice-studio/schemas/voiceStudioSchemas";
import config from "./dubbing-voice-config.json";
import { assertIdentityEpoch } from "../../../../web/src/lib/auth/actorStore";
import { getIdentitySnapshot } from "../../lib/canonical";
import type { Project } from "./projectApi";

export function dubbingReadiness(project: Project, language: string,
  choices: Awaited<ReturnType<typeof loadDubbingChoices>>, draftVoices = new Map<string, string | undefined>()) {
  const available = new Set(choices.voices.map(voice => voice.id));
  const characterVoices = new Map(choices.characters.filter(c => c.voiceKind === "custom").map(c => [c.id, c.voiceId]));
  const mappedVoice = (speaker: string) => draftVoices.get(speaker) ??
    characterVoices.get(project.characterMappings[language]?.[speaker]);
  const issues = project.cues.flatMap(cue => {
    const binding = cue.voiceBindings[language];
    const voice = binding?.characterId && !binding.usesSpeakerMapping
      ? characterVoices.get(binding.characterId) : mappedVoice(cue.speaker || "");
    const script = binding?.dubText ?? cue.translations[language] ?? (project.sourceLanguage === language ? cue.text : "");
    const needsScript = !script.trim();
    const needsVoice = !voice || !available.has(voice);
    return needsScript || needsVoice ? [{cue, needsScript, needsVoice}] : [];
  });
  return {issues, mappedVoice};
}

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

export async function loadDubbingChoices(language: string) {
  const { epoch } = getIdentitySnapshot();
  const voices: CustomVoice[] = [];
  let cursor: string | undefined;
  do {
    assertIdentityEpoch(epoch);
    const params = new URLSearchParams({ saved: "true", modelId: config.modelId, limit: "50" });
    if (cursor) params.set("cursor", cursor);
    const page = await voiceApi.customVoices(params);
    voices.push(...page.items.filter(v => v.modelId === config.modelId && v.language === language && v.savedAt && v.lifecycleState === "ready"));
    cursor = page.nextCursor || undefined;
  } while (cursor);
  assertIdentityEpoch(epoch);
  const characters = await activeCharacters();
  assertIdentityEpoch(epoch);
  return { voices, characters };
}
