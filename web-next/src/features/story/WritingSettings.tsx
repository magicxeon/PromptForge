import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Settings2 } from "lucide-react";
import { storyKeys } from "./data/storyQueryKeys";
import { Dialog } from "../dub-sub/Dialog";
import { ProcessingSpinner, useActor } from "../../lib/canonical";
import { getCinematicProject, suggestStoryDirection, updateCinematicWritingSettings } from "../../../../web/src/features/cinematic/api/cinematicApi";
import {initialDirection,StoryDirectionFields} from "./StoryDirectionFields";
import {readStorySkillFile,type ImportedStorySkill} from "./readStorySkillFile";
import authoring from "../../../../server/config/cinematic/story-authoring.v1.json";
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
  const changed=JSON.stringify(draft.customSkills)!==JSON.stringify(previous.customSkills) || JSON.stringify(draft.direction)!==JSON.stringify(previous.direction) || draft.modelId!==previous.modelId || draft.skillIds.length!==previous.skillIds.length ||
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
  const [importing,setImporting]=useState(false),[importError,setImportError]=useState(false);
  const [importList,setImportList]=useState<ImportedStorySkill[]>([]),[selectedImports,setSelectedImports]=useState<number[]>([]);
  const busy=save.isPending||reload.isPending||suggest.isPending||importing;
  function toggle(id:string) {
    setDraft(last=>{
      const checked=last.skillIds.includes(id);
      return {...last,skillIds:checked?last.skillIds.filter(value=>value!==id):[...last.skillIds,id]};
    });
  }
  const defaultLabel=catalog.models.find(model=>model.id===catalog.defaultModelId)?.label ?? catalog.defaultModelId;
  const custom=draft.customSkills??[];
  type Skill=(typeof custom)[number];
  const [editing,setEditing]=useState<Skill|null>(null);
  const unavailable=draft.skillIds.filter(id=>!catalog.skills.some(skill=>skill.id===id)&&!custom.some(skill=>skill.id===id));
  async function previewSkills(file:File){
    setImportError(false);setImporting(true);setImportList([]);setSelectedImports([]);
    try {
      const list=await readStorySkillFile(file);
      setImportList(list);
      if(list.length===1)setSelectedImports([0]);
    } catch {setImportError(true);} finally{setImporting(false);}
  }
  function applyImport(){
    const additions=selectedImports.map(i=>({...importList[i],id:"custom-"+crypto.randomUUID(),version:1}));
    setDraft(last=>({...last,customSkills:[...(last.customSkills??[]),...additions],skillIds:[...last.skillIds,...additions.map(s=>s.id)]}));
    setImportList([]);setSelectedImports([]);
  }
  function storeSkill() {
    if(!editing?.name.trim()||!editing.instruction.trim()||!editing.tasks.length)return;
    const existing=custom.some(skill=>skill.id===editing.id);
    const updated={...editing,name:editing.name.trim(),instruction:editing.instruction.trim(),version:editing.version+1};
    setDraft(last=>({...last,customSkills:existing?custom.map(skill=>skill.id===updated.id?updated:skill):[...custom,updated],
      skillIds:existing?last.skillIds:[...last.skillIds,updated.id]}));
    setEditing(null);
  }
  return <Dialog label={t("writingSettings")} onClose={()=>{if(!busy)close();}}>
    <form className="story-ai-settings" onSubmit={event=>{event.preventDefault();if(changed&&!busy&&!editing&&!importList.length&&!unavailable.length)save.mutate();}}>
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
        <p className="story-skill-count" role="status">{t("skillsChosen",{count:draft.skillIds.length})}</p>
        <div className="story-skill-list">{catalog.skills.map(skill=>{
          const checked=draft.skillIds.includes(skill.id);
          return <label key={skill.id}><input type="checkbox" checked={checked}
            onChange={()=>toggle(skill.id)}/>
            <span><strong>{skill.label[locale]}</strong><small>{skill.description[locale]}</small></span></label>;
        })}
        {unavailable.map(id=><label key={id}><input type="checkbox" checked onChange={()=>toggle(id)}/>{id}</label>)}</div>
        {custom.map(skill=><div className="story-actions" key={skill.id}><label><input type="checkbox" checked={draft.skillIds.includes(skill.id)} onChange={()=>toggle(skill.id)}/>{skill.name}</label>
          <button type="button" aria-label={t("projectSkills.editName",{name:skill.name})} onClick={()=>setEditing({...skill})}>{t("projectSkills.edit")}</button></div>)}
        {editing ? <fieldset><legend>{t("projectSkills.edit")}</legend>
          <label>{t("projectSkills.name")}<input maxLength={120} value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/></label>
          <label>{t("skillImport.context")}<input maxLength={authoring.skillImport.contextCharacters} value={editing.context??""} placeholder={t("skillImport.contextHint")} onChange={e=>setEditing({...editing,context:e.target.value})}/></label>
          <label>{t("projectSkills.instruction")}<textarea maxLength={authoring.skillImport.instructionCharacters} value={editing.instruction} onChange={e=>setEditing({...editing,instruction:e.target.value})}/></label>
          <fieldset><legend>{t("projectSkills.tasks")}</legend>{Object.keys(catalog.taskSkills??{}).map(task=><label key={task}><input type="checkbox"
            checked={editing.tasks.includes(task)} onChange={e=>setEditing({...editing,tasks:e.target.checked?[...editing.tasks,task]:editing.tasks.filter(v=>v!==task)})}/>{t("projectSkills."+task)}</label>)}</fieldset>
          <div className="story-actions"><button type="button" onClick={()=>setEditing(null)}>{t("cancel")}</button><button type="button"
            disabled={!editing.name.trim()||!editing.instruction.trim()||!editing.tasks.length} onClick={storeSkill}>{t("projectSkills.apply")}</button></div></fieldset>
        : !importList.length && <div className="story-actions"><button type="button" onClick={()=>setEditing({id:"custom-"+crypto.randomUUID(),name:"",instruction:"",tasks:[],version:0})}>{t("projectSkills.add")}</button>
          <label>{t("skillImport.file")}<input type="file" accept=".md,.zip" onChange={e=>{const file=e.target.files?.[0];e.target.value="";if(file)void previewSkills(file);}}/></label></div>}
        {importing && <ProcessingSpinner/>}
        {importError && <p role="alert">{t("skillImport.invalid")}</p>}
        {!!importList.length && <fieldset className="story-skill-import"><legend>{t("skillImport.select")}</legend>
          {importList.map((skill,index)=><div key={index}><label><input type="checkbox" checked={selectedImports.includes(index)} onChange={e=>setSelectedImports(e.target.checked?[...selectedImports,index]:selectedImports.filter(i=>i!==index))}/>{skill.name}</label>
            {selectedImports.includes(index) && <div><label>{t("skillImport.context")}<input placeholder={t("skillImport.contextHint")} maxLength={authoring.skillImport.contextCharacters} value={skill.context??""} onChange={e=>setImportList(list=>list.map((s,i)=>i===index?{...s,context:e.target.value}:s))}/></label>
              <fieldset><legend>{t("projectSkills.tasks")}</legend>{Object.keys(catalog.taskSkills??{}).map(task=><label key={task}><input type="checkbox" checked={skill.tasks.includes(task)} onChange={e=>setImportList(list=>list.map((s,i)=>i===index?{...s,tasks:e.target.checked?[...s.tasks,task]:s.tasks.filter(v=>v!==task)}:s))}/>{t("projectSkills."+task)}</label>)}</fieldset></div>}
          </div>)}
          <div className="story-actions"><button type="button" onClick={()=>setImportList([])}>{t("cancel")}</button>
            <button type="button" disabled={!selectedImports.length||selectedImports.some(i=>!importList[i].tasks.length)} onClick={applyImport}>{t("skillImport.apply")}</button></div>
        </fieldset>}
      </fieldset>
      {(save.error||reload.error) && <div role="alert" className="story-error">
        <p>{(reload.error||save.error)?.message}</p>
        <button type="button" disabled={busy} onClick={()=>reload.mutate()}>{t("reloadSettings")}</button>
      </div>}
      <footer><button type="button" disabled={busy} onClick={close}>{t("cancel")}</button>
        <button className="primary" disabled={!changed||busy||!!editing||!!importList.length||unavailable.length>0}>{busy&&<ProcessingSpinner/>}{t("saveWritingSettings")}</button></footer>
    </form>
  </Dialog>;
}
