import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PostProcessingServiceClient } from "../../providers/PostProcessingServiceClient.js";
import { dubError } from "../../repositories/dub-sub/DubProjectRepository.js";
import { mediaCommand, videoInput } from "./DubMediaService.js";
import { sceneTranscriptionPolicy, SceneTranscriptionService } from "../generation/SceneTranscriptionService.js";
import { languages, normalizeCues, normalizeDelivery } from "./projectFields.js";

const run = promisify(execFile);
function suggestedDelivery(value) {
  try {
    const result = normalizeDelivery(value);
    if (result.emotion && result.pace && result.intensity && typeof result.direction === "string" && result.direction.length <= 200)
      return result;
  } catch { /* Map invalid provider data to the scene response error. */ }
  throw dubError("dub_scene_invalid_response", 502);
}
const ocrLanguages = {
  th: "tha",
  zh: "chi_sim",
  "zh-CN": "chi_sim",
  "zh-TW": "chi_tra",
  en: "eng",
};

// Fresh transcription has new IDs. Transfer actor direction only across unambiguous cue matches.
function retainDeliveryOverrides(rows, previous) {
  const matches = new Map();
  for (const old of previous) {
    if (!old.deliveryOverrides) continue;
    const candidates = rows.filter(row => {
      const overlap = Math.min(row.endMs, old.endMs) - Math.max(row.startMs, old.startMs);
      return overlap > 0 && (row.text.trim() === old.text.trim() ||
        overlap >= 0.8 * Math.max(row.endMs - row.startMs, old.endMs - old.startMs));
    });
    if (candidates.length === 1) {
      const next = candidates[0];
      matches.set(next, matches.has(next) ? null : old.deliveryOverrides);
    }
  }
  for (const [row, overrides] of matches) if (overrides) row.deliveryOverrides = overrides;
}

export class DubLanguageService {
  constructor({
    postProcessing = new PostProcessingServiceClient(),
    sceneGeneration = new SceneTranscriptionService(),
  } = {}) {
    this.postProcessing = postProcessing;
    this.sceneGeneration = sceneGeneration;
  }

  async transcribeScene(project, source, targetLanguage, beforeDispatch) {
    const policy = sceneTranscriptionPolicy;
    const directory = path.dirname(path.dirname(source));
    const temp = await fs.mkdtemp(path.join(directory, "scene-"));
    try {
      const wav = path.join(temp, "audio.wav");
      await mediaCommand([
        ...videoInput(source), "-map", "0:a:0", "-vn", "-sn", "-dn", "-map_metadata", "-1",
        "-t", String(project.durationMs / 1000), "-ac", "1", "-af", "aresample=16000:async=1:first_pts=0", "-c:a", "pcm_s16le",
        "-fs", String(policy.maxAudioBytes), wav,
      ], { timeout: policy.timeoutMs });
      const { size } = await fs.stat(wav);
      if (size <= 44 || size >= policy.maxAudioBytes) throw dubError("dub_scene_audio_limit", 413);
      const audio = await fs.readFile(wav);
      const actor = await beforeDispatch();
      const data = await this.sceneGeneration.transcribe(actor, audio, {
        sourceLanguage: project.sourceLanguage, targetLanguage, durationMs: project.durationMs,
        storyContext: project.storyContext || "", languageStyle: project.languageStyle || "",
      });
      if (!data || typeof data.language !== "string" || !/^[a-z]{2,3}(-[A-Za-z0-9]{2,8}){0,2}$/.test(data.language) ||
          !Array.isArray(data.cues) || data.cues.length > policy.maxCues ||
          (project.sourceLanguage !== "auto" && data.language.split("-")[0] !== project.sourceLanguage.split("-")[0]))
        throw dubError("dub_scene_invalid_response", 502);
      if (!data.cues.length) throw dubError("dub_no_speech", 422);
      const detected = languages.includes(data.language) ? data.language : data.language.split("-")[0];
      if (project.sourceLanguage === "auto" && !languages.includes(detected))
        throw dubError("dub_scene_language_unsupported", 422);
      let lastStart = -1;
      const rows = data.cues.map(cue => {
        if (!cue || typeof cue.original !== "string" || !cue.original.trim() ||
            typeof cue.translation !== "string" || !cue.translation.trim() || typeof cue.speaker !== "string" ||
            !Number.isInteger(cue.startMs) || cue.startMs < lastStart)
          throw dubError("dub_scene_invalid_response", 502);
        lastStart = cue.startMs;
        return { id: randomUUID(), startMs: cue.startMs, endMs: cue.endMs, text: cue.original.trim(), sourceOrigin: "gemini",
          speaker: cue.speaker.trim(), translations: { [targetLanguage]: cue.translation.trim() },
          suggestedDelivery: { [targetLanguage]: suggestedDelivery(cue.delivery) },
          translationOrigins: { [targetLanguage]: "gemini" } };
      });
      retainDeliveryOverrides(rows, project.cues || []);
      const cues = await normalizeCues(rows, project).catch(() => { throw dubError("dub_scene_invalid_response", 502); });
      const result = { cues, language: project.sourceLanguage === "auto" ? detected : project.sourceLanguage };
      if (Buffer.byteLength(JSON.stringify(result)) > policy.maxPreviewBytes)
        throw dubError("dub_scene_invalid_response", 502);
      return result;
    } finally {
      await fs.rm(temp, { recursive: true, force: true });
    }
  }

  async localRequest(route, body, code) {
    const client = this.postProcessing;
    try {
      const response = await client.fetchWithRetry(
        client.endpoint.replace(/\/$/, "") + route,
        {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(120000),
          headers: {
            "Content-Type": "application/json",
            ...(client.token
              ? { "X-Post-Processing-Token": client.token }
              : {}),
          },
          body: JSON.stringify(body),
        },
        1,
      );
      if (!response.ok) throw new Error();
      return await response.json();
    } catch {
      throw dubError(code, 503);
    }
  }

