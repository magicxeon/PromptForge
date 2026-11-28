import {useTranslation} from "react-i18next";
import {lazy, Suspense, useState} from "react";
import {ImagePlus, MapPin, Sun, WandSparkles} from "lucide-react";
import {MediaImage} from "../../../components/media/MediaImage";
import {apiMediaBlob, getIdentitySnapshot, ProcessingSpinner} from "../../../lib/canonical";
import {getCinematicSceneEnvironment, proposeCinematicSceneEnvironment, saveCinematicSceneEnvironment} from "../../../../../web/src/features/cinematic/api/cinematicApi";
import type {CinematicProject,CinematicScene} from "../../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import type {RunWriting} from "../data/useStoryWorkspace";
import {uploadStorySceneImage} from "./uploadStorySceneImage";
import settings from "./staging-config.json";
import {useTakeStoryRunSkills, StoryRunSkillPicker} from "../StoryRunSkills";
import {SceneDirectionSummary} from "./SceneDirectionSummary";
import {SceneBlockingMap} from "./SceneBlockingMap";
import {StoryWardrobePicker} from "./StoryWardrobePicker";
import {SceneLocationImages} from "./SceneLocationImages";
import {emptyDraft} from "../../playground/state/imageDraft";

const StoryLooksheetDialog=lazy(()=>import("../StoryLooksheetDialog").then(module=>({default:module.StoryLooksheetDialog})));
type SceneEnvironment = Awaited<ReturnType<typeof getCinematicSceneEnvironment>>;

