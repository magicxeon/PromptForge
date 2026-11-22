import {useRef, useState, type ReactNode} from "react";
import {useTranslation} from "react-i18next";
import type {CinematicProject, CinematicScene, CinematicShot} from "../../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import type {RunWriting} from "../data/useStoryWorkspace";
import {MergedStoryPromptDialog} from "./MergedStoryPromptDialog";
import "./promptTranslations";

type Format = "flow" | "seedance";
type Editor = {shotIds: string[]; template: Format};

export function MergedStoryShots({project, scene, shots, run, error, defaultTemplate, children}: {
  project: CinematicProject; scene: CinematicScene; shots: CinematicShot[]; run: RunWriting;
  error: string; defaultTemplate: Format; children: ReactNode;
}) {
  const {t} = useTranslation("storyPrompt");
  const {t: story} = useTranslation("story");
  const [selection, setSelection] = useState<string[] | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const startButton = useRef<HTMLButtonElement>(null);
  const selected = shots.filter(shot => selection?.includes(shot.id));
  const seconds = selected.reduce((total, shot) => total + shot.durationMs, 0) / 1000;

  function cancelSelection() {
    setSelection(null);
    requestAnimationFrame(() => startButton.current?.focus());
  }

  return <>
    {selection === null ? <>
      {shots.length >= 2 && <button ref={startButton} type="button" onClick={() => setSelection([])}>{t("merge.select")}</button>}
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
      <footer className="story-actions">
        <span role="status">{t("merge.selected", {count: selected.length, seconds})}</span>
        <button className="primary" disabled={selected.length < 2} onClick={() => {
          setEditor({shotIds: selected.map(shot => shot.id), template: defaultTemplate});
        }}>{t("merge.create")}</button>
        <button onClick={cancelSelection}>{story("cancel")}</button>
      </footer>
    </fieldset>}
    {Boolean(scene.mergedPrompts?.length) && <section className="story-merge-saved">
      <h3>{t("merge.saved")}</h3>
      <ul>{scene.mergedPrompts!.map(prompt => <li key={JSON.stringify([prompt.template, prompt.shots.map(shot => shot.id)])}>
        <button onClick={() => setEditor({shotIds: prompt.shots.map(shot => shot.id), template: prompt.template})}>
          <strong>{t(prompt.template)}</strong>
          <span>{prompt.shots.map(shot => shot.title).join(" · ")}</span>
          <small>{story("seconds", {n: (prompt.shots.at(-1)?.endMs ?? 0) / 1000})}</small>
        </button>
        {!!prompt.outdatedShotIds?.length && <small>{t("merge.changed", {shots: prompt.shots.filter(shot => prompt.outdatedShotIds.includes(shot.id)).map(shot => shot.title).join(", ")})}</small>}
      </li>)}</ul>
    </section>}
    {editor && <MergedStoryPromptDialog project={project} scene={scene} shotIds={editor.shotIds} initialTemplate={editor.template}
      run={run} error={error} close={() => {
        setEditor(null);
        if (selection !== null) cancelSelection();
      }}/>}
  </>;
}
