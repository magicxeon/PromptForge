import { useTranslation } from "react-i18next";
import {StoryAppliedSkills,StoryRunSkillPicker,useTakeStoryRunSkills} from "./StoryRunSkills";
import { ChevronRight, Sparkles } from "lucide-react";
import type { RunWriting } from "./data/useStoryWorkspace";
import type { CinematicProject } from "../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import {
  confirmCinematicFullStoryRevision, generateCinematicFullStoryChapters,
  type ChapterDraftProgress,
  proposeCinematicChapterOutline, reviewCinematicChapterOutline,
} from "../../../../web/src/features/cinematic/api/cinematicApi";
import { applyCinematicChapterProposal, discardCinematicChapterProposal } from "../../../../web/src/features/cinematic/api/cinematicSeriesApi";
import { chapterOutlineIsStale } from "../../../../web/src/features/cinematic/components/CinematicChapterOutline";

type Props = {
  project: CinematicProject;
  run: RunWriting;
  onDraftProgress?: (progress: ChapterDraftProgress | null) => void;
  goChapter: (id: string) => void;
};

export function FullStoryPlan({ project, run, goChapter, onDraftProgress }: Props) {
  const { t } = useTranslation("storyPlan");
  const takeChapterSkills=useTakeStoryRunSkills("chapters");
  const takeOutlineSkills=useTakeStoryRunSkills("chapter_outline");
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
      if (action === "generate" && plan?.chapters.length) {
        onDraftProgress?.({completed:0,total:plan.chapters.length,title:plan.chapters[0].title});
        try {
          return await generateCinematicFullStoryChapters(project.id, project.version, takeChapterSkills(), progress => onDraftProgress?.(progress));
        } finally {
          onDraftProgress?.(null);
        }
      }
      if (pending) return (action === "apply" ? applyCinematicChapterProposal : discardCinematicChapterProposal)(project.id, pending.id);
    }, action === "generate" ? "chapters" : undefined);
  }
  return <section className="story-panel story-chapter-plan" aria-label={t("heading")}>
    <h2>{t("heading")}</h2>
    {!confirmed && <button onClick={() => void run(async () => ({project: await confirmCinematicFullStoryRevision(project.id, project.version, revision.id)}))}>
      {t("confirmRevision",{version:revision.version})}</button>}
    {confirmed && (!current || !plan) && !pending && <>
      <StoryRunSkillPicker task="chapter_outline"/>
      {plan && <p>{t("outdated")}</p>}
        <button type="button" className="primary-button" onClick={() => void run(async () => ({project: await proposeCinematicChapterOutline(project.id, project.version,takeOutlineSkills())}), "outline")}><Sparkles size={16} aria-hidden/>{t("proposeOutline")}</button>
    </>}
    {confirmed && current && plan && !pending && <>
      <ol className="story-chapter-outline">{plan.chapters.map((row,i) => <li key={i} value={row.chapterNumber}><strong>{row.title}</strong><p>{row.synopsis}</p></li>)}</ol>
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
        <StoryRunSkillPicker task="chapters"/>
        <button type="button" className="primary-button" onClick={() => void generateOrReview("generate")}>
          <Sparkles size={16} aria-hidden/>{t("writeChapters")}
        </button>
        <p>{t("writeChaptersHint")}</p>
      </div>}
    </>}
    {pending && <>
      <h3>{t("reviewChapters")}</h3>
      {pending.chapters.map(ch => <details key={ch.order}><summary>{ch.chapterNumber}. {ch.title}</summary><p style={{whiteSpace:"pre-wrap"}}>{ch.story}</p></details>)}
      <StoryAppliedSkills trace={pending.provenance}/>
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
