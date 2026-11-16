import { voiceErrorMessage } from "../api/voiceStudioErrors";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/Button";
import { ProcessingSpinner } from "../../../components/ui/ProcessingSpinner";
import { pollingPolicy } from "../../../lib/api/pollingPolicy";
import { voiceApi } from "../api/voiceStudioApi";
import type {
  DialogueRow,
  VoiceCatalog,
  VoiceCharacter,
  VoiceDocument,
  VoiceTake,
} from "../schemas/voiceStudioSchemas";
import { isStaleTake } from "../model/rowCommands";
import { TakeCard } from "./TakeCard";
import { VoiceEventToolbar } from "./VoiceEventToolbar";
import { useVoicePlayback } from "./VoicePlayback";

export function DialogueRowEditor({
  row,
  index,
  document,
  catalog,
  characters,
  actorId,
  onEdit,
  onMove,
  onDuplicate,
  onDelete,
  onFlush,
  onDocument,
  onRefresh,
  onTakes,
  activeOperationId,
  onOperationChange,
  active,
  onActivate,
  onSettings,
  onAddCharacter,
}: {
  active: boolean;
  onActivate: () => void;
  onSettings: () => void;
  onAddCharacter: () => void;
  row: DialogueRow;
  index: number;
  document: VoiceDocument;
  catalog: VoiceCatalog;
  characters: VoiceCharacter[];
  actorId: string;
  onEdit: (row: DialogueRow) => void;
  onMove: (offset: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onFlush: () => Promise<VoiceDocument>;
  onDocument: (doc: VoiceDocument) => void;
  onRefresh: () => void;
  onTakes: (takes: VoiceTake[]) => void;
  activeOperationId?: string;
  onOperationChange: (operationId: string | null) => void;
}) {
  const { t } = useTranslation("voice-studio");
  const textarea = useRef<HTMLTextAreaElement>(null);
  const caret = useRef<{ start: number; end: number } | null>(null);
  const composing = useRef(false);
  const playback = useVoicePlayback();
  const [busy, setBusy] = useState(false);
  const [previewTakeId, setPreviewTakeId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState<{
    id: string;
    totalCredits: number;
    revision: number;
  } | null>(null);
  const [operationId, setOperationId] = useState<string | null>(
    activeOperationId || row.activeOperationId || null,
  );
  const [requestId, setRequestId] = useState<string | null>(null);
  const [pollDeadline, setPollDeadline] = useState(() => Date.now() + 60000);
  const [statusTimedOut, setStatusTimedOut] = useState(false);
  const takes = useQuery({
    queryKey: ["voice-studio", actorId, "takes", document.id, row.id],
    queryFn: () => voiceApi.takes(document.id, row.id),
  });
  const terminal = [
    "completed",
    "succeeded",
    "failed",
    "cancelled",
    "reconciliation_required",
  ];
  const operation = useQuery({
    queryKey: ["voice-generation", actorId, operationId],
    queryFn: () => voiceApi.operation(operationId!),
    enabled: Boolean(operationId),
    retry: false,
    refetchInterval: (query) =>
      terminal.includes(query.state.data?.status || "") ||
      query.state.error ||
      Date.now() > pollDeadline
        ? false
        : pollingPolicy.generationJob(query.state.data?.status),
  });
  const running =
    busy ||
    Boolean(
      operationId &&
      !terminal.includes(operation.data?.status || "") &&
      !operation.isError &&
      !statusTimedOut,
    );
  const unresolved = Boolean(
    operationId &&
    (!terminal.includes(operation.data?.status || "") ||
      operation.data?.status === "reconciliation_required"),
  );
  useEffect(() => {
    if (!operationId) return;
    const timeout = setTimeout(
      () => setStatusTimedOut(true),
      Math.max(0, pollDeadline - Date.now()),
    );
    return () => clearTimeout(timeout);
  }, [operationId, pollDeadline]);
  useEffect(() => {
    onTakes(takes.data?.items || []);
  }, [takes.data, onTakes]);
  useEffect(() => {
    if (terminal.includes(operation.data?.status || "")) {
      // Keep unresolved/reconciliation pointers until they can be reconciled safely.
      if (
        ["succeeded", "failed", "cancelled", "completed"].includes(
          operation.data?.status || "",
        )
      )
        onOperationChange(null);
      void takes
        .refetch()
        .then(async (result) => {
          if (
            operation.data?.status !== "succeeded" ||
            result.data?.items.length !== 1
          )
            return;
          const saved = await onFlush();
          if (saved.rows.find((item) => item.id === row.id)?.selectedTakeId)
            return;
          onDocument(
            await voiceApi.select(
              saved.id,
              row.id,
              result.data.items[0]!.id,
              saved.revision,
            ),
          );
        })
        .catch((e) => setError(voiceErrorMessage(e, t)));
      onRefresh();
    }
    // Refresh only when operation reaches a new terminal state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operation.data?.status]);
  async function prepare() {
    setBusy(true);
    setError("");
    try {
      const saved = await onFlush();
      const result = await voiceApi.quote(saved.id, row.id, saved.revision);
      setQuote({ ...result, revision: saved.revision });
      setRequestId(crypto.randomUUID());
    } catch (e) {
      setError(voiceErrorMessage(e, t));
    } finally {
      setBusy(false);
    }
  }
  async function generate() {
    if (!quote || !requestId) return;
    setBusy(true);
    setError("");
    try {
      const result = await voiceApi.generate(
        document.id,
        row.id,
        quote.revision,
        quote.id,
        requestId,
      );
      setPollDeadline(Date.now() + 60000);
      setStatusTimedOut(false);
      setOperationId(result.id);
      onOperationChange(result.id);
      setQuote(null);
    } catch (e) {
      setError(voiceErrorMessage(e, t));
    } finally {
      setBusy(false);
    }
  }
  function edit(next: DialogueRow) {
    setQuote(null);
    onEdit(next);
  }
  function insertTag(tag: string) {
    const element = textarea.current;
    if (!element || composing.current) return;
    const start = caret.current?.start ?? row.text.length;
    if ([...row.text, ...tag].length > catalog.policy.maxTextLength) {
      setError(t("textLimit"));
      return;
    }
    element.focus({ preventScroll: true });
    // Collapse only the insertion point: existing selected words stay in the transcript.
    element.setSelectionRange(start, start);
    const inserted =
      typeof element.ownerDocument.execCommand === "function" &&
      element.ownerDocument.execCommand("insertText", false, tag);
    if (!inserted) {
      element.setRangeText(tag, start, start, "end");
      edit({ ...row, text: element.value });
    }
    caret.current = { start: start + tag.length, end: start + tag.length };
    requestAnimationFrame(() =>
      element.setSelectionRange(start + tag.length, start + tag.length),
    );
  }
  const previewTake =
    takes.data?.items.find(
      (take) => take.id === (previewTakeId || row.selectedTakeId),
    ) || takes.data?.items[0];
  const unsupportedTags =
    row.text
      .match(/<[^>]+>/g)
      ?.filter((tag) => !catalog.policy.inlineTags.includes(tag)) || [];
  return (
    <article
      className={`voice-row ${active ? "voice-row--active" : "voice-row--compact"}`}
      data-row-id={row.id}
      aria-label={t("rowNumber", { number: index + 1 })}
    >
      <header className="voice-row-header">
        <button
          className="voice-row-number"
          aria-label={t("editRow", { number: index + 1 })}
          aria-expanded={active}
          onClick={onActivate}
        >
          {String(index + 1).padStart(2, "0")}
        </button>
        <select
          className="voice-row-character"
          aria-label={t("character")}
          value={row.characterPresetId}
          onFocus={onActivate}
          onChange={(event) => {
            if (event.target.value === "__add__") onAddCharacter();
            else edit({ ...row, characterPresetId: event.target.value });
          }}
        >
          <option value="">{t("chooseCharacter")}</option>
          {characters
            .filter(
              (character) =>
                !character.archivedAt || character.id === row.characterPresetId,
            )
            .map((character) => (
              <option key={character.id} value={character.id}>
                {character.name}
                {character.archivedAt ? ` (${t("archived")})` : ""}
              </option>
            ))}
          <option value="__add__">+ {t("addCharacter")}</option>
        </select>
        {!active ? (
          <button className="voice-row-summary" onClick={onActivate}>
            {row.text || t("dialoguePlaceholder")}
          </button>
        ) : (
          <span className="voice-row-status voice-muted">
            {running
              ? t("generating")
              : previewTake
                ? t("audioReady")
                : t("readyToWrite")}
          </span>
        )}
        {previewTake ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void playback.play([previewTake])}
          >
            {t("listen")}
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            onActivate();
            onSettings();
          }}
        >
          {t("settings")}
        </Button>
        <details className="voice-row-menu">
          <summary aria-label={t("rowActions", { number: index + 1 })}>
            ⋯
          </summary>
          <div className="voice-row-menu-content">
            <label className="voice-enabled">
              <input
                type="checkbox"
                checked={row.enabled}
                onChange={(event) =>
                  edit({ ...row, enabled: event.target.checked })
                }
              />
              {t("include")}
            </label>
            <Button size="sm" disabled={!index} onClick={() => onMove(-1)}>
              {t("moveUp")}
            </Button>
            <Button
              size="sm"
              disabled={index === document.rows.length - 1}
              onClick={() => onMove(1)}
            >
              {t("moveDown")}
            </Button>
            <Button size="sm" onClick={onDuplicate}>
              {t("duplicate")}
            </Button>
            <Button
              size="sm"
              disabled={running || unresolved}
              onClick={onDelete}
            >
              {t("removeRow")}
            </Button>
            {row.selectedTakeId ? (
              <Button
                size="sm"
                onClick={() => {
                  void onFlush()
                    .then((saved) =>
                      voiceApi.select(saved.id, row.id, null, saved.revision),
                    )
                    .then(onDocument)
                    .catch((error) => setError(voiceErrorMessage(error, t)));
                }}
              >
                {t("clearSelection")}
              </Button>
            ) : null}
          </div>
        </details>
      </header>
      <div hidden={!active} className="voice-row-expanded">
        <div className="voice-transcript-editor">
          <VoiceEventToolbar
            policy={catalog.policy}
            onInsert={insertTag}
            onRestoreFocus={() => {
              const input = textarea.current;
              if (input) {
                input.focus({ preventScroll: true });
                const position = caret.current?.start ?? row.text.length;
                input.setSelectionRange(position, position);
              }
            }}
            disabled={composing.current}
          />
          <textarea
            aria-label={t("dialogue")}
            ref={textarea}
            value={row.text}
            rows={3}
            maxLength={catalog.policy.maxTextLength}
            placeholder={t("dialoguePlaceholder")}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={() => {
              composing.current = false;
            }}
            onSelect={(event) => {
              caret.current = {
                start: event.currentTarget.selectionStart,
                end: event.currentTarget.selectionEnd,
              };
            }}
            onInput={(event) =>
              edit({ ...row, text: event.currentTarget.value })
            }
            onChange={(event) => edit({ ...row, text: event.target.value })}
          />
        </div>
        {unsupportedTags.length ? (
          <p role="alert">
            {t("unsupportedEvents", { tokens: unsupportedTags.join(", ") })}
          </p>
        ) : null}
        <div className="voice-row-generate">
          <span className="voice-muted">
            {t("charactersCount", {
              count: [...row.text].length,
              max: catalog.policy.maxTextLength,
            })}
          </span>
          <Button
            variant="primary"
            disabled={
              running ||
              unresolved ||
              !row.text.trim() ||
              !row.characterPresetId ||
              Boolean(unsupportedTags.length)
            }
            loading={busy}
            onClick={() => void prepare()}
          >
            {t("generateRow")}
          </Button>
        </div>
        {quote ? (
          <div className="voice-quote">
            <span>{t("estimate", { credits: quote.totalCredits })}</span>
            <Button variant="primary" onClick={() => void generate()}>
              {t("confirmGenerate")}
            </Button>
          </div>
        ) : null}
        <div className="voice-takes">
          {(takes.data?.items.length || 0) > 1 ? (
            <label>
              {t("takeSelect")}
              <select
                value={previewTake?.id || ""}
                onChange={(event) => setPreviewTakeId(event.target.value)}
              >
                {takes.data?.items.map((take, index) => (
                  <option key={take.id} value={take.id}>
                    {t("takeNumber", { number: index + 1 })} ·{" "}
                    {(take.durationMs / 1000).toFixed(1)} s
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {[previewTake]
            .filter((take): take is VoiceTake => Boolean(take))
            .map((take) => (
              <TakeCard
                key={take.id}
                take={take}
                policy={catalog.policy}
                selected={row.selectedTakeId === take.id}
                stale={isStaleTake(
                  row,
                  take,
                  characters.find(
                    (character) => character.id === row.characterPresetId,
                  )?.voiceId,
                  document.modelId,
                )}
                onChange={() => {
                  void takes.refetch();
                  onRefresh();
                }}
                onSelect={async () => {
                  const saved = await onFlush();
                  onDocument(
                    await voiceApi.select(
                      saved.id,
                      row.id,
                      take.id,
                      saved.revision,
                    ),
                  );
                }}
              />
            ))}
        </div>
      </div>
      {running ? (
        <span className="voice-row-progress" role="status">
          <ProcessingSpinner className="size-4" />
          {t("generating")}
        </span>
      ) : null}
      {statusTimedOut && unresolved ? (
        <p role="status">
          {t("reconciliation", { id: operationId })}
          <Button
            onClick={() => {
              setPollDeadline(Date.now() + 60000);
              setStatusTimedOut(false);
              void operation.refetch();
            }}
          >
            {t("checkStatus")}
          </Button>
        </p>
      ) : null}
      {operation.data?.status === "reconciliation_required" ? (
        <p role="alert">{t("reconciliation", { id: operationId })}</p>
      ) : null}
      {error || operation.data?.errorCode || operation.isError ? (
        <p role="alert">
          {error ||
            (operation.data?.errorCode
              ? voiceErrorMessage({ code: operation.data.errorCode }, t)
              : t("statusUnavailable"))}
          {operation.isError ? (
            <Button onClick={() => void operation.refetch()}>
              {t("retry")}
            </Button>
          ) : null}
        </p>
      ) : null}
    </article>
  );
}
