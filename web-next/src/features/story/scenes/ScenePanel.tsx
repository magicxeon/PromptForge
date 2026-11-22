import {useRef,useState} from "react";
import {useTranslation} from "react-i18next";
import type {CinematicProject,CinematicScene} from "../../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import {createCinematicManualShot} from "../../../../../web/src/features/cinematic/api/cinematicSeriesApi";
import type {RunWriting} from "../data/useStoryWorkspace";
import {SceneShotEditDialog} from "./SceneShotEditDialog";

export function ScenePanel({project,scene,index,run,back,pending,requestShots,shotLimit,error}:{
  project:CinematicProject;scene:CinematicScene;index:number;run:RunWriting;back:()=>void;pending:boolean;
  requestShots:(id?:string,instruction?:string)=>Promise<boolean>;shotLimit?:number;error:string;
}){
  const {t}=useTranslation("story"),[edit,setEdit]=useState<string|null>(null);
  const shots=[...scene.shots].sort((a,b)=>a.orderKey-b.orderKey);
  const shot=shots.find(s=>s.id===edit);
  const buttons=useRef(new Map<string,HTMLButtonElement>());
  const close=()=>{const id=edit;setEdit(null);requestAnimationFrame(()=>buttons.current.get(id||"")?.focus());};
  const actions=<div className="story-actions"><button className="primary" onClick={()=>void requestShots()}>{t(pending?"reviewShots":"proposeShots")}</button>
    <button onClick={()=>void run(async()=>{const r=await createCinematicManualShot(project.id,scene.id,project.version,crypto.randomUUID());
      if(r.shot)setEdit(r.shot.id);return r;})}>{t("addShot")}</button></div>;
  return <article><button onClick={back}>‹ {t("sceneIndex")}</button>
    <header className="story-bar"><h2>{t("sceneTitle",{index,name:scene.title})}</h2>
      <button ref={el=>{if(el)buttons.current.set("scene",el);}} onClick={()=>setEdit("scene")}>{t("editScene")}</button></header>
    {scene.sourceChapterRevisionId&&scene.sourceChapterRevisionId!==project.activeChapterVersionId && <p role="status">{t("sourceChanged")}</p>}
    <p className="story-prose">{scene.synopsis||scene.storyChange}</p>
    <div className="story-bar"><h3>{t("shotCount",{count:shots.length})}</h3>
      {shots.length>0 && !pending && <details><summary>{t("sceneActions")}</summary>{actions}</details>}</div>
    {(!shots.length || pending) && actions}
    <ol className="story-shots">{shots.map((s,i)=><li key={s.id}>
      <button ref={el=>{if(el)buttons.current.set(s.id,el);}} onClick={()=>setEdit(s.id)}>
        <strong>{t("shotTitle",{index:i+1,name:s.title})}</strong><span>{t("seconds",{n:s.durationMs/1000})}</span>
        <p>{s.visibleMoment||s.subjectAction||s.purpose}</p>
        {s.shotDocument?<p className="story-prose">{s.shotDocument}</p>:s.dialogueCues?.map((line,n)=><p key={n}>{line.offscreenVoiceRole||s.speakerBindings?.find(b=>b.castAssignmentId===line.speakerCastAssignmentId)?.alias||project.castAssignments.find(c=>c.id===line.speakerCastAssignmentId)?.displayName} {line.text}</p>)}
        {s.shotPlanningStatus==="review_required" && <small>{t("sourceChanged")}</small>}
      </button></li>)}</ol>
    {(edit==="scene"||shot) && <SceneShotEditDialog key={edit} project={project} scene={scene} shot={shot} run={run} close={close} error={error}
      requestRevision={async instruction=>{if(await requestShots(shot?.id,instruction))close();}} max={shotLimit}/>}
  </article>;
}
