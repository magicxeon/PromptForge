import {useState} from "react";
import {useTranslation} from "react-i18next";
import type {CinematicProject,CinematicScene,CinematicSceneProposal,CinematicShotProposal} from "../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import {applyCinematicSceneProposal,discardCinematicSceneProposal,applyCinematicShotProposal,discardCinematicShotProposal} from "../../../../web/src/features/cinematic/api/cinematicSeriesApi";
import {Dialog} from "../dub-sub/Dialog";
import {ProcessingSpinner} from "../../lib/canonical";
import type {RunWriting} from "./StoryEditor";

export function ProposalReview({project,scene,proposal,busy,error,run,close,onApplied}:{
  project:CinematicProject;scene?:CinematicScene;proposal:CinematicSceneProposal|CinematicShotProposal;
  busy:boolean;error:string;run:RunWriting;close:()=>void;onApplied:()=>void;
}){
  const {t}=useTranslation("story");
  const [source,setSource]=useState(false),[confirm,setConfirm]=useState(false);
  const [reviewVersion]=useState(project.version);
  const shot="shots" in proposal;
  const next=shot?proposal.shots:proposal.scenes;
  const single=shot?proposal.targetShotId:undefined;
  const previous=shot?(scene?.shots||[]).filter(s=>!single||s.id===single):project.scenes;
  const ordered=[...previous].sort((a,b)=>a.orderKey-b.orderKey);
  const title=t(shot?(single?"reviewRevision":"reviewShots"):"reviewScenes");
  const acceptLabel=t(shot?(single?"applyRevision":"applyShots"):"applyScenes");
  const stale=reviewVersion!==project.version||proposal.sourceChapterRevisionId!==project.activeChapterVersionId||
    (shot && (proposal.sourceSceneVersion!==scene?.version || !!single&&scene?.shots.find(s=>s.id===single)?.version!==proposal.sourceShotVersion));
  const submit=(apply:boolean)=>void run(async()=>{
    const result=shot?await (apply?applyCinematicShotProposal:discardCinematicShotProposal)(project.id,proposal.sceneId,proposal.id,project.version)
      :await (apply?applyCinematicSceneProposal:discardCinematicSceneProposal)(project.id,proposal.id,project.version);
    if(apply)onApplied();else close();return result.project;
  });
  return <Dialog label={title} onClose={()=>{if(!busy)close();}}>
    <div className="story-review"><header className="story-bar"><h2>{title} · {scene?.title||project.chapterTitle||project.title}</h2>
      <button disabled={busy} onClick={close}>{t("close")}</button></header>
      <button aria-pressed={source} onClick={()=>setSource(!source)}>{t(source?"proposal":"source")}</button>
      <div className="story-compare" data-source={source}>
        <div className="story-source" hidden={!source}><h3>{t("source")}</h3><p className="story-prose">{scene?scene.synopsis||scene.storyChange:project.chapterStory}</p></div>
        <div className="story-proposals"><p>{t("impact",{update:Math.min(next.length,ordered.length),add:Math.max(0,next.length-ordered.length),keep:Math.max(0,ordered.length-next.length)})}</p>
          <ol>{next.map((n,i)=><li key={i}><strong>{ordered[i]?ordered[i].title+" → ":""}{n.title}</strong>
            {ordered[i]&&"shots" in ordered[i]&&<small>{t("shotCount",{count:ordered[i].shots.length})}</small>}
            <p className="story-prose">{"shotDocument" in n?n.shotDocument:n.synopsis}</p></li>)}
          {ordered.slice(next.length).map(old=><li key={old.id}>{old.title} · {t("retained")}</li>)}</ol>
          {proposal.warnings.map(w=><p key={w}>{w}</p>)}
          {error&&<p role="alert">{error}</p>}{stale&&<p role="alert">{t("sourceChanged")}</p>}
          <footer><button disabled={busy} onClick={()=>submit(false)}>{t("discardProposal")}</button>
            <button className="primary" disabled={stale||busy} onClick={()=>ordered.length?setConfirm(true):submit(true)}>{busy&&<ProcessingSpinner/>}{acceptLabel}</button></footer>
        </div></div>
      {confirm&&<Dialog label={acceptLabel} onClose={()=>setConfirm(false)}><h2>{acceptLabel}</h2>
        <p>{t("impact",{update:Math.min(next.length,ordered.length),add:Math.max(0,next.length-ordered.length),keep:Math.max(0,ordered.length-next.length)})}</p>
        <footer><button onClick={()=>setConfirm(false)}>{t("cancel")}</button><button className="primary" onClick={()=>{setConfirm(false);submit(true);}}>{acceptLabel}</button></footer></Dialog>}
    </div>
  </Dialog>;
}
