import {
  ArrowLeft,
  BookOpenText,
  Check,
  History,
  PenLine,
  Save,
  Settings2,
  Sparkles,
  Split,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../../components/ui/Button";
import { StatusNotice } from "../../../components/ui/StatusNotice";
import {
  confirmCinematicFullStoryRevision,
  generateCinematicFullStoryChapters,
  proposeCinematicFullStory,
  saveCinematicFullStoryRevision,
} from "../api/cinematicApi";
import {
  applyCinematicChapterProposal,
  discardCinematicChapterProposal,
  getCinematicSeriesWorkspace,
} from "../api/cinematicSeriesApi";
import type {
  CinematicFullStoryProposal,
  CinematicFullStoryRevision,
  CinematicChapterProposal,
  CinematicProject,
} from "../schemas/cinematicSchemas";
import type { CinematicSeriesWorkspace } from "../schemas/cinematicSeriesSchemas";
import { CinematicSharedCharactersPanel } from "./CinematicSharedCharactersPanel";

type Props = {
  actorId: string;
  project: CinematicProject;
  online: boolean;
  onBackToBrief: () => void;
  onOpenChapters: () => void;
  onProjectChanged: (project: CinematicProject) => void;
};

export function CinematicFullStoryWriter({
  actorId,
  project,
  online,
  onBackToBrief,
  onOpenChapters,
  onProjectChanged,
}: Props) {
  const { t, i18n } = useTranslation("cinematic");
  const queryClient = useQueryClient();
  const seriesQueryKey = ["cinematic-series", actorId, project.id];
  const seriesWorkspace = useQuery({
    queryKey: seriesQueryKey,
    queryFn: () => getCinematicSeriesWorkspace(project.id),
    staleTime: 20_000,
    gcTime: 60_000,
    retry: false,
  });
  const activeRevision = useMemo(
    () =>
      project.fullStoryVersions.find(
        (item) => item.id === project.activeFullStoryVersionId,
      ) || null,
    [project.activeFullStoryVersionId, project.fullStoryVersions],
  );
  const [content, setContent] = useState(activeRevision?.content || "");
  const [instruction, setInstruction] = useState("");
  const [proposal, setProposal] = useState<CinematicFullStoryProposal | null>(
    null,
  );
  const [previewRevisionId, setPreviewRevisionId] = useState<string | null>(
    null,
  );
  const [chapters, setChapters] = useState<
    CinematicSeriesWorkspace["chapters"]
  >([]);
  const [chapterProposal, setChapterProposal] =
    useState<CinematicChapterProposal | null>(null);
  const [chapterBuildMode, setChapterBuildMode] = useState<
    "generate" | "manual"
  >("generate");
  const [busy, setBusy] = useState<
    | "propose"
    | "save"
    | "confirm"
    | "chapters"
    | "apply-chapters"
    | "discard-chapters"
    | "restore"
    | "characters"
    | null
  >(null);
  const [error, setError] = useState("");
  const [characterResult, setCharacterResult] = useState("");

  useEffect(() => {
    setContent(activeRevision?.content || "");
    setProposal(null);
    setPreviewRevisionId(null);
  }, [activeRevision?.id, activeRevision?.content]);

  const dirty = content.trim() !== (activeRevision?.content || "").trim();
  const confirmedCurrent = Boolean(
    activeRevision && project.confirmedFullStoryVersionId === activeRevision.id,
  );
  const hasOlderConfirmation = Boolean(
    project.confirmedFullStoryVersionId && !confirmedCurrent,
  );
  const revisions = [...project.fullStoryVersions].sort(
    (a, b) => b.version - a.version,
  );
  const visibleChapters = chapters.length
    ? chapters
    : (seriesWorkspace.data?.chapters || []).filter((chapter) =>
        chapter.storyBrief.trim(),
      );
  const localChapterWorkStarted =
    Boolean(project.chapterGeneration) ||
    Boolean(project.chapterStory?.trim()) ||
    Boolean(project.scenes?.length);
  const chapterWorkStarted =
    localChapterWorkStarted ||
    (seriesWorkspace.data?.chapters || []).some(
      (chapter) => chapter.classification !== "empty",
    );
  const chapterStatusLoading =
    seriesWorkspace.isLoading && !localChapterWorkStarted;

  async function run(
    kind: NonNullable<typeof busy>,
    operation: () => Promise<void>,
  ) {
    if (busy) return;
    setBusy(kind);
    setError("");
    try {
      await operation();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : t("cinematic.fullStory.operationFailed"),
      );
    } finally {
      setBusy(null);
    }
  }

  function generateProposal() {
    if (activeRevision && !instruction.trim()) return;
    void run("propose", async () => {
      const next = await proposeCinematicFullStory(
        project.id,
        project.version,
        activeRevision ? instruction : "",
      );
      setProposal(next);
      setContent(next.fullStory);
      setPreviewRevisionId(null);
    });
  }

  async function saveRevision(
    source: "manual" | "ai" | "restore" = proposal ? "ai" : "manual",
    value = content,
    revisionInstruction = instruction,
    provenance = proposal?.provenance || null,
  ) {
    const saved = await saveCinematicFullStoryRevision(project.id, {
      expectedVersion: project.version,
      content: value,
      source,
      revisionInstruction,
      provenance,
      characters: source === "ai" ? proposal?.characters : undefined,
    });
    onProjectChanged(saved);
    setProposal(null);
    setPreviewRevisionId(null);
    setInstruction("");
  }

  function restoreRevision(revision: CinematicFullStoryRevision) {
    void run("restore", () =>
      saveRevision(
        "restore",
        revision.content,
        t("cinematic.fullStory.restoreInstruction", {
          version: revision.version,
        }),
        revision.provenance,
      ),
    );
  }

  function confirmStory() {
    if (!activeRevision || dirty) return;
    void run("confirm", async () => {
      const saved = await confirmCinematicFullStoryRevision(
        project.id,
        project.version,
        activeRevision.id,
      );
      onProjectChanged(saved);
    });
  }

  function generateChapters() {
    if (!confirmedCurrent) return;
    void run("chapters", async () => {
      const result = await generateCinematicFullStoryChapters(
        project.id,
        project.version,
      );
      onProjectChanged(result.project);
      setChapterProposal(
        result.proposal.status === "pending_review" ? result.proposal : null,
      );
      queryClient.setQueryData(seriesQueryKey, result.workspace);
      if (result.proposal.status === "applied") onOpenChapters();
    });
  }

  function extractCharacters() {
    if (!activeRevision || dirty || proposal || !online) return;
    setCharacterResult("");
    void run("characters", async () => {
      const extracted = await proposeCinematicFullStory(project.id, project.version, "", "characters");
      if (!extracted.characters.length) {
        setCharacterResult(t("cinematic.storyImport.noCharacters"));
        return;
      }
      const saved = await saveCinematicFullStoryRevision(project.id, {
        expectedVersion: project.version,
        content: activeRevision.content,
        source: "manual",
        characters: extracted.characters,
        provenance: extracted.provenance,
      });
      onProjectChanged(saved);
      setCharacterResult(t("cinematic.storyImport.charactersReady", { count: extracted.characters.length }));
    });
  }

  function applyChapters() {
    if (!chapterProposal) return;
    void run("apply-chapters", async () => {
      const result = await applyCinematicChapterProposal(
        project.id,
        chapterProposal.id,
      );
      onProjectChanged(result.project);
      setChapters(result.workspace.chapters);
      setChapterProposal(null);
      queryClient.setQueryData(seriesQueryKey, result.workspace);
      onOpenChapters();
    });
  }

  function discardChapters() {
    if (!chapterProposal) return;
    void run("discard-chapters", async () => {
      const result = await discardCinematicChapterProposal(
        project.id,
        chapterProposal.id,
      );
      onProjectChanged(result.project);
      setChapterProposal(null);
      queryClient.setQueryData(seriesQueryKey, result.workspace);
    });
  }

  return (
    <main className="cinematic-full-story" data-testid="cinematic-full-story">
      <header className="cinematic-full-story__header">
        <button
          type="button"
          className="cinematic-full-story__back"
          onClick={onBackToBrief}
        >
          <ArrowLeft aria-hidden="true" />
          {t("cinematic.fullStory.backToBrief")}
        </button>
        <div>
          <span>{t("cinematic.fullStory.eyebrow")}</span>
          <h1>{project.title}</h1>
        </div>
        <span className="cinematic-full-story__status" role="status">
          {confirmedCurrent ? (
            <Check aria-hidden="true" />
          ) : (
            <BookOpenText aria-hidden="true" />
          )}
          {t(
            confirmedCurrent
              ? "cinematic.fullStory.confirmed"
              : "cinematic.fullStory.draft",
          )}
        </span>
      </header>

      <details className="cinematic-full-story__brief">
        <summary>
          <BookOpenText aria-hidden="true" />
          <span>
            <strong>{t("cinematic.fullStory.projectBrief")}</strong>
            <small>
              {project.setup.storyBrief || t("cinematic.fullStory.emptyBrief")}
            </small>
          </span>
        </summary>
        <p>{project.setup.storyBrief || t("cinematic.fullStory.emptyBrief")}</p>
      </details>

      {error ? (
        <StatusNotice
          tone="error"
          title={t("cinematic.fullStory.operationFailed")}
        >
          {error}
        </StatusNotice>
      ) : null}
      {hasOlderConfirmation ? (
        <StatusNotice
          tone="warning"
          title={t("cinematic.fullStory.confirmationOutdated")}
        >
          {t("cinematic.fullStory.confirmationOutdatedDescription")}
        </StatusNotice>
      ) : null}

      <div
        className="cinematic-full-story__workspace"
        inert={busy ? true : undefined}
      >
        <section
          className="cinematic-full-story__document"
          aria-labelledby="cinematic-full-story-title"
        >
          <div className="cinematic-full-story__document-heading">
            <div>
              <span>{t("cinematic.fullStory.documentEyebrow")}</span>
              <h2 id="cinematic-full-story-title">
                {t("cinematic.fullStory.documentTitle")}
              </h2>
            </div>
            <small>
              {t("cinematic.fullStory.characterCount", {
                count: Array.from(content).length,
                limit: 50000,
              })}
            </small>
          </div>
          <textarea
            aria-label={t("cinematic.fullStory.documentTitle")}
            value={content}
            maxLength={50000}
            placeholder={t("cinematic.fullStory.placeholder")}
            onChange={(event) => {
              setContent(event.target.value);
              setProposal(null);
              setPreviewRevisionId(null);
            }}
          />
          <footer>
            <Button
              icon={<Save />}
              loading={busy === "save"}
              disabled={!online || Boolean(busy) || !content.trim() || !dirty}
              onClick={() => void run("save", () => saveRevision())}
            >
              {t("cinematic.fullStory.saveRevision")}
            </Button>
            <Button
              variant="primary"
              icon={<Check />}
              loading={busy === "confirm"}
              disabled={
                !online ||
                Boolean(busy) ||
                !activeRevision ||
                dirty ||
                confirmedCurrent
              }
              onClick={confirmStory}
            >
              {t("cinematic.fullStory.confirmStory")}
            </Button>
          </footer>
          {visibleChapters.length ? (
            <section className="cinematic-full-story__chapter-result">
              <header>
                <span>{t("cinematic.fullStory.chapterResultEyebrow")}</span>
                <h2>{t("cinematic.fullStory.chapterResultTitle")}</h2>
              </header>
              <ol>
                {visibleChapters.map((chapter) => (
                  <li key={chapter.projectId}>
                    <span>{String(chapter.order).padStart(2, "0")}</span>
                    <div>
                      <strong>{chapter.title}</strong>
                      <p>{chapter.storyBrief}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </section>

        <aside className="cinematic-full-story__side-rail">
          <section className="cinematic-full-story__assistant">
            <div>
              <Sparkles aria-hidden="true" />
              <span>
                <strong>{t("cinematic.fullStory.assistantTitle")}</strong>
                <small>
                  {t(
                    activeRevision
                      ? "cinematic.fullStory.assistantDescriptionRevision"
                      : "cinematic.fullStory.assistantDescriptionInitial",
                  )}
                </small>
              </span>
            </div>
            {activeRevision ? (
              <label>
                <span>{t("cinematic.fullStory.instruction")}</span>
                <textarea
                  value={instruction}
                  maxLength={2000}
                  rows={4}
                  required
                  aria-required="true"
                  placeholder={t("cinematic.fullStory.instructionPlaceholder")}
                  onChange={(event) => {
                    setInstruction(event.target.value);
                    setError("");
                  }}
                />
              </label>
            ) : null}
            <Button
              variant="primary"
              icon={<Sparkles />}
              loading={busy === "propose"}
              disabled={
                !online ||
                Boolean(busy) ||
                Boolean(activeRevision && !instruction.trim()) ||
                (!project.setup.storyBrief.trim() && !content.trim())
              }
              onClick={generateProposal}
            >
              {t(
                activeRevision
                  ? "cinematic.fullStory.reviseWithAi"
                  : "cinematic.fullStory.generateWithAi",
              )}
            </Button>
            {proposal ? (
              <div className="cinematic-full-story__proposal-note">
                <p>{t("cinematic.fullStory.proposalReady")}</p>
                <p>
                  {t("cinematic.fullStory.proposedCharacters", {
                    count: proposal.characters.length,
                  })}
                </p>
              </div>
            ) : null}
          </section>
          <CinematicSharedCharactersPanel
            actorId={actorId}
            project={project}
            storyProjectId={project.id}
            online={online}
            onProjectChanged={onProjectChanged}
            storyAction={activeRevision ? <>
              <Button type="button" icon={<Sparkles />} loading={busy === "characters"}
                disabled={!online || Boolean(busy) || dirty || Boolean(proposal)}
                title={dirty ? t("cinematic.storyImport.saveBeforeCharacters") : undefined}
                onClick={extractCharacters}>{t("cinematic.storyImport.extractCharacters")}</Button>
              {characterResult ? <p role="status">{characterResult}</p> : null}
            </> : undefined}
          />
          {confirmedCurrent ? (
            <section className="cinematic-full-story__chapters-action">
              <div>
                <Split aria-hidden="true" />
                <span>
                  <strong>
                    {t("cinematic.fullStory.generateChaptersTitle")}
                  </strong>
                  <small>
                    {t("cinematic.fullStory.generateChaptersDescription")}
                  </small>
                </span>
              </div>
              <div className="cinematic-chapter-target">
                <p>{t("cinematic.chapterPlan.target", { count: project.setup.chapterCount || 1 })}</p>
                <Button size="sm" icon={<Settings2 />} disabled={Boolean(busy) || dirty || Boolean(proposal)}
                  onClick={onBackToBrief}>{t("cinematic.chapterPlan.editSetup")}</Button>
              </div>
              {chapterWorkStarted ? (
                <Button
                  variant="primary"
                  icon={<PenLine />}
                  disabled={!online || Boolean(busy)}
                  onClick={onOpenChapters}
                >
                  {t("cinematic.fullStory.continueChapters")}
                </Button>
              ) : (
                <>
                  <div
                    className="cinematic-full-story__chapter-modes"
                    role="group"
                    aria-label={t("cinematic.fullStory.chapterBuildMode")}
                  >
                    <button
                      type="button"
                      className={
                        chapterBuildMode === "generate" ? "is-selected" : ""
                      }
                      aria-pressed={chapterBuildMode === "generate"}
                      onClick={() => setChapterBuildMode("generate")}
                    >
                      <Sparkles aria-hidden="true" />
                      {t("cinematic.fullStory.chapterModeGenerate")}
                    </button>
                    <button
                      type="button"
                      className={
                        chapterBuildMode === "manual" ? "is-selected" : ""
                      }
                      aria-pressed={chapterBuildMode === "manual"}
                      onClick={() => setChapterBuildMode("manual")}
                    >
                      <PenLine aria-hidden="true" />
                      {t("cinematic.fullStory.chapterModeManual")}
                    </button>
                  </div>
                  {chapterBuildMode === "generate" ? (
                    <Button
                      variant="primary"
                      icon={<Split />}
                      loading={busy === "chapters" || chapterStatusLoading}
                      disabled={
                        !online || Boolean(busy) || chapterStatusLoading
                      }
                      onClick={generateChapters}
                    >
                      {t("cinematic.fullStory.generateChapters")}
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      icon={<PenLine />}
                      disabled={!online || Boolean(busy)}
                      onClick={onOpenChapters}
                    >
                      {t("cinematic.fullStory.buildManually")}
                    </Button>
                  )}
                </>
              )}
            </section>
          ) : null}
        </aside>
      </div>

      <details className="cinematic-full-story__history">
        <summary>
          <History aria-hidden="true" />
          <span>
            <strong>{t("cinematic.fullStory.history")}</strong>
            <small>
              {t("cinematic.fullStory.revisionCount", {
                count: revisions.length,
              })}
            </small>
          </span>
        </summary>
        {revisions.length ? (
          <ol>
            {revisions.map((revision) => (
              <li
                key={revision.id}
                className={
                  revision.id === activeRevision?.id ? "is-active" : ""
                }
              >
                <button
                  type="button"
                  onClick={() => {
                    setContent(revision.content);
                    setPreviewRevisionId(revision.id);
                    setProposal(null);
                  }}
                >
                  <strong>
                    {t("cinematic.fullStory.revision", {
                      version: revision.version,
                    })}
                  </strong>
                  <span>
                    {new Intl.DateTimeFormat(
                      i18n.resolvedLanguage || i18n.language,
                      { dateStyle: "medium", timeStyle: "short" },
                    ).format(new Date(revision.createdAt))}
                  </span>
                </button>
                {previewRevisionId === revision.id &&
                revision.id !== activeRevision?.id ? (
                  <Button
                    size="sm"
                    disabled={Boolean(busy)}
                    onClick={() => restoreRevision(revision)}
                  >
                    {t("cinematic.fullStory.restore")}
                  </Button>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p>{t("cinematic.fullStory.noHistory")}</p>
        )}
      </details>

      {chapterProposal ? (
        <section
          className="cinematic-chapter-proposal"
          aria-labelledby="cinematic-chapter-proposal-title"
        >
          <header>
            <div>
              <span>{t("cinematic.fullStory.chapterProposalEyebrow")}</span>
              <h2 id="cinematic-chapter-proposal-title">
                {t("cinematic.fullStory.chapterProposalTitle")}
              </h2>
            </div>
            <small>
              {t("cinematic.fullStory.chapterProposalCount", {
                count: chapterProposal.chapters.length,
              })}
            </small>
          </header>
          <ol>
            {chapterProposal.chapters.map((chapter) => (
              <li key={`${chapter.order}-${chapter.projectId || "new"}`}>
                <span>{String(chapter.order).padStart(2, "0")}</span>
                <div>
                  <strong>{chapter.title}</strong>
                  <p>{chapter.story}</p>
                  <small>
                    {t(
                      chapter.projectId
                        ? "cinematic.fullStory.updateExisting"
                        : "cinematic.fullStory.createNew",
                    )}
                  </small>
                </div>
              </li>
            ))}
          </ol>
          <footer>
            <Button
              icon={<X />}
              loading={busy === "discard-chapters"}
              disabled={Boolean(busy)}
              onClick={discardChapters}
            >
              {t("cinematic.fullStory.discardProposal")}
            </Button>
            <Button
              variant="primary"
              icon={<Check />}
              loading={busy === "apply-chapters"}
              disabled={Boolean(busy)}
              onClick={applyChapters}
            >
              {t("cinematic.fullStory.applyProposal")}
            </Button>
          </footer>
        </section>
      ) : null}

    </main>
  );
}
