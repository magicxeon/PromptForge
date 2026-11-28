import {createContext, useContext} from "react";
import {useTranslation} from "react-i18next";
import {selectStorySkills} from "../../../../server/config/cinematic/selectStorySkills.js";
import type {CinematicWritingSettings,CinematicWritingSettingsCatalog} from "../../../../web/src/features/cinematic/schemas/cinematicSchemas";

type RunSkills = {
  catalog?:CinematicWritingSettingsCatalog;
  settings?:CinematicWritingSettings;
  source?:unknown;
  overrides:Record<string,string[] | undefined>;
  change:(task:string,ids:string[] | undefined)=>void;
};
export const StoryRunSkillContext=createContext<RunSkills|null>(null);

export function StoryAppliedSkills({trace}:{trace?:{selectedSkillVersions?:Record<string,number>}|null}){
  const {t,i18n}=useTranslation("story");
  const context=useContext(StoryRunSkillContext);
  if(!trace?.selectedSkillVersions) return null;
  const locale=i18n.language.startsWith("th")?"th":"en";
  const skills=Object.entries(trace.selectedSkillVersions);
  return <details className="story-run-skills"><summary>{t("runSkills.applied",{count:skills.length})}</summary>
    {skills.length ? <ul>{skills.map(([id,version])=><li key={id}>
      {context?.settings?.customSkills?.find(s=>s.id===id)?.name ?? context?.catalog?.skills.find(s=>s.id===id)?.label[locale] ?? id}
      {" · v"+version}</li>)}</ul> : <p>{t("runSkills.none")}</p>}
  </details>;
}

export function useStoryRunSkills(task:string){
  const context=useContext(StoryRunSkillContext);
  return context?.overrides[task]?.filter(id=>context.settings?.skillIds.includes(id));
}

// Capture once per user action so its draft and refinement share the same inputs.
export function useTakeStoryRunSkills(task:string){
  const context=useContext(StoryRunSkillContext);
  const override=useStoryRunSkills(task);
  return ()=>{
    if(override) context?.change(task,undefined);
    return override;
  };
}

export function StoryRunSkillPicker({task}:{task:string}) {
  const {t,i18n}=useTranslation("story");
  const context=useContext(StoryRunSkillContext);
  const override=useStoryRunSkills(task);
  if(!context?.catalog || !context.settings?.skillIds.length) return null;
  const {catalog,settings,change}=context;
  const locale=i18n.language.startsWith("th")?"th":"en";
  const selected=override ?? selectStorySkills(catalog,settings,task,context.source);
  return <details className="story-run-skills">
    <summary>{t("runSkills.heading",{count:selected.length})}</summary>
    <fieldset><legend>{t("runSkills.scope")}</legend>
      {settings.skillIds.map(id=>{
        const label=settings.customSkills?.find(s=>s.id===id)?.name ?? catalog.skills.find(s=>s.id===id)?.label[locale];
        return label && <label key={id}><input type="checkbox" checked={selected.includes(id)}
          onChange={e=>change(task,e.target.checked?[...selected,id]:selected.filter(v=>v!==id))}/>{label}</label>;
      })}
      {override && <button type="button" onClick={()=>change(task,undefined)}>{t("runSkills.reset")}</button>}
    </fieldset>
  </details>;
}
