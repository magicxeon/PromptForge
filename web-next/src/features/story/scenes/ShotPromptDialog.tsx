import {useState} from "react";
import {useTranslation} from "react-i18next";
import {useBlocker} from "react-router-dom";
import {ProcessingSpinner} from "../../../lib/canonical";
import {Dialog} from "../../dub-sub/Dialog";
import {StoryCharacterIdentity} from "../characters/StoryCharacters";
import type {RunWriting} from "../data/useStoryWorkspace";
import type {CinematicProject, CinematicScene, CinematicShot} from "../../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import {prepareCinematicShotWriter, updateCinematicShotDocument} from "../../../../../web/src/features/cinematic/api/cinematicSeriesApi";

export function ShotPromptDialog({project, scene, shot, skills, run, error, close}: {
  project: CinematicProject; scene: CinematicScene; shot: CinematicShot; skills: string[];
  run: RunWriting; error: string; close: () => void;
}) {
  const {t} = useTranslation("story");
  const [text, setText] = useState(shot.videoPromptOverride?.text ?? "");
  const [savedText] = useState(text);
  const [sourceVersion] = useState(project.version);
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
  const discard = () => { if (blocker.state === "blocked") blocker.proceed(); else close(); };

  async function prepare(rebuild = true) {
    setPreparing(true);
    setLocalError("");
    try {
      const result = await prepareCinematicShotWriter(project.id, scene.id, shot.id, "story");
      if (!result.storyPrompt) throw new Error(t("promptUnavailable"));
      if (!rebuild && result.overrideStale) throw new Error(t("rebuildStalePrompt"));
      setPrepared(result);
      if (rebuild) setText(result.storyPrompt);
    } catch (cause) {
      setLocalError((cause as Error).message || t("promptUnavailable"));
    } finally {
      setPreparing(false);
    }
  }

  async function save() {
    if (!prepared || stale || saving || !text.trim() || text.length > prepared.maximumPromptCharacters) return;
    setSaving(true);
    try {
      await run(async () => {
        const update = await updateCinematicShotDocument(project.id, scene.id, shot.id, {
          expectedVersion: project.version, expectedShotVersion: shot.version,
          promptOnly: true,
          videoPromptOverride: {text: text.trim(), sourceFingerprint: prepared.sourceFingerprint}
        });
        discard();
        return update;
      });
    } finally {
      setSaving(false);
    }
  }

  return <Dialog label={t("shotPrompt")} onClose={() => { if (!saving && !preparing) text === savedText ? close() : setLeaving(true); }}>
    <div className="story-dialog story-prompt-dialog">
      <h2>{t("shotPrompt")} · {shot.title}</h2>
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
      {stale && <p role="alert">{t("promptSourceChanged")}</p>}
      {(localError || error) && <p role="alert">{localError || error}</p>}
      {(text || prepared) && <label>{t("promptText")}<textarea rows={10} readOnly={!prepared || saving || stale}
        value={text} onChange={event => setText(event.target.value)}/></label>}
      {prepared && text.length > prepared.maximumPromptCharacters && <p role="alert">{t("promptTooLong", {max: prepared.maximumPromptCharacters})}</p>}
      <footer className="story-actions">
        {savedText && !prepared && !stale && <button disabled={preparing} onClick={() => void prepare(false)}>{t("editSavedPrompt")}</button>}
        <button disabled={preparing || saving || stale || Boolean(prepared)} onClick={() => void prepare()}>
          {preparing && <ProcessingSpinner/>}{savedText ? t("regeneratePrompt") : t("generatePrompt")}
        </button>
        <button className="primary" disabled={!prepared || preparing || saving || stale || !text.trim() || text.length > prepared.maximumPromptCharacters}
          onClick={() => void save()}>{t("savePrompt")}</button>
      </footer>
    </div>
    {(leaving || blocker.state === "blocked") && <Dialog label={t("unsaved")} onClose={() => { setLeaving(false); blocker.reset?.(); }}>
      <h2>{t("unsaved")}</h2>
      <footer className="story-actions"><button onClick={() => { setLeaving(false); blocker.reset?.(); }}>{t("keepEditing")}</button>
        <button onClick={discard}>{t("discardDraft")}</button></footer>
    </Dialog>}
  </Dialog>;
}
