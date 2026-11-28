import {useTranslation} from "react-i18next";
import {StoryAppliedSkills,StoryRunSkillPicker,useTakeStoryRunSkills} from "./StoryRunSkills";
import {Link} from "react-router-dom";
import {ChevronRight, TriangleAlert} from "lucide-react";
import "./chapterContinuityReview.css";
import type {CinematicProject} from "../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import type {CinematicSeriesWorkspace} from "../../../../web/src/features/cinematic/schemas/cinematicSeriesSchemas";
import {applyCinematicChapterProposal, discardCinematicChapterProposal, proposeCinematicChapters} from "../../../../web/src/features/cinematic/api/cinematicSeriesApi";
import type {RunWriting} from "./data/useStoryWorkspace";

export function ChapterContinuityReview({project, owner, workspace, run, busy}: {
  project:CinematicProject; owner:CinematicProject; workspace:CinematicSeriesWorkspace; run:RunWriting; busy:boolean;
}) {
  const {t}=useTranslation("story");
  const takeSkills=useTakeStoryRunSkills("chapters");
  const affected=workspace.chapters.filter(chapter=>chapter.continuityReviewRequired);
  const current=affected.some(chapter=>chapter.projectId===project.id);
  const pending=owner.chapterProposals.find(item=>item.status==="pending_review");
  const draft=pending?.scope==="selected" && pending.targetProjectId===project.id ? pending : null;
  if (!affected.length && !draft) return null;
  return <section className="chapter-continuity-review" aria-label={t("continuityQueue.heading")}>
    <header><TriangleAlert size={20} aria-hidden="true"/><h2>{t("continuityQueue.heading")}</h2></header>
    {affected.length > 0 && <ul>{affected.map(chapter=><li key={chapter.projectId}>
      <Link to={"/story/"+encodeURIComponent(chapter.projectId)+"?step=episode"} aria-current={chapter.projectId===project.id?"page":undefined}>
        <span className="chapter-review-order">{chapter.order}</span><span>{chapter.title}</span><ChevronRight size={16} aria-hidden="true"/>
      </Link>
    </li>)}</ul>}
    {draft ? <>
      {draft.chapters.map(chapter=><details key={chapter.order} open><summary>{chapter.title}</summary><p style={{whiteSpace:"pre-wrap"}}>{chapter.story}</p></details>)}
      <StoryAppliedSkills trace={draft.provenance}/>
      <div className="story-actions">
        <button disabled={busy || draft.sourceFullStoryRevisionId!==owner.confirmedFullStoryVersionId}
          onClick={()=>void run(()=>applyCinematicChapterProposal(project.id,draft.id))}>{t("continuityQueue.apply")}</button>
        <button disabled={busy} onClick={()=>void run(()=>discardCinematicChapterProposal(project.id,draft.id))}>{t("continuityQueue.discard")}</button>
      </div>
    </> : current && (pending ? <Link to={"/story/"+encodeURIComponent(pending.targetProjectId)+(pending.scope==="all"?"?step=chapters":"?step=episode")}>{t("continuityQueue.pending")}</Link> :
      <><StoryRunSkillPicker task="chapters"/><button disabled={busy} onClick={()=>void run(()=>proposeCinematicChapters(project.id,{
        expectedVersion:project.version,scope:"selected",intent:"continuity",skillIdsOverride:takeSkills()
      }),"chapters")}>{t("continuityQueue.propose")}</button></>)}
  </section>;
}
