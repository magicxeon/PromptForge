import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ProcessingSpinner, StatusNotice, useActor } from "../../lib/canonical";
import { dubbingReadiness, loadDubbingChoices } from "./dubbingCharacters";
import { SceneProgress } from "./SceneProgress";
import { Dialog } from "./Dialog";
import config from "./editorConfig";
import { requestScenePreview, timeLabel, type Cue, type Project, type ScenePreview, type SceneRange } from "./projectApi";

function subtitleGaps(cues: Cue[], durationMs: number) {
  const gaps: SceneRange[] = [];
  let cursor = 0;
  for (const cue of [...cues].sort((a, b) => a.startMs - b.startMs)) {
    if (cursor < cue.startMs) gaps.push({startMs: cursor, endMs: cue.startMs});
    cursor = Math.max(cursor, cue.endMs);
  }
  if (cursor < durationMs) gaps.push({startMs: cursor, endMs: durationMs});
  return gaps;
}

function rangeLabel(range: SceneRange) {
  return timeLabel(range.startMs) + " – " + timeLabel(range.endMs);
}

type Props = {
  project: Project;
  playheadMs: number;
  language: string;
  locked: boolean;
  initialPreview?: ScenePreview;
  prepare: (era: string, story: string) => Promise<Project>;
  apply: (preview: ScenePreview) => void;
  repair: (cue: Cue, target: string, action: "edit" | "translate") => void;
  close: () => void;
};

