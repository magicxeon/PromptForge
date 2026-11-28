import {useRef,useState} from "react";
import {useTranslation} from "react-i18next";
import {Check, ChevronLeft, CircleCheck, Pencil, Plus, Sparkles} from "lucide-react";
import type {CinematicProject,CinematicScene} from "../../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import {createCinematicManualShot} from "../../../../../web/src/features/cinematic/api/cinematicSeriesApi";
import {arrangeStoryShots, setStorySceneCompletion, setStoryShotCompletion} from "../../../../../web/src/features/cinematic/api/cinematicApi";
import type {RunWriting} from "../data/useStoryWorkspace";
import {SceneShotEditDialog} from "./SceneShotEditDialog";
import {ShotPromptDialog} from "./ShotPromptDialog";
import {SceneStage} from "./SceneStage";
import {StoryPromptStatus} from "./StoryPromptStatus";
import {MergedStoryShots} from "./MergedStoryShots";
import "./staging.css";

export function isSceneComplete(scene: CinematicScene) {
  return scene.completedExternally === true || (scene.shots.length > 0 && scene.shots.every(shot => shot.completed === true));
}

export function ScenePanel({project,scene,index,run,back,pending,requestShots,shotLimit,error,skills,stage,showStage,openScene,aspectRatio,mergeTemplate}:{
  project:CinematicProject;scene:CinematicScene;index:number;run:RunWriting;back:()=>void;pending:boolean;
  requestShots:(id?:string,instruction?:string)=>Promise<boolean>;shotLimit?:number;error:string;
  skills: string[];
  stage:"staging"|"shots";showStage:(stage:"staging"|"shots")=>void;
  openScene:(id:string)=>void;
  aspectRatio:string;
  mergeTemplate?:"flow"|"seedance";
}){
  const {t}=useTranslation("story"),[edit,setEdit]=useState<string|null>(null);
  const {t: labels} = useTranslation("storyPrompt");
  const scenes = [...project.scenes].sort((a,b) => a.orderKey-b.orderKey);
  const [moved, setMoved] = useState<{name:string; destination:CinematicScene}>();
  const [promptId, setPromptId] = useState<string>();
  const shots=[...scene.shots].sort((a,b)=>a.orderKey-b.orderKey);
  async function reorderShot(from:number, to:number) {
    const movingId = shots[from].id;
    const ids = shots.map(item => item.id);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    await run(async () => {
      const result = await arrangeStoryShots(project.id, scene.id, project.version, {shotIds: ids});
      setMoved(undefined);
      return result;
    });
    requestAnimationFrame(()=>buttons.current.get(movingId)?.focus({preventScroll:true}));
  }
  function moveShot(shot:typeof shots[number], destination:CinematicScene) {
    void run(async () => {
      const result = await arrangeStoryShots(project.id, scene.id, project.version,
        {move: {shotId: shot.id, destinationSceneId: destination.id}});
      setMoved({name:shot.title, destination});
      return result;
    });
  }
  const shot=shots.find(s=>s.id===edit);
  const promptShot = shots.find(s=>s.id===promptId);
  const buttons=useRef(new Map<string,HTMLButtonElement>());
  const close=()=>{const id=edit;setEdit(null);requestAnimationFrame(()=>buttons.current.get(id||"")?.focus());};
  const needsProposal = !shots.length || pending;
  const propose = <button className={needsProposal ? "primary-button" : undefined} onClick={()=>void requestShots()}>
    <Sparkles size={15} aria-hidden/>{t(pending?"reviewShots":"proposeShots")}
  </button>;
  const add = <button className={needsProposal ? undefined : "primary-button"} onClick={()=>void run(async()=>{
    const result = await createCinematicManualShot(project.id,scene.id,project.version,crypto.randomUUID());
    if (result.shot) {
      if (stage !== "shots") showStage("shots");
      setEdit(result.shot.id);
    }
    return result;
  })}><Plus size={16} aria-hidden/>{t("addShot")}</button>;
  return <article>
    <header className="story-scene-header">
      <button className="story-scene-back" onClick={back}><ChevronLeft size={16} aria-hidden/>{t("stage.backToScenes")}</button>
      <div className="story-scene-heading" data-completed={isSceneComplete(scene)}>
        <h2>{t("sceneTitle",{index,name:scene.title})}{isSceneComplete(scene) &&
          <span className="story-completion-badge"><Check size={14} aria-hidden/>{t("completion.done")}</span>}</h2>
        {(!isSceneComplete(scene) || scene.completedExternally) && <label className="story-scene-complete">
          <input type="checkbox" checked={scene.completedExternally === true}
            onChange={event=>{const checked=event.currentTarget.checked; void run(()=>setStorySceneCompletion(project.id,scene.id,project.version,checked));}}/>
          {t("completion.done")}
        </label>}
        <button ref={el=>{if(el)buttons.current.set("scene",el);}} onClick={()=>setEdit("scene")}>
          <Pencil size={14} aria-hidden/>{t("stage.editDetails")}
        </button>
      </div>
      <nav className="story-scene-views" aria-label={t("stage.sceneViews")}>
        <button aria-current={stage==="staging"?"page":undefined} onClick={()=>{if(stage!=="staging")showStage("staging");}}>
          {t("stage.setup")}
        </button>
        <button aria-current={stage==="shots"?"page":undefined} onClick={()=>{if(stage!=="shots")showStage("shots");}}>
          {t("stage.shotList")}
        </button>
      </nav>
    </header>
    {scene.sourceChapterRevisionId&&scene.sourceChapterRevisionId!==project.activeChapterVersionId && <p role="status">{t("sourceChanged")}</p>}
    {stage==="staging"?<>
      <SceneStage project={project} scene={scene} run={run} aspectRatio={aspectRatio} editTreatment={()=>setEdit("scene")} error={error}/>
      <StoryPromptStatus project={project} scene={scene}/>
      {needsProposal && <div className="story-actions">{propose}{!shots.length&&add}</div>}
    </>:<>
    {moved && <div className="story-actions" role="status">
      <span>{labels("arrange.moved", {shot:moved.name, scene:moved.destination.title})}</span>
      <button onClick={() => openScene(moved.destination.id)}>{labels("arrange.open")}</button>
    </div>}
    <MergedStoryShots project={project} scene={scene} shots={shots} run={run} error={error} defaultTemplate={mergeTemplate ?? "seedance"}
      shotActions={needsProposal?<>{propose}{add}</>:<>{add}{propose}</>}>
    <ol className="story-shots">{shots.map((shot, shotIndex) => {
      const action = shot.visibleMoment || shot.subjectAction || shot.purpose;
      const camera = [shot.framing, shot.cameraAngle, shot.cameraMovement, shot.lensIntent].filter(Boolean).join(" · ");
      const dialogue = shot.dialogueCues?.filter(line => line.text.trim()) ?? [];
      const completed = shot.completed === true;
      return <li className="story-shot-card" data-completed={completed} key={shot.id}>
        <header className="story-shot-header"><h4><button ref={node => {
          if (node) buttons.current.set(shot.id, node);
          else buttons.current.delete(shot.id);
        }} onClick={() => setEdit(shot.id)}>
          <strong>{t("shotTitle", {index: shotIndex + 1, name: shot.title})}</strong>
          <span className="story-shot-card-meta">
            {t("seconds", {n: shot.durationMs / 1000})}
            <span className="story-shot-edit-label"><Pencil size={14} aria-hidden/>{t("editShot")}</span>
          </span>
        </button></h4>
        <button className="story-shot-completion" type="button"
          aria-label={t("completion.markShot", {name: shot.title})} aria-pressed={completed}
          title={t(completed ? "completion.undo" : "completion.mark")}
          onClick={() => void run(() => setStoryShotCompletion(project.id, scene.id, project.version,
            {shotId: shot.id, completed: !completed}))}>
          {completed ? <Check size={16} aria-hidden/> : <CircleCheck size={16} aria-hidden/>}
          {t(completed ? "completion.done" : "completion.mark")}
        </button></header>
        <div className="story-shot-content">
          {shot.shotPlanningStatus === "review_required" && <small>{t("sourceChanged")}</small>}
          {action && <section className="story-shot-action"><h5>{t("shotAction")}</h5><p>{action}</p></section>}
          <div className="story-shot-toolbar">
          <details className="story-shot-details">
          <summary>{t("shotDocument")}</summary>
          {shot.continuityEntry && <section><h5>{t("stage.start")}</h5><p>{shot.continuityEntry}</p></section>}
          {camera && <section className="story-shot-camera"><h5>{t("shotCamera")}</h5><p>{camera}</p></section>}
          {dialogue.length > 0 && <section className="story-shot-dialogue"><h5>{t("shotDialogue")}</h5>
            {dialogue.map((line, index) => {
              const speaker = line.offscreenVoiceRole
                || shot.speakerBindings?.find(binding => binding.castAssignmentId === line.speakerCastAssignmentId)?.alias
                || project.castAssignments.find(member => member.id === line.speakerCastAssignmentId)?.displayName;
              return <p className="story-prose" key={index}>{speaker && <strong>{speaker} · </strong>}{line.text}</p>;
            })}
          </section>}
          {shot.shotDocument && <p className="story-prose">{shot.shotDocument}</p>}
          {(shot.continuityExit||shot.transitionToNext) && <section><h5>{t("stage.end")}</h5><p>{[shot.continuityExit,shot.transitionToNext].filter(Boolean).join(" · ")}</p></section>}
          </details>
          <div className="story-shot-tools"><button onClick={() => setPromptId(shot.id)}
            aria-label={t("shotPromptFor", {name: shot.title})}>{t("shotPrompt")}</button>
            <details className="story-arrange"><summary>{labels("arrange.title")}</summary>
              <div className="story-arrange-body">
                <div className="story-arrange-group" role="group" aria-label={labels("arrange.withinScene")}>
                  <span aria-hidden="true">{labels("arrange.withinScene")}</span>
                  <div className="story-arrange-buttons">
                    <button disabled={shotIndex === 0} onClick={() => reorderShot(shotIndex,shotIndex-1)}>{labels("arrange.up")}</button>
                    <button disabled={shotIndex === shots.length-1} onClick={() => reorderShot(shotIndex,shotIndex+1)}>{labels("arrange.down")}</button>
                  </div>
                </div>
                <div className="story-arrange-group" role="group" aria-label={labels("arrange.acrossScenes")}>
                  <span aria-hidden="true">{labels("arrange.acrossScenes")}</span>
                  <div className="story-arrange-buttons">
                    <button disabled={!scenes[index-2]} onClick={() => moveShot(shot,scenes[index-2])}>{labels("arrange.previous")}</button>
                    <button disabled={!scenes[index]} onClick={() => moveShot(shot,scenes[index])}>{labels("arrange.next")}</button>
                  </div>
                </div>
              </div>
            </details></div>
          </div>
        </div>
      </li>;
    })}</ol></MergedStoryShots></>}
    {(edit==="scene"||shot) && <SceneShotEditDialog key={edit} project={project} scene={scene} shot={shot} run={run} close={close} error={error}
      reviewPendingRevision={shot && pending ? ()=>{void requestShots();} : undefined}
      requestRevision={async instruction=>{if(await requestShots(shot?.id,instruction))close();}} max={shotLimit}/>}
    {promptShot && <ShotPromptDialog project={project} scene={scene} shot={promptShot} skills={skills} run={run}
      error={error} close={() => setPromptId(undefined)}/>}
  </article>;
}
