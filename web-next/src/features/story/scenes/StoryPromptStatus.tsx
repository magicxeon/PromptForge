import {useQuery} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {useActor} from "../../../lib/canonical";
import {getStoryPromptStatus} from "../../../../../web/src/features/cinematic/api/cinematicSeriesApi";
import type {CinematicProject,CinematicScene} from "../../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import "./promptTranslations";

export function StoryPromptStatus({project,scene}:{project:CinematicProject;scene:CinematicScene}){
  const {identityScope} = useActor();
  const {t} = useTranslation("storyPrompt");
  const check = useQuery({
    queryKey:["story-prompt-status",identityScope,project.id,scene.id,project.version,project.writingSettings],
    queryFn:()=>getStoryPromptStatus(project.id,scene.id),
    enabled:scene.shots.some(shot => Object.keys(shot.storyPromptVariants || {}).length>0),
    refetchOnWindowFocus:false, retry:false
  });
  if(check.error)return <div role="alert">{check.error.message} <button onClick={()=>void check.refetch()}>{t("retry")}</button></div>;
  if(!check.data?.outdated.length)return null;
  const ordered = [...scene.shots].sort((left,right)=>left.orderKey-right.orderKey);
  return <aside className="story-note" role="status"><strong>{t("reviewChanged")}</strong>
    <ul>{check.data.outdated.map(item=>{
      const index=ordered.findIndex(shot=>shot.id===item.shotId);
      return <li key={item.shotId}>{index+1}. {ordered[index]?.title} · {item.templates.map(kind=>t(kind)).join(", ")}</li>;
    })}</ul></aside>;
}
