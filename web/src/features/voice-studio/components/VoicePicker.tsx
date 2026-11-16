import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/Button";
import type { VoiceCatalog } from "../schemas/voiceStudioSchemas";
import { voiceApi } from "../api/voiceStudioApi";
import { WorkspaceDialog } from "./WorkspaceDialog";
import { useVoicePlayback, VoicePlaybackControls } from "./VoicePlayback";

export type VoiceChoice = {
  kind: "prebuilt" | "custom";
  id: string;
  name: string;
};
export function VoicePicker({
  catalog,
  actorId,
  selected,
  onPick,
  onCreateVoice,
}: {
  catalog: VoiceCatalog;
  actorId: string;
  selected: VoiceChoice;
  onPick: (choice: VoiceChoice) => void;
  onCreateVoice?: () => void;
}) {
  const { t } = useTranslation("voice-studio");
  const playback = useVoicePlayback();
  const [open, setOpen] = useState(false),
    [kind, setKind] = useState<"prebuilt" | "custom">(selected.kind),
    [search, setSearch] = useState("");
  const custom = useInfiniteQuery({
    queryKey: ["voice-studio", actorId, "custom-picker", search],
    queryFn: ({ pageParam }) =>
      voiceApi.customVoices(
        new URLSearchParams({
          saved: "true",
          search,
          limit: "20",
          ...(pageParam ? { cursor: pageParam } : {}),
        }),
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor || undefined,
    enabled: open && kind === "custom",
  });
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        {selected.name || t("chooseVoice")}
      </Button>
      <WorkspaceDialog
        open={open}
        onOpenChange={setOpen}
        title={t("chooseVoice")}
      >
        <VoicePlaybackControls />
        <div className="voice-actions">
          <Button
            aria-pressed={kind === "prebuilt"}
            onClick={() => setKind("prebuilt")}
          >
            {t("prebuiltVoices")}
          </Button>
          <Button
            aria-pressed={kind === "custom"}
            onClick={() => setKind("custom")}
          >
            {t("myVoices")}
          </Button>
        </div>
        <label>
          {t("searchVoices")}
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        {kind === "prebuilt" ? (
          catalog.voices
            .filter((voice) =>
              `${voice.displayName} ${voice.id}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((voice) => (
              <div key={voice.id} className="voice-picker-option">
                <div>
                  <strong>{voice.displayName}</strong>
                  <small>{t("prebuiltVoice")}</small>
                </div>
                <Button
                  onClick={() => {
                    onPick({
                      kind: "prebuilt",
                      id: voice.id,
                      name: voice.displayName,
                    });
                    setOpen(false);
                  }}
                >
                  {t("useVoice")}
                </Button>
              </div>
            ))
        ) : (
          <>
            {custom.isLoading ? <p role="status">{t("loading")}</p> : null}
            {custom.isError ? (
              <p role="alert">
                {t("customLoadFailed")}
                <Button onClick={() => void custom.refetch()}>
                  {t("retry")}
                </Button>
              </p>
            ) : null}
            {custom.data?.pages
              .flatMap((page) => page.items)
              .map((voice) => (
                <div className="voice-picker-option" key={voice.id}>
                  <div>
                    <strong>{voice.name}</strong>
                    <small>
                      {voice.language} · {t("customVoice")} ·{" "}
                      {t(`voiceState.${voice.lifecycleState}`)}
                    </small>
                  </div>
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
                  <Button
                    disabled={voice.lifecycleState !== "ready"}
                    onClick={() => {
                      onPick({
                        kind: "custom",
                        id: voice.id,
                        name: voice.name,
                      });
                      setOpen(false);
                    }}
                  >
                    {t("useVoice")}
                  </Button>
                </div>
              ))}
            {!custom.isLoading &&
            !custom.data?.pages.some((page) => page.items.length) ? (
              <p>{t("noSavedVoices")}</p>
            ) : null}
            {custom.hasNextPage ? (
              <Button onClick={() => void custom.fetchNextPage()}>
                {t("moreVoices")}
              </Button>
            ) : null}
          </>
        )}
        {onCreateVoice ? (
          <Button
            variant="primary"
            onClick={() => {
              setOpen(false);
              onCreateVoice();
            }}
          >
            {t("newVoice")}
          </Button>
        ) : null}
      </WorkspaceDialog>
    </>
  );
}
