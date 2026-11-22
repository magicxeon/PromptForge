import {useRef, useState} from "react";
import {useQuery,useQueryClient} from "@tanstack/react-query";
import {Link,useNavigate,useParams,useSearchParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {ProcessingSpinner,useActor} from "../../lib/canonical";
import {getCinematicProject,getCinematicAuthoringManifest} from "../../../../web/src/features/cinematic/api/cinematicApi";
import * as series from "../../../../web/src/features/cinematic/api/cinematicSeriesApi";
import type {CinematicProject} from "../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import {CinematicWritingCancelled} from "../../../../web/src/features/cinematic/api/cinematicWritingBilling";
import {ScriptPanel} from "./ScriptPanel";
import {ScenePanel} from "./ScenePanel";
import {ProposalReview} from "./ProposalReview";
import {FullStoryPlan} from "./FullStoryPlan";
import {WritingSettings} from "./WritingSettings";
import {BookOpen,Clapperboard,Layers,NotebookPen,ChevronRight,Plus} from "lucide-react";

export type RunWriting = (job:()=>Promise<CinematicProject|void>)=>Promise<void>;
export function StoryEditor() {
  const {id=""}=useParams();
  return <ProjectWorkspace key={id} id={id}/>;
}
function ProjectWorkspace({id}:{id:string}) {
  const {t}=useTranslation("story"), {identityScope}=useActor();
  const cache=useQueryClient(), navigate=useNavigate();
  const [params,setParams]=useSearchParams();
  const [drawer,setDrawer]=useState(false);
  const [full,setFull]=useState(false);
  const lastScene=useRef("");
  const [busy,setBusy]=useState(false), lock=useRef(false);
  const [error,setError]=useState("");
  const [review,setReview]=useState<"scene"|"shot"|null>(null);
  const key=["story-project",identityScope,id];
  const query=useQuery({queryKey:key,queryFn:()=>getCinematicProject(id),refetchOnWindowFocus:false});
  const seriesKey=["story-series",identityScope,id];
  const chapters=useQuery({queryKey:seriesKey,queryFn:()=>series.getCinematicSeriesWorkspace(id)});
  const manifest=useQuery({queryKey:["story-manifest",identityScope],queryFn:getCinematicAuthoringManifest});
  const project=query.data;
  const fullStoryOwner=chapters.data?.productionProject.storyProjectId || project?.chapterOrigin?.projectId || id;
  const storyRoot=useQuery({queryKey:["story-project",identityScope,fullStoryOwner],queryFn:()=>getCinematicProject(fullStoryOwner),
    enabled:fullStoryOwner!==id,refetchOnWindowFocus:false});
  const owner=fullStoryOwner===id?project:storyRoot.data;
  function selectScene(sceneId?:string) {
    if(sceneId)lastScene.current=sceneId;
    setParams(sceneId?{scene:sceneId}:{});
    setDrawer(false);setReview(null);setError("");
  }
  const run:RunWriting=async(job)=>{
    if(lock.current)return;
    lock.current=true;setBusy(true);setError("");
    try {
      const next=await job();
      if(next)cache.setQueryData(["story-project",identityScope,next.id],next);
      await Promise.all([cache.invalidateQueries({queryKey:seriesKey}),cache.invalidateQueries({queryKey:["story-library",identityScope]})]);
    } catch(e){
      if(!(e instanceof CinematicWritingCancelled)){
        setError((e as Error).message || t("failed"));
        await query.refetch();
      }
    } finally {lock.current=false;setBusy(false);}
  };
  if(!project)return <main className="story-workspace"><Link to="/story">{t("projects")}</Link>
    {query.error?<p role="alert">{query.error.message} <button onClick={()=>void query.refetch()}>{t("retry")}</button></p>:<ProcessingSpinner/>}</main>;
  const scenes=[...project.scenes].sort((a,b)=>a.orderKey-b.orderKey);
  const scene=scenes.find(s=>s.id===params.get("scene"));
  const step=scene?"shots":params.get("step")==="scenes"?"scenes":params.get("step")==="chapters"?"chapters":"script";
  const fullPath=full||step==="chapters"||!!project.chapterOrigin||!!owner?.activeFullStoryVersionId;
  function goStage(stage:string) {
    if(scene)lastScene.current=scene.id;
    if(stage==="shots"){selectScene(scenes.find(s=>s.id===lastScene.current)?.id||scenes[0]?.id);return;}
    if(step==="chapters"&&stage==="script")setFull(true);
    setParams(stage==="script"?{}:{step:stage});
    setReview(null);setDrawer(false);setError("");
  }
  const sceneProposal=project.sceneProposals.filter(x=>x.status==="pending_review").at(-1);
  const shotProposal=project.shotProposals.filter(x=>x.status==="pending_review"&&x.sceneId===scene?.id).at(-1);
  async function requestScenes(source: CinematicProject, afterSave=false){
    if(source.sceneProposals.some(p=>p.status==="pending_review" && (!afterSave || p.sourceChapterRevisionId===source.activeChapterVersionId))){
      setReview("scene");return;
    }
    await run(async()=>{const r=await series.proposeCinematicScenes(id,source.version);setReview("scene");return r.project;});
  }
  async function requestShots(targetShotId?:string,instruction?:string){
    if(!scene)return false;
    if(shotProposal){setReview("shot");return true;}
    let opened=false;
    await run(async()=>{
      const r=await series.proposeCinematicShots(id,scene.id,project!.version,targetShotId?{targetShotId,instruction:instruction||""}:undefined);
      opened=true;setReview("shot");return r.project;
    });
    return opened;
  }
  async function addScene(){
    await run(async()=>{const r=await series.createCinematicManualScene(id,project!.version,crypto.randomUUID());
      if(r.scene)selectScene(r.scene.id);return r.project;});
  }
  const workflow=manifest.data?.rewamp?.workflow;
  const stages=[
    {key:"script",label:"script",icon:NotebookPen,available:true},
    ...(fullPath?[{key:"chapters",label:"planStage",icon:BookOpen,available:!!owner?.activeFullStoryVersionId}]:[]),
    {key:"scenes",label:"scenes",icon:Layers,available:true},
    {key:"shots",label:"shotsStage",icon:Clapperboard,available:scenes.length>0},
  ];
  const guide=step==="chapters"?"guidePlan":step==="scenes"?(scenes.length?"guidePickScene":"guideNoScenes"):
    step==="shots"?(scene?.shots.length?"guideEditShot":"guideMakeShots"):
    full?(owner?.activeFullStoryVersionId?"guideReadyPlan":"guideFull"):(project.activeChapterVersionId?"guideReadyScenes":"guideScript");
  return <main className="story-workspace">
    <header className="story-bar"><div><Link to="/story">‹ {t("projects")}</Link><h1>{chapters.data?.productionProject.title || project.title}</h1></div>
      <div className="story-actions">
      {chapters.data && chapters.data.chapters.length>1 && <label>{t("chapter")}<select disabled={busy} value={id}
        onChange={e=>navigate("/story/"+encodeURIComponent(e.target.value))}>{chapters.data.chapters.map(c=><option key={c.projectId} value={c.projectId}>{c.title}</option>)}</select></label>}
      {chapters.data&&owner&&manifest.data?.writingSettings&&<WritingSettings project={owner} catalog={manifest.data.writingSettings} disabled={busy}/>}
      </div>
    </header>
    <nav className="story-stage-nav" aria-label={t("stages")}><ol>{stages.map(({key,label,icon:Icon,available},i)=>
      <li key={key}><button disabled={!available||busy} aria-current={step===key?"step":undefined}
        onClick={()=>{if(step!==key)goStage(key);}}><Icon size={17} aria-hidden/><span>{i+1}. {t(label)}</span></button>
        {i<stages.length-1&&<ChevronRight className="story-stage-arrow" size={14} aria-hidden/>}</li>)}</ol>
      <p>{t(guide)}</p></nav>
    {busy && <p role="status"><ProcessingSpinner/> {t("processing")}</p>}
    {error && <p className="story-error" role="alert">{error}</p>}
    {chapters.error && <p role="alert">{chapters.error.message} <button onClick={()=>void chapters.refetch()}>{t("retry")}</button></p>}
    {manifest.error && <p role="alert">{manifest.error.message} <button onClick={()=>void manifest.refetch()}>{t("retry")}</button></p>}
    {storyRoot.error&&fullStoryOwner!==id&&<p role="alert">{storyRoot.error.message} <button onClick={()=>void storyRoot.refetch()}>{t("retry")}</button></p>}
    {step!=="scenes"&&scenes.length>0&&<button className="story-index-toggle" aria-expanded={drawer} onClick={()=>setDrawer(!drawer)}>{t("sceneIndex")} ({scenes.length})</button>}
    <fieldset disabled={busy} className="story-layout" data-stage={step} data-sidebar={scenes.length>0}><legend className="sr-only">{t("workspace")}</legend>
      {(step==="scenes"||scenes.length>0)&&<aside className="story-index" data-open={step==="scenes"||drawer}>
        <header><h2>{t("sceneIndex")}</h2><span>{scenes.length}</span></header>
        <ol>{scenes.map((s,i)=><li key={s.id}><button aria-current={scene?.id===s.id?"page":undefined} onClick={()=>selectScene(s.id)}>
          <span className="story-scene-num">{i+1}</span><span className="story-scene-copy"><strong>{s.title}</strong>
          {(s.synopsis||s.storyChange)&&<small>{s.synopsis||s.storyChange}</small>}
          <span className="story-scene-meta">{t("shotCount",{count:s.shots.length})}{s.planningStatus==="review_required" && <> · {t("sourceChanged")}</>}</span></span>
          <ChevronRight size={15} aria-hidden/></button></li>)}</ol>
        {step==="scenes"&&project.activeChapterVersionId&&<button onClick={()=>void requestScenes(project)}>{t(sceneProposal?"reviewScenes":"proposeScenes")}</button>}
        <button onClick={()=>void addScene()}><Plus size={16} aria-hidden/>{t("addScene")}</button>
      </aside>
      }
      {step!=="scenes"&&<section className="story-reader">
        {scene?<ScenePanel key={scene.id} project={project} scene={scene} index={scenes.indexOf(scene)+1} run={run} error={error}
          back={()=>goStage("scenes")} requestShots={requestShots} pending={!!shotProposal}
          shotLimit={workflow?.authoring.shotDocumentMaximumCharacters}/>
        :step==="chapters"?(owner?.activeFullStoryVersionId?<FullStoryPlan project={owner} run={run} goChapter={chapterId=>{
          setFull(false);navigate("/story/"+encodeURIComponent(chapterId));
        }}/>:<button onClick={()=>{setFull(true);goStage("script");}}>{t("fullScript")}</button>):
        <ScriptPanel project={project} owner={owner} full={full} setFull={setFull} workflow={workflow} run={run}
          openPlan={()=>goStage("chapters")} requestScenes={requestScenes} pending={!!sceneProposal}/>}
      </section>}
    </fieldset>
    {review==="scene"&&sceneProposal && <ProposalReview key={sceneProposal.id} project={project} proposal={sceneProposal} busy={busy} error={error} run={run}
      close={()=>setReview(null)} onApplied={()=>goStage("scenes")}/>}
    {review==="shot"&&shotProposal&&scene && <ProposalReview key={shotProposal.id} project={project} proposal={shotProposal} scene={scene}
      busy={busy} error={error} run={run} close={()=>setReview(null)} onApplied={()=>setReview(null)}/>}
  </main>;
}
