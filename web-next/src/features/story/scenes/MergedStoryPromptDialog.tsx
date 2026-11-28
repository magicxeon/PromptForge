import {StoryWarnings} from "../StoryWarnings";
import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {StoryAppliedSkills,StoryRunSkillPicker,useTakeStoryRunSkills} from "../StoryRunSkills";
import {useBlocker} from "react-router-dom";
import {Maximize2,Minimize2,X} from "lucide-react";
import {formatStoryPromptWholeSeconds, inspectStoryPromptDraft, mergedSequenceClock, normalizeMergedStoryReferences} from "../../../../../server/domain/cinematic/StoryPromptFormatting.js";
import {ProcessingSpinner, useActor} from "../../../lib/canonical";
import {PromptReferenceImage,usePromptReferenceImages} from "./PromptReferenceImage";
import {Dialog} from "../../dub-sub/Dialog";
import {storyKeys} from "../data/storyQueryKeys";
import type {RunWriting} from "../data/useStoryWorkspace";
import type {CinematicProject, CinematicScene} from "../../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import {buildMergedStoryPrompt, saveMergedStoryPrompt} from "../../../../../web/src/features/cinematic/api/cinematicSeriesApi";
import {approveCinematicStoryboardSource, getCinematicProject} from "../../../../../web/src/features/cinematic/api/cinematicApi";
import {CinematicWritingCancelled} from "../../../../../web/src/features/cinematic/api/cinematicWritingBilling";
import {OpeningFramePicker} from "./OpeningFramePicker";
import {SeedancePacingNote} from "./SeedancePacingNote";
import {StoryPromptReviewDialog,useStoryPromptReview} from "./StoryPromptReview";
import "./promptTranslations";
import "./storyPrompt.css";

type Format = "flow" | "seedance";
type Packet = Awaited<ReturnType<typeof buildMergedStoryPrompt>>;
function displayPrompt(packet?: Pick<Packet,"text"|"shots"|"template">) {
  if (!packet) return "";
  const normalized = normalizeMergedStoryReferences(packet.text);
  return packet.template === "seedance" && mergedSequenceClock(packet.shots).precise
    ? normalized : formatStoryPromptWholeSeconds(normalized);
}

