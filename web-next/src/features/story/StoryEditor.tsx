import {useRef, useState} from "react";
import {Link,useNavigate,useParams,useSearchParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {ProcessingSpinner} from "../../lib/canonical";
import * as series from "../../../../web/src/features/cinematic/api/cinematicSeriesApi";
import type {CinematicProject} from "../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import {useStoryWorkspace} from "./data/useStoryWorkspace";
import {ScriptPanel} from "./ScriptPanel";
import {ScenePanel} from "./scenes/ScenePanel";
import {ProposalReview} from "./ProposalReview";
import {FullStoryPlan} from "./FullStoryPlan";
import {WritingSettings} from "./WritingSettings";
import {BookOpen,Clapperboard,Layers,NotebookPen,ChevronRight,Plus,PenLine,MapPin} from "lucide-react";
import "./scenes/stagingTranslations";
import {Dialog} from "../dub-sub/Dialog";
import {StoryCharacters} from "./characters/StoryCharacters";

export default function StoryEditor() {
  const {id=""}=useParams();
  return <ProjectWorkspace key={id} id={id}/>;
}
function ProjectWorkspace({id}:{id:string}) {
  const {t,i18n}=useTranslation("story");
  const navigate=useNavigate();
  const [params,setParams]=useSearchParams();
  const [drawer,setDrawer]=useState(false);
  const [full,setFull]=useState(false);
  const lastScene=useRef("");
  const [review,setReview]=useState<"scene"|"shot"|null>(null);
  const {query,chapters,manifest,storyRoot,fullStoryOwner,busy,activity,error,setError,run}=useStoryWorkspace(id);
  const project=query.data;
  const owner=fullStoryOwner===id?project:storyRoot.data;
  function selectScene(sceneId?:string, stage = "staging") {
    if(sceneId)lastScene.current=sceneId;
    setParams(sceneId?{scene:sceneId,step:stage}:{});
    setDrawer(false);setReview(null);setError("");
  }
  if(!project)return <main className="story-workspace"><Link to="/story">{t("projects")}</Link>
    {query.error?<p role="alert">{query.error.message} <button onClick={()=>void query.refetch()}>{t("retry")}</button></p>:<ProcessingSpinner/>}</main>;
  const scenes=[...project.scenes].sort((a,b)=>a.orderKey-b.orderKey);
  const scene=scenes.find(s=>s.id===params.get("scene"));
  const selectedStep = params.get("step");
  const step=scene?(selectedStep==="shots"?"shots":"staging"):selectedStep==="scenes"?"scenes":selectedStep==="chapters"?"chapters":selectedStep==="characters"?"characters":"script";
  const fullPath=full||step==="chapters"||!!project.chapterOrigin||!!owner?.activeFullStoryVersionId;
  function goStage(stage:string) {
    if(scene)lastScene.current=scene.id;
    if(stage==="shots"||stage==="staging"){selectScene(scenes.find(s=>s.id===lastScene.current)?.id||scenes[0]?.id,stage);return;}
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
    await run(async()=>{const r=await series.proposeCinematicScenes(id,source.version);setReview("scene");return r;}, "scenes");
  }
  async function requestShots(targetShotId?:string,instruction?:string){
    if(!scene)return false;
    if(shotProposal){setReview("shot");return true;}
    let opened=false;
    await run(async()=>{
      const r=await series.proposeCinematicShots(id,scene.id,project!.version,targetShotId?{targetShotId,instruction:instruction||""}:undefined);
      opened=true;setReview("shot");return r;
    }, "shots");
    return opened;
  }
  async function addScene(){
    await run(async()=>{const r=await series.createCinematicManualScene(id,project!.version,crypto.randomUUID());
      if(r.scene)selectScene(r.scene.id);return r;});
  }
  const workflow=manifest.data?.rewamp?.workflow;
  const locale = i18n.language.startsWith("th") ? "th" : "en";
  const skillLabels = (manifest.data?.writingSettings?.skills ?? [])
    .filter(skill => owner?.writingSettings?.skillIds.includes(skill.id)).map(skill => skill.label[locale]);
  const stages=[
    {key:"script",label:"script",icon:NotebookPen,available:true},
    ...(fullPath?[{key:"chapters",label:"planStage",icon:BookOpen,available:!!owner?.activeFullStoryVersionId}]:[]),
    {key:"scenes",label:"scenes",icon:Layers,available:true},
    {key:"staging",label:"stage.setup",icon:MapPin,available:scenes.length>0},
    {key:"shots",label:"shotsStage",icon:Clapperboard,available:scenes.length>0},
  ];
  const guide=step==="characters"?"guideCharacters":step==="chapters"?"guidePlan":step==="scenes"?(scenes.length?"guidePickScene":"guideNoScenes"):
    step==="staging"?"stage.guide":step==="shots"?(scene?.shots.length?"guideEditShot":"guideMakeShots"):
    full?(owner?.activeFullStoryVersionId?"guideReadyPlan":"guideFull"):(project.activeChapterVersionId?"guideReadyScenes":"guideScript");
  return <main className="story-workspace">
    <header className="story-bar"><div><Link to="/story">‹ {t("projects")}</Link><h1>{chapters.data?.productionProject.title || project.title}</h1></div>
      <div className="story-actions">
      {chapters.data && chapters.data.chapters.length>1 && <label>{t(owner?.writingSettings?.direction?.format==="series"?"brief.episode":owner?.writingSettings?.direction?.format==="feature"?"brief.chapter":"chapter")}<select disabled={busy} value={id}
        onChange={e=>navigate("/story/"+encodeURIComponent(e.target.value))}>{chapters.data.chapters.map(c=><option key={c.projectId} value={c.projectId}>{c.title}</option>)}</select></label>}
      {chapters.data&&owner&&manifest.data?.writingSettings&&<WritingSettings project={owner} sourceScript={full?owner.fullStoryVersions.find(v=>v.id===owner.activeFullStoryVersionId)?.content:project.chapterStory} catalog={manifest.data.writingSettings} disabled={busy}/>}
      {owner&&<button type="button" aria-pressed={step==="characters"} disabled={busy}
        onClick={()=>goStage(step==="characters"?"script":"characters")}>{t("characters")}</button>}
      </div>
    </header>
    <nav className="story-stage-nav" aria-label={t("stages")}><ol>{stages.map(({key,label,icon:Icon,available},i)=>
      <li key={key}><button disabled={!available||busy} aria-current={step===key?"step":undefined}
        onClick={()=>{if(step!==key)goStage(key);}}><Icon size={17} aria-hidden/><span>{i+1}. {t(label)}</span></button>
        {i<stages.length-1&&<ChevronRight className="story-stage-arrow" size={14} aria-hidden/>}</li>)}</ol>
      <p>{t(guide)}</p></nav>
    {error && <p className="story-error" role="alert">{error}</p>}
    {chapters.error && <p role="alert">{chapters.error.message} <button onClick={()=>void chapters.refetch()}>{t("retry")}</button></p>}
    {manifest.error && <p role="alert">{manifest.error.message} <button onClick={()=>void manifest.refetch()}>{t("retry")}</button></p>}
    {storyRoot.error&&fullStoryOwner!==id&&<p role="alert">{storyRoot.error.message} <button onClick={()=>void storyRoot.refetch()}>{t("retry")}</button></p>}
    {step!=="scenes"&&step!=="characters"&&scenes.length>0&&<button className="story-index-toggle" aria-expanded={drawer} onClick={()=>setDrawer(!drawer)}>{t("sceneIndex")} ({scenes.length})</button>}
    <fieldset disabled={busy} className="story-layout" data-stage={step} data-sidebar={step!=="characters"&&scenes.length>0}><legend className="sr-only">{t("workspace")}</legend>
      {step!=="characters"&&(step==="scenes"||scenes.length>0)&&<aside className="story-index" data-open={step==="scenes"||drawer}>
        <header><h2>{t("sceneIndex")}</h2><span>{scenes.length}</span></header>
        <ol>{scenes.map((s,i)=><li key={s.id}><button aria-current={scene?.id===s.id?"page":undefined} onClick={()=>selectScene(s.id)}>
          <span className="story-scene-num">{i+1}</span><span className="story-scene-copy"><strong>{s.title}</strong>
          {(s.synopsis||s.storyChange)&&<span className="story-scene-synopsis">{s.synopsis||s.storyChange}</span>}
          <span className="story-scene-meta">{t("shotCount",{count:s.shots.length})}{s.planningStatus==="review_required" && <> · {t("sourceChanged")}</>}</span></span>
          <ChevronRight size={15} aria-hidden/></button></li>)}</ol>
        {step==="scenes"&&project.activeChapterVersionId&&<button onClick={()=>void requestScenes(project)}>{t(sceneProposal?"reviewScenes":"proposeScenes")}</button>}
        <button onClick={()=>void addScene()}><Plus size={16} aria-hidden/>{t("addScene")}</button>
      </aside>
      }
      {step!=="scenes"&&<section className="story-reader">
        {step==="characters" ? owner && <StoryCharacters project={project} owner={owner} run={run} error={error}/>
        :scene?<ScenePanel key={scene.id} project={project} scene={scene} index={scenes.indexOf(scene)+1} run={run} error={error}
          stage={step==="shots"?"shots":"staging"} showStage={stage=>selectScene(scene.id,stage)} openScene={id=>selectScene(id,"shots")}
          aspectRatio={owner?.writingSettings?.direction?.aspectRatio??project.aspectRatio}
          mergeTemplate={owner?.writingSettings?.direction?.destination === "flow" ? "flow" : "seedance"}
          back={()=>goStage("scenes")} requestShots={requestShots} pending={!!shotProposal}
          shotLimit={workflow?.authoring.shotDocumentMaximumCharacters}
          skills={skillLabels}/>
        :step==="chapters"?(owner?.activeFullStoryVersionId?<FullStoryPlan project={owner} run={run} goChapter={chapterId=>{
          setFull(false);navigate("/story/"+encodeURIComponent(chapterId));
        }}/>:<button onClick={()=>{setFull(true);goStage("script");}}>{t("fullScript")}</button>):
        <ScriptPanel project={project} owner={owner} full={full} setFull={setFull} workflow={workflow} run={run}
          openPlan={()=>goStage("chapters")} requestScenes={requestScenes} pending={!!sceneProposal} skills={skillLabels}/>}
      </section>}
    </fieldset>
    {busy && !activity && <div className="story-saving" role="status"><ProcessingSpinner/> {t("processing")}</div>}
    {activity && !(activity==="scenes"&&review==="scene"&&sceneProposal) && !(activity==="shots"&&review==="shot"&&shotProposal) &&
      <Dialog label={t("writingActivity."+activity)} onClose={()=>{}}>
      <div className="story-writing-progress" role="status">
        <PenLine className="story-writing-pen" aria-hidden="true"/>
        <p>{t("writingActivity."+activity)}</p>
      </div>
    </Dialog>}
    {review==="scene"&&sceneProposal && <ProposalReview key={sceneProposal.id} project={project} proposal={sceneProposal} busy={busy} error={error} run={run}
      close={()=>setReview(null)} onApplied={()=>goStage("scenes")}/>}
    {review==="shot"&&shotProposal&&scene && <ProposalReview key={shotProposal.id} project={project} proposal={shotProposal} scene={scene}
      busy={busy} error={error} run={run} close={()=>setReview(null)} onApplied={()=>selectScene(scene.id,"shots")}/>}
  </main>;
}
