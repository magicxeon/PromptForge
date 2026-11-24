import {useRef, useState} from "react";
import {formatStoryPromptWholeSeconds,inspectStoryPromptDraft} from "../../../../../server/domain/cinematic/StoryPromptFormatting.js";
import {Copy, Maximize2, Minimize2, X} from "lucide-react";
import {useQuery} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {useBlocker,useNavigate} from "react-router-dom";
import {ProcessingSpinner,useActor} from "../../../lib/canonical";
import {Dialog} from "../../dub-sub/Dialog";
import {StoryCharacterIdentity} from "../characters/StoryCharacters";
import type {RunWriting} from "../data/useStoryWorkspace";
import type {CinematicProject, CinematicScene, CinematicShot} from "../../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import {buildCinematicStoryPrompt, prepareCinematicShotWriter, updateCinematicShotDocument} from "../../../../../web/src/features/cinematic/api/cinematicSeriesApi";
import {CinematicWritingCancelled} from "../../../../../web/src/features/cinematic/api/cinematicWritingBilling";
import {approveCinematicStoryboardSource, getCinematicProject} from "../../../../../web/src/features/cinematic/api/cinematicApi";
import {MediaImage} from "../../../components/media/MediaImage";
import {OpeningFramePicker} from "./OpeningFramePicker";
import {ShotArtDirection} from "./ShotArtDirection";
import {StoryPromptReviewDialog,useStoryPromptReview} from "./StoryPromptReview";
import {outputStorageKey} from "../../playground/state/imageDraft";
import "./promptTranslations";
import "./storyPrompt.css";

type Format = "still" | "flow" | "seedance" | "legacy";

