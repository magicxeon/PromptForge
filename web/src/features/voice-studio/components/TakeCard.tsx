import { voiceErrorMessage } from "../api/voiceStudioErrors";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/Button";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import type { VoiceTake, VoiceCatalog } from "../schemas/voiceStudioSchemas";
import { voiceApi } from "../api/voiceStudioApi";
import { useVoicePlayback } from "./VoicePlayback";

export function TakeCard({
  take,
  selected,
  stale,
  onSelect,
  onChange,
  onSource,
  manager = false,
  policy,
}: {
  take: VoiceTake;
  selected?: boolean;
  stale?: boolean;
  onSelect?: () => Promise<void>;
  onChange: () => void;
  onSource?: () => void;
  manager?: boolean;
  policy?: VoiceCatalog["policy"];
}) {
  const { t } = useTranslation("voice-studio");
  const playback = useVoicePlayback();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(take.displayTitle);
  const [tags, setTags] = useState(take.tags.join(", "));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function act(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      onChange();
      setEditing(false);
    } catch (e) {
      setError(voiceErrorMessage(e, t));
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="voice-take">
      <div className="voice-line">
        <strong>{take.displayTitle}</strong>
        <span>{(take.durationMs / 1000).toFixed(1)} s</span>
        {selected ? <span className="voice-badge">{t("selected")}</span> : null}
        {take.savedAt ? (
          <span className="voice-badge">{t("savedAudio")}</span>
        ) : null}
      </div>
      <p className="voice-muted">
        {take.inputSnapshot.characterName} · {take.inputSnapshot.modelId} ·{" "}
        {new Date(take.createdAt).toLocaleString()}
      </p>
      {stale ? <p className="voice-warning">{t("stale")}</p> : null}
      <div className="voice-actions">
        <Button disabled={busy} onClick={() => void playback.play([take])}>
          {playback.playingId === take.id ? t("replay") : t("listen")}
        </Button>
        {onSelect ? (
          <Button
            disabled={busy || selected}
            onClick={() => void act(onSelect)}
          >
            {t("useTake")}
          </Button>
        ) : null}
        <Button
          disabled={busy || Boolean(take.savedAt)}
          onClick={() => void act(() => voiceApi.saveTake(take.id))}
        >
          {t("saveAudio")}
        </Button>
        <Button onClick={() => void playback.download(take)}>
          {t("download")}
        </Button>
      </div>
      {editing ? (
        <form
          className="voice-form"
          onSubmit={(event) => {
            event.preventDefault();
            void act(() => {
              const parsedTags = tags
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean);
              if (
                parsedTags.length > (Number(policy?.maxTags) || 10) ||
                parsedTags.some(
                  (tag) =>
                    [...tag].length > (Number(policy?.maxTagLength) || 40),
                )
              )
                throw new Error(t("invalidTags"));
              return voiceApi.updateTake(
                take.id,
                take.metadataRevision,
                title,
                parsedTags,
              );
            });
          }}
        >
          <label>
            {t("audioName")}
            <input
              value={title}
              required
              maxLength={Number(policy?.maxTitleLength) || 120}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label>
            {t("tags")}
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
            />
          </label>
          <Button type="submit" loading={busy}>
            {t("saveChanges")}
          </Button>
        </form>
      ) : null}
      <details>
        <summary>{t("moreAudioActions")}</summary>
        <div className="voice-actions">
          {" "}
          {onSource ? (
            <Button onClick={onSource}>{t("openScript")}</Button>
          ) : null}
          {manager ? (
            <>
              <Button onClick={() => setEditing(!editing)}>
                {t("editMetadata")}
              </Button>
              <ConfirmDialog
                trigger={
                  <Button variant="danger" disabled={busy}>
                    {t("delete")}
                  </Button>
                }
                title={t("deleteAudio")}
                description={t("deleteDescription", {
                  name: take.displayTitle,
                })}
                confirmLabel={t("delete")}
                destructive
                onConfirm={() => void act(() => voiceApi.deleteTake(take.id))}
              />
            </>
          ) : null}
        </div>
        <h3>{t("generationDetails")}</h3>
        <p className="voice-transcript">{take.inputSnapshot.text}</p>
        <p>
          {Object.values(take.inputSnapshot.delivery)
            .filter(Boolean)
            .join(" · ")}
        </p>
      </details>
      {error ? <p role="alert">{error}</p> : null}
    </article>
  );
}
