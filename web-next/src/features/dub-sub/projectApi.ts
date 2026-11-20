import { z } from "zod";
import { apiRequest } from "../../lib/canonical";
import config from "./editorConfig";

const binding = z.object({
  documentId: z.string().optional(),
  rowId: z.string().optional(),
  dubText: z.string().optional(),
  characterId: z.string().optional(),
  operationId: z.string().optional(),
});
const take = z.object({
  id: z.string(),
  durationMs: z.number(),
  audioUrl: z.string(),
});
const cue = z
  .object({
    id: z.string(),
    startMs: z.number(),
    endMs: z.number(),
    text: z.string(),
    speaker: z.string().nullish(),
    translations: z.record(z.string(), z.string()).default({}),
    voiceBindings: z.record(z.string(), binding).default({}),
    takes: z.record(z.string(), take).default({}),
    offsetMs: z.number().optional(),
    gain: z.number().optional(),
  })
  .passthrough();
const track = z
  .object({
    visible: z.boolean(),
    locked: z.boolean(),
    font: z.string(),
    color: z.string(),
    size: z.number(),
    x: z.number(),
    y: z.number(),
    maxChars: z.number(),
  })
  .passthrough();
export const exported = z
  .object({
    id: z.string(),
    url: z.string(),
    format: z.string(),
    revision: z.number(),
    language: z.string().optional(),
  })
  .passthrough();
const summary = z
  .object({
    id: z.string(),
    name: z.string(),
    languageStyle: z.string().default(""),
    storyContext: z.string().default(""),
    sourceLanguage: z.string(),
    targetLanguages: z.array(z.string()),
    durationMs: z.number().nullish(),
    status: z.string(),
    updatedAt: z.string(),
    posterUrl: z.string().nullish(),
    revision: z.number(),
    archived: z.boolean().optional(),
    operations: z
      .array(
        z.object({
          id: z.string(),
          kind: z.string(),
          status: z.string(),
          code: z.string().optional(),
        }),
      )
      .optional(),
    exports: z.array(exported).optional(),
  })
  .passthrough();
export const project = summary.extend({
  mediaUrl: z.string().nullish(),
  cues: z.array(cue),
  tracks: z.record(z.string(), track),
  characterMappings: z
    .record(z.string(), z.record(z.string(), z.string()))
    .default({}),
  mixer: z
    .record(
      z.string(),
      z.record(
        z.string(),
        z.object({ gain: z.number(), mute: z.boolean(), solo: z.boolean() }),
      ),
    )
    .default({}),
});
export type Project = z.infer<typeof project>;
export type Cue = z.infer<typeof cue>;
export type Track = z.infer<typeof track>;
export type Export = z.infer<typeof exported>;
export const base = "/api/dub-sub/projects";
export const projectUrl = (id: string) => base + "/" + encodeURIComponent(id);
export const projectsApi = {
  updateDetails: (
    id: string,
    revision: number,
    details: Pick<Project, "name" | "languageStyle" | "storyContext">,
  ) =>
    apiRequest(projectUrl(id), {
      method: "PATCH",
      body: { revision, ...details },
      schema: project,
    }),
  archive: (id: string, revision: number, archived: boolean) =>
    apiRequest(projectUrl(id), {
      method: "PATCH",
      body: { revision, archived },
      schema: project,
    }),
  list: (cursor: string | undefined, archived = false) =>
    apiRequest(
      base +
        "?archived=" +
        archived +
        "&limit=" +
        config.pageSize +
        (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
      {
        schema: z.object({
          items: z.array(summary),
          nextCursor: z.string().nullish(),
        }),
      },
    ),
  read: (id: string) => apiRequest(projectUrl(id), { schema: project }),
  create: (body: Record<string, unknown>) =>
    apiRequest(base, { method: "POST", body, schema: project }),
  upload: (id: string, file: File, signal?: AbortSignal) =>
    apiRequest(projectUrl(id) + "/media", {
      method: "PUT",
      body: file,
      signal,
      headers: { "Content-Type": file.type || "video/mp4" },
      schema: project,
    }),
  save: (p: Project) =>
    apiRequest(projectUrl(p.id), {
      method: "PATCH",
      body: {
        revision: p.revision,
        name: p.name,
        cues: p.cues,
        tracks: p.tracks,
        targetLanguages: p.targetLanguages,
        characterMappings: p.characterMappings,
        mixer: p.mixer,
      },
      schema: project,
    }),
  process: (
    id: string,
    step: "translate" | "transcribe",
    body: Record<string, unknown>,
  ) =>
    apiRequest(projectUrl(id) + "/" + step, {
      method: "POST",
      body,
      schema: project,
    }),
  export: (p: Project, body: Record<string, unknown>) =>
    apiRequest(projectUrl(p.id) + "/exports", {
      method: "POST",
      body: { ...body, revision: p.revision },
      schema: exported,
    }),
  peaks: (id: string, signal?: AbortSignal) =>
    apiRequest(projectUrl(id) + "/peaks", {
      signal,
      schema: z.object({ peaks: z.array(z.number()), durationMs: z.number() }),
    }),
  detect: (
    id: string,
    step: "ocr" | "transcribe",
    body: Record<string, unknown>,
  ) =>
    apiRequest(projectUrl(id) + "/" + step, {
      method: "POST",
      body,
      schema: z.object({ cues: z.array(cue), language: z.string() }),
    }),
  frame: async (id: string, body: Record<string, unknown>) => {
    const blob = await apiRequest(projectUrl(id) + "/preview", {
      method: "POST",
      body,
      responseType: "blob",
      schema: z.instanceof(Blob),
    });
    return blob;
  },
};
export const newCue = (startMs: number, endMs: number): Cue => ({
  id: crypto.randomUUID(),
  startMs,
  endMs,
  text: "",
  translations: {},
  voiceBindings: {},
  takes: {},
});
export function timeLabel(ms: number) {
  const n = Math.max(0, Math.round(ms));
  return (
    [
      Math.floor(n / 3600000),
      Math.floor(n / 60000) % 60,
      Math.floor(n / 1000) % 60,
    ]
      .map((x) => String(x).padStart(2, "0"))
      .join(":") +
    "." +
    String(n % 1000).padStart(3, "0")
  );
}
export function parseSubtitles(input: string): Cue[] {
  const time = (s: string) =>
    s
      .replace(",", ".")
      .split(":")
      .reduce((total, part) => total * 60 + Number(part), 0) * 1000;
  const cues: Cue[] = [];
  for (const block of input
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/\r/g, "")
    .split(/\n\s*\n/)) {
    const lines = block.split("\n");
    const i = lines.findIndex((line) => line.includes("-->"));
    if (i < 0) continue;
    const match = lines[i].match(
      /^\s*((?:\d+:)?\d{2}:\d{2}[.,]\d{3})\s+-->\s+((?:\d+:)?\d{2}:\d{2}[.,]\d{3})(?:\s|$)/,
    );
    if (!match) throw new Error("subtitle_time_invalid");
    const start = Math.round(time(match[1])),
      end = Math.round(time(match[2]));
    if (end <= start) throw new Error("subtitle_time_invalid");
    cues.push({ ...newCue(start, end), text: lines.slice(i + 1).join("\n") });
  }
  if (!cues.length) throw new Error("subtitle_empty");
  return cues;
}