export function ShotPromptDialog({project, scene, shot, skills, run, error, close}: {
  project: CinematicProject; scene: CinematicScene; shot: CinematicShot; skills: string[];
  run: RunWriting; error: string; close: () => void;
}) {
  const {t,i18n} = useTranslation("story");
  const {t: label} = useTranslation("storyPrompt");
  const navigate = useNavigate();
  const {identityScope} = useActor();
  const [format, setFormat] = useState<Format>(shot.videoPromptOverride && !shot.storyPromptVariants ? "legacy" :
    project.writingSettings?.direction?.destination === "flow" ? "flow" : "seedance");
  const saved = format === "legacy" ? shot.videoPromptOverride : shot.storyPromptVariants?.[format];
  const savedText = format === "still" ? saved?.text || "" : formatStoryPromptWholeSeconds(saved?.text || "");
  const [text, setText] = useState(savedText);
  const [reviewBase, setReviewBase] = useState(savedText);
  const [sourceVersion, setSourceVersion] = useState(project.version);
  const [newFormat, setNewFormat] = useState<Format | null>(null);
  const [picker, setPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [prepared, setPrepared] = useState<Awaited<ReturnType<typeof prepareCinematicShotWriter>>>();
  const [loadingSaved, setLoadingSaved] = useState(false);
  const review = useStoryPromptReview<Awaited<ReturnType<typeof prepareCinematicShotWriter>>>();
  const preparing = loadingSaved || Boolean(review.stage);
  const [localError, setLocalError] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded,setExpanded] = useState(false);
  const [showMobileRefs,setShowMobileRefs] = useState(false);
  const [artChanged,setArtChanged] = useState(false);
  const [artDirty,setArtDirty] = useState(false);
  const expandButton = useRef<HTMLButtonElement>(null);
  const blocker = useBlocker(text !== savedText || artDirty || preparing);
  const current = useQuery({
    queryKey:["story-shot-attachments",identityScope,project.id,project.version,scene.id,shot.id,format],
    queryFn:()=>prepareCinematicShotWriter(project.id,scene.id,shot.id,"story", format === "legacy" ? undefined : format),
    enabled:format !== "legacy", refetchOnWindowFocus:false, retry:false
  });
  const packet = prepared?.storyPacket || current.data?.storyPacket;
  const savedVariant = format === "legacy" ? undefined : shot.storyPromptVariants?.[format];
  const outdated = !prepared && Boolean(savedVariant && packet && savedVariant.sourceFingerprint !== packet.sourceFingerprint);
  const savedRefs = prepared ? undefined : savedVariant?.references;
  const listedRefs = savedRefs?.map(ref=>({...ref, imageUrl:packet?.references.find(image=>image.assetId===ref.assetId)?.imageUrl}))
    ?? (!prepared && savedText ? undefined : packet?.references);
  const language = i18n.language.startsWith("th") ? "th" : "en";
  const sourceOutline = shot.shotDocument?.match(/^OPENING(?: FRAME)?[ \t]*\r?\n([^\r\n]+)/im)?.[1]
    || shot.visibleMoment || shot.subjectAction || shot.purpose
    || shot.shotDocument?.split(/\r?\n/).map(line=>line.trim()).find(line=>line && !/^[A-Z &]+$|^#|^\d+(?:\.\d+)? seconds?$|^\[/.test(line));
  const summary = shot.summary?.[language] || (sourceOutline && [...new Intl.Segmenter(language,{granularity:"sentence"})
    .segment(sourceOutline)].slice(0,2).map(part=>part.segment).join("").trim());
  const castIds = shot.speakerBindings?.map(binding => binding.castAssignmentId)
    ?? (shot.castMode === "none" || scene.castMode === "none" ? []
      : shot.castMode === "inherit" || (shot.castMode !== "selected" && !shot.castAssignmentIds.length)
        ? scene.castAssignmentIds : shot.castAssignmentIds);
  const resolvedCues = (prepared || current.data)?.dialogue.cues || [];
  const members = project.castAssignments.filter(person => person.active !== false &&
    (castIds.includes(person.id) || resolvedCues.some(cue=>cue.speakerCastAssignmentId===person.id)));
  const stale = project.version !== sourceVersion;
  const needsFrame = format === "flow" && !shot.approvedStoryboardSource;
  const frameReferences = prepared?.storyPacket?.references ?? [];
  const canUseImageWorkspace = frameReferences.filter(ref=>ref.role==="character").length <= 1;
  function selectFormat(next: Format) {
    setFormat(next);
    const nextText = (next === "legacy" ? shot.videoPromptOverride : shot.storyPromptVariants?.[next])?.text || "";
    setText(next === "still" ? nextText : formatStoryPromptWholeSeconds(nextText));
    setReviewBase(next === "still" ? nextText : formatStoryPromptWholeSeconds(nextText));
    setPrepared(undefined); setCopied(false); setLocalError(""); setNewFormat(null); setLeaving(false); setSourceVersion(project.version);
  }
  const discard = () => { if (blocker.state === "blocked") blocker.proceed(); else if (newFormat) selectFormat(newFormat); else close(); };
  function requestFormat(next: Format) {
    if (text !== savedText) { setNewFormat(next); setLeaving(true); } else selectFormat(next);
  }
  async function chooseFrame(jobId: string) {
    setSaving(true);
    try {
      await run(async () => {
        await approveCinematicStoryboardSource(project.id, shot.id, {
          expectedVersion: project.version, expectedShotVersion: shot.version, idempotencyKey: crypto.randomUUID(), jobId
        });
        const updated = await getCinematicProject(project.id);
        setSourceVersion(updated.version); setPicker(false); setPrepared(undefined); setLocalError("");
        return {project: updated};
      });
    } finally { setSaving(false); }
  }

  async function prepare(rebuild = true) {
    setLocalError("");
    function accept(result:Awaited<ReturnType<typeof prepareCinematicShotWriter>>) {
      const packet = result.storyPacket;
      const draft = format === "legacy" ? result.storyPrompt : packet?.text;
      if (!draft) throw new Error(t("promptUnavailable"));
      if (packet && !packet.ready) throw new Error(label("needFrame"));
      if (!rebuild && (packet ? saved?.sourceFingerprint !== packet.sourceFingerprint : result.overrideStale)) throw new Error(t("rebuildStalePrompt"));
      setPrepared(result);
      setReviewBase(rebuild ? formatStoryPromptWholeSeconds(draft) : savedText);
      if (rebuild) setText(format === "still" ? draft : formatStoryPromptWholeSeconds(draft));
    }
    try {
      if (rebuild) {
        const write = (draft?:string) => buildCinematicStoryPrompt(project.id,scene.id,shot.id,project.version,format,language,draft);
        await review.build(()=>write(), result=>{
          const draft = format === "legacy" ? result.storyPrompt : result.storyPacket?.text;
          if (!draft) throw new Error(t("promptUnavailable"));
          return write(draft);
        },accept);
      } else {
        setLoadingSaved(true);
        accept(await prepareCinematicShotWriter(project.id,scene.id,shot.id,"story",format === "legacy" ? undefined : format));
      }
    } catch (cause) {
      if (!(cause instanceof CinematicWritingCancelled)) setLocalError((cause as Error).message || t("promptUnavailable"));
    } finally {
      setLoadingSaved(false);
    }
  }

  async function save(openImageWorkspace = false) {
    if (!prepared || stale || saving || !text.trim() || text.length > prepared.maximumPromptCharacters) return;
    setSaving(true);
    try {
      await run(async () => {
        const update = await updateCinematicShotDocument(project.id, scene.id, shot.id, {
          expectedVersion: project.version, expectedShotVersion: shot.version,
          promptOnly: true,
          ...(format === "legacy" ? {videoPromptOverride: {text: text.trim(), sourceFingerprint: prepared.sourceFingerprint}} :
            {storyTemplate: format, storyPrompt: {text: text.trim(), sourceFingerprint: prepared.storyPacket!.sourceFingerprint}})
        });
        if(openImageWorkspace){
          const references = frameReferences.map(ref=>({id:ref.assetId,role:ref.role==="character"?"character_reference":"style_reference",
            name:ref.name,storageKey:outputStorageKey(ref.imageUrl),status:"ready"}));
          close();
          // Release the editor's route blocker once the prompt is saved.
          setTimeout(()=>navigate("/image",{state:{identityScope, frameReferences:references,
            imageSettings:{prompt:text.trim(),ratio:project.writingSettings?.direction?.aspectRatio || project.aspectRatio},
            storyScene:{projectId:project.id,sceneId:scene.id,title:shot.title,expectedVersion:update.project.version,
              shot:{id:shot.id,version:update.shot.version}}
          }}),0);
        }else discard();
        return update;
      });
    } finally {
      setSaving(false);
    }
  }

  function requestClose() {
    if (saving || preparing) return;
    if (text !== savedText || artDirty) setLeaving(true);
    else close();
  }

  function toggleExpanded() {
    setExpanded(!expanded);
    expandButton.current?.focus({preventScroll:true});
  }
  return <Dialog label={t("shotPrompt")} onClose={expanded ? toggleExpanded : requestClose}>
    <div className="story-dialog story-prompt-dialog" data-expanded={expanded}>
      <header className="story-prompt-heading">
        <h2>{t("shotPrompt")} · {shot.title}</h2>
        <button type="button" aria-label={t("close")} title={t("close")} disabled={saving || preparing} onClick={requestClose}>
          <X size={20} aria-hidden="true"/>
        </button>
      </header>
      <section className="story-shot-summary"><strong>{label("summary")}</strong><p>{summary || label("summaryEmpty")}</p></section>
      <div className="story-prompt-formats" role="group" aria-label={label("destination")}>
        {(["still","flow","seedance",...(shot.videoPromptOverride ? ["legacy"] : [])] as Format[])
          .map(id => <button key={id} disabled={saving || preparing} aria-pressed={format===id}
            onClick={() => { if (id !== format) requestFormat(id); }}>{label(id)}</button>)}
      </div>
      <div className="story-prompt-panes">
      <fieldset className="story-art-pane" disabled={preparing || saving || text !== savedText}>
        <ShotArtDirection project={project} scene={scene} shot={shot} run={run} onDirtyChange={setArtDirty}
          onSaved={version=>{setArtChanged(true);setSourceVersion(version);setPrepared(undefined);}}/>
      </fieldset>
      <section className="story-ref-pane">
      <h3>{label("attachments")}{listedRefs && <> · {listedRefs.length}</>}</h3>
      <button className="story-mobile-refs" aria-expanded={showMobileRefs} onClick={()=>setShowMobileRefs(!showMobileRefs)}>
        {label(showMobileRefs ? "hideRefs" : "showRefs")}</button>
      <div className="story-ref-content" data-open={showMobileRefs}>
      {outdated && <p role="status">{label("refsChanged")}</p>}
      {listedRefs?.length ? <ol className="story-prompt-references">{listedRefs.map(ref => <li key={ref.number}>
        {ref.imageUrl ? <MediaImage src={ref.imageUrl} alt=""/> : <small>{label(current.isPending ? "loadingRefs" : "imageUnavailable")}</small>}
        <span><small>{label("referenceNumber",{number:ref.number})} · {label(ref.role)}</small><strong>{ref.name}</strong></span>
      </li>)}</ol> : <p>{format === "legacy" || !prepared && savedText && !savedRefs ? label("unknownRefs") :
        listedRefs ? label("noRefs") : current.isError ? label("refsError") : label("loadingRefs")}</p>}
      {current.isError && <button onClick={()=>void current.refetch()}>{label("retry")}</button>}
      {needsFrame && <p>{label("needFrame")} <button onClick={() => requestFormat("still")}>{label("prepareFrame")}</button></p>}
      {(format === "flow" || format === "seedance") && <button disabled={saving || preparing || text!==savedText || stale}
        onClick={() => setPicker(true)}>{label(shot.approvedStoryboardSource ? "replaceFrame" : "chooseFrame")}</button>}
      </div></section>
      <div className="story-text-pane">
      <details className="story-prompt-context" open={!expanded || undefined}><summary>{t("characters")}</summary>
      {members.length ? <ul className="story-character-list">{members.map((person, index) => {
        const offscreen = shot.speakerBindings?.find(binding => binding.castAssignmentId === person.id)?.visible === false;
        return <li key={person.id}>
          <StoryCharacterIdentity person={person} showPhoto={!offscreen}/>
          <small>{t("promptCharacterNumber", {number: index + 1})}{offscreen && <> · {t("promptOffscreen")}</>}</small>
        </li>;
      })}</ul>
        : <p>{t("noShotCharacters")}</p>}
      {skills.length > 0 && <p>{t("promptSkills", {skills: skills.join(" · ")})}</p>}
      </details>
      {stale && <p role="alert">{t("promptSourceChanged")}</p>}
      {(localError || error) && <p role="alert">{localError || error}</p>}
      {review.usedFirstDraft && <p role="status">{label("refinement.invalidFallback")}</p>}
      {prepared?.storyPacket?.reviewNotes?.map((note,i)=><p role="status" key={i}>{note}</p>)}
      {format==="seedance" && text && listedRefs && inspectStoryPromptDraft(text,listedRefs,shot.durationMs,reviewBase)
        .map((issue,i)=><p role="status" key={i}>{label(issue.key,{value:issue.value})}</p>)}
      <div className="story-prompt-text-heading"><label htmlFor="shot-prompt-text">{t("promptText")}</label>
        <button ref={expandButton} onClick={toggleExpanded} aria-expanded={expanded}>
          {expanded ? <Minimize2 size={16}/> : <Maximize2 size={16}/>} {label(expanded ? "shrink" : "expand")}</button></div>
      {(text || prepared) ? <textarea id="shot-prompt-text" rows={10} readOnly={!prepared || saving || stale || artDirty}
        value={text} onChange={event => {setText(event.target.value); setCopied(false);}}/> : <p>{label("emptyPrompt")}</p>}
      {prepared && text.length > prepared.maximumPromptCharacters && <p role="alert">{t("promptTooLong", {max: prepared.maximumPromptCharacters})}</p>}
      <footer className="story-actions">
        {savedText && !prepared && !stale && <button disabled={preparing} onClick={() => void prepare(false)}>{t("editSavedPrompt")}</button>}
        <button disabled={preparing || saving || artDirty || stale || needsFrame || Boolean(prepared)} onClick={() => void prepare()}>
          {preparing && <ProcessingSpinner/>}{artChanged ? label("rebuildArt") : savedText ? t("regeneratePrompt") : t("generatePrompt")}
        </button>
        <button type="button" className="story-copy" disabled={!text.trim()} onClick={async () => {
          try { await navigator.clipboard.writeText(text); setCopied(true); }
          catch { setLocalError(label("copyFailed")); }
        }}><Copy size={16}/>{label(copied ? "copied" : "copy")}</button>
        <button className="primary" disabled={!prepared || preparing || saving || artDirty || stale || !text.trim() || text.length > prepared.maximumPromptCharacters}
          onClick={() => void save()}>{t("savePrompt")}</button>
        {format==="still" && prepared && canUseImageWorkspace && <button disabled={artDirty || preparing || saving || stale || !text.trim() || text.length>prepared.maximumPromptCharacters}
          onClick={()=>void save(true)}>{label("openImage")}</button>}
      </footer>
      {format==="still" && prepared && !canUseImageWorkspace && <p>{label("externalStill")}</p>}
      </div></div>
    </div>
    <StoryPromptReviewDialog {...review}/>
    {picker && <OpeningFramePicker pending={saving} error={error} choose={jobId => void chooseFrame(jobId)} close={() => setPicker(false)}/>}
    {(leaving || blocker.state === "blocked") && <Dialog label={t("unsaved")} onClose={() => { setLeaving(false); setNewFormat(null); blocker.reset?.(); }}>
      <h2>{t("unsaved")}</h2>
      <footer className="story-actions"><button onClick={() => { setLeaving(false); setNewFormat(null); blocker.reset?.(); }}>{t("keepEditing")}</button>
        <button onClick={discard}>{t("discardDraft")}</button></footer>
    </Dialog>}
  </Dialog>;
}
