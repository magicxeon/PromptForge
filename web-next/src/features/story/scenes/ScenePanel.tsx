import {useRef,useState} from "react";
import {useTranslation} from "react-i18next";
import type {CinematicProject,CinematicScene} from "../../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import {createCinematicManualShot} from "../../../../../web/src/features/cinematic/api/cinematicSeriesApi";
import type {RunWriting} from "../data/useStoryWorkspace";
import {SceneShotEditDialog} from "./SceneShotEditDialog";
import {ShotPromptDialog} from "./ShotPromptDialog";
import {SceneStage} from "./SceneStage";
import {StoryPromptStatus} from "./StoryPromptStatus";
import {MergedStoryShots} from "./MergedStoryShots";
import "./staging.css";

export function ScenePanel({project,scene,index,run,back,pending,requestShots,shotLimit,error,skills,stage,showStage,aspectRatio,mergeTemplate}:{
  project:CinematicProject;scene:CinematicScene;index:number;run:RunWriting;back:()=>void;pending:boolean;
  requestShots:(id?:string,instruction?:string)=>Promise<boolean>;shotLimit?:number;error:string;
  skills: string[];
  stage:"staging"|"shots";showStage:(stage:"staging"|"shots")=>void;
  aspectRatio:string;
  mergeTemplate?:"flow"|"seedance";
}){
  const {t}=useTranslation("story"),[edit,setEdit]=useState<string|null>(null);
  const [promptId, setPromptId] = useState<string>();
  const shots=[...scene.shots].sort((a,b)=>a.orderKey-b.orderKey);
  const shot=shots.find(s=>s.id===edit);
  const promptShot = shots.find(s=>s.id===promptId);
  const buttons=useRef(new Map<string,HTMLButtonElement>());
  const close=()=>{const id=edit;setEdit(null);requestAnimationFrame(()=>buttons.current.get(id||"")?.focus());};
  const actions=<div className="story-actions"><button className="primary" onClick={()=>void requestShots()}>{t(pending?"reviewShots":"proposeShots")}</button>
    <button onClick={()=>void run(async()=>{const r=await createCinematicManualShot(project.id,scene.id,project.version,crypto.randomUUID());
      if(r.shot)setEdit(r.shot.id);return r;})}>{t("addShot")}</button></div>;
  return <article><button onClick={back}>‹ {t("sceneIndex")}</button>
    <header className="story-bar"><h2>{t("sceneTitle",{index,name:scene.title})}</h2>
      <button ref={el=>{if(el)buttons.current.set("scene",el);}} onClick={()=>setEdit("scene")}>{t("editScene")}</button></header>
    {scene.sourceChapterRevisionId&&scene.sourceChapterRevisionId!==project.activeChapterVersionId && <p role="status">{t("sourceChanged")}</p>}
    {stage==="staging"?<>
      <SceneStage project={project} scene={scene} run={run} aspectRatio={aspectRatio}/>
      <StoryPromptStatus project={project} scene={scene}/>
      <div className="story-actions">
        {shots.length>0 && !pending?<button className="primary" onClick={()=>showStage("shots")}>{t("stage.openShots",{count:shots.length})}</button>:
        <button className="primary" onClick={()=>void requestShots()}>{t(pending?"reviewShots":"stage.propose")}</button>}
        {!shots.length&&<button onClick={()=>void run(async()=>{const r=await createCinematicManualShot(project.id,scene.id,project.version,crypto.randomUUID());
          if(r.shot){showStage("shots");setEdit(r.shot.id);}return r;})}>{t("addShot")}</button>}
      </div>
    </>:<>
    <button onClick={()=>showStage("staging")}>{t("stage.backToSetup")}</button>
    <div className="story-bar"><h3>{t("shotCount",{count:shots.length})} <small>{t("stage.total",{seconds:shots.reduce((sum,s)=>sum+s.durationMs,0)/1000})}</small></h3>
      {shots.length>0 && !pending && <details><summary>{t("sceneActions")}</summary>{actions}</details>}</div>
    {(!shots.length || pending) && actions}
    <MergedStoryShots project={project} scene={scene} shots={shots} run={run} error={error} defaultTemplate={mergeTemplate ?? "seedance"}>
    <ol className="story-shots">{shots.map((shot, shotIndex) => {
      const action = shot.visibleMoment || shot.subjectAction || shot.purpose;
      const camera = [shot.framing, shot.cameraAngle, shot.cameraMovement, shot.lensIntent].filter(Boolean).join(" · ");
      const dialogue = shot.dialogueCues?.filter(line => line.text.trim()) ?? [];
      return <li className="story-shot-card" key={shot.id}>
        <h4><button ref={node => {
          if (node) buttons.current.set(shot.id, node);
          else buttons.current.delete(shot.id);
        }} onClick={() => setEdit(shot.id)}>
          <strong>{t("shotTitle", {index: shotIndex + 1, name: shot.title})}</strong>
          <span>{t("seconds", {n: shot.durationMs / 1000})} · {t("editShot")}</span>
        </button></h4>
        <div className="story-shot-content">
          {shot.shotPlanningStatus === "review_required" && <small>{t("sourceChanged")}</small>}
          {shot.continuityEntry && <section><h5>{t("stage.start")}</h5><p>{shot.continuityEntry}</p></section>}
          {action && <section className="story-shot-action"><h5>{t("shotAction")}</h5><p>{action}</p></section>}
          {camera && <section className="story-shot-camera"><h5>{t("shotCamera")}</h5><p>{camera}</p></section>}
          {dialogue.length > 0 && <section className="story-shot-dialogue"><h5>{t("shotDialogue")}</h5>
            {dialogue.map((line, index) => {
              const speaker = line.offscreenVoiceRole
                || shot.speakerBindings?.find(binding => binding.castAssignmentId === line.speakerCastAssignmentId)?.alias
                || project.castAssignments.find(member => member.id === line.speakerCastAssignmentId)?.displayName;
              return <p className="story-prose" key={index}>{speaker && <strong>{speaker} · </strong>}{line.text}</p>;
            })}
          </section>}
          {shot.shotDocument && <details open={!dialogue.length}>
            <summary>{t("shotDocument")}</summary><p className="story-prose">{shot.shotDocument}</p>
          </details>}
          {(shot.continuityExit||shot.transitionToNext) && <section><h5>{t("stage.end")}</h5><p>{[shot.continuityExit,shot.transitionToNext].filter(Boolean).join(" · ")}</p></section>}
          <div className="story-shot-tools"><button onClick={() => setPromptId(shot.id)}
            aria-label={t("shotPromptFor", {name: shot.title})}>{t("shotPrompt")}</button></div>
        </div>
      </li>;
    })}</ol></MergedStoryShots></>}
    {(edit==="scene"||shot) && <SceneShotEditDialog key={edit} project={project} scene={scene} shot={shot} run={run} close={close} error={error}
      requestRevision={async instruction=>{if(await requestShots(shot?.id,instruction))close();}} max={shotLimit}/>}
    {promptShot && <ShotPromptDialog project={project} scene={scene} shot={promptShot} skills={skills} run={run}
      error={error} close={() => setPromptId(undefined)}/>}
  </article>;
}
