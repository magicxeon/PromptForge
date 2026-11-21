import { sceneTranscriptionPolicy } from "../generation/SceneTranscriptionService.js";
import { dubError } from "../../repositories/dub-sub/DubProjectRepository.js";

const policy = sceneTranscriptionPolicy.timedDialogue;
const spoken = (cue, lang, source) => cue?.voiceBindings?.[lang]?.dubText ?? cue?.translations?.[lang] ?? (source === lang ? cue?.text : "") ?? "";

export function timingContext(project, language, selected, forceSingle=false, rhythms=new Map()) {
  const ids = new Set(selected);
  const segmenter = new Intl.Segmenter(language, {granularity:"grapheme"});
  const rate = policy.graphemesPerSecond[language.split("-")[0]];
  const sourceLanguage = project.detectedLanguage || project.sourceLanguage;
  const sourceWords = new Intl.Segmenter(sourceLanguage === "auto" ? undefined : sourceLanguage,{granularity:"word"});
  const previous = project.dubBatches?.[language];
  const needsReview = new Set(previous?.items.filter(i => i.status === "failed" || i.status === "needs_listen").map(i => i.cueId));
  const cues = [];
  for (const [index, cue] of project.cues.entries()) {
    if (!ids.delete(cue.id)) continue;
    const text = spoken(cue,language,project.sourceLanguage).trim();
    const windowMs = cue.endMs - cue.startMs;
    const speechWindows = rhythms.get(cue.id);
    const speakingMs = speechWindows?.reduce((total,w)=>total+w.endMs-w.startMs,0) || windowMs;
    const budget = Math.max(1, Math.floor(rate * speakingMs / 1000));
    const length = [...segmenter.segment(text)].filter(s => /[\p{L}\p{N}]/u.test(s.segment)).length;
    if (text && (forceSingle || length > budget || needsReview.has(cue.id) || cue.takes?.[language]?.durationMs > windowMs)) {
      cues.push({id:cue.id, source:cue.text, text, windowMs, budget, speaker:cue.speaker,
        ...(speechWindows && {speechWindows,speakingMs,sourceWordCount:[...sourceWords.segment(cue.text)].filter(s=>s.isWordLike).length}),
        delivery:{...cue.suggestedDelivery?.[language], ...cue.deliveryOverrides?.[language]},
        before:project.cues[index-1]?.text, after:project.cues[index+1]?.text});
    }
  }
  if (ids.size) throw dubError("dub_cue_missing",422);
  return {language, storyContext:project.storyContext, languageStyle:project.languageStyle, cues};
}

export async function proposeTimedDialogue(context, beforeDispatch, generate) {
  const {cues, ...scene} = context;
  const suggestions = [];
  for (let start=0; start<cues.length; start+=policy.linesPerRequest) {
    const group = cues.slice(start,start+policy.linesPerRequest);
    const actor = await beforeDispatch();
    const result = await generate(actor, {...scene, cues:group});
    if (!Array.isArray(result?.lines) || result.lines.length !== group.length)
      throw dubError("dub_scene_invalid_response",502);
    const byId = new Map(result.lines.map(line=>[line?.id,line?.text]));
    for (const cue of group) {
      const text = byId.get(cue.id);
      if (typeof text !== "string" || !text.trim() || text.length > 4000 || /[\u0000-\u001f]/.test(text))
        throw dubError("dub_scene_invalid_response",502);
      suggestions.push({id:cue.id, original:cue.text, suggested:text.trim(), windowMs:cue.windowMs,
        ...(cue.speechWindows && {speechWindows:cue.speechWindows})});
    }
    if (Buffer.byteLength(JSON.stringify(suggestions)) > sceneTranscriptionPolicy.maxPreviewBytes)
      throw dubError("dub_scene_invalid_response",502);
  }
  return suggestions;
}
