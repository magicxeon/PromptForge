import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ProcessingSpinner } from "../../lib/canonical";
import { Dialog } from "./Dialog";
import config from "./editorConfig";
import { requestScenePreview, timeLabel, type Cue, type Project, type ScenePreview } from "./projectApi";

type Props = {
  project: Project;
  language: string;
  locked: boolean;
  initialPreview?: ScenePreview;
  prepare: (era: string, story: string) => Promise<Project>;
  apply: (cues: Cue[], target: string, detected: string) => void;
  close: () => void;
};

export function SceneTranscription({ project, language, locked, initialPreview, prepare, apply, close }: Props) {
  const { t } = useTranslation("dub");
  const [target, setTarget] = useState(initialPreview?.target ?? language);
  const [era, setEra] = useState(project.languageStyle);
  const [story, setStory] = useState(project.storyContext);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScenePreview | undefined>(initialPreview);
  const running = useRef(false);
  const intent = useRef<{ key: string; id: string } | null>(null);

  async function send() {
    if (running.current || locked || !target) return;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      const saved = await prepare(era.trim(), story.trim());
      const key = JSON.stringify([saved.id, saved.revision, target]);
      if (intent.current?.key !== key) intent.current = { key, id: crypto.randomUUID() };
      setResult(await requestScenePreview(saved, target, intent.current.id));
    } catch (cause) {
      const code = cause && typeof cause === "object" && "code" in cause ? String(cause.code) : "";
      setError(t("scene.errors." + code, { defaultValue: t("scene.failed") }));
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  const stale = !!result && (locked || result.revision !== project.revision);
  return <Dialog label={t("scene.title")} onClose={() => { if (!running.current) close(); }}>
    <div className="dub-project-details">
      <h2>{t("scene.title")}</h2>
      {result ? <>
        <strong>{t("scene.unapplied")}</strong>
        <p>{t("scene.review", { count: result.cues.length, source: t("lang." + result.language, { defaultValue: result.language }), target: t("lang." + target) })}</p>
        <ol className="dub-scene-cues">
          {result.cues.map(cue => <li key={cue.id}>
            <small>{timeLabel(cue.startMs)} – {timeLabel(cue.endMs)}</small>
            <div lang={result.language}>{cue.text}</div>
            <div lang={target}>{cue.translations[target]}</div>
          </li>)}
        </ol>
        {project.cues.length > 0 && <p>{t("scene.replace")}</p>}
        {stale && <p role="alert">{t("scene.stale")}</p>}
      </> : <>
        <p>{t("scene.sendInfo")}</p>
        <label>{t("scene.target")}<select value={target} disabled={busy} onChange={e => setTarget(e.target.value)}>
          {project.targetLanguages.map(code => <option key={code} value={code}>{t("lang." + code)}</option>)}
        </select></label>
        <label>{t("languageStyle")}<input value={era} maxLength={config.languageStyleMaxLength}
          placeholder={t("languageStyleHint")} disabled={busy} onChange={e => setEra(e.target.value)} /></label>
        <label>{t("storyContext")}<textarea value={story} maxLength={config.storyContextMaxLength}
          placeholder={t("storyContextHint")} disabled={busy} onChange={e => setStory(e.target.value)} /></label>
      </>}
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status"><ProcessingSpinner /> {t("scene.working")}</p>}
      <footer>
        <button disabled={busy} onClick={close}>{t("cancel")}</button>
        {result ? <button disabled={stale || !result.cues.length} onClick={() => apply(result.cues, target, result.language)}>{t("scene.apply")}</button>
          : <button disabled={busy || locked || !target} onClick={() => void send()}>{t("scene.send")}</button>}
      </footer>
    </div>
  </Dialog>;
}
