import { useTranslation } from "react-i18next";
import type { TimingLine } from "./dubBatchApi";
import { timeLabel, type Cue } from "./projectApi";

export function TimingReview({lines,cues,onEdit,onRequest,disabled=false,offerAnalysis=false}: {
  lines: TimingLine[]; cues:Cue[]; onEdit:(id:string,text:string)=>void; onRequest:(director:"luna"|"gemini")=>void; disabled?:boolean; offerAnalysis?:boolean;
}) {
  const {t} = useTranslation("dub");
  const manual = lines.find(line=>line.manual);
  const canRequest = manual && !["dub_scene_access_denied","dub_scene_request_limit"].includes(manual.reason ?? "");
  const actionsDisabled = disabled || lines.some(line=>line.original!==line.suggested);
  return <section aria-label={t("timed.title")}>
    <h3>{t("timed.title")}</h3>
    {offerAnalysis && !manual && <button type="button" disabled={disabled} onClick={()=>{
      if (!lines.some(l=>l.original!==l.suggested) || window.confirm(t("timed.replaceDraft"))) onRequest("gemini");
    }}>{t("timed.analyzeAI")}</button>}
    {manual && <div className="dub-timing-error"><div role="status"><strong>{t("timed.errorHeading")}</strong>
      <p>{t(`timed.reasons.${manual.reason}`,{defaultValue:t("timed.manual"),provider:manual.director==="gemini"?"Gemini":"Luna"})}</p></div>
      {canRequest && <div className="dub-timing-error-actions">
        {(manual.director==="gemini" || ["dub_luna_access","dub_luna_unavailable","dub_luna_rejected","dub_luna_quota"].includes(manual.reason ?? "")) &&
          <button type="button" disabled={actionsDisabled} onClick={()=>onRequest("luna")}>{t("timed.retryLuna")}</button>}
        {manual.director!=="gemini" && <button type="button" disabled={actionsDisabled} onClick={()=>onRequest("gemini")}>{t("timed.gemini")}</button>}
      </div>}
    </div>}
    {lines.map(line=><fieldset key={line.id} disabled={disabled}>
      <legend>{timeLabel(cues.find(c=>c.id===line.id)?.startMs ?? 0)} · {t("timed.seconds",{seconds:line.windowMs/1000})}</legend>
      {line.speechWindows && <small>{t("timed.windows",{seconds:line.speechWindows.reduce((sum,w)=>sum+w.endMs-w.startMs,0)/1000,ranges:line.speechWindows.map(w=>
        `${w.startMs/1000}–${w.endMs/1000}`).join(", ")})}</small>}
      <p>{line.original}</p>
      <label>{t("timed.spoken")}<textarea value={line.suggested} maxLength={4000}
        onChange={e=>onEdit(line.id,e.target.value)} /></label>
      <button type="button" disabled={line.original===line.suggested} onClick={()=>onEdit(line.id,line.original)}>{t("timed.keep")}</button>
    </fieldset>)}
  </section>;
}
