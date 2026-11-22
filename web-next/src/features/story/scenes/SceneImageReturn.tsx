import {useState} from "react";
import {useQueryClient} from "@tanstack/react-query";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {apiMediaBlob,getIdentitySnapshot,ProcessingSpinner,useActor,type HistoryItem} from "../../../lib/canonical";
import {storyKeys} from "../data/storyQueryKeys";
import {sceneImageTargetSchema,uploadStorySceneImage} from "./uploadStorySceneImage";
import settings from "./staging-config.json";
import "./stagingTranslations";
import "./promptTranslations";
import {approveCinematicStoryboardSource,getCinematicProject} from "../../../../../web/src/features/cinematic/api/cinematicApi";

export function SceneImageReturn({target,item}:{target:unknown;item?:HistoryItem|null}) {
  const {identityScope}=useActor();
  const {t}=useTranslation("story");
  const cache=useQueryClient(),navigate=useNavigate();
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const parsed=sceneImageTargetSchema.safeParse(target);
  if(!parsed.success)return null;
  const scene=parsed.data;
  const back=()=>navigate(`/story/${encodeURIComponent(scene.projectId)}?scene=${encodeURIComponent(scene.sceneId)}&step=${scene.shot?"shots":"staging"}`);
  async function useImage(){
    if(!item?.imageUrl||busy)return;
    const epoch=getIdentitySnapshot().epoch;
    setError("");setBusy(true);
    try{
      let project;
      if(scene.shot){
        await approveCinematicStoryboardSource(scene.projectId,scene.shot.id,{expectedVersion:scene.expectedVersion,
          expectedShotVersion:scene.shot.version,jobId:item.id,idempotencyKey:crypto.randomUUID()});
        if(getIdentitySnapshot().epoch!==epoch)return;
        project=await getCinematicProject(scene.projectId);
      }else{
        const blob=await apiMediaBlob(item.imageUrl);
        project=await uploadStorySceneImage(blob,scene,t("stage.fileError",{mb:settings.maximumUploadBytes/1024/1024}),epoch);
      }
      if(getIdentitySnapshot().epoch!==epoch)return;
      const key=storyKeys.project(identityScope,scene.projectId);
      await cache.cancelQueries({queryKey:key,exact:true});
      cache.setQueryData(key,project);
      back();
    }catch(cause){if(getIdentitySnapshot().epoch===epoch)setError((cause as Error).message);}
    finally {setBusy(false);}
  }
  return <section className="handoff-panel" aria-label={scene.shot?t("opening",{ns:"storyPrompt"}):t("stage.looksheet")}>
    <strong>{scene.shot?t("frameFor",{ns:"storyPrompt",title:scene.title}):t("stage.imageFor",{scene:scene.title})}</strong>
    <button className="primary-button" disabled={busy||!item?.imageUrl} onClick={()=>void useImage()}>
      {busy&&<ProcessingSpinner/>}{scene.shot?t("useResult",{ns:"storyPrompt"}):t("stage.useResult")}</button>
    <button onClick={back} disabled={busy}>{t("stage.returnScene")}</button>
    {error&&<p role="alert">{error}</p>}
  </section>;
}
