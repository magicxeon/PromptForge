import { promises as fs } from "node:fs";
import path from "node:path";
import { dubError } from "../../repositories/dub-sub/DubProjectRepository.js";
import { DUB_SUB_FONTS_DIR } from "../../config/paths.js";
import { boundedCopy, mediaCommand, videoInput } from "./DubMediaService.js";

function clock(ms, separator) {
  const pad = (n, width = 2) => String(n).padStart(width, "0");
  return (
    pad(Math.floor(ms / 3600000)) +
    ":" +
    pad(Math.floor(ms / 60000) % 60) +
    ":" +
    pad(Math.floor(ms / 1000) % 60) +
    separator +
    pad(ms % 1000, 3)
  );
}
function subtitles(project, language, preview = false) {
  const rows = project.cues.map((cue) => ({
    ...cue,
    caption: language === "source" ? cue.text : cue.translations[language],
  }));
  if (preview) return rows.filter((cue) => cue.caption?.trim());
  if (!rows.length || rows.some((cue) => !cue.caption?.trim()))
    throw dubError("dub_missing_subtitle", 422);
  return rows;
}
export function textSubtitles(rows, format) {
  const separator = format === "vtt" ? "." : ",";
  return (
    (format === "vtt" ? "WEBVTT\n\n" : "") +
    rows
      .map((row, index) => {
        const caption = row.caption
          .replace(/\r/g, "")
          .replace(/\n{2,}/g, "\n")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        return (
          index +
          1 +
          "\n" +
          clock(row.startMs, separator) +
          " --> " +
          clock(row.endMs, separator) +
          "\n" +
          caption
        );
      })
      .join("\n\n") +
    "\n"
  );
}
function fontFamily(project, language) {
  let lang =
    language === "source"
      ? project.detectedLanguage || project.sourceLanguage
      : language;
  if (lang === "auto")
    lang = project.cues.some((cue) => /\p{Script=Han}/u.test(cue.text))
      ? "zh"
      : "th";
  return (
    "Noto " +
    (project.tracks[language].font === "serif" ? "Serif" : "Sans") +
    (lang.startsWith("zh") ? (lang === "zh-TW" ? " TC" : " SC") : " Thai")
  );
}
function ass(project, language, rows) {
  const style = project.tracks[language];
  const { width, height } = project.media;
  const lang =
    language === "source"
      ? project.detectedLanguage || project.sourceLanguage
      : language;
  const family = fontFamily(project, language);
  const size = Math.round((style.size * height) / 1080);
  const pos =
    "{\\pos(" +
    Math.round((style.x * width) / 100) +
    "," +
    Math.round((style.y * height) / 100) +
    ")}";
  const time = (ms) => clock(ms, ".").slice(0, -1);
  const wrap = (text) => {
    const segmenter = new Intl.Segmenter(lang === "auto" ? undefined : lang, {
      granularity: "grapheme",
    });
    return text
      .split(/\r?\n/)
      .map((line) => {
        const clusters = [...segmenter.segment(line)].map(
          (item) => item.segment,
        );
        const lines = [];
        for (let i = 0; i < clusters.length; i += style.maxChars)
          lines.push(clusters.slice(i, i + style.maxChars).join(""));
        return lines.join("\\N");
      })
      .join("\\N");
  };
  return [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: " + width,
    "PlayResY: " + height,
    "ScaledBorderAndShadow: yes",
    "[V4+ Styles]",
    "Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding",
    "Style: " +
      language +
      "," +
      family +
      "," +
      size +
      "," +
      (style.color === "yellow" ? "&H0044DFFF" : "&H00FFFFFF") +
      ",&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,1,2,2,10,10,0,1",
    "[Events]",
    "Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text",
    ...rows.map(
      (cue) =>
        "Dialogue: 0," +
        time(cue.startMs) +
        "," +
        time(cue.endMs) +
        "," +
        language +
        ",,0,0,0,," +
        pos +
        wrap(
          cue.caption.replace(
            /[{}\\]/g,
            (c) => ({ "{": "｛", "}": "｝", "\\": "＼" })[c],
          ),
        ),
    ),
  ].join("\n");
}

