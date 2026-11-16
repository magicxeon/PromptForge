import { voiceErrorMessage } from "../api/voiceStudioErrors";
import { useEffect, useState } from "react";
import { VoicePicker, type VoiceChoice } from "./VoicePicker";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/Button";
import { voiceApi } from "../api/voiceStudioApi";
import type {
  VoiceCatalog,
  VoiceCharacter,
  CustomVoice,
} from "../schemas/voiceStudioSchemas";

export function CharacterVoices({
  characters,
  catalog,
  onChange,
  actorId,
  customVoices = [],
  initialChoice,
  initialCharacterId,
  onSaved,
  onCreateVoice,
}: {
  actorId: string;
  customVoices?: CustomVoice[];
  initialChoice?: VoiceChoice | null;
  initialCharacterId?: string;
  onSaved?: (character: VoiceCharacter) => void;
  onCreateVoice?: () => void;
  characters: VoiceCharacter[];
  catalog: VoiceCatalog;
  onChange: () => void;
}) {
  const { t } = useTranslation("voice-studio");
  const initialCharacter = characters.find(
    (character) => character.id === initialCharacterId,
  );
  const [editing, setEditing] = useState<VoiceCharacter | null>(
    initialCharacter || null,
  );
  const [showArchived, setShowArchived] = useState(false);
  const [name, setName] = useState(initialCharacter?.name || "");
  const [choice, setChoice] = useState<VoiceChoice>(
    initialChoice || {
      kind: initialCharacter?.voiceKind || "prebuilt",
      id: initialCharacter?.voiceId || catalog.voices[0]?.id || "",
      name:
        initialCharacter?.voiceKind === "custom"
          ? t("customVoice")
          : catalog.voices.find(
              (voice) => voice.id === initialCharacter?.voiceId,
            )?.displayName ||
            catalog.voices[0]?.displayName ||
            "",
    },
  );
  const [color, setColor] = useState(initialCharacter?.color || "#8b5cf6");
  useEffect(() => {
    if (choice.kind === "custom") {
      const found = customVoices.find((voice) => voice.id === choice.id);
      if (found && found.name !== choice.name)
        setChoice((previous) => ({ ...previous, name: found.name }));
    }
  }, [customVoices, choice.id, choice.kind]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    setBusy(true);
    setError("");
    try {
      const saved = await voiceApi.saveCharacter({
        id: editing?.id,
        expectedRevision: editing?.revision,
        name,
        color,
        voiceId: choice.id,
        voiceKind: choice.kind,
      });
      setEditing(null);
      setName("");
      onChange();
      onSaved?.(saved);
    } catch (e) {
      setError(voiceErrorMessage(e, t));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="voice-characters">
      <h2>{t("characterVoices")}</h2>
      <p className="voice-muted">{t("characterDescription")}</p>
      <form
        className="voice-form"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <label>
          {t("characterName")}
          <input
            value={name}
            required
            maxLength={Number(catalog.policy.maxTitleLength) || 120}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          {t("voice")}
          <VoicePicker
            catalog={catalog}
            actorId={actorId}
            selected={choice}
            onPick={setChoice}
            onCreateVoice={onCreateVoice}
          />
        </label>
        <label>
          {t("color")}
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
          />
        </label>
        {editing &&
        (choice.id !== editing.voiceId || choice.kind !== editing.voiceKind) ? (
          <p className="voice-warning">{t("sharedPresetWarning")}</p>
        ) : null}
        <div className="voice-actions">
          <Button loading={busy} disabled={!choice.id} type="submit">
            {editing ? t("saveChanges") : t("addCharacter")}
          </Button>
          {editing ? (
            <Button
              onClick={() => {
                setEditing(null);
                setName("");
              }}
            >
              {t("cancel")}
            </Button>
          ) : null}
        </div>
      </form>
      {error ? <p role="alert">{error}</p> : null}
      <label className="voice-enabled">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(event) => setShowArchived(event.target.checked)}
        />
        {t("showArchivedCharacters")}
      </label>
      <div className="voice-character-list">
        {characters
          .filter((character) => showArchived || !character.archivedAt)
          .map((character) => (
            <div className="voice-character" key={character.id}>
              <span
                className="voice-dot"
                style={{ backgroundColor: character.color }}
              />
              <strong>{character.name}</strong>
              <span>
                {character.voiceKind === "custom"
                  ? customVoices.find((voice) => voice.id === character.voiceId)
                      ?.name || t("customVoice")
                  : character.voiceId}
                {character.archivedAt ? ` (${t("archived")})` : ""}
              </span>
              <Button
                onClick={() => {
                  setEditing(character);
                  setName(character.name);
                  setChoice({
                    kind: character.voiceKind,
                    id: character.voiceId,
                    name:
                      character.voiceKind === "custom"
                        ? customVoices.find(
                            (voice) => voice.id === character.voiceId,
                          )?.name || t("customVoice")
                        : catalog.voices.find(
                            (voice) => voice.id === character.voiceId,
                          )?.displayName || character.voiceId,
                  });
                  setColor(character.color);
                }}
              >
                {t("edit")}
              </Button>
              <Button
                onClick={() => {
                  void voiceApi
                    .archiveCharacter(
                      character.id,
                      character.revision,
                      !character.archivedAt,
                    )
                    .then(onChange)
                    .catch((e) => setError(voiceErrorMessage(e, t)));
                }}
              >
                {character.archivedAt ? t("restoreCharacter") : t("archive")}
              </Button>
            </div>
          ))}
      </div>
    </section>
  );
}
