import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Feather, Plus, Trash2 } from "lucide-react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { ProcessingSpinner, useActor } from "../../lib/canonical";
import { Dialog } from "../dub-sub/Dialog";
import { createCinematicProject, deleteCinematicProductionProject, listCinematicProjectPage, type CinematicProjectSummary } from "../../../../web/src/features/cinematic/api/cinematicApi";
import { createCinematicSetupDraft } from "../../../../web/src/features/cinematic/state/cinematicDraftStorage";
import { registerCinematicWritingConsent, type WritingConsentRequest } from "../../../../web/src/features/cinematic/api/cinematicWritingBilling";
import { storyKeys } from "./data/storyQueryKeys";
import settings from "./story-config.json";
import authoring from "../../../../server/config/cinematic/story-authoring.v1.json";
import workflow from "../../../../server/config/cinematic/workflow-policy.v1.json";
import {StoryDirectionFields,initialDirection} from "./StoryDirectionFields";
import "./story.css";
import "./translations";

const StoryEditor = lazy(() => import("./StoryEditor"));

function Projects() {
  const { t } = useTranslation("story");
  const { identityScope } = useActor();
  const cache = useQueryClient(), navigate = useNavigate();
  const projects = useInfiniteQuery({ queryKey:storyKeys.library(identityScope),initialPageParam:undefined as string|undefined,
    queryFn:({pageParam})=>listCinematicProjectPage(settings.projectsPerPage,pageParam),getNextPageParam:last=>last.nextCursor??undefined });
  const items=projects.data?.pages.flatMap(page=>page.items);
  const [deleteTarget,setDeleteTarget] = useState<CinematicProjectSummary|null>(null);
  const [deleting,setDeleting] = useState(false);
  const [deleteError,setDeleteError] = useState("");
  const [deleteStale,setDeleteStale] = useState(false);
  useEffect(()=>{setDeleteTarget(null);setDeleteError("");},[identityScope]);
  async function confirmDeletion() {
    if (!deleteTarget || deleting || deleteStale) return;
    setDeleting(true);
    try {
      const result = await deleteCinematicProductionProject(deleteTarget);
      for (const id of result.deletedProjectIds) {
        cache.removeQueries({queryKey:storyKeys.project(identityScope,id)});
        cache.removeQueries({queryKey:storyKeys.series(identityScope,id)});
      }
      setDeleteTarget(null);
      await projects.refetch();
    } catch (err) {
      if ((err as {code?:string}).code === "cinematic_project_delete_stale") {
        setDeleteStale(true); setDeleteError(t("deleteStoryChanged"));
        await projects.refetch();
      } else setDeleteError((err as Error).message);
    } finally {setDeleting(false);}
  }
  const [name,setName] = useState(""), [creating,setCreating] = useState(false);
  const [busy,setBusy] = useState(false), [error,setError] = useState("");
  const [draft] = useState(() => createCinematicSetupDraft());
  const [direction,setDirection] = useState(initialDirection);
  const [start,setStart] = useState("script");
  const [startingEpisode,setStartingEpisode] = useState("1"), [priorEpisodeSummary,setPriorEpisodeSummary] = useState("");
  const [episodeCount,setEpisodeCount] = useState("");
  const maxEpisodes = Math.min(workflow.projectCreation.maximumChapterCount,workflow.authoring.generatedChapterMaximum);
  const summaryLength = priorEpisodeSummary.trim().length;
  const summaryLimit = authoring.limits.priorEpisodeSummary;
  const summaryTooLong = direction.format === "series" && summaryLength > summaryLimit;
  async function create() {
    if (busy || !name.trim() || summaryTooLong) return;
    setBusy(true); setError("");
    try {
      const result = await createCinematicProject({...draft,projectName:name.trim(),storyDirection:direction,
        format:direction.format==="standalone"?"short-film":"mini-series",aspectRatio:direction.aspectRatio,
        ...(direction.format==="series" ? {startingEpisode:Number(startingEpisode), priorEpisodeSummary} : {}),
        ...(direction.format==="series" && episodeCount ? {requestedEpisodeCount:Number(episodeCount)} : {}),
        storyCountryStyle:direction.country,storyPeriod:direction.period,genre:direction.genre,genres:[direction.genre],
        audienceFeeling:direction.tone,audienceFeelings:[direction.tone]});
      cache.setQueryData(storyKeys.project(identityScope,result.id),result);
      await cache.invalidateQueries({queryKey:storyKeys.library(identityScope),refetchType:"none"});
      navigate(result.id+(start==="idea"?"?start=idea":""));
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
      <article key={p.productionProjectId} className="story-library-card"><Link to={p.resumeContext.productionUnitId}>
        <BookOpen className="story-book" size={22} aria-hidden="true"/><strong>{p.title}</strong>
        {p.chapterTitle && p.title!==p.chapterTitle && <span>{p.chapterTitle}</span>}
        <small>{[p.sceneCount!==undefined?t("sceneCount",{count:p.sceneCount}):null,t("shotCount",{count:p.progress.totalClipCount})].filter(Boolean).join(" · ")}</small>
        <ArrowRight className="story-open" size={18} aria-hidden="true"/>
      </Link><button className="story-project-delete" onClick={()=>{setDeleteError("");setDeleteStale(false);setDeleteTarget(p);}}>
        <Trash2 size={15} aria-hidden="true"/>{t("deleteStory")}</button></article>)}</div>
    {deleteTarget && <Dialog label={t("deleteStoryTitle")} descriptionId="story-delete-description" onClose={()=>{if(!deleting)setDeleteTarget(null);}}>
      <section className="story-delete-confirmation"><h2>{t("deleteStoryTitle")}</h2>
        <p id="story-delete-description">{t("deleteStoryDetail",{title:deleteTarget.title,count:deleteTarget.chapterCount})}</p>
        {deleteError && <p role="alert">{deleteError}</p>}
        <footer><button autoFocus disabled={deleting} onClick={()=>setDeleteTarget(null)}>{t("cancel")}</button>
          <button className="story-project-delete" disabled={deleting||deleteStale} onClick={()=>void confirmDeletion()}>
            {deleting && <ProcessingSpinner/>}{t("deleteStoryConfirm")}</button></footer>
      </section></Dialog>}
    {projects.hasNextPage && <button disabled={projects.isFetchingNextPage} onClick={()=>void projects.fetchNextPage()}>{t("more")}</button>}
    {creating && <Dialog label={t("createProject")} onClose={()=>{if(!busy)setCreating(false);}}>
      <form className="story-create" onSubmit={e=>{e.preventDefault();void create();}}><Feather aria-hidden="true"/><h2>{t("createProject")}</h2>
      <label>{t("projectName")}<input autoFocus maxLength={120} required value={name} onChange={e=>setName(e.target.value)}/></label>
      <label>{t("brief.start")}<select value={start} onChange={e=>setStart(e.target.value)}>
        <option value="script">{t("brief.script")}</option><option value="idea">{t("brief.idea")}</option></select></label>
      <details><summary>{t("brief.heading")}</summary><StoryDirectionFields value={direction} onChange={setDirection}/></details>
      {direction.format==="series" && <><label>{t("startingEpisode")}<input type="number" min="0" step="1" required value={startingEpisode} onChange={e=>setStartingEpisode(e.target.value)}/></label>
        <label>{t("episodeCount")}<input type="number" min="1" max={maxEpisodes} step="1" aria-describedby="episode-lock-note" placeholder={t("episodeCountAuto")} value={episodeCount} onChange={e=>setEpisodeCount(e.target.value)}/></label>
        <p id="episode-lock-note" className="story-episode-warning">{t("episodeLockNotice")}</p>
        {startingEpisode !== "" && Number.isInteger(Number(startingEpisode)) && Number(startingEpisode)>=0 && Number.isInteger(Number(episodeCount)) && Number(episodeCount)>0 && Number(episodeCount)<=maxEpisodes &&
          <small>{t("episodeRange",{first:Number(startingEpisode),last:Number(startingEpisode)+Number(episodeCount)-1})}</small>}
        <label>{t("priorEpisodeSummary")}<textarea aria-describedby="episode-summary-count" aria-invalid={summaryTooLong} value={priorEpisodeSummary} onChange={e=>setPriorEpisodeSummary(e.target.value)}/></label>
        <small id="episode-summary-count" role={summaryTooLong ? "alert" : undefined}>{t(summaryTooLong ? "episodeSummaryTooLong" : "episodeSummaryCount",{used:summaryLength,limit:summaryLimit})}</small></>}
      {error && <p role="alert">{error}</p>}<footer><button type="button" disabled={busy} onClick={()=>setCreating(false)}>{t("cancel")}</button>
      <button className="primary" disabled={busy||!name.trim()||summaryTooLong}>{busy && <ProcessingSpinner/>}{t("createProject")}</button></footer></form></Dialog>}
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
  return <><Routes><Route index element={<Projects/>}/><Route path=":id" element={
    <Suspense fallback={<ProcessingSpinner/>}><StoryEditor/></Suspense>
  }/></Routes><WritingConsent/></>;
}
