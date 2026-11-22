import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Feather, Plus } from "lucide-react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { ProcessingSpinner, useActor } from "../../lib/canonical";
import { Dialog } from "../dub-sub/Dialog";
import { createCinematicProject, listCinematicProjectPage } from "../../../../web/src/features/cinematic/api/cinematicApi";
import { createCinematicSetupDraft } from "../../../../web/src/features/cinematic/state/cinematicDraftStorage";
import { registerCinematicWritingConsent, type WritingConsentRequest } from "../../../../web/src/features/cinematic/api/cinematicWritingBilling";
import { StoryEditor } from "./StoryEditor";
import settings from "./story-config.json";
import "./story.css";
import "./translations";

function Projects() {
  const { t } = useTranslation("story");
  const { identityScope } = useActor();
  const cache = useQueryClient(), navigate = useNavigate();
  const projects = useInfiniteQuery({ queryKey:["story-library",identityScope],initialPageParam:undefined as string|undefined,
    queryFn:({pageParam})=>listCinematicProjectPage(settings.projectsPerPage,pageParam),getNextPageParam:last=>last.nextCursor??undefined });
  const items=projects.data?.pages.flatMap(page=>page.items);
  const [name,setName] = useState(""), [creating,setCreating] = useState(false);
  const [busy,setBusy] = useState(false), [error,setError] = useState("");
  const draft = useRef(createCinematicSetupDraft());
  async function create() {
    if (busy || !name.trim()) return;
    setBusy(true); setError("");
    try {
      const result = await createCinematicProject({...draft.current,projectName:name.trim()});
      cache.setQueryData(["story-project",identityScope,result.id],result);
      await cache.invalidateQueries({queryKey:["story-library",identityScope]});
      navigate(result.id);
    } catch(e) {setError((e as Error).message);}
    finally {setBusy(false);}
  }
  return <main className="story-workspace story-library"><header className="story-bar story-entrance">
    <div><Feather size={28} aria-hidden="true"/><h1>{t("writingRoom")}</h1><p>{t("startHint")}</p></div>
    <button className="primary" onClick={()=>{setError("");setCreating(true);}}><Plus size={18}/>{t("createProject")}</button></header>
    <h2 className="story-shelf-title">{t("projects")}</h2>
    {projects.isPending && <ProcessingSpinner/>}
    {projects.error && <p role="alert">{projects.error.message} <button onClick={()=>void projects.refetch()}>{t("retry")}</button></p>}
    {items?.length===0 && <p>{t("noProjects")}</p>}
    <div className="story-projects">{items?.map(p=>
      <Link key={p.productionProjectId} to={p.resumeContext.productionUnitId}>
        <BookOpen className="story-book" size={22} aria-hidden="true"/><strong>{p.title}</strong>
        {p.chapterTitle && p.title!==p.chapterTitle && <span>{p.chapterTitle}</span>}
        <small>{[p.sceneCount!==undefined?t("sceneCount",{count:p.sceneCount}):null,t("shotCount",{count:p.progress.totalClipCount})].filter(Boolean).join(" · ")}</small>
        <ArrowRight className="story-open" size={18} aria-hidden="true"/>
      </Link>)}</div>
    {projects.hasNextPage && <button disabled={projects.isFetchingNextPage} onClick={()=>void projects.fetchNextPage()}>{t("more")}</button>}
    {creating && <Dialog label={t("createProject")} onClose={()=>{if(!busy)setCreating(false);}}>
      <form className="story-create" onSubmit={e=>{e.preventDefault();void create();}}><Feather aria-hidden="true"/><h2>{t("createProject")}</h2>
      <label>{t("projectName")}<input autoFocus maxLength={120} required value={name} onChange={e=>setName(e.target.value)}/></label>
      {error && <p role="alert">{error}</p>}<footer><button type="button" disabled={busy} onClick={()=>setCreating(false)}>{t("cancel")}</button>
      <button className="primary" disabled={busy||!name.trim()}>{busy && <ProcessingSpinner/>}{t("createProject")}</button></footer></form></Dialog>}
  </main>;
}

function WritingConsent() {
  const {t} = useTranslation("story");
  const [offer,setOffer] = useState<WritingConsentRequest|null>(null);
  const pending = useRef<((yes:boolean)=>void)|null>(null);
  useEffect(()=>{
    const unregister=registerCinematicWritingConsent(request=>new Promise(resolve=>{
      pending.current=resolve; setOffer(request);
    }));
    return ()=>{unregister(); pending.current?.(false); pending.current=null;};
  },[]);
  const choose=(yes:boolean)=>{pending.current?.(yes); pending.current=null; setOffer(null);};
  return offer && <Dialog label={t("confirmWriting")} onClose={()=>choose(false)}>
    <h2>{t("confirmWriting")}</h2><p>{t(offer.recovery?"recoverQuote":"writingQuote",{credits:offer.quote.credits})}</p>
    <footer><button onClick={()=>choose(false)}>{t("cancel")}</button><button className="primary" onClick={()=>choose(true)}>{t("continue")}</button></footer>
  </Dialog>;
}

export default function StoryStudio() {
  return <><Routes><Route index element={<Projects/>}/><Route path=":id" element={<StoryEditor/>}/></Routes><WritingConsent/></>;
}
