import { expect, it } from "vitest";
import { detectCueSpeakers } from "./detectCueSpeakers";
import type { Cue } from "./projectApi";

function line(id: string, startMs: number, endMs: number, speaker: string): Cue {
  return {id,startMs,endMs,speaker,text:"source",translations:{th:"reviewed"},voiceBindings:{},takes:{}};
}
it("fills only unlabeled cues using existing speaker names and leaves ambiguous overlaps unresolved", () => {
  const source = [line("a",0,1000,"Lead"),line("b",1000,1900,""),line("c",1900,3000,"")];
  const detected = [line("d",0,2200,"Speaker A"),line("e",2200,3000,"Speaker B")];
  const next = detectCueSpeakers(source,detected);
  expect(next[0]).toBe(source[0]);
  expect(next[1]).toEqual({...source[1],speaker:"Lead",speakerVoiceType:undefined});
  expect(next[2]).toBe(source[2]);
});
