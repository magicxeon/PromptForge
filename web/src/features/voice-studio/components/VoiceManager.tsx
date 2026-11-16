import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/Button";
import { voiceApi } from "../api/voiceStudioApi";
import type {
  VoiceCatalog,
  VoiceCharacter,
  VoiceDocument,
} from "../schemas/voiceStudioSchemas";
import { TakeCard } from "./TakeCard";
import { WorkspaceDialog } from "./WorkspaceDialog";
import { SlidersHorizontal } from "lucide-react";

export function VoiceManager({
  actorId,
  catalog,
  characters,
  documents,
  onSource,
}: {
  actorId: string;
  catalog: VoiceCatalog;
  characters: VoiceCharacter[];
  documents: VoiceDocument[];
  onSource: (id: string) => void;
}) {
  const { t } = useTranslation("voice-studio");

  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [saved, setSaved] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [characterId, setCharacterId] = useState("");
  const [modelId, setModelId] = useState("");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState("newest");
  const [cursor, setCursor] = useState("");
  const params = new URLSearchParams({
    search,
    saved,
    documentId,
    characterPresetId: characterId,
    modelId,
    tag,
    sort,
    limit: "20",
    ...(cursor ? { cursor } : {}),
  });
  const library = useQuery({
    queryKey: ["voice-studio", actorId, "library", params.toString()],
    queryFn: () => voiceApi.library(params),
  });
  function filter(setter: (value: string) => void, value: string) {
    setter(value);
    setCursor("");
  }
  const activeFilters = [
    {
      id: "saved",
      label: saved ? t("savedAudio") : "",
      clear: () => filter(setSaved, ""),
    },
    {
      id: "document",
      label:
        documents.find((doc) => doc.id === documentId)?.title || documentId,
      clear: () => filter(setDocumentId, ""),
    },
    {
      id: "character",
      label:
        characters.find((character) => character.id === characterId)?.name ||
        characterId,
      clear: () => filter(setCharacterId, ""),
    },
    {
      id: "model",
      label:
        catalog.models.find((model) => model.id === modelId)?.displayName ||
        modelId,
      clear: () => filter(setModelId, ""),
    },
    { id: "tag", label: tag, clear: () => filter(setTag, "") },
  ].filter((item) => item.label);
  return (
    <section className="voice-audio-manager" aria-label={t("audioLibrary")}>
      <div className="voice-library-toolbar">
        <label className="voice-library-search">
          {t("search")}
          <input
            value={search}
            onChange={(event) => filter(setSearch, event.target.value)}
          />
        </label>
        <Button
          className="voice-library-filter-trigger"
          icon={<SlidersHorizontal className="size-4" aria-hidden="true" />}
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen(true)}
        >
          {t("filters")}
          {activeFilters.length ? ` (${activeFilters.length})` : ""}
        </Button>
        <WorkspaceDialog
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          title={t("filters")}
          className="voice-library-filter-dialog"
        >
          <div className="voice-filters">
            <label>
              {t("status")}
              <select
                aria-label={t("status")}
                value={saved}
                onChange={(e) => filter(setSaved, e.target.value)}
              >
                <option value="">{t("allAudio")}</option>
                <option value="true">{t("savedAudio")}</option>
              </select>
            </label>
            <label>
              {t("script")}
              <select
                aria-label={t("script")}
                value={documentId}
                onChange={(e) => filter(setDocumentId, e.target.value)}
              >
                <option value="">{t("all")}</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("character")}
              <select
                aria-label={t("character")}
                value={characterId}
                onChange={(e) => filter(setCharacterId, e.target.value)}
              >
                <option value="">{t("all")}</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("model")}
              <select
                aria-label={t("model")}
                value={modelId}
                onChange={(e) => filter(setModelId, e.target.value)}
              >
                <option value="">{t("all")}</option>
                {catalog.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("tag")}
              <input
                value={tag}
                onChange={(e) => filter(setTag, e.target.value)}
              />
            </label>
            <label>
              {t("sort")}
              <select
                aria-label={t("sort")}
                value={sort}
                onChange={(e) => filter(setSort, e.target.value)}
              >
                <option value="newest">{t("newest")}</option>
                <option value="name">{t("name")}</option>
              </select>
            </label>
            <Button onClick={() => setFiltersOpen(false)}>{t("close")}</Button>
          </div>
        </WorkspaceDialog>
        <span className="voice-muted" role="status">
          {t("pageResults", { count: library.data?.items.length || 0 })}
        </span>
      </div>
      {activeFilters.length ? (
        <div className="voice-filter-chips">
          {activeFilters.map((item) => (
            <Button
              key={item.id}
              size="sm"
              variant="ghost"
              onClick={item.clear}
            >
              {item.label} ×
            </Button>
          ))}
          <Button
            size="sm"
            onClick={() => {
              setSaved("");
              setDocumentId("");
              setCharacterId("");
              setModelId("");
              setTag("");
              setSearch("");
              setCursor("");
            }}
          >
            {t("clearFilters")}
          </Button>
        </div>
      ) : null}

      {library.isLoading ? <p role="status">{t("loading")}</p> : null}
      {library.isError ? (
        <p role="alert">
          {library.error.message}
          <Button onClick={() => void library.refetch()}>{t("retry")}</Button>
        </p>
      ) : null}
      {!library.isLoading && !library.data?.items.length ? (
        <p>{t("noAudio")}</p>
      ) : null}
      <div className="voice-library">
        {library.data?.items.map((take) => (
          <TakeCard
            key={take.id}
            take={take}
            policy={catalog.policy}
            manager
            onChange={() => void library.refetch()}
            onSource={() => onSource(take.documentId)}
          />
        ))}
      </div>
      <div className="voice-actions">
        {cursor ? (
          <Button onClick={() => setCursor("")}>{t("firstPage")}</Button>
        ) : null}
        {library.data?.nextCursor ? (
          <Button onClick={() => setCursor(library.data!.nextCursor!)}>
            {t("nextPage")}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
