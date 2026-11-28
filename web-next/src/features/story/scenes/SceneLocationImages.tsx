import {useState} from "react";
import {useTranslation} from "react-i18next";
import {Check, MapPin} from "lucide-react";
import type {CinematicProject, CinematicScene} from "../../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import {approveCinematicSceneEnvironment} from "../../../../../web/src/features/cinematic/api/cinematicApi";
import {MediaImage} from "../../../components/media/MediaImage";
import type {RunWriting} from "../data/useStoryWorkspace";

function images(scene:CinematicScene) {
  const saved=scene.environmentSources || [];
  const active=scene.approvedEnvironmentSource;
  if (!active || saved.some(item=>item.assetId===active.assetId)) return saved;
  return [...saved,{...active,location:active.location || scene.location || scene.title,description:active.description || ""}];
}

type Props={project:CinematicProject;scene:CinematicScene;run:RunWriting;disabled:boolean};
type Selection=Parameters<typeof approveCinematicSceneEnvironment>[2];

export function SceneLocationImages({project,scene,run,disabled}:Props) {
  const {t}=useTranslation("story");
  const [pending,setPending]=useState(false);
  const saved=images(scene);
  const current=saved.find(item=>item.assetId===scene.approvedEnvironmentSource?.assetId);
  const [editing,setEditing]=useState(false);
  const [location,setLocation]=useState("");
  const [description,setDescription]=useState("");
  const normalise=(value:string)=>value.trim().normalize().toLowerCase();
  const here=normalise(scene.location || "");
  const others=project.scenes.filter(item=>item.id!==scene.id).flatMap(other=>
    images(other).filter(image=>!saved.some(item=>item.assetId===image.assetId)).map(image=>({
      scene:other,image,match:!!here && normalise(image.location || other.location || "")===here,
      key:other.approvedEnvironmentSource?.assetId===image.assetId ? other.id : other.id+"/"+image.assetId
    }))
  ).sort((a,b)=>Number(b.match)-Number(a.match));
  async function apply(input:Selection) {
    if (disabled || pending) return;
    setPending(true);
    try {
      await run(async()=>{
        const projectUpdate=await approveCinematicSceneEnvironment(project.id,scene.id,input);
        setEditing(false);
        return {project:projectUpdate};
      });
    } finally {setPending(false);}
  }
  return <div className="story-location-choices" aria-busy={pending}>
    {saved.length>1 && <div className="story-location-thumbs" role="group" aria-label={t("stage.chooseLocationImage")}>
      {saved.map((item,index)=><button key={item.assetId} type="button" disabled={pending||disabled||editing}
        aria-pressed={item.assetId===current?.assetId} title={item.description || item.location}
        onClick={()=>{if(item.assetId!==current?.assetId) void apply({expectedVersion:project.version,selectedAssetId:item.assetId});}}>
        <MediaImage src={item.thumbnailUrl || item.imageUrl} alt=""/>
        <span>{item.assetId===current?.assetId && <Check size={14} aria-hidden/>}
          {item.location || scene.title} · {index+1}</span>
      </button>)}
    </div>}
    {current && <div className="story-location-caption">
      {editing ? <>
        <label>{t("stage.imageLocation")}<input maxLength={240} value={location} onChange={e=>setLocation(e.target.value)}/></label>
        <label>{t("stage.imageDescription")}<textarea maxLength={2000} rows={2} value={description} onChange={e=>setDescription(e.target.value)}/></label>
        <div className="story-looksheet-actions"><button type="button" className="primary" disabled={disabled||pending||!location.trim()}
          onClick={()=>void apply({expectedVersion:project.version,editAssetId:current.assetId,location:location.trim(),description:description.trim()})}>{t("stage.saveImageDetails")}</button>
          <button type="button" disabled={pending} onClick={()=>setEditing(false)}>{t("stage.cancelImageDetails")}</button></div>
      </> : <>
        <strong><MapPin size={15} aria-hidden/> {current.location || scene.location || scene.title}</strong>
        {current.description && <p>{current.description}</p>}
        <button type="button" disabled={disabled||pending} onClick={()=>{setLocation(current.location||scene.location||scene.title);setDescription(current.description||"");setEditing(true);}}>{t("stage.editImageDetails")}</button>
      </>}
    </div>}
    {others.length>0 && <label>{t("stage.reuse")}<select value="" disabled={disabled||pending||editing} onChange={e=>{
      const pick=others.find(item=>item.key===e.target.value);
      if(pick) void apply({expectedVersion:project.version,reuseSceneId:pick.scene.id,reuseAssetId:pick.image.assetId,preserveReferenceSetting:true});
    }}><option value="">{t("stage.chooseScene")}</option>
      {others.map(item=><option key={item.key} value={item.key}>{item.match?t("stage.matchLocation")+" · ":""}{item.image.location || item.scene.title} · {item.image.description || item.scene.title}</option>)}
    </select></label>}
  </div>;
}
