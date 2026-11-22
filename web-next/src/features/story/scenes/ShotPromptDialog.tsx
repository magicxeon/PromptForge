import {useState} from "react";
import {X} from "lucide-react";
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
import {outputStorageKey} from "../../playground/state/imageDraft";
import "./promptTranslations";
import "./storyPrompt.css";

type Format = "still" | "flow" | "seedance" | "legacy";

export function ShotPromptDialog({project, scene, shot, skills, run, error, close}: {
  project: CinematicProject; scene: CinematicScene; shot: CinematicShot; skills: string[];
  run: RunWriting; error: string; close: () => void;
}) {
  const {t} = useTranslation("story");
  const {t: label} = useTranslation("storyPrompt");
  const navigate = useNavigate();
  const {identityScope} = useActor();
  const [format, setFormat] = useState<Format>(shot.videoPromptOverride && !shot.storyPromptVariants ? "legacy" :
    project.writingSettings?.direction?.destination === "flow" ? "flow" : "seedance");
  const saved = format === "legacy" ? shot.videoPromptOverride : shot.storyPromptVariants?.[format];
  const savedText = saved?.text || "";
  const [text, setText] = useState(savedText);
  const [sourceVersion, setSourceVersion] = useState(project.version);
  const [newFormat, setNewFormat] = useState<Format | null>(null);
  const [picker, setPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [prepared, setPrepared] = useState<Awaited<ReturnType<typeof prepareCinematicShotWriter>>>();
  const [preparing, setPreparing] = useState(false);
  const [localError, setLocalError] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const blocker = useBlocker(text !== savedText);
  const castIds = shot.speakerBindings?.map(binding => binding.castAssignmentId)
    ?? (shot.castMode === "none" || scene.castMode === "none" ? []
      : shot.castMode === "inherit" || (shot.castMode !== "selected" && !shot.castAssignmentIds.length)
        ? scene.castAssignmentIds : shot.castAssignmentIds);
  const members = project.castAssignments.filter(person => person.active !== false && castIds.includes(person.id));
  const stale = project.version !== sourceVersion;
  const needsFrame = format === "flow" && !shot.approvedStoryboardSource;
  const frameReferences = prepared?.storyPacket?.references ?? [];
  const canUseImageWorkspace = frameReferences.filter(ref=>ref.role==="character").length <= 1;
  function selectFormat(next: Format) {
    setFormat(next);
    setText((next === "legacy" ? shot.videoPromptOverride : shot.storyPromptVariants?.[next])?.text || "");
    setPrepared(undefined); setCopied(false); setLocalError(""); setNewFormat(null); setLeaving(false);
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
    setPreparing(true);
    setLocalError("");
    try {
      const result = rebuild
        ? await buildCinematicStoryPrompt(project.id,scene.id,shot.id,project.version,format)
        : await prepareCinematicShotWriter(project.id, scene.id, shot.id, "story", format === "legacy" ? undefined : format);
      const packet = result.storyPacket;
      const draft = format === "legacy" ? result.storyPrompt : packet?.text;
      if (!draft) throw new Error(t("promptUnavailable"));
      if (packet && !packet.ready) throw new Error(label("needFrame"));
      if (!rebuild && (packet ? saved?.sourceFingerprint !== packet.sourceFingerprint : result.overrideStale)) throw new Error(t("rebuildStalePrompt"));
      setPrepared(result);
      if (rebuild) setText(draft);
    } catch (cause) {
      if (!(cause instanceof CinematicWritingCancelled)) setLocalError((cause as Error).message || t("promptUnavailable"));
    } finally {
      setPreparing(false);
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
    if (text !== savedText) setLeaving(true);
    else close();
  }

  return <Dialog label={t("shotPrompt")} onClose={requestClose}>
    <div className="story-dialog story-prompt-dialog">
      <header className="story-prompt-heading">
        <h2>{t("shotPrompt")} · {shot.title}</h2>
        <button type="button" aria-label={t("close")} title={t("close")} disabled={saving || preparing} onClick={requestClose}>
          <X size={20} aria-hidden="true"/>
        </button>
      </header>
      <div className="story-prompt-formats" role="group" aria-label={label("destination")}>
        {(["still","flow","seedance",...(shot.videoPromptOverride ? ["legacy"] : [])] as Format[])
          .map(id => <button key={id} disabled={saving || preparing} aria-pressed={format===id}
            onClick={() => { if (id !== format) requestFormat(id); }}>{label(id)}</button>)}
      </div>
      {needsFrame && <p>{label("needFrame")} <button onClick={() => requestFormat("still")}>{label("prepareFrame")}</button></p>}
      {(format === "flow" || format === "seedance") && <button disabled={saving || preparing || text!==savedText || stale}
        onClick={() => setPicker(true)}>{label(shot.approvedStoryboardSource ? "replaceFrame" : "chooseFrame")}</button>}
      <h3>{t("characters")}</h3>
      {members.length ? <ul className="story-character-list">{members.map((person, index) => {
        const offscreen = shot.speakerBindings?.find(binding => binding.castAssignmentId === person.id)?.visible === false;
        return <li key={person.id}>
          <StoryCharacterIdentity person={person} showPhoto={!offscreen}/>
          <small>{t("promptCharacterNumber", {number: index + 1})}{offscreen && <> · {t("promptOffscreen")}</>}</small>
        </li>;
      })}</ul>
        : <p>{t("noShotCharacters")}</p>}
      {skills.length > 0 && <p>{t("promptSkills", {skills: skills.join(" · ")})}</p>}
      {!!prepared?.storyPacket?.references.length && <section><h3>{label("attachments")}</h3>
        <ol className="story-prompt-references">{prepared.storyPacket.references.map(ref => <li key={ref.number}>
          <MediaImage src={ref.imageUrl} alt=""/>{label(ref.role)} · {ref.name}</li>)}</ol></section>}
      {stale && <p role="alert">{t("promptSourceChanged")}</p>}
      {(localError || error) && <p role="alert">{localError || error}</p>}
      {(text || prepared) && <label>{t("promptText")}<textarea rows={10} readOnly={!prepared || saving || stale}
        value={text} onChange={event => {setText(event.target.value); setCopied(false);}}/></label>}
      {prepared && text.length > prepared.maximumPromptCharacters && <p role="alert">{t("promptTooLong", {max: prepared.maximumPromptCharacters})}</p>}
      <footer className="story-actions">
        {savedText && !prepared && !stale && <button disabled={preparing} onClick={() => void prepare(false)}>{t("editSavedPrompt")}</button>}
        <button disabled={preparing || saving || stale || needsFrame || Boolean(prepared)} onClick={() => void prepare()}>
          {preparing && <ProcessingSpinner/>}{savedText ? t("regeneratePrompt") : t("generatePrompt")}
        </button>
        {text && <button disabled={!prepared || stale || needsFrame} onClick={async () => {
          try { await navigator.clipboard.writeText(text); setCopied(true); }
          catch { setLocalError(label("copyFailed")); }
        }}>{label(copied ? "copied" : "copy")}</button>}
        <button className="primary" disabled={!prepared || preparing || saving || stale || !text.trim() || text.length > prepared.maximumPromptCharacters}
          onClick={() => void save()}>{t("savePrompt")}</button>
        {format==="still" && prepared && canUseImageWorkspace && <button disabled={preparing || saving || stale || !text.trim() || text.length>prepared.maximumPromptCharacters}
          onClick={()=>void save(true)}>{label("openImage")}</button>}
      </footer>
      {format==="still" && prepared && !canUseImageWorkspace && <p>{label("externalStill")}</p>}
    </div>
    {picker && <OpeningFramePicker pending={saving} error={error} choose={jobId => void chooseFrame(jobId)} close={() => setPicker(false)}/>}
    {(leaving || blocker.state === "blocked") && <Dialog label={t("unsaved")} onClose={() => { setLeaving(false); setNewFormat(null); blocker.reset?.(); }}>
      <h2>{t("unsaved")}</h2>
      <footer className="story-actions"><button onClick={() => { setLeaving(false); setNewFormat(null); blocker.reset?.(); }}>{t("keepEditing")}</button>
        <button onClick={discard}>{t("discardDraft")}</button></footer>
    </Dialog>}
  </Dialog>;
}
