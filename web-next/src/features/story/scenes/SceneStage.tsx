import {useTranslation} from "react-i18next";
import {useState} from "react";
import {ImagePlus, MapPin, Sun, WandSparkles} from "lucide-react";
import {MediaImage} from "../../../components/media/MediaImage";
import {useNavigate} from "react-router-dom";
import {ProcessingSpinner, useActor} from "../../../lib/canonical";
import {approveCinematicSceneEnvironment, getCinematicSceneEnvironment, saveCinematicSceneEnvironment} from "../../../../../web/src/features/cinematic/api/cinematicApi";
import type {CinematicProject,CinematicScene} from "../../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import type {RunWriting} from "../data/useStoryWorkspace";
import {uploadStorySceneImage} from "./uploadStorySceneImage";
import settings from "./staging-config.json";
import {SceneDirectionSummary} from "./SceneDirectionSummary";

export function SceneStage({project,scene,run,aspectRatio,editTreatment}:{project:CinematicProject;scene:CinematicScene;run:RunWriting;aspectRatio:string;editTreatment:()=>void}) {
  const {t} = useTranslation("story");
  const navigate = useNavigate();
  const {identityScope} = useActor();
  const [uploading,setUploading] = useState(false);
  const [fileError,setFileError] = useState("");
  const image = scene.approvedEnvironmentSource;
  const alternatives = project.scenes.filter(item=>item.id!==scene.id && item.approvedEnvironmentSource && item.approvedEnvironmentSource.assetId!==image?.assetId);
  const cast = project.castAssignments.filter(person=>person.active!==false && scene.castAssignmentIds.includes(person.id));
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

  async function upload(file?:File) {
    if (!file || uploading) return;
    if (!settings.imageTypes.includes(file.type) || file.size > settings.maximumUploadBytes) {
      setFileError(t("stage.fileError",{mb:settings.maximumUploadBytes/1024/1024})); return;
    }
    setFileError(""); setUploading(true);
    try {
      await run(async()=>{
        return {project:await uploadStorySceneImage(file,{projectId:project.id,sceneId:scene.id,expectedVersion:project.version},t("stage.fileError",{mb:settings.maximumUploadBytes/1024/1024}))};
      });
    } finally {setUploading(false);}
  }

  return <section className="story-staging" aria-label={t("stage.setup")}>
    <div className="story-scene-description">
      <h3>{t("stage.description")}</h3>
      {(scene.location||scene.time)&&<p className="story-setting-meta">
        {scene.location&&<span><MapPin aria-hidden size={15}/>{scene.location}</span>}
        {scene.time&&<span><Sun aria-hidden size={15}/>{scene.time}</span>}</p>}
      <p className="story-prose">{scene.synopsis||scene.storyChange||t("stage.emptySynopsis")}</p>
      {excerpt&&<details><summary>{t("stage.sourceRange",{start:scene.sourceStartParagraph,end:scene.sourceEndParagraph})}</summary>
        <p className="story-prose">{excerpt}</p></details>}
      {direction&&<><h4>{t("stage.direction")}</h4><p className="story-prose">{direction}</p></>}
      {continuity.length>0&&<dl>{continuity.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
      <section className="story-scene-treatment">
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
        <button type="button" onClick={()=>void run(async()=>{
          const context = await getCinematicSceneEnvironment(project.id,scene.id);
          navigate("/image",{state:{identityScope,
            imageSettings:{prompt:context.compiledPrompt,ratio:aspectRatio},
            storyScene:{projectId:project.id,sceneId:scene.id,expectedVersion:context.projectVersion,title:scene.title}
          }});
        })}><WandSparkles aria-hidden size={16}/>{t("stage.generateImage")}</button>
      </div>
      {uploading&&<span role="status"><ProcessingSpinner/>{t("stage.uploading")}</span>}
      {fileError&&<p role="alert">{fileError}</p>}
      {alternatives.length>0&&<label>{t("stage.reuse")}<select value="" onChange={event=>{
        const reuseSceneId=event.target.value;
        if(reuseSceneId)void run(async()=>({project:await approveCinematicSceneEnvironment(project.id,scene.id,{expectedVersion:project.version,reuseSceneId})}));
      }}><option value="">{t("stage.chooseScene")}</option>
        {alternatives.map(source=><option key={source.id} value={source.id}>{source.title}</option>)}</select></label>}
    </div>
  </section>;
}
