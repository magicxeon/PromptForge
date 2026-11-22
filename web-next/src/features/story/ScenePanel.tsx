import {useRef,useState} from "react";
import {useTranslation} from "react-i18next";
import {useBlocker} from "react-router-dom";
import {useQuery} from "@tanstack/react-query";
import {z} from "zod";
import {useActor} from "../../lib/canonical";
import {Dialog} from "../dub-sub/Dialog";
import type {CinematicProject,CinematicScene,CinematicShot} from "../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import {prepareCinematicShotWriter,createCinematicManualShot,updateCinematicShotDocument,updateCinematicSceneOutline} from "../../../../web/src/features/cinematic/api/cinematicSeriesApi";
import {useCinematicTextRecovery} from "../../../../web/src/features/cinematic/state/useCinematicTextRecovery";
import type {RunWriting} from "./StoryEditor";

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
      if(r.shot)setEdit(r.shot.id);return r.project;})}>{t("addShot")}</button></div>;
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
    {(edit==="scene"||shot) && <WritingEdit key={edit} project={project} scene={scene} shot={shot} run={run} close={close} error={error}
      requestRevision={async instruction=>{if(await requestShots(shot?.id,instruction))close();}} max={shotLimit}/>}
  </article>;
}

const editSchema=z.object({title:z.string().max(120),body:z.string().max(50000),location:z.string().max(240),
  time:z.string().max(160),seconds:z.number().finite(),characterIds:z.array(z.string()).max(24),
  speakers:z.array(z.object({castAssignmentId:z.string(),alias:z.string().max(120),visible:z.boolean()})).max(24)});
