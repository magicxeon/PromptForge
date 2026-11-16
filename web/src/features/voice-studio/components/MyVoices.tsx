import { useEffect, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/Button";
import { voiceApi } from "../api/voiceStudioApi";
import type {
  VoiceCatalog,
  VoiceCharacter,
} from "../schemas/voiceStudioSchemas";
import { WorkspaceDialog } from "./WorkspaceDialog";
import { VoiceDesignForm } from "./VoiceDesignForm";
import { CustomVoiceCard } from "./CustomVoiceCard";
import type { VoiceChoice } from "./VoicePicker";

export function MyVoices({
  catalog,
  characters,
  actorId,
  onUse,
  onManageCharacters,
  startDesign = false,
  onDesignOpened,
}: {
  catalog: VoiceCatalog;
  characters: VoiceCharacter[];
  actorId: string;
  onUse: (choice: VoiceChoice) => void;
  onManageCharacters: () => void;
  startDesign?: boolean;
  onDesignOpened?: () => void;
}) {
  const { t } = useTranslation("voice-studio");
  const client = useQueryClient();
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [archived, setArchived] = useState(false),
    [designOpen, setDesignOpen] = useState(false),
    [recoveryId, setRecoveryId] = useState<string | undefined>();
  const list = useInfiniteQuery({
    queryKey: [
      "voice-studio",
      actorId,
      "custom-voices",
      search,
      filter,
      archived,
    ],
    queryFn: ({ pageParam }) =>
      voiceApi.customVoices(
        new URLSearchParams({
          search,
          archived: String(archived),
          limit: "20",
          ...(filter === "saved"
            ? { saved: "true" }
            : filter === "candidates"
              ? { saved: "false" }
              : {}),
          ...(pageParam ? { cursor: pageParam } : {}),
        }),
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor || undefined,
  });
  const refresh = () => {
    void client.invalidateQueries({
      queryKey: ["voice-studio", actorId, "custom-voices"],
    });
    void client.invalidateQueries({
      queryKey: ["voice-studio", actorId, "custom-picker"],
    });
  };
  const operations = list.data?.pages[0]?.operations || [];
  useEffect(() => {
    if (startDesign) {
      setRecoveryId(undefined);
      setDesignOpen(true);
      onDesignOpened?.();
    }
  }, [startDesign]);
  return (
    <section className="voice-my-voices" aria-label={t("myVoices")}>
      <div className="voice-my-voices-toolbar">
        <div>
          <h2>{t("myVoices")}</h2>
          <p className="voice-muted">{t("myVoicesDescription")}</p>
        </div>
        <div className="voice-actions">
          <Button
            variant="primary"
            onClick={() => {
              setRecoveryId(undefined);
              setDesignOpen(true);
            }}
          >
            {t("newVoice")}
          </Button>
          <Button onClick={onManageCharacters}>{t("characterVoices")}</Button>
        </div>
      </div>
      <div className="voice-library-toolbar">
        <label className="voice-library-search">
          {t("searchVoices")}
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          {t("voiceType")}
          <select
            aria-label={t("voiceType")}
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="all">{t("all")}</option>
            <option value="saved">{t("savedCustomVoices")}</option>
            <option value="candidates">{t("designCandidates")}</option>
            <option value="prebuilt">{t("prebuiltVoices")}</option>
          </select>
        </label>
        <label className="voice-enabled">
          <input
            type="checkbox"
            checked={archived}
            onChange={(event) => setArchived(event.target.checked)}
          />
          {t("showArchivedVoices")}
        </label>
      </div>
      {list.isError ? (
        <p role="alert">
          {t("customLoadFailed")}
          <Button onClick={() => void list.refetch()}>{t("retry")}</Button>
        </p>
      ) : null}
      {operations.length ? (
        <div className="voice-design-recovery">
          {operations.map((operation) => (
            <div key={operation.id}>
              <span>{t("pendingDesign", { id: operation.id })}</span>
              <Button
                onClick={() => {
                  setRecoveryId(operation.id);
                  setDesignOpen(true);
                }}
              >
                {t("recoverDesign")}
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      {filter !== "prebuilt" ? (
        <div className="voice-custom-grid">
          {list.data?.pages
            .flatMap((page) => page.items)
            .map((voice) => (
              <CustomVoiceCard
                key={voice.id}
                voice={voice}
                catalog={catalog}
                characters={characters}
                onChange={refresh}
                onUse={onUse}
              />
            ))}
        </div>
      ) : null}
      {list.isLoading ? <p role="status">{t("loading")}</p> : null}
      {!list.isLoading &&
      filter !== "prebuilt" &&
      !list.data?.pages.some((page) => page.items.length) ? (
        <p className="voice-muted">{t("noCustomVoices")}</p>
      ) : null}
      {filter === "all" || filter === "prebuilt" ? (
        <section>
          <h3>{t("prebuiltVoices")}</h3>
          <div className="voice-prebuilt-grid">
            {catalog.voices
              .filter((voice) =>
                voice.displayName
                  .toLocaleLowerCase()
                  .includes(search.toLocaleLowerCase()),
              )
              .map((voice) => (
                <div className="voice-picker-option" key={voice.id}>
                  <div>
                    <strong>{voice.displayName}</strong>
                    <small>{t("prebuiltVoice")}</small>
                  </div>
                  <Button
                    onClick={() =>
                      onUse({
                        kind: "prebuilt",
                        id: voice.id,
                        name: voice.displayName,
                      })
                    }
                  >
                    {t("useWithCharacter")}
                  </Button>
                </div>
              ))}
          </div>
        </section>
      ) : null}
      {list.hasNextPage ? (
        <Button onClick={() => void list.fetchNextPage()}>
          {t("moreVoices")}
        </Button>
      ) : null}
      <WorkspaceDialog
        open={designOpen}
        onOpenChange={setDesignOpen}
        title={t("newVoice")}
      >
        <VoiceDesignForm
          key={recoveryId || "new"}
          catalog={catalog}
          actorId={actorId}
          recoveryId={recoveryId}
          onChange={refresh}
          onUse={(voice) => {
            setDesignOpen(false);
            onUse({ kind: "custom", id: voice.id, name: voice.name });
          }}
        />
      </WorkspaceDialog>
    </section>
  );
}