export function SceneTranscription({ project, playheadMs, language, locked, initialPreview, prepare, apply, repair, close }: Props) {
  const { t } = useTranslation("dub");
  const [target, setTarget] = useState(initialPreview?.target ?? language);
  const gaps = useMemo(() => subtitleGaps(project.cues, project.durationMs ?? 0), [project.cues, project.durationMs]);
  const [scope, setScope] = useState<"auto" | "whole" | "gap">(project.cues.length ? "auto" : "whole");
  const [gapStart, setGapStart] = useState(() =>
    (gaps.find(gap => gap.startMs <= playheadMs && playheadMs < gap.endMs) ?? gaps[0])?.startMs);
  const range = scope === "gap" ? gaps.find(gap => gap.startMs === gapStart) : undefined;
  const [era, setEra] = useState(project.languageStyle);
  const [story, setStory] = useState(project.storyContext);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{code: string; limit?: number; retryable: boolean}>();
  const [result, setResult] = useState<ScenePreview | undefined>(initialPreview);
  const { identityScope } = useActor();
  const choices = useQuery({
    queryKey: ["dub-speaker-choices", identityScope, target],
    queryFn: () => loadDubbingChoices(target),
    enabled: scope === "auto" && !result,
  });
  const issues = useMemo(() => scope === "auto" && choices.data
    ? dubbingReadiness(project, target, choices.data).issues : [], [scope, choices.data, project, target]);
  const running = useRef(false);
  const intent = useRef<{ key: string; id: string; revision: number } | null>(null);
  const [requestId, setRequestId] = useState("");
  const staleRetry = !!error?.retryable && intent.current?.revision !== project.revision;
  const blocked = locked || staleRetry || error?.code === "dub_scene_outcome_unknown" || (scope === "gap" && !range);
  const fieldsDisabled = busy || !!error?.retryable || error?.code === "dub_scene_outcome_unknown";

  async function send() {
    if (scope === "auto" || running.current || blocked || !target) return;
    running.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const saved = error?.retryable ? project : await prepare(era.trim(), story.trim());
      const key = JSON.stringify([saved.id, saved.revision, target, range]);
      if (intent.current?.key !== key || error?.retryable) {
        intent.current = { key, id: crypto.randomUUID(), revision: saved.revision };
      }
      setRequestId(intent.current.id);
      setResult(await requestScenePreview(saved, target, intent.current.id, range));
    } catch (cause) {
      const code = cause && typeof cause === "object" && "code" in cause ? String(cause.code) : "";
      const details = cause && typeof cause === "object" && "details" in cause ? cause.details : null;
      const limit = details && typeof details === "object" && "revisionLimit" in details ? details.revisionLimit : null;
      const retryable = !!details && typeof details === "object" && "retryable" in details && details.retryable === true;
      setError({code, limit: typeof limit === "number" ? limit : undefined, retryable});
    } finally {
      running.current = false;
      setRequestId("");
      setBusy(false);
    }
  }

  const reviewedRange = result?.range;
  const stale = !!result && (locked || result.revision !== project.revision ||
    (reviewedRange && !gaps.some(gap => gap.startMs <= reviewedRange.startMs && reviewedRange.endMs <= gap.endMs)));
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
            <label>{t("speaker")}
              <input value={cue.speaker ?? ""} placeholder={t("scene.unidentified")} maxLength={120} disabled={stale}
                onChange={event => {
                  const speaker = event.target.value;
                  setResult({ ...result, cues: result.cues.map(row => row.id === cue.id ? { ...row, speaker } : row) });
                }} />
            </label>
          </li>)}
        </ol>
        {reviewedRange ? <p>{t("scene.gapReview", { range: rangeLabel(reviewedRange) })}</p>
          : project.cues.length > 0 && <p>{t("scene.replace")}</p>}
        {stale && <StatusNotice tone="warning" title={t("scene.warningHeading")}>{t("scene.stale")}</StatusNotice>}
      </> : <>
        {project.cues.length > 0 && <label>{t("scene.scope")}
          <select value={scope} disabled={fieldsDisabled} onChange={e => {
            setScope(e.target.value as typeof scope);
            setError(undefined);
          }}>
            <option value="auto">{t("scene.auto")}</option>
            <option value="gap">{t("scene.gap")}</option>
            <option value="whole">{t("scene.whole")}</option>
          </select>
        </label>}
        {scope === "gap" && (gaps.length > 0 ? <label>{t("scene.selectGap")}
          <select value={gapStart ?? ""} disabled={fieldsDisabled} onChange={e => {
            setGapStart(Number(e.target.value));
            setError(undefined);
          }}>
            {gaps.map(gap => <option key={gap.startMs} value={gap.startMs}>{rangeLabel(gap)}</option>)}
          </select>
        </label> : <p role="status">{t("scene.noGap")}</p>)}
        {scope !== "auto" && <p>{t(scope === "gap" ? "scene.gapSendInfo" : "scene.sendInfo")}</p>}
        <label>{t("scene.target")}<select value={target} disabled={fieldsDisabled} onChange={e => setTarget(e.target.value)}>
          {project.targetLanguages.map(code => <option key={code} value={code}>{t("lang." + code)}</option>)}
        </select></label>
        {scope === "auto" ? choices.isError ? <StatusNotice tone="error" title={t("scene.checkFailed")}>
          <button onClick={() => void choices.refetch()}>{t("casting.retry")}</button>
        </StatusNotice> : !choices.data ? <p role="status"><ProcessingSpinner /> {t("scene.checkingInputs")}</p>
          : issues.length ? <>
            <strong>{t("scene.issueCount", {count:issues.length})}</strong>
            <ol className="dub-scene-cues">{issues.map(({cue, needsScript, needsVoice}) => <li key={cue.id}>
              <small>{rangeLabel(cue)}</small>
              <div>{cue.translations[target] || cue.text}</div>
              <p>{[needsScript && t("scene.needsScript"), needsVoice && t("scene.needsVoice")].filter(Boolean).join(" · ")}</p>
              {needsScript && !cue.translations[target]?.trim() && cue.voiceBindings[target]?.dubText == null && cue.text.trim() &&
                <button disabled={locked} onClick={() => repair(cue,target,"translate")}>{t("translateCue")}</button>}
              <button disabled={locked} onClick={() => repair(cue,target,"edit")}>{t("scene.fixLine")}</button>
            </li>)}</ol>
          </> : <p role="status">{t("scene.inputsReady")}</p> : <><label>{t("languageStyle")}<input value={era} maxLength={config.languageStyleMaxLength}
          placeholder={t("languageStyleHint")} disabled={fieldsDisabled} onChange={e => setEra(e.target.value)} /></label>
        <label>{t("storyContext")}<textarea value={story} maxLength={config.storyContextMaxLength}
          placeholder={t("storyContextHint")} disabled={fieldsDisabled} onChange={e => setStory(e.target.value)} /></label></>}
      </>}
      {error && <StatusNotice tone={error.code === "dub_scene_request_limit" ? "warning" : "error"}
        title={t(error.code === "dub_scene_request_limit" ? "scene.warningHeading" : "scene.errorHeading")}>
        {error.limit ? t("scene.revisionLimit", { limit: error.limit }) : t("scene.errors." + error.code, { defaultValue: t("scene.failed") })}
        {error.retryable && <p>{t(staleRetry ? "scene.stale" : "scene.retryInfo")}</p>}
      </StatusNotice>}
      {busy && <SceneProgress projectId={project.id} requestId={requestId} />}
      <footer>
        <button disabled={busy} onClick={close}>{t("cancel")}</button>
        {result ? <button disabled={stale || !result.cues.length} onClick={() => apply(result)}>{t(reviewedRange ? "scene.addGap" : "scene.apply")}</button>
          : scope !== "auto" && <button disabled={busy || blocked || !target} onClick={() => void send()}>{t(error?.retryable ? "scene.retry" : "scene.send")}</button>}
      </footer>
    </div>
  </Dialog>;
}