export function SceneStage({project,scene,run,aspectRatio,editTreatment,error}:{project:CinematicProject;scene:CinematicScene;run:RunWriting;aspectRatio:string;editTreatment:()=>void;error:string}) {
  const {t} = useTranslation("story");
  const takeSkills=useTakeStoryRunSkills("environment");
  const [uploading,setUploading] = useState(false);
  const [fileError,setFileError] = useState("");
  const [preparing,setPreparing]=useState(false);
  const [design,setDesign]=useState<SceneEnvironment>();
  const [changed,setChanged]=useState<SceneEnvironment>();
  const image = scene.approvedEnvironmentSource;
  const cast = project.castAssignments.filter(person=>scene.castMode !== "none" && person.active!==false && scene.castAssignmentIds.includes(person.id));
  const direction = scene.environmentPrompt || scene.artDirection;
  const revision = project.chapterVersions.find(item=>item.id===scene.sourceChapterRevisionId);
  const excerpt = revision && scene.sourceStartParagraph && scene.sourceEndParagraph
    ? revision.story.split(/\r?\n/).map(line=>line.trim()).filter(Boolean)
      .slice(scene.sourceStartParagraph-1,scene.sourceEndParagraph).join("\n\n") : "";
  const continuity = [
    [t("stage.start"),scene.entryState], [t("stage.beatFocus"),scene.objective], [t("stage.end"),scene.exitState],
    [t("stage.emotion"),[scene.emotionalStart,scene.emotionalEnd].filter(Boolean).join(" → ")],
    [t("stage.cast"),cast.map(person=>person.displayName).join(", ")]
  ].filter(([,value])=>Boolean(value));
  const fileErrorMessage=t("stage.fileError",{mb:settings.maximumUploadBytes/1024/1024});

  async function openDesign() {
    if (preparing) return;
    const epoch=getIdentitySnapshot().epoch;
    setPreparing(true);setFileError("");
    try {
      const context=await getCinematicSceneEnvironment(project.id,scene.id);
      if (getIdentitySnapshot().epoch===epoch) setDesign(context);
    } catch (cause) {setFileError((cause as Error).message);}
    finally {setPreparing(false);}
  }

  async function saveDesign(url:string) {
    if (!design) return false;
    const epoch=getIdentitySnapshot().epoch;
    const latest=await getCinematicSceneEnvironment(project.id,scene.id);
    if (getIdentitySnapshot().epoch!==epoch) return false;
    if (latest.sceneVersion!==design.sceneVersion || latest.promptFingerprint!==design.promptFingerprint
        || latest.approvedSource?.assetId!==design.approvedSource?.assetId) {
      setChanged(latest);
      return false;
    }
    const blob=await apiMediaBlob(url);
    let saved=false;
    await run(async()=>{
      const updated=await uploadStorySceneImage(blob,{projectId:project.id,sceneId:scene.id,
        expectedVersion:latest.projectVersion,preserveReferenceSetting:true},fileErrorMessage,epoch);
      saved=true;
      return {project:updated};
    });
    return saved;
  }

  async function upload(file?:File) {
    if (!file || uploading) return;
    if (!settings.imageTypes.includes(file.type) || file.size > settings.maximumUploadBytes) {
      setFileError(t("stage.fileError",{mb:settings.maximumUploadBytes/1024/1024})); return;
    }
    setFileError(""); setUploading(true);
    try {
      await run(async()=>{
        return {project:await uploadStorySceneImage(file,{projectId:project.id,sceneId:scene.id,expectedVersion:project.version,preserveReferenceSetting:true},fileErrorMessage)};
      });
    } finally {setUploading(false);}
  }

  return <section className="story-staging" aria-label={t("stage.setup")}>
    <div className="story-scene-description">
      {(scene.location||scene.time)&&<section className="story-setting-meta" aria-label={t("setting")}>
        {scene.location&&<div><span><MapPin aria-hidden size={16}/>{t("location")}</span><strong>{scene.location}</strong></div>}
        {scene.time&&<div><span><Sun aria-hidden size={16}/>{t("time")}</span><strong>{scene.time}</strong></div>}
      </section>}
      <h3>{t("stage.description")}</h3>
      <p className="story-prose">{scene.synopsis||scene.storyChange||t("stage.emptySynopsis")}</p>
      {excerpt&&<details><summary>{t("stage.sourceRange",{start:scene.sourceStartParagraph,end:scene.sourceEndParagraph})}</summary>
        <p className="story-prose">{excerpt}</p></details>}
      {direction&&<><h4>{t("stage.direction")}</h4><p className="story-prose">{direction}</p></>}
      {continuity.length>0&&<dl>{continuity.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
      <StoryWardrobePicker project={project} scene={scene} members={cast} run={run}/>
      <section className="story-scene-treatment">
        <h4>{t("blocking.map")}</h4>
        {scene.blockingMap ? <><p className="story-prose">{scene.blockingMap}</p><SceneBlockingMap value={scene.blockingMap}/></> :
          <p>{t("blocking.empty")}</p>}
        <h4>{t("stage.lighting")}</h4>
        {scene.lighting&&<p className="story-prose">{scene.lighting}</p>}
        <button type="button" onClick={editTreatment}>{t("stage.editTreatment")}</button>
      </section>
      <SceneDirectionSummary scene={{sceneEvents:scene.sceneEvents,audioIntent:scene.audioIntent}}/>
    </div>
    <div className="story-looksheet"><h3>{t("stage.looksheet")}</h3>
      {image?<MediaImage className="story-stage-image" src={image.thumbnailUrl||image.imageUrl} alt={scene.title}/>:
        <div className="story-stage-placeholder"><ImagePlus aria-hidden size={26}/><span>{t("stage.optionalImage")}</span></div>}
      {image && <label><input type="checkbox" checked={scene.environmentReferenceEnabled!==false} onChange={event=>{
        const referenceEnabled=event.currentTarget.checked;
        void run(async()=>({project:await saveCinematicSceneEnvironment(project.id,scene.id,{
          expectedVersion:project.version,expectedSceneVersion:scene.version??1,referenceEnabled
        })}));
      }}/> {t("stage.useImageForPlanning")}</label>}
      <div className="story-looksheet-actions">
        <label className="story-looksheet-upload"><ImagePlus aria-hidden size={16}/>{uploading?t("stage.uploading"):t("stage.upload")}
          <input type="file" accept={settings.imageTypes.join(",")} disabled={uploading} onChange={event=>{
            const file=event.target.files?.[0];event.target.value="";void upload(file);
          }}/></label>
        <button type="button" disabled={preparing || uploading} onClick={()=>void openDesign()}>
          {preparing?<ProcessingSpinner size={16}/>:<WandSparkles aria-hidden size={16}/>}
          {t(preparing?"stage.preparingSetting":"stage.generateImage")}
        </button>
      </div>
      {uploading&&<span role="status"><ProcessingSpinner/>{t("stage.uploading")}</span>}
      {fileError&&<p role="alert">{fileError}</p>}
      <SceneLocationImages key={scene.id+":"+(image?.assetId||"")} project={project} scene={scene} run={run} disabled={uploading||preparing}/>
    </div>
    {design && <Suspense fallback={<span role="status"><ProcessingSpinner/> {t("stage.preparingSetting")}</span>}>
      <StoryLooksheetDialog name={scene.title} title={t("stage.imageFor",{scene:scene.title})}
        reference={(changed ?? design).approvedSource ?? undefined}
        session={{scope:JSON.stringify(["scene-looksheet",project.id,scene.id]),saveDraft:true,
          sourceVersion:JSON.stringify([(changed ?? design).sceneVersion,(changed ?? design).promptFingerprint,
            (changed ?? design).approvedSource?.assetId]),
          initialDraft:{...emptyDraft,prompt:design.looksheetPrompt,ratio:aspectRatio},
          restorePrompt:prompt=>{
            const [previousInstruction]=design.compiledPrompt.split("\n\n",1);
            const [looksheetInstruction]=design.looksheetPrompt.split("\n\n",1);
            return previousInstruction && (prompt===previousInstruction || prompt.startsWith(previousInstruction+"\n\n"))
              ? looksheetInstruction+prompt.slice(previousInstruction.length) : prompt;
          }}}
        close={()=>{setDesign(undefined);setChanged(undefined);}}
        save={saveDesign} saveError={error}
        sceneTools={{useImageLabel:t("stage.useResult"), refreshRequired:Boolean(changed),
          reviewLatest:()=>{if(changed){setDesign(changed);setChanged(undefined);}},
          suggest:async prompt=>{
            const result=await proposeCinematicSceneEnvironment(project.id,scene.id,{expectedVersion:project.version,
              expectedSceneVersion:scene.version ?? 1,skillIdsOverride:takeSkills(),currentDirection:prompt.slice(0,2500)});
            return result.environmentPrompt;
          }}}/>
    </Suspense>}
    <StoryRunSkillPicker task="environment"/>
  </section>;
}
