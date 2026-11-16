import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/Button";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { voiceApi } from "../api/voiceStudioApi";
import { voiceErrorMessage } from "../api/voiceStudioErrors";
import type {
  CustomVoice,
  VoiceCatalog,
  VoiceCharacter,
} from "../schemas/voiceStudioSchemas";
import { useVoicePlayback } from "./VoicePlayback";
import type { VoiceChoice } from "./VoicePicker";

export function CustomVoiceCard({
  voice,
  catalog,
  characters,
  onChange,
  onUse,
}: {
  voice: CustomVoice;
  catalog: VoiceCatalog;
  characters: VoiceCharacter[];
  onChange: () => void;
  onUse: (choice: VoiceChoice) => void;
}) {
  const { t } = useTranslation("voice-studio");
  const playback = useVoicePlayback();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [editing, setEditing] = useState(false),
    [name, setName] = useState(voice.name),
    [description, setDescription] = useState(voice.displayDescription);
  const users = characters.filter(
    (character) =>
      character.voiceKind === "custom" && character.voiceId === voice.id,
  );
  async function act(run: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await run();
      onChange();
      setEditing(false);
    } catch (error) {
      setError(voiceErrorMessage(error, t));
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="voice-custom-card">
      <header className="voice-line">
        <strong>{voice.name}</strong>
        <span className="voice-badge">{t("customVoice")}</span>
        <span className="voice-muted">
          {voice.language} · {t(`voiceState.${voice.lifecycleState}`)}
        </span>
      </header>
      <p className="voice-muted">{voice.displayDescription}</p>
      <p className="voice-muted">
        {t("usedByCharacters", {
          names:
            users.map((character) => character.name).join(", ") || t("notUsed"),
        })}
      </p>
      <div className="voice-actions">
        <Button
          onClick={() =>
            void playback.play([
              {
                id: voice.id,
                audioUrl: voice.audioUrl,
                displayTitle: voice.name,
              },
            ])
          }
        >
          {t("listenSample")}
        </Button>
        {!voice.savedAt ? (
          <Button
            disabled={busy || voice.lifecycleState !== "ready"}
            onClick={() => void act(() => voiceApi.saveCustomVoice(voice.id))}
          >
            {t("saveVoice")}
          </Button>
        ) : (
          <Button
            disabled={voice.lifecycleState !== "ready"}
            onClick={() =>
              onUse({ kind: "custom", id: voice.id, name: voice.name })
            }
          >
            {t("useWithCharacter")}
          </Button>
        )}
        <details className="voice-row-menu">
          <summary>{t("moreAudioActions")}</summary>
          <div className="voice-row-menu-content">
            <Button onClick={() => setEditing(!editing)}>
              {t("editVoiceMetadata")}
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                void act(() =>
                  voiceApi.updateCustomVoice(voice.id, {
                    expectedRevision: voice.revision,
                    archived: !voice.archivedAt,
                  }),
                )
              }
            >
              {voice.archivedAt ? t("restoreVoice") : t("archive")}
            </Button>
            <ConfirmDialog
              trigger={
                <Button variant="danger" disabled={busy}>
                  {t("delete")}
                </Button>
              }
              title={t("deleteVoice")}
              description={t("deleteVoiceDescription", { name: voice.name })}
              confirmLabel={t("delete")}
              destructive
              onConfirm={() => {
                playback.stop();
                void act(() => voiceApi.deleteCustomVoice(voice.id));
              }}
            />
          </div>
        </details>
      </div>
      {editing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void act(() =>
              voiceApi.updateCustomVoice(voice.id, {
                expectedRevision: voice.revision,
                name,
                displayDescription: description,
              }),
            );
          }}
        >
          <label>
            {t("voiceName")}
            <input
              value={name}
              required
              maxLength={Number(catalog.policy.maxTitleLength) || 120}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            {t("displayDescription")}
            <textarea
              value={description}
              required
              rows={3}
              maxLength={Number(catalog.policy.maxDesignLength) || 1000}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <p className="voice-muted">{t("voiceMetadataScope")}</p>
          <Button type="submit" loading={busy}>
            {t("saveChanges")}
          </Button>
        </form>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
    </article>
  );
}