async function writeAss(project, languages, dir, fontsDir, preview = false) {
  const target = path.join(dir, "fonts");
  await fs.mkdir(target);
  const families = new Set(
    languages.flatMap((language) => {
      const style =
        project.tracks[language].font === "serif" ? "Noto Serif" : "Noto Sans";
      return [fontFamily(project, language), style + " Thai", style + " SC"];
    }),
  );
  for (const family of families) {
    const filename = family.replaceAll(" ", "") + ".ttf";
    const src = path.join(fontsDir, filename);
    const dest = path.join(target, filename);
    try {
      await fs.link(src, dest).catch(async (error) => {
        if (!["EXDEV", "EPERM", "EACCES"].includes(error.code)) throw error;
        await fs.copyFile(src, dest);
      });
    } catch {
      throw dubError("dub_font_unavailable", 503);
    }
  }
  const blocks = languages.map((lang) =>
    ass(project, lang, subtitles(project, lang, preview)).split("\n"),
  );
  const first = blocks[0];
  const eventsIndex = first.indexOf("[Events]");
  const header = first.slice(0, eventsIndex - 1);
  const styles = blocks.map((lines) =>
    lines.find((line) => line.startsWith("Style: ")),
  );
  const events = blocks.flatMap((lines) =>
    lines.filter((line) => line.startsWith("Dialogue: ")),
  );
  await fs.writeFile(
    path.join(dir, "captions.ass"),
    [
      ...header,
      ...styles,
      ...first.slice(eventsIndex, eventsIndex + 2),
      ...events,
    ].join("\n"),
    "utf8",
  );
}
export async function renderPreview(
  project,
  languages,
  timeMs,
  source,
  dir,
  fontsDir = DUB_SUB_FONTS_DIR,
) {
  await writeAss(project, languages, dir, fontsDir, true);
  const filename = path.join(dir, "preview.png");
  // Seeking on the output keeps the subtitle filter on the source timeline.
  await mediaCommand(
    [
      ...videoInput(source),
      "-vf",
      "ass=captions.ass:fontsdir=fonts",
      "-ss",
      String(timeMs / 1000),
      "-frames:v",
      "1",
      filename,
    ],
    { cwd: dir },
  );
  return fs.readFile(filename);
}

async function mix(project, language, dir, openTake) {
  const clips = [];
  const files = new Map();
  const mixer = project.mixer?.[language] || {};
  const hasSolo = Object.values(mixer).some((item) => item.solo);
  for (const cue of project.cues) {
    const channel = Object.hasOwn(mixer, cue.speaker)
      ? mixer[cue.speaker]
      : undefined;
    if (channel?.mute || (hasSolo && !channel?.solo)) continue;
    const id = cue.takes?.[language]?.id;
    if (!id) throw dubError("dub_take_missing", 422);
    if (!files.has(id)) {
      const file = await openTake(id);
      try {
        if (!Number.isFinite(file.durationMs) || file.durationMs <= 0)
          throw dubError("dub_take_invalid", 422);
        const dest = path.join(dir, "take-" + files.size + ".wav");
        await boundedCopy(
          file.handle.createReadStream(),
          dest,
          32 * 1024 * 1024,
          file.reauthorize,
        );
        files.set(id, { dest, durationMs: file.durationMs });
      } finally {
        await file.handle.close().catch(() => {});
      }
    }
    const { dest, durationMs } = files.get(id);
    const start = cue.startMs + cue.offsetMs;
    if (
      start < 0 ||
      start + durationMs > cue.endMs + 25 ||
      start + durationMs > project.durationMs + 25
    )
      throw dubError("dub_take_overrun", 422);
    clips.push({
      start,
      end: start + durationMs,
      dest,
      gain: cue.gain * (channel?.gain ?? 1),
    });
  }
  if (!clips.length) {
    if (!project.cues.length) throw dubError("dub_take_missing", 422);
    const silence = path.join(dir, "dub-silence.wav");
    await mediaCommand([
      "-f",
      "lavfi",
      "-i",
      "anullsrc=r=48000:cl=stereo",
      "-t",
      String(project.durationMs / 1000),
      "-c:a",
      "pcm_s16le",
      silence,
    ]);
    return silence;
  }
  clips.sort((a, b) => a.start - b.start);
  if (clips.some((clip, i) => i && clip.start < clips[i - 1].end - 25))
    throw dubError("dub_takes_overlap", 422);
  // Keep the number of decoder inputs and OS command length bounded.
  const parts = [];
  for (let start = 0; start < clips.length; start += 16) {
    const chunk = clips.slice(start, start + 16);
    const origin = start ? chunk[0].start : 0;
    const until = clips[start + 16]?.start ?? project.durationMs;
    const args = [];
    const filters = [];
    const labels = [];
    chunk.forEach((clip, i) => {
      args.push("-f", "wav", "-i", clip.dest);
      filters.push(
        "[" +
          i +
          ":a]aresample=48000,volume=" +
          clip.gain +
          ",adelay=" +
          (clip.start - origin) +
          ":all=1[a" +
          i +
          "]",
      );
      labels.push("[a" + i + "]");
    });
    filters.push(
      labels.join("") +
        "amix=inputs=" +
        labels.length +
        ":normalize=0,apad[out]",
    );
    const filename = "mix-" + start + ".wav";
    await mediaCommand([
      ...args,
      "-filter_complex",
      filters.join(";"),
      "-map",
      "[out]",
      "-t",
      String((until - origin) / 1000),
      "-ac",
      "2",
      "-ar",
      "48000",
      "-c:a",
      "pcm_s16le",
      path.join(dir, filename),
    ]);
    parts.push(filename);
  }
  if (parts.length === 1) return path.join(dir, parts[0]);
  await fs.writeFile(
    path.join(dir, "parts.txt"),
    parts.map((name) => "file " + name).join("\n") + "\n",
  );
  await mediaCommand(
    [
      "-f",
      "concat",
      "-safe",
      "1",
      "-protocol_whitelist",
      "file",
      "-i",
      "parts.txt",
      "-c:a",
      "copy",
      "dub.wav",
    ],
    { cwd: dir },
  );
  return path.join(dir, "dub.wav");
}

