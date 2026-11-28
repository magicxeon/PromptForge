import {useState} from "react";
import {Shirt} from "lucide-react";
import {useTranslation} from "react-i18next";
import {MediaImage} from "../../../components/media/MediaImage";
import {ProcessingSpinner} from "../../../lib/canonical";
import type {CinematicProject,CinematicScene,CinematicShot} from "../../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import {updateCinematicSceneOutfits,updateCinematicShotDocument} from "../../../../../web/src/features/cinematic/api/cinematicSeriesApi";
import type {RunWriting} from "../data/useStoryWorkspace";
import "./storyWardrobePicker.css";

type Member = CinematicProject["castAssignments"][number];

export function StoryWardrobePicker({project,scene,shot,members,run,disabled,onSaved}:{
  project:CinematicProject;scene:CinematicScene;shot?:CinematicShot;members:Member[];
  run:RunWriting;disabled?:boolean;onSaved?:(version:number)=>void;
}) {
  const {t}=useTranslation("story");
  const [saving,setSaving]=useState("");
  const previous=project.scenes.filter(item=>item.orderKey<scene.orderKey).sort((a,b)=>b.orderKey-a.orderKey)[0];
  const assignments=(shot ?? scene).storyOutfitIds ?? {};
  async function choose(personId:string,value:string) {
    if (saving || disabled) return;
    const next={...assignments};
    if (value==="inherit" || (!shot && !value)) delete next[personId];
    else next[personId]=value;
    setSaving(personId);
    try {
      await run(async()=>{
        const update=shot ? await updateCinematicShotDocument(project.id,scene.id,shot.id,{
          expectedVersion:project.version,expectedShotVersion:shot.version,storyOutfitIds:next
        }) : await updateCinematicSceneOutfits(project.id,scene.id,{
          expectedVersion:project.version,expectedSceneVersion:scene.version ?? 1,storyOutfitIds:next
        });
        onSaved?.(update.project.version);
        return update;
      });
    } finally {setSaving("");}
  }
  if (!members.length) return null;
  return <section className="story-outfit-picker">
    <h4><Shirt size={17} aria-hidden/>{t(shot?"wardrobePicker.shot":"wardrobePicker.scene")}</h4>
    {members.map(person=>{
      const outfits=person.storyOutfits ?? [];
      const sceneId=scene.storyOutfitIds?.[person.id];
      const value=assignments[person.id] ?? (shot?"inherit":"");
      const effective=value==="inherit" ? sceneId : value;
      const current=outfits.find(item=>item.id===effective);
      const base=t("wardrobePicker.base");
      const name=current?.name ?? base;
      const image=effective ? current?.imageUrl : person.storyReference?.imageUrl;
      const prior=!shot && outfits.find(item=>item.id===previous?.storyOutfitIds?.[person.id]);
      return <div className="story-outfit-row" key={person.id}>
        {image ? <MediaImage src={image} alt={person.displayName+" · "+name}/> :
          <span className="story-outfit-placeholder"><Shirt aria-hidden size={22}/></span>}
        <div><label><strong>{person.displayName}</strong>
          <select value={value} disabled={!!saving || disabled} onChange={event=>void choose(person.id,event.target.value)}>
            {shot && <option value="inherit">{t("wardrobePicker.inherit",{name:outfits.find(item=>item.id===sceneId)?.name ?? base})}</option>}
            <option value="">{base}</option>
            {outfits.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>
          {effective && !image && <small className="story-outfit-missing">{t("wardrobePicker.missing",{name})}</small>}
          {prior && prior.id!==effective && <button type="button" disabled={!!saving || disabled}
            onClick={()=>void choose(person.id,prior.id)}>{t("wardrobePicker.previous",{name:prior.name})}</button>}
          {saving===person.id && <span role="status"><ProcessingSpinner size={14}/> {t("wardrobePicker.saving")}</span>}
        </div>
      </div>;
    })}
  </section>;
}
