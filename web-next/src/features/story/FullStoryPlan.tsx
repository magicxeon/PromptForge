import { useTranslation } from "react-i18next";
import { ChevronRight, Sparkles } from "lucide-react";
import type { RunWriting } from "./data/useStoryWorkspace";
import type { CinematicProject } from "../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import {
  confirmCinematicFullStoryRevision, generateCinematicFullStoryChapters,
  proposeCinematicChapterOutline, reviewCinematicChapterOutline,
} from "../../../../web/src/features/cinematic/api/cinematicApi";
import { applyCinematicChapterProposal, discardCinematicChapterProposal } from "../../../../web/src/features/cinematic/api/cinematicSeriesApi";
import { chapterOutlineIsStale } from "../../../../web/src/features/cinematic/components/CinematicChapterOutline";

type Props = {
  project: CinematicProject;
  run: RunWriting;
  goChapter: (id: string) => void;
};

export function FullStoryPlan({ project, run, goChapter }: Props) {
  const { t } = useTranslation("storyPlan");
  const revision = project.fullStoryVersions.find(v => v.id === project.activeFullStoryVersionId);
  if (!revision) return null;
  const confirmed = project.confirmedFullStoryVersionId === revision.id;
  const plan = project.chapterOutline;
  const current = plan && !chapterOutlineIsStale(project);
  const pending = project.chapterProposals.find(p => p.scope === "all" && p.status === "pending_review");
  const applied = [...project.chapterProposals].reverse().find(p => p.status === "applied" && p.scope === "all");
  async function generateOrReview(action: "generate" | "apply" | "discard") {
    await run(async () => {
      if (action !== "generate" && !pending) return;
      return action === "generate"
        ? generateCinematicFullStoryChapters(project.id, project.version)
        : (action === "apply" ? applyCinematicChapterProposal : discardCinematicChapterProposal)(project.id, pending!.id);
    }, action === "generate" ? "chapters" : undefined);
  }
  return <section className="story-panel story-chapter-plan" aria-label={t("heading")}>
    <h2>{t("heading")}</h2>
    {!confirmed && <button onClick={() => void run(async () => ({project: await confirmCinematicFullStoryRevision(project.id, project.version, revision.id)}))}>
      {t("confirmRevision",{version:revision.version})}</button>}
    {confirmed && (!current || !plan) && !pending && <>
      {plan && <p>{t("outdated")}</p>}
      <button onClick={() => void run(async () => ({project: await proposeCinematicChapterOutline(project.id, project.version)}), "outline")}>{t("proposeOutline")}</button>
    </>}
    {confirmed && current && plan && !pending && <>
      <ol className="story-chapter-outline">{plan.chapters.map((row,i) => <li key={i}><strong>{row.title}</strong><p>{row.synopsis}</p></li>)}</ol>
      {plan.status === "proposed" ? <div className="story-actions">
        {(["approve","discard"] as const).map(action => <button key={action} onClick={() => void run(async () => ({
          project: await reviewCinematicChapterOutline(project.id,{
            expectedVersion:project.version,
            outlineId:plan.id,
            action,
            ...(action === "approve" ? {chapters:plan.chapters} : {})
          })
        }))}>{t(action+"Outline")}</button>)}
      </div> : <div className="story-chapter-draft-action">
        <button type="button" className="primary-button" onClick={() => void generateOrReview("generate")}>
          <Sparkles size={16} aria-hidden/>{t("writeChapters")}
        </button>
        <p>{t("writeChaptersHint")}</p>
      </div>}
    </>}
    {pending && <>
      <h3>{t("reviewChapters")}</h3>
      {pending.chapters.map(ch => <details key={ch.order}><summary>{ch.order}. {ch.title}</summary><p style={{whiteSpace:"pre-wrap"}}>{ch.story}</p></details>)}
      {pending.warnings.map(message => <p key={message}>{message}</p>)}
      <div className="story-actions">
        <button disabled={!confirmed || pending.sourceFullStoryRevisionId !== revision.id} onClick={() => void generateOrReview("apply")}>{t("applyChapters")}</button>
        <button onClick={() => void generateOrReview("discard")}>{t("discardChapters")}</button>
      </div>
    </>}
    {!!applied?.appliedProjectIds?.length && <section className="story-saved-chapters" aria-label={t("savedChapters")}>
      <h3>{t("savedChapters")}</h3>
      <ul>{applied.appliedProjectIds.map((id,index) => {
        const title = applied.chapters[index]?.title || String(index+1);
        return <li key={id}><button type="button" aria-label={t("openChapter",{name:title})} onClick={() => goChapter(id)}>
          <span>{title}</span>
          <span className="story-open-chapter">{t("openScript")}<ChevronRight size={15} aria-hidden/></span>
        </button></li>;
      })}</ul>
    </section>}
  </section>;
}
