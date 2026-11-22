import {useEffect,useState} from "react";
import {useTranslation} from "react-i18next";
import {ProcessingSpinner} from "../../../lib/canonical";
import type {RunWriting} from "../data/useStoryWorkspace";
import type {CinematicProject,CinematicScene,CinematicShot} from "../../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import {proposeShotArt,updateCinematicShotDocument} from "../../../../../web/src/features/cinematic/api/cinematicSeriesApi";
import {CinematicWritingCancelled} from "../../../../../web/src/features/cinematic/api/cinematicWritingBilling";
import catalog from "../../../../../server/config/cinematic/story-direction.v1.json";
import "./promptTranslations";
import "./shotArt.css";

type Props = {project:CinematicProject;scene:CinematicScene;shot:CinematicShot;run:RunWriting;
  onSaved:(version:number)=>void; onDirtyChange?:(dirty:boolean)=>void};

export function ShotArtDirection({project,scene,shot,run,onSaved,onDirtyChange}:Props) {
  const {t,i18n}=useTranslation("storyPrompt");
  const language = i18n.language.startsWith("th") ? "th" : "en";
  const style = catalog.visualStyles[(project.writingSettings?.direction?.visualStyle ?? catalog.defaults.visualStyle) as keyof typeof catalog.visualStyles] ?? catalog.visualStyles.neutral;
  const saved = shot.artDirection || "";
  const inherited = [scene.artDirection,shot.lighting || scene.lighting].filter(Boolean).join(" · ");
  const [draft,setDraft]=useState<string|null>(null);
  const [proposal,setProposal]=useState<string|null>(null);
  const [working,setWorking]=useState(false);
  const [error,setError]=useState("");
  const [baseVersion,setBaseVersion]=useState(project.version);
  const dirty = (draft !== null && draft.trim() !== saved) || proposal !== null;
  useEffect(()=>{onDirtyChange?.(dirty);},[dirty,onDirtyChange]);
  function edit() {
    setBaseVersion(project.version); setDraft(saved || inherited); setError("");
  }
  async function suggest() {
    if (draft===null) setBaseVersion(project.version);
    setWorking(true); setError("");
    try {
      const result=await proposeShotArt(project.id,scene.id,shot.id,project.version,language,draft ?? undefined);
      setProposal(result.artDirection);
    } catch(cause) {
      if (!(cause instanceof CinematicWritingCancelled)) setError((cause as Error).message || t("art.failed"));
    } finally {setWorking(false);}
  }
  async function save(artDirection:string) {
    setWorking(true); setError("");
    try {
      await run(async()=>{
        const result=await updateCinematicShotDocument(project.id,scene.id,shot.id,{
          expectedVersion:baseVersion,expectedShotVersion:shot.version,artDirection});
        setDraft(null);setProposal(null);onSaved(result.project.version);
        return result;
      });
    } finally {setWorking(false);}
  }
  return <section className="story-shot-art" aria-busy={working}>
    <header><h3>{t("art.title")}</h3><span>{style[language]}</span></header>
    {draft===null ? <p>{saved || inherited || style.description[language]}</p>
      : <label>{t("art.direction")}<textarea rows={3} value={draft} maxLength={1500} disabled={working || proposal!==null}
          onChange={e=>setDraft(e.target.value)}/></label>}
    {proposal!==null ? <div className="story-art-proposal"><strong>{t("art.proposed")}</strong><p>{proposal}</p>
      <div className="story-actions"><button type="button" disabled={working} onClick={()=>void save(proposal)}>{t("art.accept")}</button>
        <button type="button" disabled={working} onClick={()=>setProposal(null)}>{t("art.keep")}</button></div>
    </div> : <div className="story-actions">
      {draft===null ? <button type="button" disabled={working} onClick={edit}>{t("art.edit")}</button>
        : <><button type="button" disabled={working || !dirty} onClick={()=>void save(draft)}>{t("art.save")}</button>
          <button type="button" disabled={working} onClick={()=>setDraft(null)}>{t("art.cancel")}</button></>}
      <button type="button" disabled={working} onClick={()=>void suggest()}>{t("art.suggest")}</button>
    </div>}
    {working && <span role="status"><ProcessingSpinner size={16}/> {t("art.working")}</span>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
