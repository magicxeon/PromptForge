import {useEffect,useRef,useState} from "react";
import {useBlocker} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {FileUp,Maximize2,Sparkles} from "lucide-react";
import {useActor} from "../../lib/canonical";
import {Dialog} from "../dub-sub/Dialog";
import {proposeCinematicFullStory,saveCinematicFullStoryRevision,type getCinematicAuthoringManifest} from "../../../../web/src/features/cinematic/api/cinematicApi";
import {updateCinematicChapter} from "../../../../web/src/features/cinematic/api/cinematicSeriesApi";
import {readStoryFile} from "../../../../web/src/features/cinematic/components/CinematicStoryFileImport";
import {chapterRecoverySchema,useCinematicTextRecovery} from "../../../../web/src/features/cinematic/state/useCinematicTextRecovery";
import type {CinematicProject} from "../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import type {RunWriting} from "./data/useStoryWorkspace";
import config from "./story-config.json";
type Workflow=NonNullable<Awaited<ReturnType<typeof getCinematicAuthoringManifest>>["rewamp"]>["workflow"];

export function ScriptPanel({project,owner,full,setFull,workflow,run,openPlan,requestScenes,pending,skills}:{
  project:CinematicProject;owner?:CinematicProject;full:boolean;setFull:(value:boolean)=>void;workflow?:Workflow;run:RunWriting;
  openPlan:()=>void;requestScenes:(source:CinematicProject,afterSave?:boolean)=>Promise<void>;pending:boolean;skills:string[];
}){
  const {t}=useTranslation("story"),{identityScope}=useActor();
  const [confirm,setConfirm]=useState<"save"|"scenes"|null>(null);
  const [writingBrief,setWritingBrief]=useState(""),[showBrief,setShowBrief]=useState(false);
  const [generated,setGenerated]=useState<Awaited<ReturnType<typeof proposeCinematicFullStory>>|null>(null);
  const [expanded,setExpanded]=useState(false),[fileError,setFileError]=useState("");
  const active=owner?.fullStoryVersions.find(v=>v.id===owner.activeFullStoryVersionId);
  const initial=full?active?.content||"":project.chapterStory;
  const revision=full?active?.id||"":project.activeChapterVersionId||"";
  const chapterTitle=project.chapterTitle||project.title;
  const recovery=useCinematicTextRecovery({actorId:identityScope,projectId:project.id,documentId:"next-script",
    revision, schema:chapterRecoverySchema,serverValue:{title:chapterTitle,story:initial,instruction:full?"full":"chapter"}});
  const draft=recovery.value;
  const blocker=useBlocker(recovery.dirty);
  const base=useRef(revision),leaveAfterSave=useRef(false);
  if(!recovery.dirty)base.current=revision;
  const staleEdit=recovery.dirty&&base.current!==revision;
  const max=workflow?.authoring.fullStoryMaximumCharacters||50000;
  useEffect(()=>{if(recovery.dirty)setFull(draft.instruction==="full");},[recovery.dirty,draft.instruction]);
  useEffect(()=>{if(recovery.pending)setFileError("");},[recovery.pending]);
  const changeMode=(next:boolean)=>{
    if(next===full)return;
    // The existing text remains editable across destinations until the writer saves it.
    if(recovery.dirty)recovery.setValue({...draft,instruction:next?"full":"chapter"});
    base.current=next?active?.id||"":project.activeChapterVersionId||"";
    setFull(next);
  };
  async function draftWithAI() {
    const target=full?owner:project;
    if(!target||!writingBrief.trim())return;
    setShowBrief(false);
    await run(async()=>{
      const result=await proposeCinematicFullStory(target.id,target.version,writingBrief.trim());
      setGenerated(result);
      recovery.setValue(v=>({...v,story:result.fullStory}));
    }, "draft");
  }
  async function save(next:"save"|"scenes"="save") {
    setConfirm(null);
    let saved:CinematicProject|undefined;
    await run(async()=>{
      const ai=generated?.fullStory===draft.story ? generated : null;
      const update=full&&owner?{project:await saveCinematicFullStoryRevision(owner.id,{expectedVersion:owner.version,content:draft.story,
        source:ai?"ai":"manual",...(ai?{provenance:ai.provenance,revisionInstruction:writingBrief}: {})})}
        :await updateCinematicChapter(project.id,project.version,draft.title,draft.story,ai?{source:"ai",revisionInstruction:writingBrief}:{});
      const result=update.project;
      saved=result;
      recovery.markSaved(draft,{...draft,story:full?result.fullStoryVersions.find(v=>v.id===result.activeFullStoryVersionId)?.content||draft.story:result.chapterStory},
        (full?result.activeFullStoryVersionId:result.activeChapterVersionId)||"");
      if(leaveAfterSave.current){leaveAfterSave.current=false;blocker.proceed?.();}
      return update;
    });
    if(next==="scenes" && saved)await requestScenes(saved,true);
  }
  function chooseSave(next:"save"|"scenes"){
    if(initial.trim())setConfirm(next);else void save(next);
  }
  const canSave=!!draft.story.trim()&&!!draft.title.trim()&&!recovery.pending&&!staleEdit&&(!full||!!owner);
  const saveLabel=t(full?"saveFull":"saveChapter",{name:full?owner?.title:draft.title});
  const edit=<textarea aria-label={t("script")} rows={config.readingRows} value={draft.story} maxLength={max}
    onChange={e=>recovery.setValue({...draft,story:e.target.value})}/>;
  return <article className="story-script"><header className="story-bar"><h2>{t("script")}</h2>
    <span role="status">{t(recovery.dirty?"editing":"saved")}</span></header>
    <div className="story-actions" role="group" aria-label={t("destination")}>
      <button aria-pressed={!full} onClick={()=>changeMode(false)}>{t("chapterScript")}</button>
      <button aria-pressed={full} onClick={()=>changeMode(true)}>{t("fullScript")}</button>
    </div>
    {recovery.pending && <div role="status" className="story-note">{t(recovery.stale?"staleDraft":"recoverDraft")}
      <button onClick={()=>{recovery.restore(true);}}>{t("restore")}</button><button onClick={()=>recovery.discard()}>{t("discardDraft")}</button></div>}
    {recovery.unavailable && <p role="alert">{t("draftUnavailable")}</p>}
    {staleEdit && <section className="story-note"><p role="alert">{t("staleDraft")}</p><details>
      <summary>{t("latestVersion")}</summary><p className="story-prose">{initial}</p></details>
      <button onClick={()=>{base.current=revision;recovery.setValue({...draft});}}>{t("keepMyEdits")}</button></section>}
    {!full && <label>{t("chapterTitle")}<input value={draft.title} maxLength={120} onChange={e=>recovery.setValue({...draft,title:e.target.value})}/></label>}
    <div className="story-bar"><strong>{full?owner?.title:draft.title}</strong><div className="story-actions">
      {!draft.story.trim() && <button disabled={recovery.pending || (full&&!owner)} onClick={()=>setShowBrief(true)}><Sparkles size={16} aria-hidden/>{t("draftWithAI")}</button>}
      {workflow?.storyImport && <label className="story-import"><FileUp size={16} aria-hidden/>{t("importFile")}<input type="file" accept={workflow.storyImport.extensions.join(",")}
        onChange={async e=>{const file=e.target.files?.[0];e.target.value="";if(!file)return;
          try{const data=await readStoryFile(file,workflow.storyImport!,max);recovery.setValue(v=>({...v,story:data.content}));setFileError("");}
          catch(error){setFileError(t("import_"+(error as Error).message));}}}/></label>}
      <button onClick={()=>setExpanded(true)}><Maximize2 size={16} aria-hidden/>{t("expand")}</button></div></div>
    {fileError && <p role="alert">{fileError}</p>}{edit}
    <div className="story-actions"><button className={full&&recovery.dirty?"primary":""} disabled={!canSave||!recovery.dirty}
      onClick={()=>chooseSave("save")}>{saveLabel}</button>
      {full&&active&&!recovery.dirty&&<button className="primary" onClick={openPlan}>{t("openPlan")}</button>}
      {!full && <button className="primary" disabled={!canSave||(!recovery.dirty&&!project.activeChapterVersionId)}
        onClick={()=>recovery.dirty?chooseSave("scenes"):void requestScenes(project)}>{t(recovery.dirty?"saveProposeScenes":pending?"reviewScenes":"proposeScenes")}</button>}</div>
    {!full&&pending && <p>{t("sceneProposalCount",{count:project.sceneProposals.filter(p=>p.status==="pending_review").at(-1)?.scenes.length,saved:project.scenes.length})}</p>}
    <details><summary>{t("revisions")}</summary>{(full?owner?.fullStoryVersions||[]:project.chapterVersions).slice().reverse().map(v=>
      <details key={v.id}><summary>{v.version} · {new Date(v.createdAt).toLocaleString()}</summary><p className="story-prose">{"content" in v?v.content:v.story}</p></details>)}</details>
    {showBrief && <Dialog label={t("draftWithAI")} onClose={()=>setShowBrief(false)}><form className="story-create" onSubmit={e=>{e.preventDefault();void draftWithAI();}}>
      <h2>{t("draftWithAI")}</h2>
      {skills.length > 0 && <p>{t("promptSkills", {skills: skills.join(" · ")})}</p>}
      <label>{t("writingBrief")}<textarea autoFocus rows={5} value={writingBrief}
        maxLength={workflow?.authoring.fullStoryInstructionMaximumCharacters||2000} placeholder={t("briefExample")}
        onChange={e=>setWritingBrief(e.target.value)}/></label>
      <footer><button type="button" onClick={()=>setShowBrief(false)}>{t("cancel")}</button>
        <button className="primary" disabled={!writingBrief.trim()}>{t("writeDraft")}</button></footer></form></Dialog>}
    {confirm && <Dialog label={saveLabel} onClose={()=>setConfirm(null)}><h2>{saveLabel}</h2><p>{t("overwrite",{name:full?owner?.title:draft.title})}</p>
      <footer><button onClick={()=>setConfirm(null)}>{t("cancel")}</button><button className="primary" onClick={()=>void save(confirm)}>{confirm==="scenes"?t("saveProposeScenes"):saveLabel}</button></footer></Dialog>}
    {expanded && <Dialog label={t("script")} onClose={()=>setExpanded(false)}><div className="story-expanded"><h2>{full?owner?.title:draft.title}</h2>{edit}
      <button onClick={()=>setExpanded(false)}>{t("close")}</button></div></Dialog>}
    {blocker.state==="blocked" && <Dialog label={t("unsaved")} onClose={()=>blocker.reset()}><h2>{t("unsaved")}</h2><footer>
      <button onClick={()=>blocker.reset()}>{t("keepEditing")}</button>
      <button onClick={()=>{recovery.setValue({title:chapterTitle,story:initial,instruction:full?"full":"chapter"});blocker.proceed();}}>{t("discardDraft")}</button>
      <button className="primary" disabled={!draft.story.trim()||!draft.title.trim()||recovery.pending||staleEdit||(full&&!owner)}
        onClick={()=>{leaveAfterSave.current=true;void save();}}>{saveLabel}</button></footer></Dialog>}
  </article>;
}