  translationContext(project, language, overwrite, cueIds) {
    if (!project.cues.length) throw dubError("dub_no_cues", 422);
    const selected = cueIds ? new Set(cueIds) : null;
    if (selected) {
      const available = new Set(project.cues.map(cue => cue.id));
      if ([...selected].some(id => !available.has(id))) throw dubError("dub_cue_missing", 422);
    }
    const cues = project.cues.filter(cue => (!selected || selected.has(cue.id)) && cue.text.trim() &&
      (overwrite || !cue.translations?.[language]?.trim())).map(({ id, text }) => ({ id, text }));
    const context = { sourceLanguage: project.detectedLanguage || project.sourceLanguage, targetLanguage: language,
      storyContext: project.storyContext || "", languageStyle: project.languageStyle || "", cues };
    if (cues.length > sceneTranscriptionPolicy.maxCues ||
        Buffer.byteLength(JSON.stringify(context)) > sceneTranscriptionPolicy.maxPreviewBytes)
      throw dubError("dub_translation_limit", 413);
    return context;
  }

  async translate(context, beforeDispatch) {
    const actor = await beforeDispatch();
    const output = await this.sceneGeneration.translate(actor, context);
    const expected = new Set(context.cues.map(cue => cue.id));
    if (!Array.isArray(output?.cues) || output.cues.length !== expected.size ||
        Buffer.byteLength(JSON.stringify(output.cues)) > sceneTranscriptionPolicy.maxPreviewBytes)
      throw dubError("dub_scene_invalid_response", 502);
    return output.cues.map(row => {
      if (!row || !expected.delete(row.id) || typeof row.translation !== "string" ||
          !row.translation.trim() || row.translation.length > 4000 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(row.translation))
        throw dubError("dub_scene_invalid_response", 502);
      return { id: row.id, translation: row.translation.trim(), delivery: suggestedDelivery(row.delivery) };
    });
  }

  // OCR produces a review candidate. It never overwrites an edited transcript.
  async scan(project, directory, language) {
    const languagePack = ocrLanguages[language];
    if (!languagePack) throw dubError("dub_ocr_language_required", 422);
    const command = process.env.TESSERACT_PATH;
    const options = {
      windowsHide: true,
      timeout: 120000,
      maxBuffer: 4 * 1024 * 1024,
    };
    if (command)
      try {
        const { stdout } = await run(command, ["--list-langs"], options);
        if (!stdout.split(/\s+/).includes(languagePack)) throw new Error();
      } catch {
        throw dubError("dub_ocr_unavailable", 503);
      }
    const temp = await fs.mkdtemp(path.join(directory, "ocr-"));
    const cues = [];
    let previous;
    try {
      for (let offset = 0; offset < project.durationMs; offset += 15000) {
        const filter =
          "fps=2,crop=iw:ih*0.40:0:ih*0.60,scale=960:640:force_original_aspect_ratio=decrease,format=gray";
        await mediaCommand(
          [
            "-ss",
            String(offset / 1000),
            ...videoInput(path.join(directory, project.media.folder, "media")),
            "-t",
            "15",
            "-vf",
            filter,
            "-frames:v",
            "30",
            "page-%03d.png",
          ],
          { cwd: temp },
        );
        const frames = (await fs.readdir(temp))
          .filter((name) => /^page-\d+\.png$/.test(name))
          .sort();
        if (!frames.length) continue;
        let pages = [];
        if (command) {
          await fs.writeFile(
            path.join(temp, "pages.txt"),
            frames.join("\n") + "\n",
            "utf8",
          );
          try {
            const { stdout } = await run(
              command,
              ["pages.txt", "stdout", "-l", languagePack, "--psm", "6"],
              { ...options, cwd: temp },
            );
            pages = stdout.split("\f");
          } catch {
            throw dubError("dub_ocr_failed", 503);
          }
        } else {
          for (let start = 0; start < frames.length; start += 6) {
            const group = frames.slice(start, start + 6);
            const encoded = await Promise.all(
              group.map((name) => fs.readFile(path.join(temp, name), "base64")),
            );
            const result = await this.localRequest(
              "/v1/audio/subtitle-ocr",
              { language, frames: encoded },
              "dub_ocr_unavailable",
            );
            if (
              !Array.isArray(result.texts) ||
              result.texts.length !== group.length ||
              result.texts.some((t) => typeof t !== "string")
            )
              throw dubError("dub_ocr_failed", 503);
            pages.push(...result.texts);
          }
        }
        frames.forEach((name, index) => {
          const text = (pages[index] || "")
            .trim()
            .replace(/\s+/g, " ")
            .slice(0, 4000);
          if (!text) {
            previous = null;
            return;
          }
          const startMs = offset + index * 500;
          const endMs = Math.min(project.durationMs, startMs + 500);
          if (endMs <= startMs) return;
          if (previous?.text === text && previous.endMs === startMs)
            previous.endMs = endMs;
          else {
            previous = {
              id: randomUUID(),
              startMs,
              endMs,
              text,
              translations: {},
              speaker: "",
            };
            cues.push(previous);
          }
        });
        await Promise.all(
          frames.map((name) => fs.unlink(path.join(temp, name))),
        );
        if (cues.length > 3000) throw dubError("dub_cue_limit", 422);
      }
    } finally {
      await fs.rm(temp, { recursive: true, force: true });
    }
    if (!cues.length) throw dubError("dub_no_subtitles_detected", 422);
    return { cues, language };
  }
}
