import {useRef, useState, type ReactNode} from "react";
import {useTranslation} from "react-i18next";
import {ChevronRight, Files, Trash2} from "lucide-react";
import {Dialog} from "../../dub-sub/Dialog";
import {removeMergedStoryPrompt} from "../../../../../web/src/features/cinematic/api/cinematicSeriesApi";
import type {CinematicProject, CinematicScene, CinematicShot} from "../../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import type {RunWriting} from "../data/useStoryWorkspace";
import {MergedStoryPromptDialog} from "./MergedStoryPromptDialog";
import {SeedancePacingNote} from "./SeedancePacingNote";
import "./promptTranslations";

type Format = "flow" | "seedance";
type Editor = {shotIds: string[]; template: Format};

export function MergedStoryShots({project, scene, shots, run, error, defaultTemplate, shotActions, children}: {
  project: CinematicProject; scene: CinematicScene; shots: CinematicShot[]; run: RunWriting;
  error: string; defaultTemplate: Format; shotActions: ReactNode; children: ReactNode;
}) {
  const {t} = useTranslation("storyPrompt");
  const {t: story} = useTranslation("story");
  const [selection, setSelection] = useState<string[] | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [removal, setRemoval] = useState<(Editor & {version:number; title:string}) | null>(null);
  const [removing, setRemoving] = useState(false);
  const startButton = useRef<HTMLButtonElement>(null);
  const selected = shots.filter(shot => selection?.includes(shot.id));
  const seconds = selected.reduce((total, shot) => total + shot.durationMs, 0) / 1000;
  const totalSeconds = shots.reduce((total, shot) => total + shot.durationMs, 0) / 1000;

  function cancelSelection() {
    setSelection(null);
    requestAnimationFrame(() => startButton.current?.focus());
  }

  return <>
    {Boolean(scene.mergedPrompts?.length) && <section className="story-merge-saved" aria-label={t("merge.saved")}>
      <h3><Files size={18} aria-hidden/>{t("merge.saved")}</h3>
      <ul>{scene.mergedPrompts!.map(prompt => {
        const shotIds = prompt.shots.map(shot => shot.id);
        const title = prompt.shots.map(shot => shot.title).join(" · ");
        return <li key={JSON.stringify([prompt.template, shotIds])}>
          <div className="story-merge-saved-actions">
            <button className="story-merge-saved-open" type="button" onClick={() => setEditor({shotIds, template:prompt.template})}>
              <span className="story-merge-saved-copy">
                <strong>{title}</strong>
                <span className="story-merge-saved-meta">
                  <span>{t(prompt.template)}</span>
                  <small>{story("seconds", {n: (prompt.shots.at(-1)?.endMs ?? 0) / 1000})}</small>
                </span>
              </span>
              <ChevronRight size={18} aria-hidden/>
            </button>
            <button className="story-merge-saved-remove" type="button" aria-label={t("merge.remove")} title={t("merge.remove")} onClick={() => setRemoval({
              template:prompt.template, shotIds, version:project.version, title
            })}><Trash2 size={16} aria-hidden/></button>
          </div>
          {!!prompt.outdatedShotIds?.length && <small className="story-merge-saved-warning">{t("merge.changed", {shots: prompt.shots.filter(shot => prompt.outdatedShotIds.includes(shot.id)).map(shot => shot.title).join(", ")})}</small>}
        </li>;
      })}</ul>
    </section>}
    <div className="story-scene-shot-toolbar">
      <div className="story-scene-shot-count">
        <h3>{story("shotCount",{count:shots.length})}</h3>
        {shots.length>0 && <small>{story("stage.total",{seconds:totalSeconds})}</small>}
      </div>
      <div className="story-scene-shot-actions">
        {shotActions}
        {selection === null && shots.length >= 2 &&
          <button ref={startButton} type="button" onClick={() => setSelection([])}>{t("merge.select")}</button>}
      </div>
    </div>
    {selection === null ? <>
      {children}
    </> : <fieldset className="story-merge-selection">
      <legend>{t("merge.select")}</legend>
      <ol className="story-merge-options">
        {shots.map((shot, index) => <li key={shot.id}>
          <label>
            <input type="checkbox" autoFocus={index === 0} checked={selection.includes(shot.id)} onChange={event => {
              const checked = event.target.checked;
              setSelection(current => checked ? [...(current ?? []), shot.id] : (current ?? []).filter(id => id !== shot.id));
            }}/>
            <strong>{story("shotTitle", {index: index + 1, name: shot.title})}</strong>
            <span>{story("seconds", {n: shot.durationMs / 1000})}</span>
          </label>
        </li>)}
      </ol>
      {defaultTemplate === "seedance" && <SeedancePacingNote count={selected.length} seconds={seconds}/>}
      <footer className="story-actions">
        <span role="status">{t("merge.selected", {count: selected.length, seconds})}</span>
        <button className="primary" disabled={selected.length < 2} onClick={() => {
          setEditor({shotIds: selected.map(shot => shot.id), template: defaultTemplate});
        }}>{t("merge.create")}</button>
        <button onClick={cancelSelection}>{story("cancel")}</button>
      </footer>
    </fieldset>}
    {removal && <Dialog label={t("merge.remove")} onClose={() => { if (!removing) setRemoval(null); }}>
      <div className="story-dialog">
        <h2>{t("merge.remove")}</h2>
        <p>{t("merge.removeConfirm", {template:t(removal.template), shots:removal.title})}</p>
        {error && <p role="alert">{error}</p>}
        <footer className="story-actions">
          <button autoFocus disabled={removing} onClick={() => setRemoval(null)}>{story("cancel")}</button>
          <button disabled={removing} onClick={async () => {
            setRemoving(true);
            try {
              await run(async () => {
                const result = await removeMergedStoryPrompt(project.id, scene.id, removal.version, {
                  template:removal.template, shotIds:removal.shotIds
                });
                setRemoval(null);
                return result;
              });
            } finally { setRemoving(false); }
          }}>{t("merge.remove")}</button>
        </footer>
      </div>
    </Dialog>}
    {editor && <MergedStoryPromptDialog project={project} scene={scene} shotIds={editor.shotIds} initialTemplate={editor.template}
      run={run} error={error} close={() => {
        setEditor(null);
        if (selection !== null) cancelSelection();
      }}/>}
  </>;
}
