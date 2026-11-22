import { useTranslation } from "react-i18next";
import {SceneDirectionSummary} from "./SceneDirectionSummary";
import type { CinematicScene,CinematicSceneProposal } from "../../../../../web/src/features/cinematic/schemas/cinematicSchemas";

export type SourceRange = {start:number; origins:number[]};

export function initialRanges(proposal:CinematicSceneProposal, paragraphCount:number):SourceRange[] {
  if (paragraphCount < proposal.scenes.length) return [];
  return proposal.scenes.map((scene,index)=>({
    start:scene.sourceStartParagraph ?? 1+Math.floor(index*paragraphCount/proposal.scenes.length),
    origins:[index]
  }));
}

export function SceneRangeReview({proposal,paragraphs,ranges,onChange,disabled,existing}:{
  proposal:CinematicSceneProposal; paragraphs:string[]; ranges:SourceRange[];
  onChange:(next:SourceRange[])=>void; disabled:boolean; existing:CinematicScene[];
}) {
  const {t}=useTranslation("story");
  return <ol className="story-range-review">{ranges.map((range,index)=>{
    const end=(ranges[index+1]?.start??paragraphs.length+1)-1;
    const scene=proposal.scenes[range.origins[0]];
    const text=paragraphs.slice(range.start-1,end);
    const continued=index>0 && ranges[index-1].origins.includes(range.origins[0]);
    const title=continued?t("brief.splitTitle",{title:scene.title}):scene.title;
    const oldTitles=continued?"":range.origins.map(origin=>existing[origin]?.title).filter(Boolean).join(" + ");
    const canSplit=text.length>1 && ranges.length<24;
    const canMerge=index+1<ranges.length;
    return <li key={range.start}>
      <strong>{oldTitles && oldTitles!==title && <>{oldTitles} → </>}{title}</strong>
      {!continued && existing[range.origins[0]] && <small>{t("shotCount",{count:existing[range.origins[0]].shots.length})}</small>}
      <p>{range.origins.length===1 && !continued && scene.sourceStartParagraph===range.start && scene.sourceEndParagraph===end?scene.synopsis:text.join(" ")}</p>
      <details><summary>{t("brief.source")} · {range.start}–{end}</summary>
        {text.map((paragraph,i)=><p key={i}><small>{range.start+i}</small> {paragraph}</p>)}
      </details>
      <SceneDirectionSummary scene={{...scene,sceneEvents:range.origins.flatMap(i=>proposal.scenes[i].sceneEvents??[])}}/>
      {(canSplit || canMerge) && <details className="story-range-adjust">
        <summary>{t("brief.rangeTools")}</summary>
        <div className="story-range-tools">
        {canSplit && <label>{t("brief.split")}
          <select disabled={disabled} value="" onChange={event=>{
            const start=Number(event.target.value);
            const bounds=initialRanges(proposal,paragraphs.length);
            const before=range.origins.filter(origin=>bounds[origin].start<start);
            const after=range.origins.filter(origin=>(bounds[origin+1]?.start??paragraphs.length+1)>start);
            onChange([...ranges.slice(0,index),{...range,origins:before.length?before:[range.origins[0]]},
              {start,origins:after.length?after:[range.origins[range.origins.length-1]]},...ranges.slice(index+1)]);
          }}><option value="" disabled>{t("brief.selectBoundary")}</option>
            {text.slice(1).map((_,i)=><option key={i} value={range.start+i+1}>{t("brief.paragraph",{n:range.start+i+1})}</option>)}
          </select></label>}
        {canMerge && <button disabled={disabled} onClick={()=>{
          const origins=[...new Set([...range.origins,...ranges[index+1].origins])];
          onChange([...ranges.slice(0,index),{...range,origins},...ranges.slice(index+2)]);
        }}>{t("brief.merge")}</button>}
        </div>
      </details>}
    </li>;
  })}{existing.slice(proposal.scenes.length).map(row=><li key={row.id}>{row.title} · {t("retained")}</li>)}</ol>;
}
