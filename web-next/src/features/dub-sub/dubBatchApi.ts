import { z } from "zod";
import { apiRequest } from "../../lib/canonical";
import { projectUrl } from "./projectApi";

const batch = z.object({
  id: z.string(),
  language: z.string(),
  status: z.enum(["prepared", "running", "complete", "partial"]),
  totalCredits: z.number().nullable(),
  items: z.array(
    z.object({
      cueId: z.string(),
      takeId: z.string().optional(),
      internalPausesAccepted: z.boolean().optional(),
      status: z.enum(["pending", "working", "done", "failed", "review", "needs_listen"]),
      errorCode: z.string().optional(),
      durationMs: z.number().optional(),
      targetMs: z.number().optional(),
    }),
  ),
});
export type Batch = z.infer<typeof batch>;
export type BatchMode = "missing" | "all" | "failed";
const speechWindows = z.array(z.object({startMs:z.number().int().nonnegative(),endMs:z.number().int().positive()})).max(12);
const timingLine = z.object({ id:z.string(), original:z.string(), suggested:z.string(), windowMs:z.number(), manual:z.boolean().optional(),
  speechWindows:speechWindows.optional(),reason:z.string().optional(),director:z.enum(["luna","gemini"]).optional() });
export type TimingLine = z.infer<typeof timingLine>;
export const dubBatchApi = {
  cueRhythm:(id:string,revision:number,cueId:string)=>apiRequest(projectUrl(id)+"/cue-rhythm",{
    method:"POST",body:{revision,cueId},schema:speechWindows}),
  timing: (id:string, revision:number, language:string, cueIds:string[], forceSingle=false, director:"luna"|"gemini"="luna") =>
    apiRequest(projectUrl(id) + "/dubbing-timing-review", {method:"POST",
      body:{revision,language,cueIds,forceSingle,director,confirmed:true,requestId:crypto.randomUUID()},schema:z.array(timingLine)}),
  get: (id: string, language: string) =>
    apiRequest(
      projectUrl(id) +
        "/dubbing-batches?language=" +
        encodeURIComponent(language),
      { schema: batch.nullable() },
    ),
  prepare: (
    id: string,
    body: { language: string; revision: number; mode: BatchMode; acceptRhythmMismatch?: boolean },
  ) =>
    apiRequest(projectUrl(id) + "/dubbing-batches", {
      method: "POST",
      body,
      schema: batch,
    }),
  advance: (id: string, batchId: string, request: {retime:true;revision:number;pauseException?:{cueId:string;takeId:string}} | {confirmed:true} = {confirmed:true}) =>
    apiRequest(
      projectUrl(id) +
        "/dubbing-batches/" +
        encodeURIComponent(batchId) +
        "/advance",
      { method: "POST", body: request, schema: batch },
    ),
};
