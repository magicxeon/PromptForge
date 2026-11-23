import {useId,useState} from "react";
import {useTranslation} from "react-i18next";
import {useBlocker} from "react-router-dom";
import {useQuery} from "@tanstack/react-query";
import {z} from "zod";
import {ProcessingSpinner,useActor} from "../../../lib/canonical";
import {Dialog} from "../../dub-sub/Dialog";
import type {CinematicProject,CinematicScene,CinematicShot} from "../../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import {prepareCinematicShotWriter,updateCinematicShotDocument,updateCinematicSceneOutline} from "../../../../../web/src/features/cinematic/api/cinematicSeriesApi";
import {useCinematicTextRecovery} from "../../../../../web/src/features/cinematic/state/useCinematicTextRecovery";
import type {RunWriting} from "../data/useStoryWorkspace";
import {StoryCharacterIdentity} from "../characters/StoryCharacters";
import catalog from "../../../../../server/config/cinematic/story-direction.v1.json";

const editSchema=z.object({title:z.string().max(120),body:z.string().max(50000),location:z.string().max(240),
  objective:z.string().max(1000).optional(), sceneEvents:z.array(z.string()).optional(), lighting:z.string().max(500).optional(), audioIntent:z.string().max(500).optional(),
  time:z.string().max(160),environment:z.string().max(2500).optional(),entryState:z.string().max(1000).optional(),
  exitState:z.string().max(1000).optional(),emotionalStart:z.string().max(500).optional(),emotionalEnd:z.string().max(500).optional(),
  seconds:z.number().finite(),characterIds:z.array(z.string()).max(24),
  speakers:z.array(z.object({castAssignmentId:z.string(),alias:z.string().max(120),visible:z.boolean()})).max(24)});