function WritingEdit({project,scene,shot,run,close,requestRevision,max,error}:{
  project:CinematicProject;scene:CinematicScene;shot?:CinematicShot;run:RunWriting;close:()=>void;
  requestRevision:(instruction:string)=>Promise<void>;max?:number;error:string;
}){
  const {identityScope}=useActor(), {t}=useTranslation("story");
  const [leaving,setLeaving]=useState(false),[instruction,setInstruction]=useState(""),[saving,setSaving]=useState(false);
  const legacy=useQuery({queryKey:["story-shot-source",identityScope,project.id,scene.id,shot?.id,shot?.version],
    queryFn:()=>prepareCinematicShotWriter(project.id,scene.id,shot!.id), enabled:!!shot&&!shot.shotDocument,retry:false});
  const cast=project.castAssignments.filter(c=>c.active!==false&&(!shot||scene.castMode!=="none"&&scene.castAssignmentIds.includes(c.id)));
  const effectiveIds=shot?.castMode==="none"||scene.castMode==="none"?[]:shot?.castMode==="selected"||shot?.castAssignmentIds.length?shot.castAssignmentIds:scene.castAssignmentIds;
  const original={title:shot?.title??scene.title,body:shot?(shot.shotDocument||legacy.data?.shotDocument||""):(scene.synopsis||scene.storyChange||""),
    location:scene.location,time:scene.time,seconds:(shot?.durationMs??scene.durationMs)/1000,characterIds:scene.castAssignmentIds,
    speakers:shot?.speakerBindings??(shot?effectiveIds.map(id=>({castAssignmentId:id,alias:cast.find(c=>c.id===id)?.displayName||id,visible:true})):[])};
  const revision=String(shot?.version??scene.version);
  const editor=useCinematicTextRecovery({actorId:identityScope,projectId:project.id,documentId:"next:"+(shot?.id??scene.id),
    schema:editSchema,revision,serverValue:original});
  const draft=editor.value;
  const [baseVersion,setBaseVersion]=useState(shot?.version??scene.version);
  const stale=baseVersion!==(shot?.version??scene.version);
  const aliases=draft.speakers.map(b=>b.alias.trim());
  const validSpeakers=aliases.every(Boolean)&&new Set(aliases).size===aliases.length;
  const valid=!!draft.title.trim()&&(!shot||!!draft.body.trim()&&draft.seconds>=0.5&&draft.seconds<=20&&validSpeakers)&&!editor.pending&&!stale;
  const blocker=useBlocker(editor.dirty);
  const finish=()=>{if(blocker.state==="blocked")blocker.proceed();else close();};
  const dismiss=()=>{if(saving)return;if(editor.dirty){setLeaving(true);return;}close();};
  const save=async()=>{
    if(!valid||saving)return;
    setSaving(true);
    try{await run(async()=>{
      const r=shot?await updateCinematicShotDocument(project.id,scene.id,shot.id,{
        expectedVersion:project.version,expectedShotVersion:shot.version,title:draft.title,durationMs:Math.round(draft.seconds*1000),
        shotDocument:draft.body,speakerBindings:draft.speakers,source:"manual",
      }):await updateCinematicSceneOutline(project.id,scene.id,{
        expectedVersion:project.version,expectedSceneVersion:scene.version,title:draft.title,synopsis:draft.body,
        purpose:scene.purpose as Parameters<typeof updateCinematicSceneOutline>[2]["purpose"],objective:scene.objective||"",
        location:draft.location,time:draft.time,weather:scene.weather||"",environment:scene.environmentPrompt||"",
        entryState:scene.entryState||"",exitState:scene.exitState||"",emotionalStart:scene.emotionalStart,emotionalEnd:scene.emotionalEnd,
        transitionIntent:scene.transitionIntent,targetDurationSeconds:Math.min(120,Math.max(5,Math.round(draft.seconds))),
        dialogueTargetPercent:scene.dialogueTargetPercent??0,characterIds:draft.characterIds
      });
      editor.markSaved(draft,draft,String(baseVersion+1));finish();return r.project;
    });}finally{setSaving(false);}
  };
  return <Dialog label={t(shot?"editShot":"editScene")} onClose={dismiss}><div className="story-dialog">
    <h2>{t(shot?"editShot":"editScene")} · {scene.title}</h2>
    {editor.pending&&<p className="story-note">{t(editor.stale?"staleDraft":"recoverDraft")} <button onClick={()=>editor.restore(true)}>{t("restore")}</button>
      <button onClick={()=>editor.discard()}>{t("discardDraft")}</button></p>}
    {error && <p className="story-error" role="alert">{error}</p>}
    {stale && <section className="story-note"><p role="alert">{t("staleDraft")}</p>
      <details><summary>{t("latestVersion")}</summary><strong>{original.title}</strong><p className="story-prose">{original.body}</p></details>
      <button onClick={()=>setBaseVersion(shot?.version??scene.version)}>{t("keepMyEdits")}</button></section>}
    {legacy.error && <p role="alert">{legacy.error.message} <button onClick={()=>void legacy.refetch()}>{t("retry")}</button></p>}
    <fieldset disabled={saving||(!!shot&&!shot.shotDocument&&!legacy.data)}><label>{t("name")}<input maxLength={120} value={draft.title} onChange={e=>editor.setValue({...draft,title:e.target.value})}/></label>
      <label>{t(shot?"shotDocument":"synopsis")}<textarea rows={8} maxLength={shot?max:4000} value={draft.body} onChange={e=>editor.setValue({...draft,body:e.target.value})}/></label>
      <label>{t("duration")}<input type="number" step={shot?0.1:1} min={shot?0.5:5} max={shot?20:120} value={draft.seconds} onChange={e=>editor.setValue({...draft,seconds:Number(e.target.value)})}/></label>
      {cast.length>0&&<details><summary>{t(shot?"speakers":"cast")}</summary>{!validSpeakers&&<p role="alert">{t("uniqueAliases")}</p>}{cast.map(person=>{
        const binding=draft.speakers.find(s=>s.castAssignmentId===person.id);
        return <div key={person.id} className="story-cast"><label><input type="checkbox"
          checked={shot?!!binding:draft.characterIds.includes(person.id)} onChange={e=>{
            if(!shot)editor.setValue({...draft,characterIds:e.target.checked?[...draft.characterIds,person.id]:draft.characterIds.filter(id=>id!==person.id)});
            else editor.setValue({...draft,speakers:e.target.checked?[...draft.speakers,{castAssignmentId:person.id,alias:person.displayName,visible:true}]:
              draft.speakers.filter(s=>s.castAssignmentId!==person.id)});
          }}/>{person.displayName}</label>
          {shot&&binding&&<><label>{t("speakerAlias")}<input value={binding.alias} maxLength={120} onChange={e=>editor.setValue({...draft,
            speakers:draft.speakers.map(s=>s===binding?{...s,alias:e.target.value}:s)})}/></label><label><input type="checkbox" checked={binding.visible}
             onChange={e=>editor.setValue({...draft,speakers:draft.speakers.map(s=>s===binding?{...s,visible:e.target.checked}:s)})}/>{t("visible")}</label></>}
        </div>;
      })}</details>}
      {shot?<details><summary>{t("aiRevision")}</summary><label>{t("instructions")}<textarea value={instruction} maxLength={2000} onChange={e=>setInstruction(e.target.value)}/></label>
        <button disabled={editor.dirty||!instruction.trim()} onClick={()=>void requestRevision(instruction)}>{t("proposeRevision")}</button></details>
        :<details><summary>{t("setting")}</summary><label>{t("location")}<input value={draft.location} maxLength={240} onChange={e=>editor.setValue({...draft,location:e.target.value})}/></label>
        <label>{t("time")}<input value={draft.time} maxLength={160} onChange={e=>editor.setValue({...draft,time:e.target.value})}/></label></details>}
      <footer><button onClick={dismiss}>{t("close")}</button><button className="primary" disabled={!valid||!editor.dirty} onClick={()=>void save()}>{t(shot?"saveShot":"saveScene")}</button></footer>
    </fieldset>
    {(leaving||blocker.state==="blocked") && <Dialog label={t("unsaved")} onClose={()=>{setLeaving(false);blocker.reset?.();}}><h2>{t("unsaved")}</h2><footer>
      <button onClick={()=>{setLeaving(false);blocker.reset?.();}}>{t("keepEditing")}</button><button onClick={()=>{editor.setValue(original);finish();}}>{t("discardDraft")}</button>
      <button disabled={!valid||saving} className="primary" onClick={()=>void save()}>{t(shot?"saveShot":"saveScene")}</button></footer></Dialog>}
  </div></Dialog>;
}