export async function renderExport({
  project,
  language,
  captionLanguages = [language],
  format,
  burnIn,
  includeDubbing,
  sourceGain,
  dubGain,
  source,
  dir,
  output,
  openTake,
  fontsDir = DUB_SUB_FONTS_DIR,
}) {
  let audio;
  if (format === "wav" || (format === "mp4" && includeDubbing)) {
    audio = await mix(project, language, dir, openTake);
    if (sourceGain > 0 && project.media.hasAudio) {
      const mixed = path.join(dir, "mixed.wav");
      await mediaCommand([
        ...videoInput(source),
        "-f",
        "wav",
        "-i",
        audio,
        "-filter_complex",
        "[0:a]volume=" +
          sourceGain +
          "[original];[1:a]volume=" +
          dubGain +
          "[dub];[original][dub]amix=inputs=2:duration=longest:normalize=0[out]",
        "-map",
        "[out]",
        "-t",
        String(project.durationMs / 1000),
        "-ac",
        "2",
        "-ar",
        "48000",
        "-c:a",
        "pcm_s16le",
        mixed,
      ]);
      audio = mixed;
    } else if (dubGain !== 1) {
      const adjusted = path.join(dir, "adjusted.wav");
      await mediaCommand([
        "-f",
        "wav",
        "-i",
        audio,
        "-af",
        "volume=" + dubGain,
        "-c:a",
        "pcm_s16le",
        adjusted,
      ]);
      audio = adjusted;
    }
  }
  if (format === "wav") {
    await fs.rename(audio, output);
    return;
  }
  if (format === "srt" || format === "vtt") {
    await fs.writeFile(
      output,
      textSubtitles(subtitles(project, language), format),
      "utf8",
    );
    return;
  }
  const args = videoInput(source);
  if (includeDubbing) args.push("-i", audio);
  if (burnIn && captionLanguages.length) {
    if (
      !["yuv420p", "yuvj420p"].includes(project.media.pixelFormat) ||
      ["smpte2084", "arib-std-b67"].includes(project.media.colorTransfer)
    )
      throw dubError("dub_burnin_format_unsupported", 422);
    await writeAss(project, captionLanguages, dir, fontsDir);
    args.push(
      "-map",
      "0:v:0",
      "-vf",
      "ass=captions.ass:fontsdir=fonts",
      "-c:v",
      "libx264",
      "-crf",
      "16",
      "-preset",
      "medium",
      "-fps_mode",
      "passthrough",
    );
  } else {
    for (const lang of captionLanguages) {
      await fs.writeFile(
        path.join(dir, lang + ".srt"),
        textSubtitles(subtitles(project, lang), "srt"),
        "utf8",
      );
      args.push("-f", "srt", "-i", lang + ".srt");
    }
    args.push("-map", "0:v:0", "-c:v", "copy", "-c:s", "mov_text");
    captionLanguages.forEach((lang, index) => {
      const tag =
        lang === "source"
          ? project.detectedLanguage || project.sourceLanguage
          : lang;
      args.push(
        "-map",
        String(index + (includeDubbing ? 2 : 1)) + ":s:0",
        "-metadata:s:s:" + index,
        "language=" +
          ({ th: "tha", zh: "zho", en: "eng" }[tag.split("-")[0]] || "und"),
      );
    });
  }
  args.push("-map", includeDubbing ? "1:a:0" : "0:a:0?");
  if (
    !includeDubbing &&
    sourceGain === 1 &&
    ["aac", "mp3", "alac"].includes(project.media.audioCodec)
  )
    args.push("-c:a", "copy");
  else {
    if (!includeDubbing && project.media.hasAudio && sourceGain !== 1)
      args.push("-af", "volume=" + sourceGain);
    args.push("-c:a", "aac", "-b:a", "256k");
  }
  args.push("-map_metadata", "0", "-movflags", "+faststart", output);
  await mediaCommand(args, { cwd: dir });
}