export function SceneShotEditDialog({project,scene,shot,run,close,requestRevision,max,error}:{
  project:CinematicProject;scene:CinematicScene;shot?:CinematicShot;run:RunWriting;close:()=>void;
  requestRevision:(instruction:string)=>Promise<void>;max?:number;error:string;
}){
  const {identityScope}=useActor(), {t,i18n}=useTranslation("story");
  const locale=i18n.language.startsWith("th")?"th":"en";
  const confirmationDescriptionId = useId();
  const [leaving,setLeaving]=useState(false),[instruction,setInstruction]=useState(""),[saving,setSaving]=useState(false);
  const legacy=useQuery({queryKey:["story-shot-source",identityScope,project.id,scene.id,shot?.id,shot?.version],
    queryFn:()=>prepareCinematicShotWriter(project.id,scene.id,shot!.id), enabled:!!shot&&!shot.shotDocument,retry:false});
  const cast=project.castAssignments.filter(c=>c.active!==false&&(!shot||scene.castMode!=="none"&&scene.castAssignmentIds.includes(c.id)));
  const effectiveIds=shot?.castMode==="none"||scene.castMode==="none"?[]:shot?.castMode==="selected"||shot?.castAssignmentIds.length?shot.castAssignmentIds:scene.castAssignmentIds;
  const original={title:shot?.title??scene.title,body:shot?(shot.shotDocument||legacy.data?.shotDocument||""):(scene.synopsis||scene.storyChange||""),
    location:scene.location,time:scene.time,seconds:shot?Math.ceil(shot.durationMs/1000):scene.durationMs/1000,characterIds:scene.castAssignmentIds,
    environment:scene.environmentPrompt||"",objective:scene.objective||"",entryState:scene.entryState||"",exitState:scene.exitState||"",
    emotionalStart:scene.emotionalStart,emotionalEnd:scene.emotionalEnd,
    sceneEvents:scene.sceneEvents??[],lighting:scene.lighting??"",audioIntent:scene.audioIntent??"",
    speakers:shot?.speakerBindings??(shot?effectiveIds.map(id=>({castAssignmentId:id,alias:cast.find(c=>c.id===id)?.displayName||id,visible:true})):[])};
  const revision=String(shot?.version??scene.version);
  const editor=useCinematicTextRecovery({actorId:identityScope,projectId:project.id,documentId:"next:"+(shot?.id??scene.id),
    schema:editSchema,revision,serverValue:original});
  const draft=editor.value;
  const [baseVersion,setBaseVersion]=useState(shot?.version??scene.version);
  const stale=baseVersion!==(shot?.version??scene.version);
  const aliases=draft.speakers.map(b=>b.alias.trim());
  const validSpeakers=aliases.every(Boolean)&&new Set(aliases).size===aliases.length;
  const validShotDuration=Number.isInteger(draft.seconds)&&draft.seconds>=1&&draft.seconds<=20;
  const valid=!!draft.title.trim()&&(!shot||!!draft.body.trim()&&validShotDuration&&validSpeakers)&&!editor.pending&&!stale;
  const blocker=useBlocker(editor.dirty);
  const finish=()=>{if(blocker.state==="blocked")blocker.proceed();else close();};
  const dismiss=()=>{if(saving)return;if(editor.dirty){setLeaving(true);return;}close();};
  function keepEditing() {
    if (saving) return;
    setLeaving(false);
    blocker.reset?.();
  }
  const save=async()=>{
    if(!valid||saving)return;
    setSaving(true);
    try{await run(async()=>{
      const r=shot?await updateCinematicShotDocument(project.id,scene.id,shot.id,{
        expectedVersion:project.version,expectedShotVersion:shot.version,title:draft.title,durationMs:draft.seconds*1000,
        shotDocument:draft.body,speakerBindings:draft.speakers,source:"manual",
      }):await updateCinematicSceneOutline(project.id,scene.id,{
        expectedVersion:project.version,expectedSceneVersion:scene.version,title:draft.title,synopsis:draft.body,
        purpose:scene.purpose as Parameters<typeof updateCinematicSceneOutline>[2]["purpose"],objective:draft.objective??scene.objective??"",
        location:draft.location,time:draft.time,weather:scene.weather||"",environment:draft.environment??scene.environmentPrompt??"",
        entryState:draft.entryState??scene.entryState??"",exitState:draft.exitState??scene.exitState??"",
        emotionalStart:draft.emotionalStart??scene.emotionalStart,emotionalEnd:draft.emotionalEnd??scene.emotionalEnd,
        sceneEvents:draft.sceneEvents,lighting:draft.lighting,audioIntent:draft.audioIntent,
        transitionIntent:scene.transitionIntent,targetDurationSeconds:Math.min(120,Math.max(5,Math.round(draft.seconds))),
        dialogueTargetPercent:scene.dialogueTargetPercent??0,characterIds:draft.characterIds
      });
      editor.markSaved(draft,draft,String(baseVersion+1));finish();return r;
    });}finally{setSaving(false);}
  };
  return <Dialog label={t(shot?"editShot":"editScene")} onClose={dismiss}><div className={shot?"story-dialog story-shot-edit":"story-dialog"}>
    {shot ? <header>
      <h2>{t("editShot")}</h2>
      <p>{shot.title}</p>
    </header> : <h2>{t("editScene")} · {scene.title}</h2>}
    {editor.pending&&<p className="story-note">{t(editor.stale?"staleDraft":"recoverDraft")} <button onClick={()=>editor.restore(true)}>{t("restore")}</button>
      <button onClick={()=>editor.discard()}>{t("discardDraft")}</button></p>}
    {error && <p className="story-error" role="alert">{error}</p>}
    {stale && <section className="story-note"><p role="alert">{t("staleDraft")}</p>
      <details><summary>{t("latestVersion")}</summary><strong>{original.title}</strong><p className="story-prose">{original.body}</p></details>
      <button onClick={()=>setBaseVersion(shot?.version??scene.version)}>{t("keepMyEdits")}</button></section>}
    {legacy.error && <p role="alert">{legacy.error.message} <button onClick={()=>void legacy.refetch()}>{t("retry")}</button></p>}
    <fieldset disabled={saving||(!!shot&&!shot.shotDocument&&!legacy.data)}><label>{t("name")}<input maxLength={120} value={draft.title} onChange={e=>editor.setValue({...draft,title:e.target.value})}/></label>
      <label>{t(shot?"shotDocument":"synopsis")}<textarea rows={8} maxLength={shot?max:4000} value={draft.body} onChange={e=>editor.setValue({...draft,body:e.target.value})}/></label>
      {!shot&&<label>{t("stage.lighting")}<textarea rows={3} maxLength={500} value={draft.lighting??scene.lighting??""}
        onChange={e=>editor.setValue({...draft,lighting:e.target.value})}/></label>}
      <label>{t("duration")}<input type="number" step={1} min={shot?1:5} max={shot?20:120} value={draft.seconds}
        aria-invalid={shot&&!validShotDuration||undefined} onChange={e=>editor.setValue({...draft,seconds:Number(e.target.value)})}/></label>
      {cast.length>0&&<details><summary>{t(shot?"speakers":"cast")}</summary>{!validSpeakers&&<p role="alert">{t("uniqueAliases")}</p>}{cast.map(person=>{
        const binding=draft.speakers.find(s=>s.castAssignmentId===person.id);
        return <div key={person.id} className="story-cast"><label><input type="checkbox"
          checked={shot?!!binding:draft.characterIds.includes(person.id)} onChange={e=>{
            if(!shot)editor.setValue({...draft,characterIds:e.target.checked?[...draft.characterIds,person.id]:draft.characterIds.filter(id=>id!==person.id)});
            else editor.setValue({...draft,speakers:e.target.checked?[...draft.speakers,{castAssignmentId:person.id,alias:person.displayName,visible:true}]:
              draft.speakers.filter(s=>s.castAssignmentId!==person.id)});
          }}/><StoryCharacterIdentity person={person}/></label>
          {shot&&binding&&<><label>{t("speakerAlias")}<input value={binding.alias} maxLength={120} onChange={e=>editor.setValue({...draft,
            speakers:draft.speakers.map(s=>s===binding?{...s,alias:e.target.value}:s)})}/></label><label><input type="checkbox" checked={binding.visible}
             onChange={e=>editor.setValue({...draft,speakers:draft.speakers.map(s=>s===binding?{...s,visible:e.target.checked}:s)})}/>{t("visible")}</label></>}
        </div>;
      })}</details>}
      {shot?<details><summary>{t("aiRevision")}</summary><label>{t("instructions")}<textarea value={instruction} maxLength={2000} onChange={e=>setInstruction(e.target.value)}/></label>
        <button disabled={editor.dirty||!instruction.trim()} onClick={()=>void requestRevision(instruction)}>{t("proposeRevision")}</button></details>
        :<details><summary>{t("setting")}</summary><label>{t("location")}<input value={draft.location} maxLength={240} onChange={e=>editor.setValue({...draft,location:e.target.value})}/></label>
        <label>{t("time")}<input value={draft.time} maxLength={160} onChange={e=>editor.setValue({...draft,time:e.target.value})}/></label>
        <fieldset className="story-scene-events"><legend>{t("stage.sceneEvents")}</legend>
          {Object.entries(catalog.sceneEvents).map(([id,label])=>{
            const selected=draft.sceneEvents??scene.sceneEvents??[];
            return <label key={id}><input type="checkbox" checked={selected.includes(id)} onChange={e=>
              editor.setValue({...draft,sceneEvents:e.target.checked?[...selected,id]:selected.filter(item=>item!==id)})}/>{label[locale]}</label>;
          })}
        </fieldset>
        <label>{t("stage.audioIntent")}<textarea rows={2} maxLength={500} value={draft.audioIntent??scene.audioIntent??""}
          onChange={e=>editor.setValue({...draft,audioIntent:e.target.value})}/></label>
        <label>{t("stage.direction")}<textarea rows={3} maxLength={2500} value={draft.environment??scene.environmentPrompt??""}
          onChange={e=>editor.setValue({...draft,environment:e.target.value})}/></label>
        {([["entryState","start",1000],["objective","beatFocus",1000],["exitState","end",1000],["emotionalStart","emotionStart",500],["emotionalEnd","emotionEnd",500]] as const).map(([key,label,maxLength])=>
          <label key={key}>{t("stage."+label)}<input value={draft[key]??scene[key]??""} maxLength={maxLength}
            onChange={e=>editor.setValue({...draft,[key]:e.target.value})}/></label>)}</details>}
      <footer>
        <button onClick={dismiss}>{t("close")}</button>
        <button className={shot?"primary primary-button":"primary"} disabled={!valid||!editor.dirty}
          onClick={()=>void save()}>{t(shot?"saveShot":"saveScene")}</button>
      </footer>
    </fieldset>
    {(leaving||blocker.state==="blocked") && <Dialog label={t("unsaved")} descriptionId={confirmationDescriptionId} onClose={keepEditing}>
      <div className="story-save-confirmation">
        <header>
          <h2>{t("unsaved")}</h2>
          <p id={confirmationDescriptionId}>{t("unsavedItem",{name:original.title})}</p>
        </header>
        {error && <p className="story-error" role="alert">{error}</p>}
        {!valid && !error && <p>{t("reviewEditsBeforeSaving")}</p>}
        {saving && <p className="story-save-status" role="status"><ProcessingSpinner size={16}/> {t("savingEdits")}</p>}
        <footer>
          <button type="button" disabled={saving} onClick={keepEditing}>{t("keepEditing")}</button>
          <button type="button" className="story-discard-edits" disabled={saving} onClick={()=>{editor.setValue(original);finish();}}>
            {t("discardEdits")}
          </button>
          <button type="button" className="primary-button" disabled={!valid||saving} onClick={()=>void save()}>{t("saveAndClose")}</button>
        </footer>
      </div>
    </Dialog>}
  </div></Dialog>;
}
