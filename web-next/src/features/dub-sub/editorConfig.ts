import { z } from "zod";
import values from "./editor-config.json";
const count = z.number().int().positive();
const range = (min: number, max: number) =>
  z
    .object({
      min: z.number().int().min(min),
      max: z.number().int().max(max),
    })
    .refine((value) => value.min <= value.max);
export default z
  .object({
    version: z.literal(1),
    compactWidth: count,
    speakerColors: z.array(z.string().regex(/^#[0-9a-f]{6}$/i)).nonempty(),
    transcriptRowPx: count,
    transcriptWindowRows: count.max(100),
    languages: z.array(z.string().min(2)).nonempty(),
    maxTargets: count.max(2),
    languageStyleMaxLength: count.max(300),
    storyContextMaxLength: count.max(2000),
    pageSize: count.max(50),
    libraryLimit: count.max(100),
    defaultCueMs: count,
    minimumCueMs: count,
    autosaveMs: count,
    timelineZoom: z.array(z.number().min(1)).nonempty(),
    timelineFollowAnchor: z.number().min(0).max(1),
    subtitleControls: z.object({
      size: range(8, 200),
      x: range(0, 100),
      y: range(0, 100),
      maxChars: range(4, 200),
    }),
    defaultStyle: z.object({
      visible: z.boolean(),
      locked: z.boolean(),
      font: z.enum(["sans", "serif"]),
      color: z.enum(["white", "yellow"]),
      size: count,
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
      maxChars: count,
    }),
    fonts: z.object({ sans: z.string(), serif: z.string() }),
    colors: z.object({ white: z.string(), yellow: z.string() }),
    formats: z.array(z.enum(["mp4", "wav", "vtt", "srt"])).nonempty(),
  })
  .parse(values);
