import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Settings2 } from "lucide-react";
import { storyKeys } from "./data/storyQueryKeys";
import { Dialog } from "../dub-sub/Dialog";
import { ProcessingSpinner, useActor } from "../../lib/canonical";
import { getCinematicProject, suggestStoryDirection, updateCinematicWritingSettings } from "../../../../web/src/features/cinematic/api/cinematicApi";
import {initialDirection,StoryDirectionFields} from "./StoryDirectionFields";
import type { CinematicProject, CinematicWritingSettings, CinematicWritingSettingsCatalog } from "../../../../web/src/features/cinematic/schemas/cinematicSchemas";

const defaults: CinematicWritingSettings = { modelId:null, skillIds:[] };
type Props = { project:CinematicProject; catalog:CinematicWritingSettingsCatalog; disabled:boolean; sourceScript?:string };

export function WritingSettings({project,catalog,disabled,sourceScript}: Props) {
  const {t}=useTranslation("story");
  const [open,setOpen]=useState(false);
  const currentId=project.writingSettings?.modelId || catalog.defaultModelId;
  const name=catalog.models.find(model=>model.id===currentId)?.label || currentId;
  return <>
    <button className="story-settings-trigger" disabled={disabled} onClick={()=>setOpen(true)}>
      <Settings2 size={16} aria-hidden/>{t("brief.settings")}{name && <small>{name}</small>}
    </button>
    {open && <SettingsDialog project={project} sourceScript={sourceScript} catalog={catalog} close={()=>setOpen(false)}/>}
  </>;
}

function SettingsDialog({project,catalog,close,sourceScript}:Omit<Props,"disabled"> & {close:()=>void}) {
  const {t,i18n}=useTranslation("story");
  const locale=i18n.language.startsWith("th")?"th":"en";
  const {identityScope}=useActor(), cache=useQueryClient();
  const [base,setBase]=useState(project);
  const [draft,setDraft]=useState<CinematicWritingSettings>(project.writingSettings ?? defaults);
  const previous=base.writingSettings ?? defaults;
  const changed=JSON.stringify(draft.direction)!==JSON.stringify(previous.direction) || draft.modelId!==previous.modelId || draft.skillIds.length!==previous.skillIds.length ||
    draft.skillIds.some(id=>!previous.skillIds.includes(id));
  const cacheKey=storyKeys.project(identityScope,project.id);
  const save=useMutation({
    mutationFn:()=>updateCinematicWritingSettings(project.id,base.version,draft),
    onSuccess:async updated=>{
      cache.setQueryData(cacheKey,updated);
      await cache.invalidateQueries({queryKey:["story-project",identityScope],predicate:query=>query.queryKey[2]!==project.id});
      close();
    },
  });
  const reload=useMutation({
    mutationFn:()=>getCinematicProject(project.id),
    onSuccess:latest=>{
      cache.setQueryData(cacheKey,latest);
      setBase(latest);setDraft(latest.writingSettings ?? defaults);save.reset();
    },
  });
  const script=sourceScript || base.chapterStory || base.fullStoryVersions.find(v=>v.id===base.activeFullStoryVersionId)?.content;
  const suggest=useMutation({
    mutationFn:()=>suggestStoryDirection(base.id,base.version,script!),
    onSuccess:result=>setDraft(last=>({...last,direction:{...(last.direction??initialDirection(base)),...result}}))
  });
  const busy=save.isPending||reload.isPending||suggest.isPending;
  function toggle(id:string) {
    setDraft(last=>{
      const checked=last.skillIds.includes(id);
      if(!checked && last.skillIds.length>=catalog.maxSkills)return last;
      return {...last,skillIds:checked?last.skillIds.filter(value=>value!==id):[...last.skillIds,id]};
    });
  }
  const defaultLabel=catalog.models.find(model=>model.id===catalog.defaultModelId)?.label ?? catalog.defaultModelId;
  const unavailable=draft.skillIds.filter(id=>!catalog.skills.some(skill=>skill.id===id));
  return <Dialog label={t("writingSettings")} onClose={()=>{if(!busy)close();}}>
    <form className="story-ai-settings" onSubmit={event=>{event.preventDefault();if(changed&&!busy)save.mutate();}}>
      <header><h2>{t("brief.settings")}</h2><p>{t("settingsScope")}</p></header>
      <fieldset disabled={busy}><legend>{t("brief.heading")}</legend>
        <StoryDirectionFields value={draft.direction??initialDirection(base)} onChange={direction=>setDraft(last=>({...last,direction}))}/>
        {script?.trim() && <button type="button" disabled={busy} onClick={()=>suggest.mutate()}>{suggest.isPending && <ProcessingSpinner/>}{t("brief.infer")}</button>}
        {suggest.isSuccess && <p role="status">{t("brief.review")}</p>}
        {suggest.error && <p role="alert">{suggest.error.message}</p>}
      </fieldset>
      <label>{t("writingModel")}<select autoFocus disabled={busy} value={draft.modelId ?? ""}
        onChange={e=>setDraft(last=>({...last,modelId:e.target.value||null}))}>
        <option value="">{defaultLabel?t("writingDefaultModel",{model:defaultLabel}):t("useDefaultModel")}</option>
        {draft.modelId && !catalog.models.some(m=>m.id===draft.modelId) && <option value={draft.modelId} disabled>{draft.modelId}</option>}
        {catalog.models.map(model=><option key={model.id} value={model.id}>{model.label}</option>)}
      </select></label>
      <fieldset disabled={busy}><legend>{t("writingSkills")}</legend>
        <p className="story-skill-count" role="status">{t("skillsChosen",{count:draft.skillIds.length,limit:catalog.maxSkills})}</p>
        <div className="story-skill-list">{catalog.skills.map(skill=>{
          const checked=draft.skillIds.includes(skill.id);
          return <label key={skill.id}><input type="checkbox" checked={checked}
            disabled={!checked && draft.skillIds.length>=catalog.maxSkills} onChange={()=>toggle(skill.id)}/>
            <span><strong>{skill.label[locale]}</strong><small>{skill.description[locale]}</small></span></label>;
        })}
        {unavailable.map(id=><label key={id}><input type="checkbox" checked onChange={()=>toggle(id)}/>{id}</label>)}</div>
      </fieldset>
      {(save.error||reload.error) && <div role="alert" className="story-error">
        <p>{(reload.error||save.error)?.message}</p>
        <button type="button" disabled={busy} onClick={()=>reload.mutate()}>{t("reloadSettings")}</button>
      </div>}
      <footer><button type="button" disabled={busy} onClick={close}>{t("cancel")}</button>
        <button className="primary" disabled={!changed||busy||unavailable.length>0}>{busy&&<ProcessingSpinner/>}{t("saveWritingSettings")}</button></footer>
    </form>
  </Dialog>;
}
