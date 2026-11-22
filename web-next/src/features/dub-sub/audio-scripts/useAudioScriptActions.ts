import {useCallback, useEffect, useRef, useState} from "react";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {voiceApi} from "../../../../../web/src/features/voice-studio/api/voiceStudioApi";
import type {VoiceDocument, VoiceTake} from "../../../../../web/src/features/voice-studio/schemas/voiceStudioSchemas";
import {apiMediaBlob, getIdentitySnapshot, pollingPolicy, readActorScopedDraft, writeActorScopedDraft, useActor} from "../../../lib/canonical";
import i18n from "../../../app/i18n";
import en from "../../../locales/en/audioActions.json";
import th from "../../../locales/th/audioActions.json";
import {createSpeechRequest} from "../speechRequest";
import {assembleScriptWav} from "./scriptWav";

i18n.addResourceBundle("en","audioActions",en);
i18n.addResourceBundle("th","audioActions",th);

type Receipt = {id:string; requestId:string; revision:number};
type Entry = {rowId:string; receipt:Receipt; recover:boolean; expiresAt?:string; approvedCredits?:number};
type Batch = {doc:VoiceDocument; entries:Entry[]; credits:number};
type Props = {document:VoiceDocument; persist:()=>Promise<VoiceDocument>; apply:(doc:VoiceDocument)=>void; creditsEnabled:boolean|undefined};
type History = Record<string,VoiceTake[]>;
const message = (err:unknown) => (err as {code?:string})?.code || (err instanceof Error ? err.message : "");

