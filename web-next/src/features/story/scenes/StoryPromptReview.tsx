import {useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {PenLine} from "lucide-react";
import {Dialog} from "../../dub-sub/Dialog";
import {CinematicWritingCancelled} from "../../../../../web/src/features/cinematic/api/cinematicWritingBilling";

type Stage = "writing" | "refining" | "recovery";

export function useStoryPromptReview<T>() {
  const [stage,setStage] = useState<Stage>();
  const [reason,setReason] = useState("");
  const [usedFirstDraft,setUsedFirstDraft] = useState(false);
  const recovery = useRef<{retry:()=>Promise<void>; useDraft:()=>void} | null>(null);
  const locked = useRef(false);

  async function build(write:()=>Promise<T>, refine:(draft:T)=>Promise<T>, accept:(result:T)=>void) {
    if (locked.current || recovery.current) return;
    locked.current = true;
    setUsedFirstDraft(false);
    setStage("writing");
    let draft:T;
    try {
      draft = await write();
    } catch (error) {
      locked.current = false;
      setStage(undefined);
      throw error;
    }
    function finish(result:T) {
      recovery.current = null;
      setStage(undefined);
      accept(result);
    }
    async function review() {
      setStage("refining");
      try {
        const result = await refine(draft);
        finish(result);
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "cinematic_prompt_refinement_invalid") {
          setUsedFirstDraft(true);
          finish(draft);
        } else {
          setReason(error instanceof Error && !(error instanceof CinematicWritingCancelled) ? error.message : "");
          setStage("recovery");
        }
      } finally {
        locked.current = false;
      }
    }
    recovery.current = {retry:review,useDraft:()=>finish(draft)};
    await review();
  }
  function retry() {
    if (locked.current || !recovery.current) return;
    locked.current = true;
    void recovery.current.retry();
  }
  return {stage,reason,usedFirstDraft,build,retry,useDraft:()=>{if (!locked.current) recovery.current?.useDraft();}};
}

export function StoryPromptReviewDialog({stage,reason,retry,useDraft}:{
  stage?:Stage; reason:string; retry:()=>void; useDraft:()=>void;
}) {
  const {t} = useTranslation("storyPrompt");
  if (!stage) return null;
  const title = t("refinement."+stage);
  return <Dialog label={title} onClose={()=>{if (stage === "recovery") useDraft();}}>
    <div className="story-writing-progress">
      {stage === "recovery" ? <>
        <strong>{title}</strong>
        {reason && <p role="alert">{reason}</p>}
        <footer className="story-actions">
          <button onClick={useDraft}>{t("refinement.useDraft")}</button>
          <button className="primary" onClick={retry}>{t("refinement.retry")}</button>
        </footer>
      </> : <div role="status" className="story-writing-progress">
        <PenLine className="story-writing-pen" aria-hidden="true"/><p>{title}</p>
      </div>}
    </div>
  </Dialog>;
}
