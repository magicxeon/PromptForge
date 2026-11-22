import {useState} from "react";
import {initialRanges,SceneRangeReview,type SourceRange} from "./scenes/SceneRangeReview";
import {SceneDirectionSummary} from "./scenes/SceneDirectionSummary";
import {useTranslation} from "react-i18next";
import type {CinematicProject,CinematicScene,CinematicSceneProposal,CinematicShotProposal} from "../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import {applyCinematicSceneProposal,discardCinematicSceneProposal,applyCinematicShotProposal,discardCinematicShotProposal} from "../../../../web/src/features/cinematic/api/cinematicSeriesApi";
import {Dialog} from "../dub-sub/Dialog";
import {ProcessingSpinner} from "../../lib/canonical";
import type {RunWriting} from "./data/useStoryWorkspace";

export function ProposalReview({project,scene,proposal,busy,error,run,close,onApplied}:{
  project:CinematicProject;scene?:CinematicScene;proposal:CinematicSceneProposal|CinematicShotProposal;
  busy:boolean;error:string;run:RunWriting;close:()=>void;onApplied:()=>void;
}){
  const {t}=useTranslation("story");
  const [source,setSource]=useState(false),[confirm,setConfirm]=useState(false);
  const [reviewVersion]=useState(project.version);
  const shot="shots" in proposal;
  const chapterSource=project.chapterVersions.find(revision=>revision.id===proposal.sourceChapterRevisionId)?.story || project.chapterStory || "";
  const paragraphs=chapterSource.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  const [editedRanges,setRanges]=useState<SourceRange[]>();
  const suggested=shot?[]:initialRanges(proposal,paragraphs.length);
  const unverified=!shot && proposal.scenes.some(row=>!row.sourceStartParagraph);
  const ranges=editedRanges??(unverified?[]:suggested);
  const next=shot?proposal.shots:proposal.scenes;
  const single=shot?proposal.targetShotId:undefined;
  const previous=shot?(scene?.shots||[]).filter(s=>!single||s.id===single):project.scenes;
  const ordered=[...previous].sort((a,b)=>a.orderKey-b.orderKey);
  const counts=editedRanges?{
    update:editedRanges.filter((row,i)=>row.origins[0]<ordered.length && !editedRanges.slice(0,i).some(earlier=>earlier.origins.includes(row.origins[0]))).length,
    add:0,keep:Math.max(0,ordered.length-next.length)
  }:{update:Math.min(next.length,ordered.length),add:Math.max(0,next.length-ordered.length),keep:Math.max(0,ordered.length-next.length)};
  if(editedRanges)counts.add=editedRanges.length-counts.update;
  const title=t(shot?(single?"reviewRevision":"reviewShots"):"reviewScenes");
  const contextTitle=scene?.title||project.chapterTitle||project.title;
  const acceptLabel=t(shot?(single?"applyRevision":"applyShots"):"applyScenes");
  const stale=reviewVersion!==project.version||proposal.sourceChapterRevisionId!==project.activeChapterVersionId||
    (shot && (proposal.sourceSceneVersion!==scene?.version || !!single&&scene?.shots.find(s=>s.id===single)?.version!==proposal.sourceShotVersion));
  const submit=(apply:boolean)=>void run(async()=>{
    const result=shot?await (apply?applyCinematicShotProposal:discardCinematicShotProposal)(project.id,proposal.sceneId,proposal.id,project.version)
      :apply?await applyCinematicSceneProposal(project.id,proposal.id,project.version,editedRanges)
      :await discardCinematicSceneProposal(project.id,proposal.id,project.version);
    if(apply)onApplied();else close();return result;
  });
  const feedback=<>{error&&<p role="alert">{error}</p>}{stale&&<p role="alert">{t("sourceChanged")}</p>}</>;
  const actions=<footer>
    {feedback}
    <div className="story-proposal-actions">
      <button disabled={busy} onClick={()=>submit(false)}>{t("discardProposal")}</button>
      <button className={shot?"primary":"primary-button"} disabled={stale||busy}
        onClick={()=>ordered.length?setConfirm(true):submit(true)}>{busy&&<ProcessingSpinner/>}{acceptLabel}</button>
    </div>
  </footer>;
  return <Dialog label={title} onClose={()=>{if(!busy)close();}}>
    <div className={shot?"story-review":"story-review story-scene-review"}>
      <header className={shot?"story-bar":"story-proposal-heading"}>
        {shot?<h2>{title} · {contextTitle}</h2>:<div><h2>{title}</h2><p>{contextTitle}</p></div>}
        <button disabled={busy} onClick={close}>{t("close")}</button>
      </header>
      <div className="story-proposal-toolbar">
        {!shot && <p className="story-proposal-impact" role="status">{t("impact",counts)}</p>}
        <button aria-pressed={source} onClick={()=>setSource(!source)}>{t(source?"proposal":"source")}</button>
      </div>
      <div className="story-compare" data-source={source}>
        <div className="story-source" hidden={!source}><h3>{t("source")}</h3><p className="story-prose">{scene?scene.synopsis||scene.storyChange:chapterSource}</p></div>
        <div className="story-proposals">{shot && <p>{t("impact",counts)}</p>}
          {unverified && !editedRanges && suggested.length>0 && <button disabled={stale||busy} onClick={()=>setRanges(suggested)}>{t("brief.assignRanges")}</button>}
          {!shot && ranges.length>0 ? <SceneRangeReview proposal={proposal} paragraphs={paragraphs} ranges={ranges}
            existing={project.scenes.slice().sort((a,b)=>a.orderKey-b.orderKey)} disabled={busy||stale} onChange={setRanges}/> : <ol>{next.map((n,i)=><li key={i}><strong>{ordered[i]&&(shot||ordered[i].title!==n.title)?ordered[i].title+" → ":""}{n.title}</strong>
            {ordered[i]&&"shots" in ordered[i]&&<small>{t("shotCount",{count:ordered[i].shots.length})}</small>}
            <p className="story-prose">{"shotDocument" in n?n.shotDocument:n.synopsis}</p>
            {"synopsis" in n && <SceneDirectionSummary scene={n}/>}</li>)}
          {ordered.slice(next.length).map(old=><li key={old.id}>{old.title} · {t("retained")}</li>)}</ol>}
          {proposal.warnings.map(w=><p key={w}>{w}</p>)}
          {shot && actions}
        </div></div>
      {!shot && actions}
    </div>
    {confirm&&<Dialog label={acceptLabel} onClose={()=>setConfirm(false)}>
      <div className={shot?undefined:"story-save-confirmation"}>
        <header><h2>{acceptLabel}</h2><p>{t("impact",counts)}</p></header>
        <footer><button onClick={()=>setConfirm(false)}>{t("cancel")}</button>
          <button className={shot?"primary":"primary-button"} onClick={()=>{setConfirm(false);submit(true);}}>{acceptLabel}</button></footer>
      </div>
    </Dialog>}
  </Dialog>;
}