export function MergedStoryPromptDialog({project, scene, shotIds, initialTemplate, run, error, close}: {
  project: CinematicProject; scene: CinematicScene; shotIds: string[]; initialTemplate: Format;
  run: RunWriting; error: string; close: () => void;
}) {
  const {t,i18n} = useTranslation("storyPrompt");
  const takeSkills = useTakeStoryRunSkills("shots");
  const {t: story} = useTranslation("story");
  const {identityScope} = useActor();
  const [template, setTemplate] = useState(initialTemplate);
  const saved = scene.mergedPrompts?.find(prompt => prompt.template === template && prompt.shots.length === shotIds.length
    && prompt.shots.every(shot => shotIds.includes(shot.id)));
  const review = useQuery({queryKey: storyKeys.project(identityScope, project.id), queryFn: () => getCinematicProject(project.id),
    enabled: Boolean(saved), refetchOnMount: "always", refetchOnWindowFocus: false});
  const [built, setBuilt] = useState<Packet>();
  const [edit, setEdit] = useState<string>();
  const [expanded,setExpanded] = useState(false);
  const [baseText, setBaseText] = useState<string | null>();
  const [saveConflict, setSaveConflict] = useState(false);
  const [operation, setOperation] = useState<"build" | "frame" | "save">();
  const promptReview = useStoryPromptReview<Packet>();
  const [picker, setPicker] = useState(false);
  const [copyState, setCopyState] = useState<"copied" | "copyFailed">();
  const [failedBuild, setFailedBuild] = useState(false);
  const [showError, setShowError] = useState(false);
  const [discardAction, setDiscardAction] = useState<(() => void) | null>(null);
  const packet = built ?? saved;
  const referenceImages = usePromptReferenceImages(packet?.references);
  const savedDisplayText = saved && displayPrompt(saved);
  const text = edit ?? displayPrompt(packet);
  const limit = packet?.maximumPromptCharacters;
  const excess = limit === undefined ? 0 : Math.max(0, text.length - limit);
  const dirty = Boolean(packet && (text !== savedDisplayText || packet.sourceFingerprint !== saved?.sourceFingerprint));
  const blocker = useBlocker(dirty || Boolean(operation) || Boolean(promptReview.stage));
  const selected = scene.shots.filter(shot => shotIds.includes(shot.id)).sort((a, b) => a.orderKey - b.orderKey);
  let duration = 0;
  const timeline = packet?.shots ?? selected.map(shot => {
    const startMs = duration;
    duration += shot.durationMs;
    return {id: shot.id, title: shot.title, startMs, endMs: duration};
  });
  const totalMs = timeline.at(-1)?.endMs ?? 0;
  const clockSeconds = template === "seedance" ? mergedSequenceClock(timeline).seconds : (ms:number) => ms / 1000;
  const issues = template === "seedance" && packet ? inspectStoryPromptDraft(text,packet.references,totalMs,displayPrompt(packet)) : [];
  const clockIssues = issues.filter(issue => issue.key === "reviewClock");
  const otherIssues = issues.filter(issue => issue.key !== "reviewClock");
  const first = selected[0];
  const missing = selected.length !== shotIds.length;
  const needsFrame = template === "flow" && !first?.approvedStoryboardSource;
  const outdated = packet?.shots.filter(shot => !selected.some(current => current.id === shot.id)
    || (built && selected.find(current => current.id === shot.id)?.version !== shot.version)
    || (packet.sourceFingerprint === saved?.sourceFingerprint && saved.outdatedShotIds.includes(shot.id))) ?? [];
  const checking = Boolean(saved && review.isFetching);
  const reviewError = saved && review.isError;
  const busy = Boolean(operation) || Boolean(promptReview.stage);
  const changedElsewhere = saveConflict || (baseText !== undefined && baseText !== (saved?.text ?? null));

  function confirmDiscard(action: () => void, confirm = dirty) {
    if (busy) return;
    if (confirm) setDiscardAction(() => action);
    else action();
  }
  function changeTemplate(next: Format) {
    setTemplate(next);
    setBuilt(undefined);
    setEdit(undefined);
    setBaseText(undefined);
    setSaveConflict(false);
    setFailedBuild(false);
    setShowError(false);
    setCopyState(undefined);
  }
  async function build() {
    if (busy || missing || needsFrame) return;
    setOperation("build");
    setShowError(true);
    setFailedBuild(false);
    setCopyState(undefined);
    try {
      await run(async () => {
        try {
          const skillIdsOverride = takeSkills();
          const write = (draft?:string) => buildMergedStoryPrompt(project.id, scene.id, selected.map(shot => shot.id), project.version, template,
            i18n.language.startsWith("th") ? "th" : "en", draft,skillIdsOverride);
          await promptReview.build(()=>write(), result=>write(result.text), result=>{
            setBaseText(previous => previous === undefined ? saved?.text ?? null : previous);
            setBuilt(result);
            setEdit(undefined);
          });
        } catch (cause) {
          if (!(cause instanceof CinematicWritingCancelled)) setFailedBuild(true);
          const failure = cause as {code?:string; details?:{names?:unknown}};
          if (failure?.code === "cinematic_character_reference_required" && Array.isArray(failure.details?.names))
            throw new Error(t("missingCharacters",{names:failure.details.names.join(", ")}));
          throw cause;
        }
      });
    } finally { setOperation(undefined); }
  }
  async function save() {
    if (busy || !packet || !text.trim() || excess || outdated.length || missing || checking || reviewError || changedElsewhere) return;
    setOperation("save");
    setShowError(true);
    try {
      await run(async () => {
        try {
          const result = await saveMergedStoryPrompt(project.id, scene.id, project.version, {
            shotIds: packet.shots.map(shot => shot.id), template, text, sourceFingerprint: packet.sourceFingerprint,
            provenance:packet.provenance,expectedSavedText: baseText === undefined ? saved?.text ?? null : baseText
          });
          close();
          return result;
        } catch (cause) {
          if ((cause as {code?: string})?.code === "cinematic_merged_prompt_changed") setSaveConflict(true);
          throw cause;
        }
      });
    } finally { setOperation(undefined); }
  }
  async function chooseFrame(jobId: string) {
    if (busy || !first) return;
    setOperation("frame");
    setShowError(true);
    try {
      await run(async () => {
        await approveCinematicStoryboardSource(project.id, first.id, {expectedVersion: project.version,
          expectedShotVersion: first.version, idempotencyKey: crypto.randomUUID(), jobId});
        const updated = await getCinematicProject(project.id);
        setPicker(false);
        return {project: updated};
      });
    } finally { setOperation(undefined); }
  }
  function keepEditing() {
    setDiscardAction(null);
    blocker.reset?.();
  }
  const referenceList = !!packet?.references.length && <ol className="story-prompt-references">{packet.references.map(ref =>
    <li key={ref.number} value={ref.number}><PromptReferenceImage src={ref.imageUrl} name={ref.name} report={referenceImages.report}/>{t(ref.role)} · {ref.name}</li>
  )}</ol>;
  function promptEditor(id:string) {
    return <textarea id={id} rows={10} value={text} readOnly={busy || !!outdated.length || missing || changedElsewhere}
      aria-invalid={excess > 0 || undefined} aria-describedby={excess ? id+"-limit" : undefined}
      onChange={event=>{
        if (baseText === undefined) setBaseText(saved?.text ?? null);
        setEdit(event.target.value);
        setCopyState(undefined);
      }}/>;
  }
  const copyButton = <button disabled={referenceImages.pending || !text.trim() || !!packet?.missingCharacters?.length || !!outdated.length} onClick={async () => {
    try { await navigator.clipboard.writeText(text); setCopyState("copied"); }
    catch { setCopyState("copyFailed"); }
  }}>{t(copyState === "copied" ? "copied" : "copy")}</button>;
  return <Dialog label={t("merge.title")} onClose={() => confirmDiscard(close)}>
    <div className="story-dialog story-merged-dialog">
      <header className="story-prompt-heading"><h2>{t("merge.title")}</h2>
        <button type="button" disabled={busy} aria-label={story("close")} onClick={() => confirmDiscard(close)}><X size={20} aria-hidden/></button>
      </header>
      <div className="story-prompt-formats" role="group" aria-label={t("destination")}>
        {(["flow", "seedance"] as const).map(format => <button key={format} aria-pressed={template === format} disabled={busy}
          onClick={() => {if (format !== template) confirmDiscard(() => changeTemplate(format));}}>{t(format)}</button>)}
      </div>
      <StoryRunSkillPicker task="shots"/>
      <StoryAppliedSkills trace={packet?.provenance ?? saved?.provenance}/>
      <section className="story-merge-schedule">
        <header><h3>{t("merge.timeline")}</h3>
          <span>{story("seconds", {n: clockSeconds(totalMs)})}</span></header>
        {totalMs > 0 && <div className="story-merge-track" aria-hidden="true">{timeline.map(shot =>
          <span key={shot.id} style={{flexGrow: shot.endMs - shot.startMs}}/>)}</div>}
        <ol className="story-merge-timeline">{timeline.map((shot,index) => <li key={shot.id}>
          <span aria-hidden="true">{index + 1}</span><strong>{shot.title}</strong>
          <time>{t("merge.range", {start: clockSeconds(shot.startMs), end: clockSeconds(shot.endMs)})}</time>
        </li>)}</ol>
      </section>
      {template === "seedance" && <SeedancePacingNote count={timeline.length} seconds={totalMs / 1000}/>}
      {needsFrame && !missing && <div><p>{t("merge.needFrame", {name: first.title})}</p>
        <button disabled={busy} onClick={() => setPicker(true)}>{t("chooseFrame")}</button></div>}
      {changedElsewhere && <p role="alert">{t("merge.saveConflict")}</p>}
      {missing && <p role="alert">{t("merge.missing")}</p>}
      {!!packet?.missingCharacters?.length && <p role="alert">{t("missingCharacters",{names:packet.missingCharacters.join(", ")})}</p>}
      <StoryWarnings messages={[outdated.length > 0 && t("merge.changed", {shots: outdated.map(shot => shot.title).join(", ")}),
        promptReview.usedFirstDraft && t("refinement.invalidFallback"), ...(packet?.reviewNotes ?? [])]}/>
      {clockIssues.length > 0 && <details className="story-merge-clock-review">
        <summary>{t("merge.clockReview", {count:clockIssues.length})}</summary>
        <ul>{clockIssues.map((issue,index) => <li key={index}>
          {issue.shotNumber && <strong>{t("merge.shotNumber",{n:issue.shotNumber})} · </strong>}
          {t(issue.key,{value:issue.value})}
        </li>)}</ul>
      </details>}
      {otherIssues.map((issue,i)=><p role="status" key={i}>{t(issue.key,{value:issue.value})}</p>)}
      {referenceList && <section><h3>{t("attachments")}</h3>{referenceList}</section>}
      {packet && <section>
        <div className="story-prompt-text-heading"><label htmlFor="merge-text">{story("promptText")}</label>
          <button type="button" aria-haspopup="dialog" onClick={()=>setExpanded(true)}><Maximize2 size={16}/>{t("expand")}</button></div>
        {promptEditor("merge-text")}
      </section>}
      {excess > 0 && <p id="merge-text-limit" role="status">{t("merge.tooLong", {length:text.length, limit, excess})}</p>}
      {operation && operation !== "build" && <p className="story-merged-progress" role="status">
        <ProcessingSpinner/>
        {t("merge." + operation + "Busy")}
      </p>}
      {reviewError && <p role="alert">{review.error.message} <button disabled={busy || checking} onClick={() => void review.refetch()}>{t("retry")}</button></p>}
      {showError && error && !changedElsewhere && <p role="alert">{error}</p>}
      {copyState === "copyFailed" && <p role="status">{t(copyState)}</p>}
      <footer className="story-actions">
        <button className={packet ? undefined : "primary"} disabled={busy || missing || needsFrame || checking || changedElsewhere}
          onClick={() => confirmDiscard(() => void build(), edit !== undefined && edit !== packet?.text)}>
          {failedBuild ? t("retry") : t(packet ? "merge.rebuild" : "merge.create")}
        </button>
        {packet && <>
          {copyButton}
          <button className="primary" disabled={referenceImages.pending || busy || !text.trim() || excess > 0 || !!outdated.length || missing || checking || !!reviewError || changedElsewhere || !dirty}
            onClick={() => void save()}>{story("savePrompt")}</button>
        </>}
      </footer>
    </div>
    <StoryPromptReviewDialog {...promptReview}/>
    {expanded && <Dialog label={t("expand")} onClose={()=>setExpanded(false)}>
      <section className="story-merge-focus">
        <header className="story-prompt-text-heading"><label htmlFor="merge-expanded">{story("promptText")}</label>
          {copyButton}<button type="button" onClick={()=>setExpanded(false)}><Minimize2 size={16}/>{t("shrink")}</button></header>
        <div className="story-merge-focus-body">{promptEditor("merge-expanded")}
          {referenceList && <aside className="story-ref-pane"><h3>{t("attachments")}</h3>{referenceList}</aside>}</div>
        {excess > 0 && <p id="merge-expanded-limit" role="status">{t("merge.tooLong",{length:text.length,limit,excess})}</p>}
        {copyState === "copyFailed" && <p role="status">{t(copyState)}</p>}
      </section>
    </Dialog>}
    {picker && <OpeningFramePicker pending={busy} error={showError ? error : ""} choose={id => void chooseFrame(id)} close={() => setPicker(false)}/>}
    {(discardAction || blocker.state === "blocked") && <Dialog label={story("unsaved")} onClose={keepEditing}>
      <h2>{busy ? story("processing") : story("unsaved")}</h2>
      <footer className="story-actions"><button onClick={keepEditing}>{story("keepEditing")}</button>
        <button disabled={busy} onClick={() => {
          if (blocker.state === "blocked") blocker.proceed();
          else { setDiscardAction(null); discardAction?.(); }
        }}>{story("discardDraft")}</button></footer>
    </Dialog>}
  </Dialog>;
}
