import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  listHistory,
  useActor,
  ProcessingSpinner,
} from "../../../lib/canonical";
import { MediaImage } from "../../../components/media/MediaImage";
import { listTrustedVideoSources } from "../../../../../web/src/features/generation/api/trustedVideoSources";
import type { VideoModelCapability } from "../../../../../web/src/features/generation/schemas/videoGenerationSchemas";
import { outputStorageKey } from "../state/imageDraft";
import {
  videoSourceUrl,
  type VideoDraft,
  type VideoSource,
} from "../state/videoDraft";
import {
  listOwnedCharacters,
  listCharacterLooks,
} from "../../../../../web/src/features/profiles/api/profileApi";
import { approvedVideoLooks } from "../../../../../web/src/features/playground/components/videoReferenceSelection";
import type { CharacterSummary } from "../../../../../web/src/features/profiles/schemas/profileSchemas";

export function VideoSources({
  draft,
  model,
  onChange,
  upload,
  remove,
  rejectedIds,
}: {
  draft: VideoDraft;
  model: VideoModelCapability;
  onChange: (sources: VideoSource[]) => void;
  upload: (
    file: File,
    kind: "image" | "look",
    replaceId?: string,
  ) => Promise<void>;
  remove: (id: string) => void;
  rejectedIds: string[];
}) {
  const { t } = useTranslation("video");
  const { identityScope } = useActor();
  const [picker, setPicker] = useState(false);
  const [preview, setPreview] = useState<VideoSource | null>(null);
  const [characterPicker, setCharacterPicker] = useState(false);
  const [character, setCharacter] = useState<CharacterSummary | null>(null);
  const focusTarget = useRef<HTMLElement | null>(null);
  const restoreFocus = (event: Event) => {
    event.preventDefault();
    if (focusTarget.current?.isConnected)
      focusTarget.current.focus({ preventScroll: true });
  };
  const kind = draft.operation === "character_to_video" ? "look" : "image";
  const trustedOnly =
    model.playgroundReferencePolicy?.kind === "trusted_generated_only";
  const allowUploads =
    !trustedOnly ||
    (kind === "image" &&
      model.playgroundReferencePolicy?.allowImageReferenceUploads === true);
  const limit = Math.min(
    12,
    model.supportsOrderedImageReferences
      ? model.referenceImageLimit
      : Math.min(1, model.referenceImageLimit),
  );
  const characters = useInfiniteQuery({
    queryKey: ["fe24-video-characters", identityScope],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => listOwnedCharacters(pageParam),
    getNextPageParam: (page) => (page.hasMore ? page.nextCursor : undefined),
    enabled: characterPicker && !trustedOnly,
    retry: false,
  });
  const looks = useQuery({
    queryKey: [
      "character-looks",
      identityScope,
      character?.id,
      character?.characterProfileVersionId,
    ],
    queryFn: () =>
      listCharacterLooks(character!.id, character!.characterProfileVersionId),
    enabled: characterPicker && !!character && !trustedOnly,
    retry: false,
  });
  const approvedLooks = character
    ? approvedVideoLooks(looks.data?.items || [], character)
    : [];
  const trusted = useInfiniteQuery({
    queryKey: ["trusted-video-sources", identityScope, kind],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      listTrustedVideoSources(
        pageParam,
        kind === "look" ? "look-sheet" : undefined,
      ),
    getNextPageParam: (page) => (page.hasMore ? page.nextCursor : undefined),
    enabled: picker && trustedOnly,
    retry: false,
  });
  const history = useInfiniteQuery({
    queryKey: ["fe24-video-source-history", identityScope],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => listHistory(pageParam),
    getNextPageParam: (page) => (page.hasMore ? page.nextCursor : undefined),
    enabled: picker && !trustedOnly,
    retry: false,
  });
  const sourceQuery = trustedOnly ? trusted : history;
  const options = trustedOnly
    ? trusted.data?.pages
        .flatMap((page) => page.items)
        .map((item) => ({
          id: item.id,
          url: item.previewUrl,
          name: item.modelId,
          eligible:
            item.eligible &&
            item.policyVersion === model.playgroundReferencePolicy?.version,
          policyVersion: item.policyVersion,
        })) || []
    : history.data?.pages
        .flatMap((page) => page.items)
        .filter((item) => item.imageUrl)
        .map((item) => ({
          id: item.id,
          url: item.imageUrl,
          name: item.submodel || item.id,
          eligible: true,
          policyVersion: undefined,
        })) || [];
  function choose(item: (typeof options)[number]) {
    let storageKey: string | undefined;
    try {
      storageKey = outputStorageKey(item.url);
    } catch {
      if (!trustedOnly) return;
    }
    onChange([
      ...draft.sources,
      {
        id: crypto.randomUUID(),
        name: "",
        kind,
        generationId: item.id,
        policyVersion: item.policyVersion,
        storageKey,
        generated: true,
        status: "ready",
      },
    ]);
    setPicker(false);
  }
  return (
    <section className="video-sources">
      <div className="section-heading">
        <h2>{t(kind === "look" ? "lookReferences" : "references")}</h2>
        <span>
          {draft.sources.length} / {limit}
        </span>
      </div>
      <p className="muted">
        {t(
          kind === "look"
            ? "lookHelp"
            : model.firstFrameEnabled === false ||
                model.playgroundReferencePolicy?.allowImageReferenceUploads
              ? "referenceHelp"
              : "openingHelp",
        )}
      </p>
      {draft.sources.map((source, index) => (
        <div
          key={source.id}
          className={`video-source ${rejectedIds.includes(source.id) ? "is-invalid" : ""}`}
        >
          <button
            className="video-source-thumb"
            onClick={(event) => {
              focusTarget.current = event.currentTarget;
              setPreview(source);
            }}
            disabled={!videoSourceUrl(source)}
            aria-label={t("previewReference", { number: index + 1 })}
          >
            {source.status === "uploading" ? (
              <ProcessingSpinner className="small-spinner" />
            ) : videoSourceUrl(source) ? (
              <MediaImage
                src={videoSourceUrl(source)}
                alt={source.name || t("referenceNumber", { number: index + 1 })}
              />
            ) : (
              <span>{index + 1}</span>
            )}
          </button>
          <div className="video-source-info">
            <label>
              {t("referenceNumber", { number: index + 1 })}
              <input
                maxLength={80}
                value={source.name}
                onChange={(event) =>
                  onChange(
                    draft.sources.map((row) =>
                      row.id === source.id
                        ? { ...row, name: event.target.value }
                        : row,
                    ),
                  )
                }
              />
            </label>
            {source.status !== "ready" && (
              <p role="status">{t(`source_${source.status}`)}</p>
            )}
            {rejectedIds.includes(source.id) && (
              <p role="alert">{t("referenceRejected")}</p>
            )}
            <div className="video-source-actions">
              {allowUploads && (
                <label className="button">
                  {t("replace")}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void upload(file, kind, source.id);
                    }}
                  />
                </label>
              )}
              <button onClick={() => remove(source.id)}>{t("remove")}</button>
            </div>
          </div>
        </div>
      ))}
      <div className="video-source-actions">
        {allowUploads && (
          <label
            className={`button ${draft.sources.length >= limit ? "disabled" : ""}`}
          >
            {t("upload")}
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              disabled={draft.sources.length >= limit}
              onChange={(event) => {
                const files = [...(event.target.files || [])].slice(
                  0,
                  Math.max(0, limit - draft.sources.length),
                );
                event.target.value = "";
                for (const file of files) void upload(file, kind);
              }}
            />
          </label>
        )}
        <button
          onClick={(event) => {
            focusTarget.current = event.currentTarget;
            setPicker(true);
          }}
          disabled={draft.sources.length >= limit}
        >
          {t(trustedOnly ? "chooseTrusted" : "chooseGenerated")}
        </button>
        {!trustedOnly && kind === "look" && (
          <button
            onClick={(event) => {
              focusTarget.current = event.currentTarget;
              setCharacterPicker(true);
            }}
            disabled={draft.sources.length >= limit}
          >
            {t("chooseApprovedLook")}
          </button>
        )}
      </div>
      <Dialog.Root open={picker} onOpenChange={setPicker}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            className="video-dialog"
            onCloseAutoFocus={restoreFocus}
          >
            <Dialog.Title>
              {t(trustedOnly ? "chooseTrusted" : "chooseGenerated")}
            </Dialog.Title>
            <Dialog.Description>{t("sourcePickerHelp")}</Dialog.Description>
            <div className="video-picker-grid">
              {options.map((item) => (
                <button
                  key={item.id}
                  onClick={() => choose(item)}
                  disabled={
                    !item.eligible ||
                    draft.sources.some(
                      (source) => source.generationId === item.id,
                    )
                  }
                >
                  <MediaImage src={item.url} alt={item.name} />
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
            {sourceQuery.isPending && (
              <p role="status">
                <ProcessingSpinner className="small-spinner" />
                {t("loading")}
              </p>
            )}
            {sourceQuery.isError && (
              <p role="alert">
                {t("sourceError")}{" "}
                <button onClick={() => void sourceQuery.refetch()}>
                  {t("retry")}
                </button>
              </p>
            )}
            {!sourceQuery.isPending && !options.length && (
              <p>{t("noSources")}</p>
            )}
            {sourceQuery.hasNextPage && (
              <button
                disabled={sourceQuery.isFetchingNextPage}
                onClick={() => void sourceQuery.fetchNextPage()}
              >
                {t("loadMore")}
              </button>
            )}
            <Dialog.Close asChild>
              <button>{t("close")}</button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={characterPicker} onOpenChange={setCharacterPicker}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            className="video-dialog"
            onCloseAutoFocus={restoreFocus}
          >
            <Dialog.Title>{t("chooseApprovedLook")}</Dialog.Title>
            <Dialog.Description>{t("approvedLookHelp")}</Dialog.Description>
            <label>
              {t("character")}
              <select
                value={character?.id || ""}
                onChange={(event) =>
                  setCharacter(
                    characters.data?.pages
                      .flatMap((page) => page.items)
                      .find((item) => item.id === event.target.value) || null,
                  )
                }
              >
                <option value="">{t("chooseCharacter")}</option>
                {characters.data?.pages
                  .flatMap((page) => page.items)
                  .filter(
                    (item) =>
                      item.handoffAvailable && item.characterProfileVersionId,
                  )
                  .map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.displayName}
                    </option>
                  ))}
              </select>
            </label>
            {characters.hasNextPage && (
              <button
                onClick={() => void characters.fetchNextPage()}
                disabled={characters.isFetchingNextPage}
              >
                {t("loadMore")}
              </button>
            )}
            <div className="video-picker-grid">
              {approvedLooks.map((look) => (
                <button
                  key={look.versionId}
                  disabled={draft.sources.some(
                    (source) => source.lookVersionId === look.versionId,
                  )}
                  onClick={() => {
                    onChange([
                      ...draft.sources,
                      {
                        id: crypto.randomUUID(),
                        name: "",
                        kind: "look",
                        status: "ready",
                        characterProfileId: look.characterProfileId,
                        characterProfileVersionId:
                          look.characterProfileVersionId,
                        lookId: look.lookId,
                        lookVersionId: look.versionId,
                      },
                    ]);
                    setCharacterPicker(false);
                  }}
                >
                  <MediaImage src={look.url} alt={look.name} />
                  <span>{look.name}</span>
                </button>
              ))}
            </div>
            {(characters.isFetching || looks.isFetching) && (
              <p role="status">
                <ProcessingSpinner className="small-spinner" />
                {t("loading")}
              </p>
            )}
            {(characters.isError || looks.isError) && (
              <p role="alert">
                {t("sourceError")}{" "}
                <button
                  onClick={() => {
                    void characters.refetch();
                    if (character) void looks.refetch();
                  }}
                >
                  {t("retry")}
                </button>
              </p>
            )}
            {character && !looks.isFetching && !approvedLooks.length && (
              <p>{t("noSources")}</p>
            )}
            <Dialog.Close asChild>
              <button>{t("close")}</button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            className="video-dialog video-reference-preview"
            onCloseAutoFocus={restoreFocus}
          >
            <Dialog.Title>{preview?.name || t("references")}</Dialog.Title>
            <Dialog.Description>{t("referencePreview")}</Dialog.Description>
            {preview && (
              <MediaImage
                src={videoSourceUrl(preview)}
                alt={preview.name || t("references")}
              />
            )}
            <Dialog.Close asChild>
              <button>{t("close")}</button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