export function useAudioScriptActions({document:doc,persist,apply,creditsEnabled}:Props) {
  const {t} = useTranslation("audioActions");
  const {identityScope} = useActor();
  const client = useQueryClient();
  const epoch = getIdentitySnapshot().epoch;
  const scope = {actorId:getIdentitySnapshot().actorId,feature:"audio-script-requests."+doc.id,schemaVersion:1};
  const receipts = () => readActorScopedDraft<Record<string,Receipt>>({...scope,fallback:{}});
  const persisted = client.getQueryData<VoiceDocument>(["audio-scripts",identityScope,doc.id]);
  const savedIds = (persisted?.rows || []).map(row=>row.id).sort();
  const historyKey = ["audio-script-takes",identityScope,doc.id,savedIds];
  const history = useQuery({queryKey:historyKey,refetchOnWindowFocus:false,queryFn:async () => {
    const result:History = {};
    for (let i=0;i<savedIds.length;i+=4) {
      await Promise.all(savedIds.slice(i,i+4).map(async id=>{
        result[id] = (await voiceApi.takes(doc.id,id)).items.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
      }));
    }
    return result;
  }});
  const [busy,setBusy] = useState(false);
  const [activeRowId,setActive] = useState<string|null>(null);
  const [errors,setErrors] = useState<Record<string,string>>({});
  const [confirmation,setConfirmation] = useState<Batch|null>(null);
  const [playing,setPlaying] = useState<string|null>(null);
  const mounted = useRef(false), locked = useRef(false), player = useRef<HTMLAudioElement|null>(null);
  const mediaUrl = useRef(""), playbackId = useRef(0);
  const sampleRequest = useRef<{key:string; controller:AbortController} | null>(null);
  const stop = useCallback(() => {
    playbackId.current++;
    sampleRequest.current?.controller.abort();
    sampleRequest.current=null;
    if (player.current) {player.current.onended=null;player.current.onerror=null;player.current.pause();player.current=null;}
    if (mediaUrl.current) URL.revokeObjectURL(mediaUrl.current);
    mediaUrl.current="";
    if (mounted.current) setPlaying(null);
  },[]);
  const stopSample = useCallback((key:string) => {
    if (sampleRequest.current?.key === key) stop();
  },[stop]);
  useEffect(()=>{
    mounted.current=true;
    return ()=>{mounted.current=false;stop();};
  },[doc.id,identityScope]);
  const current = () => mounted.current && epoch === getIdentitySnapshot().epoch;
  const guard = () => {if (!current()) throw Error("cancelled");};
  const refresh = () => {void history.refetch();};
  function remember(rowId:string,value?:Receipt) {
    guard();
    const next = receipts();
    if (value) next[rowId]=value; else delete next[rowId];
    writeActorScopedDraft({...scope,payload:next});
  }
  function report(rowId:string,err:unknown) {
    if (!current()) return;
    const code = message(err);
    const translated = err instanceof Error && err.name==="ScriptNotice" ? err.message
      : code==="voice_revision_conflict" ? t("stale") : t("error",{code:code || "audio_error"});
    setErrors(prev=>({...prev,[rowId]:translated}));
  }
  function notice(text:string) {return Object.assign(new Error(text),{name:"ScriptNotice"});}
  async function run(key:string,work:()=>Promise<void>) {
    if (locked.current) return;
    locked.current=true;setBusy(true);
    setErrors(prev=>({...prev,[key]:"",_:""}));
    try {await work();} catch(err) {report(key,err);}
    finally {
      locked.current=false;
      if (current()) {setBusy(false);setActive(null);}
    }
  }
  async function submit(entry:Entry,saved:VoiceDocument) {
    const {rowId,receipt} = entry;
    if (!entry.recover && entry.expiresAt && Date.parse(entry.expiresAt)<=Date.now()) {
      const renewed=await voiceApi.quote(saved.id,rowId,saved.revision);
      if (entry.approvedCredits===undefined || renewed.totalCredits>entry.approvedCredits) throw notice(t("priceChanged"));
      receipt.id=renewed.id;
    }
    const dispatch = () => voiceApi.generate(saved.id,rowId,receipt.revision,receipt.id,receipt.requestId);
    let op;
    if (entry.recover) {
      try {op=await voiceApi.operation(receipt.id);}
      catch(err) {
        if ((err as {status?:number}).status!==404) throw err;
      }
    }
    if (!op || op.status==="quoted") {
      if (receipt.revision!==saved.revision) {remember(rowId);throw notice(t("stale"));}
      guard();remember(rowId,receipt);
      try {op=await dispatch();}
      catch(err) {
        const status=(err as {status?:number}).status;
        if (status && status>=400 && status<500) remember(rowId);
        throw err;
      }
    }
    while (["admitting","queued","dispatching","delivered"].includes(op.status) && !op.errorCode) {
      await new Promise(resolve=>setTimeout(resolve,pollingPolicy.comparison(true) || 1500));
      guard();
      op=await voiceApi.operation(receipt.id);
    }
    guard();
    if (op.status==="failed") {remember(rowId);throw notice(t("failed",{code:op.errorCode || "speech_failed"}));}
    if (op.status!=="succeeded" || !op.take) throw notice(t("pending"));
    return op.take;
  }
  async function execute(batch:Batch) {
    let saved=batch.doc;
    const completed:{entry:Entry;take:VoiceTake}[]=[];
    for (const entry of batch.entries) {
      guard();setActive(entry.rowId);
      setErrors(prev=>({...prev,[entry.rowId]:""}));
      try {
        const take=await submit(entry,batch.doc);
        completed.push({entry,take});
        client.setQueryData<History>(historyKey,old=>({...old,[entry.rowId]:[take,...(old?.[entry.rowId]||[]).filter(item=>item.id!==take.id)]}));
      } catch(err) {report(entry.rowId,err);}
    }
    // All quotes describe the same saved revision. Select results only after
    // generation, because selecting a take advances the document revision.
    let refreshDocument = batch.entries.some(entry=>entry.recover);
    for (const {entry,take} of completed) {
      guard();
      const row=saved.rows.find(r=>r.id===entry.rowId);
      const inputRevision = take.inputSnapshot.documentRevision ?? entry.receipt.revision;
      if (row && (!row.selectedTakeId || !row.selectedTakeCurrent) && inputRevision===batch.doc.revision) {
        try {
          saved=await voiceApi.select(saved.id,row.id,take.id,saved.revision,true);
          guard();apply(saved);
        } catch(err) {
          // The take already exists. A concurrent edit must leave it available
          // for audition without approving it for the newly edited line.
          if ((err as {status?:number}).status !== 409) throw err;
          refreshDocument = true;
          report(row.id,notice(t("stale")));
        }
      }
      remember(entry.rowId);
    }
    guard();
    if (refreshDocument) {
      const latest = await voiceApi.document(saved.id);
      guard();apply(latest);
    }
    refresh();
  }
  async function generate(rowId?:string) {
    if (confirmation || creditsEnabled===undefined) return;
    await run(rowId || "_", async()=>{
      const saved=await persist();guard();
      const outstanding=receipts();
      const rows=saved.rows.filter(row=>row.enabled && (rowId ? row.id===rowId : !row.selectedTakeId || !row.selectedTakeCurrent || row.activeOperationId || outstanding[row.id]));
      if (!rows.length) return;
      for (const row of rows) if (!row.characterPresetId || !row.text.trim()) throw notice(t("invalid",{n:saved.rows.indexOf(row)+1}));
      const batch:Batch={doc:saved,entries:[],credits:0};
      for (const row of rows) {
        guard();
        const existing=outstanding[row.id];
        if (existing || row.activeOperationId) {
          batch.entries.push({rowId:row.id,recover:true,receipt:existing ?? {id:row.activeOperationId!,requestId:"",revision:-1}});
          continue;
        }
        const request=createSpeechRequest();
        const entry:Entry={rowId:row.id,recover:false,receipt:{...request,revision:saved.revision}};
        if (creditsEnabled) {
          const quote=await voiceApi.quote(saved.id,row.id,saved.revision);
          entry.receipt.id=quote.id;
          entry.approvedCredits=quote.totalCredits;
          entry.expiresAt=quote.expiresAt;
          batch.credits+=quote.totalCredits;
        }
        batch.entries.push(entry);
      }
      guard();
      if (creditsEnabled && batch.entries.some(e=>!e.recover)) setConfirmation(batch);
      else await execute(batch);
    });
  }
  async function confirmGeneration() {
    if (!confirmation) return;
    const batch=confirmation;
    await run("_",async()=>{setConfirmation(null);await execute(batch);});
  }
  async function select(rowId:string,takeId:string) {
    await run(rowId,async()=>{
      const saved=await persist();guard();
      const updated=await voiceApi.select(saved.id,rowId,takeId,saved.revision);
      guard();apply(updated);
    });
  }
  async function audio(rowId?:string,takeId?:string) {
    const saved=await persist();guard();
    const rows=saved.rows.filter(row=>row.enabled && (!rowId || row.id===rowId));
    if (!rows.length) throw notice(t("empty"));
    const lines=rows.map(row=>{
      const id=takeId || row.selectedTakeId;
      if (!id || (!rowId && !row.selectedTakeCurrent)) throw notice(t("missing",{n:saved.rows.indexOf(row)+1}));
      return {pauseAfterMs:row.pauseAfterMs ?? 0,read:async()=>{
        let take=history.data?.[row.id]?.find(item=>item.id===id);
        if (!take) take=(await voiceApi.takes(saved.id,row.id)).items.find(item=>item.id===id);
        guard();
        if (!take) throw notice(t("missing",{n:saved.rows.indexOf(row)+1}));
        return apiMediaBlob(take.audioUrl);
      }};
    });
    return rowId ? lines[0].read() : assembleScriptWav(lines);
  }
  async function startAudio(blob:Blob, token:number, onError:()=>void) {
    if (!current() || playbackId.current!==token) return;
    mediaUrl.current=URL.createObjectURL(blob);
    const element=new Audio(mediaUrl.current);
    player.current=element;
    element.onended=stop;
    const fail=()=>{if (current() && playbackId.current===token) {stop();onError();}};
    element.onerror=fail;
    try {await element.play();} catch {fail();}
  }
  async function playSample(key:string, url:string, onError:()=>void) {
    const toggled=sampleRequest.current?.key===key;
    stop();
    if (toggled) return;
    const token=playbackId.current;
    const controller=new AbortController();
    sampleRequest.current={key,controller};
    setPlaying(key);
    try {await startAudio(await apiMediaBlob(url,controller.signal),token,onError);}
    catch {if (!controller.signal.aborted && current()) {stop();onError();}}
  }
  async function play(rowId?:string,takeId?:string) {
    const key=rowId || "all";
    const toggled=playing===key && !takeId;
    stop();
    if (toggled) return;
    const token=playbackId.current;
    await run(rowId || "_",async()=>{
      const blob=await audio(rowId,takeId);guard();
      if (playbackId.current!==token) return;
      await startAudio(blob,token,()=>report(rowId || "_",Error("audio_playback")));
      if (current() && playbackId.current===token) setPlaying(key);
    });
  }
  async function download(rowId?:string) {
    await run(rowId || "_",async()=>{
      const blob=await audio(rowId);guard();
      const url=URL.createObjectURL(blob);
      const a=window.document.createElement("a");
      const suffix=rowId ? "-"+(doc.rows.findIndex(row=>row.id===rowId)+1) : "";
      a.href=url;a.download=(doc.title.replace(/[<>:"/\\|?*]/g,"_") || "audio")+suffix+".wav";
      a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
  }
  return {busy,activeRowId,errors:history.error && !errors._ ? {...errors,_:t("takes")} : errors,takes:history.data ?? {},
    generate,confirmGeneration,cancelConfirmation:()=>setConfirmation(null),pendingCredits:confirmation?.credits ?? null,
    select,play,playSample,stopSample,stop,playing,download,refresh};
}
