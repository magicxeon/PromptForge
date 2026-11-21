import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ProcessingSpinner, pollingPolicy, useActor } from "../../lib/canonical";
import { dubBatchApi, type Batch, type BatchMode, type TimingLine } from "./dubBatchApi";
import { projectsApi, timeLabel, type Project, type Cue } from "./projectApi";
import { TimingReview } from "./TimingReview";
import { useDubConfirmation } from "./useDubConfirmation";

function needsListen(item: Batch["items"][number]) {
  return item.status === "needs_listen" || (item.status === "failed" &&
    (item.errorCode?.startsWith("dub_take_rhythm_") || item.errorCode === "dub_take_exceeds_window"));
}

export function BatchControls({ project, language, save, onReload, onBusy, canPrepare, missingInputs, castVersion, onCanExit, closing }: {
  project: Project; language: string; save: () => Promise<Project>; onReload: () => Promise<void>;
  onBusy: (busy:boolean) => void; canPrepare: boolean;
  onCanExit: (canExit:boolean) => void; missingInputs: Cue[]; castVersion: number; closing: boolean;
}) {
  const { t } = useTranslation("dub");
  const confirmation = useDubConfirmation();
  const {identityScope} = useActor();
  const client = useQueryClient();
  const key = ["dub-batch", identityScope, project.id, language];
  const query = useQuery({queryKey:key, queryFn:()=>dubBatchApi.get(project.id,language), refetchOnWindowFocus:false});
  const batch = query.data;
  const [working,setWorking] = useState(false);
  const [reviewed,setReviewed] = useState(false);
  const [checkingTime,setCheckingTime] = useState(false);
  const [error,setError] = useState("");
  const [retimeResult,setRetimeResult] = useState("");
  const [offer,setOffer] = useState<{id:string;revision:number;castVersion:number}>();
  const [timingDraft,setTimingDraft] = useState<{lines:TimingLine[];revision:number;castVersion:number;mode:BatchMode}>();
  const timing = timingDraft?.revision === project.revision && timingDraft.castVersion === castVersion ? timingDraft : undefined;
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current=true; return () => { mounted.current=false; }; },[]);
  const existingCandidates = new Set(batch?.items.filter(needsListen).map(i=>i.cueId));
  const retryable = new Set(batch?.items.filter(i=>i.status==="failed" || needsListen(i)).map(i=>i.cueId));
  const missing = (c:Cue) => !c.takes[language] && !existingCandidates.has(c.id);
  const needsNewTake = (c:Cue) => !c.takes[language] && retryable.has(c.id);
  const remaining = project.cues.filter(missing).length;
  const running = batch?.status === "running";
  const prepared = batch?.status==="prepared" && offer?.id===batch.id && offer.revision===project.revision && offer.castVersion===castVersion;
  const missingPending = missingInputs.filter(missing);
  const review = batch?.items.some(i=>i.status==="review");
  const done = batch?.items.filter(i=>i.status==="done").length ?? 0;
  const failed = batch?.items.filter(i=>i.status==="failed" && !needsListen(i)).length ?? 0;
  function retime(pauseException?:{cueId:string;takeId:string}) {
    if (!batch) return;
    void run(async()=>{
      const next = await dubBatchApi.advance(project.id,batch.id,{retime:true,revision:project.revision,pauseException});
      client.setQueryData(key,next);
      await onReload();
      const newlyPlaced = next.items.filter(i=>i.status==="done" &&
        !project.cues.find(c=>c.id===i.cueId)?.takes[language]).length;
      const awaiting = next.items.filter(needsListen).length;
      if (mounted.current) setRetimeResult(t(newlyPlaced ? "casting.retimePlaced" : "casting.retimeUnchanged",{placed:newlyPlaced,awaiting}));
    });
  }
  async function advance(previous: Batch) {
    const next = await dubBatchApi.advance(project.id,previous.id);
    client.setQueryData(key,next);
    if (mounted.current && next.status !== "running") await onReload();
  }
  async function run(action:()=>Promise<void>) {
    if (lock.current) return;
    lock.current=true;setWorking(true);setError("");setRetimeResult("");
    try { await action(); }
    catch (e) {
      const code = e && typeof e==="object" && "code" in e ? String(e.code) : "";
      if (mounted.current) setError(t("errors."+code,{defaultValue:t("casting.batchError")}));
    } finally {
      lock.current=false;
      if (mounted.current) setWorking(false);
    }
  }
  useEffect(()=>{onBusy(working || (!!running && !error)); return ()=>onBusy(false);},[working,running,error,onBusy]);
  useEffect(()=>{onCanExit(!!running && !working); return ()=>onCanExit(false);},[running,working,onCanExit]);
  useEffect(()=>{
    if (!batch || !running || working || error || closing) return;
    const id = window.setTimeout(()=>void run(()=>advance(batch)),Number(pollingPolicy.comparison(true)));
    return ()=>window.clearTimeout(id);
  },[batch,running,working,error,closing]);
  async function prepare(saved:Project, mode:BatchMode, acceptRhythmMismatch=false) {
    const next = await dubBatchApi.prepare(project.id,{language,revision:saved.revision,mode,...(acceptRhythmMismatch && {acceptRhythmMismatch})});
    setOffer({id:next.id,revision:saved.revision,castVersion});
    client.setQueryData(key,next);
    if (next.totalCredits === null && next.status==="prepared") await advance(next);
  }
  function start(mode:BatchMode, confirmed=false) {
    if (!reviewed || !canPrepare) return;
    if (mode==="all" && !confirmed) {
      confirmation.ask({action:t("casting.replace"), message:t("casting.replaceConfirm"), proceed:()=>start(mode,true)});
      return;
    }
    void run(async()=>{
      const saved = await save();
      const cues = saved.cues.filter(c=>mode==="all" || (mode==="missing" ? missing(c) : needsNewTake(c)));
      if (mode==="failed") {
        const lines = cues.map(c=>{
          const original = c.voiceBindings[language]?.dubText || c.translations[language] || c.text;
          return {id:c.id,original,suggested:original,windowMs:c.endMs-c.startMs};
        });
        setTimingDraft({lines,revision:saved.revision,castVersion,mode});
        return;
      }
      setCheckingTime(true);
      const lines = await dubBatchApi.timing(project.id,saved.revision,language,cues.map(c=>c.id))
        .finally(()=>{if (mounted.current) setCheckingTime(false);});
      if (lines.length) setTimingDraft({lines,revision:saved.revision,castVersion,mode});
      else await prepare(saved,mode);
    });
  }
  function applyTiming() {
    if (!timing || !reviewed || !canPrepare) return;
    void run(async()=>{
      const edits = new Map(timing.lines.map(l=>[l.id,l.suggested.trim()]));
      const cues = project.cues.map(c=>{
        const text = edits.get(c.id);
        return text ? {...c,voiceBindings:{...c.voiceBindings,[language]:{...c.voiceBindings[language],dubText:text}}} : c;
      });
      const saved = await projectsApi.save({...project,cues},project);
      await onReload();
      setTimingDraft(undefined);
      await prepare(saved,timing.mode,true);
    });
  }
  const blocked = !canPrepare || working || running || query.isPending || query.isError || review;
  return <section className="dub-batch-controls">
    {confirmation.modal}
    {query.isError && <button onClick={()=>void query.refetch()}>{t("refresh")}</button>}
    {!timing && batch?.status==="partial" && existingCandidates.size>0 && <section className="dub-analysis">
      <button disabled={working || closing || review || !!project.tracks[language]?.locked} onClick={()=>retime()}>{t("casting.retime")}</button>
      <small>{t("casting.analysisHint")}</small>
      {retimeResult && <p role="status">{retimeResult}</p>}
    </section>}
    <strong>{t("casting.generateHeading")}</strong>
    <label><input type="checkbox" checked={reviewed} disabled={working || running} onChange={e=>setReviewed(e.target.checked)} /> {t("casting.reviewed")}</label>
    {!query.isPending && missingInputs.length>0 && <details><summary>{t("casting.incomplete",{count:missingInputs.length})}</summary>
      <ul>{missingInputs.map(c=><li key={c.id}>{timeLabel(c.startMs)} · {c.translations[language] || c.text}</li>)}</ul>
    </details>}
    {checkingTime && <p role="status"><ProcessingSpinner variant="wave" className="seed-generation-wave" /> {t("timed.check")}</p>}
    {timing && <><TimingReview disabled={working} lines={timing.lines} cues={project.cues} onRequest={director=>void run(async()=>{
      const lines = await dubBatchApi.timing(project.id,timing.revision,language,timing.lines.map(l=>l.id),true,director);
      const suggestions = new Map(lines.map(l=>[l.id,l]));
      setTimingDraft({...timing,lines:timing.lines.map(l=>suggestions.get(l.id) ?? l)});
    })} offerAnalysis onEdit={(id,text)=>setTimingDraft({...timing,
      lines:timing.lines.map(l=>l.id===id?{...l,suggested:text}:l)})}/>
      <small>{t("timed.placeHint")}</small>
      <button className="primary" disabled={blocked || !reviewed || timing.lines.some(l=>!l.suggested.trim())} onClick={applyTiming}>{t("timed.createAndPlace")}</button></>}
    {!timing && !prepared && !running && <div className="dub-cast-actions">
      {remaining>0 && <button className="primary" disabled={blocked || !reviewed || !!missingPending.length} onClick={()=>start("missing")}>{t("casting.generate",{count:remaining})}</button>}
      {project.cues.some(c=>c.takes[language]) && <button disabled={blocked || !reviewed || !!missingInputs.length} onClick={()=>start("all")}>{t("casting.replace")}</button>}
      {batch?.status==="partial" && project.cues.some(needsNewTake) && <button disabled={blocked || !reviewed || missingInputs.some(needsNewTake)} onClick={()=>start("failed")}>{t("casting.retryFailed")}</button>}
    </div>}
    {prepared && <button className="primary" disabled={working || !reviewed || !canPrepare} onClick={()=>void run(()=>advance(batch))}>{batch.totalCredits===null ? t("casting.resume") : t("casting.confirmCredits",{credits:batch.totalCredits})}</button>}
    {!timing && batch && batch.status!=="prepared" && <p role="status">{running && <ProcessingSpinner variant="wave" className="seed-generation-wave" />} {t("casting.progress",{done,total:batch.items.length})}
      {existingCandidates.size>0 && <> · {t("casting.listenCount",{count:existingCandidates.size})}</>}
      {failed>0 && <> · {t("casting.failedCount",{count:failed})}</>}
    </p>}
    {running && <small>{t("casting.keepOpen")}</small>}
    {!timing && batch?.items.filter(i=>i.status==="failed" || i.status==="review" || needsListen(i)).map(i=>{
      const cue=project.cues.find(c=>c.id===i.cueId);
      return <p key={i.cueId}>{cue && timeLabel(cue.startMs) + " · "}{cue?.voiceBindings[language]?.dubText || cue?.translations[language] || cue?.text} · {i.errorCode==="dub_take_exceeds_window" && i.durationMs && i.targetMs ?
        t("timed.over",{actual:i.durationMs/1000,target:i.targetMs/1000}) : t("errors."+i.errorCode,{defaultValue:t(i.status==="review"?"dubVoice:review":"dubVoice:failed")})}
        {i.errorCode==="dub_take_rhythm_pause" && i.takeId && !running && <button disabled={working || closing || !!project.tracks[language]?.locked}
          onClick={()=>retime({cueId:i.cueId,takeId:i.takeId!})}>{t("useBoundaryTiming")}</button>}</p>;
    })}
    {error && <p role="alert">{error}</p>}
    {batch && (review || (running && error)) && <button disabled={working} onClick={()=>void run(()=>advance(batch))}>{t("refresh")}</button>}
  </section>;
}
