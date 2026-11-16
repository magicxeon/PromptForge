import { voiceErrorMessage } from "../api/voiceStudioErrors";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  resolveVoiceStudioView,
  type VoiceStudioView,
} from "../../../app/routeRegistry/routes";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useActor } from "../../../lib/auth/ActorProvider";
import { Button } from "../../../components/ui/Button";
import { ProcessingSpinner } from "../../../components/ui/ProcessingSpinner";

import { voiceApi } from "../api/voiceStudioApi";
import type { VoiceDocument } from "../schemas/voiceStudioSchemas";
import { duplicateRow, moveRow, newRow } from "../model/rowCommands";
import { VoicePlayback, useVoicePlayback } from "../components/VoicePlayback";
import { DialogueRowEditor } from "../components/DialogueRowEditor";
import { CharacterVoices } from "../components/CharacterVoices";
import { VoiceManager } from "../components/VoiceManager";
import { RowInspector } from "../components/RowInspector";
import { MyVoices } from "../components/MyVoices";
import type { VoiceChoice } from "../components/VoicePicker";
import { WorkspaceDialog } from "../components/WorkspaceDialog";
import { UnsavedChangesGuard } from "../components/UnsavedChangesGuard";
import "../voice-studio.css";

export function VoiceStudioRoute() {
  const { actor, identityScope } = useActor();
  return (
    <VoicePlayback key={identityScope}>
      <Workspace actorId={actor?.userId || ""} />
    </VoicePlayback>
  );
}
function Workspace({ actorId }: { actorId: string }) {
  const { t } = useTranslation("voice-studio");
  const playback = useVoicePlayback();
  const client = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = resolveVoiceStudioView(searchParams.get("view"));
  const setTab = (view: VoiceStudioView) =>
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set("view", view);
      return next;
    });
  useEffect(() => {
    playback.stop();
  }, [tab]);
  const [draft, setDraft] = useState<VoiceDocument | null>(null);
  // One pointer per current document row. The canonical Generation query owns status/polling.
  const [rowOperations, setRowOperations] = useState<Record<string, string>>(
    {},
  );
  const draftRef = useRef<VoiceDocument | null>(null);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const saveInFlight = useRef<Promise<VoiceDocument> | null>(null);
  const [error, setError] = useState("");
  const [showVoices, setShowVoices] = useState(false);
  const [voiceChoice, setVoiceChoice] = useState<VoiceChoice | null>(null);
  const [voiceBindingCharacterId, setVoiceBindingCharacterId] = useState<
    string | undefined
  >();
  const [startVoiceDesign, setStartVoiceDesign] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const catalog = useQuery({
    queryKey: ["voice-studio", actorId, "catalog"],
    queryFn: voiceApi.catalog,
    enabled: Boolean(actorId),
  });
  const documents = useInfiniteQuery({
    queryKey: ["voice-studio", actorId, "documents"],
    queryFn: ({ pageParam }) => voiceApi.documents(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor || undefined,
    enabled: Boolean(actorId),
  });
  const characters = useInfiniteQuery({
    queryKey: ["voice-studio", actorId, "characters"],
    queryFn: ({ pageParam }) => voiceApi.characters(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor || undefined,
    enabled: Boolean(actorId),
  });
  const customNames = useQuery({
    queryKey: ["voice-studio", actorId, "custom-voices", "names"],
    queryFn: () =>
      voiceApi.customVoices(
        new URLSearchParams({ saved: "true", archived: "true", limit: "50" }),
      ),
    enabled: Boolean(actorId),
  });
  function setDocument(doc: VoiceDocument) {
    if (draftRef.current?.id !== doc.id) {
      setRowOperations({});
      setActiveRowId(doc.rows[0]?.id || null);
    }
    draftRef.current = doc;
    setDraft(doc);
    dirtyRef.current = false;
    setDirty(false);
  }
  function edit(doc: VoiceDocument) {
    playback.stop();
    draftRef.current = doc;
    setDraft(doc);
    dirtyRef.current = true;
    setDirty(true);
  }
  const flush = useCallback(async (): Promise<VoiceDocument> => {
    if (saveInFlight.current) await saveInFlight.current;
    const current = draftRef.current;
    if (!current) throw new Error(t("chooseScript"));
    if (!dirtyRef.current) return current;
    setSaving(true);
    setError("");
    const request = voiceApi.saveDocument(current);
    saveInFlight.current = request;
    try {
      const saved = await request;
      if (draftRef.current === current) setDocument(saved);
      else if (draftRef.current?.id === current.id) {
        const next = { ...draftRef.current, revision: saved.revision };
        draftRef.current = next;
        setDraft(next);
      }
      void client.invalidateQueries({
        queryKey: ["voice-studio", actorId, "documents"],
      });
      return saved;
    } catch (e) {
      setError(voiceErrorMessage(e, t));
      throw e;
    } finally {
      saveInFlight.current = null;
      setSaving(false);
    }
  }, [actorId, client, t]);
  useEffect(() => {
    if (!dirty || saving || error) return;
    const timer = setTimeout(() => {
      void flush().catch(() => {});
    }, 900);
    return () => clearTimeout(timer);
  }, [draft, dirty, saving, error, flush]);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
  async function open(id: string) {
    try {
      if (dirtyRef.current) await flush();
      playback.stop();
      setDocument(await voiceApi.document(id));
      setError("");
      setTab("script");
      setShowDocuments(false);
    } catch (e) {
      setError(voiceErrorMessage(e, t));
    }
  }
  async function create() {
    try {
      if (dirtyRef.current) await flush();
      setDocument(await voiceApi.createDocument());
      setTab("script");
      setShowDocuments(false);
      await documents.refetch();
    } catch (e) {
      setError(voiceErrorMessage(e, t));
    }
  }
  async function sequence() {
    if (!draft) return;
    const rows = draft.rows.filter((row) => row.enabled);
    if (!rows.length || rows.some((row) => !row.selectedTakeId)) {
      setError(t("missingAudio"));
      return;
    }
    try {
      const lists = await Promise.all(
        rows.map((row) => voiceApi.takes(draft.id, row.id)),
      );
      const takes = rows.map((row, index) =>
        lists[index]!.items.find((take) => take.id === row.selectedTakeId),
      );
      if (takes.some((take) => !take)) {
        setError(t("missingAudio"));
        return;
      }
      await playback.play(
        takes.filter((take) => Boolean(take)) as NonNullable<
          (typeof takes)[number]
        >[],
      );
    } catch (e) {
      setError(voiceErrorMessage(e, t));
    }
  }
  const ignoreTakes = useCallback(() => {}, []);
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["voice-studio", actorId] });
  };
  const allCharacters =
    characters.data?.pages.flatMap((page) => page.items) || [];
  const allDocuments =
    documents.data?.pages.flatMap((page) => page.items) || [];
  const activeRow =
    draft?.rows.find((row) => row.id === activeRowId) || draft?.rows[0];
  const editRow = (nextRow: NonNullable<typeof activeRow>) => {
    const current = draftRef.current;
    if (current)
      edit({
        ...current,
        rows: current.rows.map((row) =>
          row.id === nextRow.id ? nextRow : row,
        ),
      });
  };
  const inspector =
    draft && activeRow && catalog.data ? (
      <RowInspector
        row={activeRow}
        index={draft.rows.findIndex((row) => row.id === activeRow.id)}
        catalog={catalog.data}
        characters={allCharacters}
        customVoices={customNames.data?.items || []}
        modelId={draft.modelId}
        onEdit={editRow}
        onModel={(modelId) => edit({ ...draft, modelId })}
        onManageVoices={() => {
          setVoiceChoice(null);
          setVoiceBindingCharacterId(activeRow.characterPresetId || undefined);
          setShowVoices(true);
        }}
      />
    ) : null;
  return (
    <main className="voice-studio voice-studio--r2">
      <UnsavedChangesGuard dirty={dirty} />
      <header className="voice-header">
        <div>
          <h1>{t("title")}</h1>
          <p className="voice-muted">{t("description")}</p>
        </div>
        <span className="voice-current-view">
          {t(
            tab === "voices"
              ? "myVoices"
              : tab === "library"
                ? "audioLibrary"
                : "scriptTab",
          )}
        </span>
      </header>
      {error ? (
        <div role="alert" className="voice-error">
          {error}
          <Button
            onClick={() => {
              setError("");
              void flush().catch(() => {});
            }}
          >
            {t("retrySave")}
          </Button>
        </div>
      ) : null}
      {catalog.isLoading ? (
        <p role="status">
          <ProcessingSpinner className="size-4" />
          {t("loading")}
        </p>
      ) : null}
      {catalog.isError ? (
        <p role="alert">
          {catalog.error.message}
          <Button onClick={() => void catalog.refetch()}>{t("retry")}</Button>
        </p>
      ) : null}
      {catalog.data && tab === "voices" ? (
        <MyVoices
          catalog={catalog.data}
          characters={allCharacters}
          actorId={actorId}
          startDesign={startVoiceDesign}
          onDesignOpened={() => setStartVoiceDesign(false)}
          onUse={(choice) => {
            setVoiceChoice(choice);
            setVoiceBindingCharacterId(
              activeRow?.characterPresetId || undefined,
            );
            setShowVoices(true);
          }}
          onManageCharacters={() => {
            setVoiceChoice(null);
            setVoiceBindingCharacterId(undefined);
            setShowVoices(true);
          }}
        />
      ) : null}
      {catalog.data && tab === "library" ? (
        <VoiceManager
          actorId={actorId}
          catalog={catalog.data}
          characters={allCharacters}
          documents={allDocuments}
          onSource={(id) => void open(id)}
        />
      ) : null}
      {catalog.data && tab === "script" ? (
        <>
          <div className="voice-script-toolbar">
            <Button onClick={() => setShowDocuments(true)}>
              {t("openScript")}
            </Button>
            {draft ? (
              <>
                <input
                  className="voice-script-title"
                  aria-label={t("scriptName")}
                  value={draft.title}
                  maxLength={Number(catalog.data.policy.maxTitleLength) || 120}
                  onChange={(event) =>
                    edit({ ...draft, title: event.target.value })
                  }
                />
                <span role="status" className="voice-muted">
                  {saving
                    ? t("saving")
                    : dirty
                      ? t("unsaved")
                      : t("scriptSaved")}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void flush().catch(() => {})}
                >
                  {t("saveScript")}
                </Button>
                <details className="voice-script-actions">
                  <summary>{t("scriptActions")}</summary>
                  <div>
                    <Button
                      onClick={() => {
                        void flush()
                          .then((doc) =>
                            voiceApi.archiveDocument(doc, !doc.archivedAt),
                          )
                          .then(() => {
                            setDraft(null);
                            setRowOperations({});
                            draftRef.current = null;
                            void documents.refetch();
                          })
                          .catch((error) =>
                            setError(voiceErrorMessage(error, t)),
                          );
                      }}
                    >
                      {draft.archivedAt ? t("restore") : t("archive")}
                    </Button>
                  </div>
                </details>
              </>
            ) : (
              <span className="voice-muted">{t("chooseScript")}</span>
            )}
          </div>
          {draft ? (
            <div className="voice-workspace">
              <section className="voice-editor" aria-label={t("scriptTab")}>
                {draft.rows.map((row, index) => (
                  <DialogueRowEditor
                    key={`${draft.id}:${row.id}`}
                    row={row}
                    index={index}
                    active={activeRow?.id === row.id}
                    onActivate={() => setActiveRowId(row.id)}
                    onSettings={() => setShowSettings(true)}
                    onAddCharacter={() => {
                      setVoiceChoice(null);
                      setVoiceBindingCharacterId(undefined);
                      setShowVoices(true);
                    }}
                    document={draft}
                    catalog={catalog.data!}
                    characters={allCharacters}
                    actorId={actorId}
                    onFlush={flush}
                    onDocument={(updated) => {
                      if (draftRef.current?.id === updated.id)
                        setDocument(updated);
                    }}
                    activeOperationId={rowOperations[row.id]}
                    onOperationChange={(operationId) => {
                      if (draftRef.current?.id !== draft.id) return;
                      setRowOperations((current) => {
                        const next = { ...current };
                        if (operationId) next[row.id] = operationId;
                        else delete next[row.id];
                        return next;
                      });
                    }}
                    onRefresh={refresh}
                    onTakes={ignoreTakes}
                    onEdit={editRow}
                    onMove={(offset) =>
                      edit({
                        ...draft,
                        rows: moveRow(draft.rows, row.id, offset),
                      })
                    }
                    onDuplicate={() => {
                      if (draft.rows.length < catalog.data!.policy.maxRows) {
                        const copied = duplicateRow(row);
                        edit({
                          ...draft,
                          rows: [
                            ...draft.rows.slice(0, index + 1),
                            copied,
                            ...draft.rows.slice(index + 1),
                          ],
                        });
                        setActiveRowId(copied.id);
                      }
                    }}
                    onDelete={() => {
                      setRowOperations((current) => {
                        const next = { ...current };
                        delete next[row.id];
                        return next;
                      });
                      const rows = draft.rows.filter(
                        (item) => item.id !== row.id,
                      );
                      edit({ ...draft, rows });
                      if (activeRowId === row.id)
                        setActiveRowId(
                          rows[index]?.id || rows.at(-1)?.id || null,
                        );
                    }}
                  />
                ))}
                <Button
                  disabled={draft.rows.length >= catalog.data.policy.maxRows}
                  onClick={() => {
                    const activeIndex = draft.rows.findIndex(
                      (row) => row.id === activeRow?.id,
                    );
                    const row = newRow(activeRow?.characterPresetId);
                    const insertion =
                      activeIndex < 0 ? draft.rows.length : activeIndex + 1;
                    edit({
                      ...draft,
                      rows: [
                        ...draft.rows.slice(0, insertion),
                        row,
                        ...draft.rows.slice(insertion),
                      ],
                    });
                    setActiveRowId(row.id);
                    requestAnimationFrame(() =>
                      document
                        .querySelector<HTMLTextAreaElement>(
                          `[data-row-id="${row.id}"] textarea`,
                        )
                        ?.focus({ preventScroll: true }),
                    );
                  }}
                >
                  {t("addRow")}
                </Button>
                <div className="voice-sequence-bar">
                  <Button onClick={() => void sequence()}>
                    {t("playScript")}
                  </Button>
                  <Button onClick={playback.stop}>{t("stop")}</Button>
                  <span className="voice-muted">
                    {t("activeRowCount", {
                      current: activeRow
                        ? draft.rows.findIndex(
                            (row) => row.id === activeRow.id,
                          ) + 1
                        : 0,
                      total: draft.rows.length,
                    })}
                  </span>
                </div>
              </section>
              <aside className="voice-desktop-inspector">{inspector}</aside>
            </div>
          ) : (
            <div className="voice-empty">
              <h2>{t("startTitle")}</h2>
              <p>{t("startDescription")}</p>
              <Button variant="primary" onClick={() => void create()}>
                {t("newScript")}
              </Button>
            </div>
          )}
        </>
      ) : null}
      <WorkspaceDialog
        open={showDocuments}
        onOpenChange={setShowDocuments}
        title={t("scripts")}
        className="voice-documents-dialog"
      >
        <div className="voice-document-list">
          <Button variant="primary" onClick={() => void create()}>
            {t("newScript")}
          </Button>
          <label>
            {t("searchScripts")}
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="voice-enabled">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
            />
            {t("showArchived")}
          </label>
          {documents.isError ? (
            <p role="alert">{documents.error.message}</p>
          ) : null}
          {allDocuments
            .filter(
              (doc) =>
                (showArchived || !doc.archivedAt) &&
                doc.title
                  .toLocaleLowerCase()
                  .includes(search.toLocaleLowerCase()),
            )
            .map((doc) => (
              <button
                className="voice-document-link"
                aria-current={doc.id === draft?.id ? "page" : undefined}
                key={doc.id}
                onClick={() => void open(doc.id)}
              >
                {doc.title}
                {doc.archivedAt ? ` (${t("archived")})` : ""}
              </button>
            ))}
          {documents.hasNextPage ? (
            <Button onClick={() => void documents.fetchNextPage()}>
              {t("moreScripts")}
            </Button>
          ) : null}
        </div>
      </WorkspaceDialog>
      <WorkspaceDialog
        open={showVoices}
        onOpenChange={(open) => {
          setShowVoices(open);
          if (!open) {
            setVoiceChoice(null);
            setVoiceBindingCharacterId(undefined);
          }
        }}
        title={t("characterVoices")}
      >
        {catalog.data ? (
          <CharacterVoices
            actorId={actorId}
            customVoices={customNames.data?.items || []}
            catalog={catalog.data}
            characters={allCharacters}
            initialChoice={voiceChoice}
            initialCharacterId={voiceBindingCharacterId}
            onChange={() => void characters.refetch()}
            onSaved={(character) => {
              setShowVoices(false);
              if (activeRow && draftRef.current) {
                editRow({ ...activeRow, characterPresetId: character.id });
                setTab("script");
              }
            }}
            onCreateVoice={() => {
              setShowVoices(false);
              setTab("voices");
              setStartVoiceDesign(true);
            }}
          />
        ) : null}
        {characters.hasNextPage ? (
          <Button onClick={() => void characters.fetchNextPage()}>
            {t("moreCharacters")}
          </Button>
        ) : null}
      </WorkspaceDialog>
      <WorkspaceDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        title={t("rowSettings")}
      >
        {inspector}
      </WorkspaceDialog>
    </main>
  );
}
