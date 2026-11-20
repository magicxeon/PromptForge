import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PostProcessingServiceClient } from "../../providers/PostProcessingServiceClient.js";
import { dubError } from "../../repositories/dub-sub/DubProjectRepository.js";
import { mediaCommand, videoInput } from "./DubMediaService.js";

const run = promisify(execFile);
const ocrLanguages = {
  th: "tha",
  zh: "chi_sim",
  "zh-CN": "chi_sim",
  "zh-TW": "chi_tra",
  en: "eng",
};

export class DubLanguageService {
  constructor({
    postProcessing = new PostProcessingServiceClient(),
    translateUrl = process.env.LIBRETRANSLATE_URL,
    fetchImpl = fetch,
  } = {}) {
    this.postProcessing = postProcessing;
    this.translateUrl = translateUrl;
    this.fetchImpl = fetchImpl;
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

  async transcribe(project, directory) {
    if (!project.media.hasAudio) throw dubError("dub_audio_missing", 422);
    const client = this.postProcessing;
    const temp = await fs.mkdtemp(path.join(directory, "asr-"));
    const filename = path.join(temp, "segment.wav");
    const cues = [];
    let language = project.sourceLanguage;
    try {
      for (let offset = 0; offset < project.durationMs; offset += 300000) {
        await mediaCommand([
          "-y",
          "-ss",
          String(offset / 1000),
          ...videoInput(path.join(directory, project.media.folder, "media")),
          "-t",
          "300",
          "-vn",
          "-ac",
          "1",
          "-ar",
          "16000",
          filename,
        ]);
        const wav = await fs.readFile(filename);
        let data;
        try {
          const result = await client.fetchWithRetry(
            client.endpoint.replace(/\/$/, "") + "/v1/audio/transcribe",
            {
              method: "POST",
              redirect: "error",
              signal: AbortSignal.timeout(300000),
              headers: {
                "Content-Type": "application/json",
                ...(client.token
                  ? { "X-Post-Processing-Token": client.token }
                  : {}),
              },
              body: JSON.stringify({
                bytesBase64: wav.toString("base64"),
                language: language === "auto" ? "zh" : language.split("-")[0],
                detectLanguage: language === "auto",
              }),
            },
            1,
          );
          if (!result.ok) throw new Error();
          data = await result.json();
        } catch {
          throw dubError("dub_asr_unavailable", 503);
        }
        if (!data.success || data.fallbackUsed || !Array.isArray(data.words))
          throw dubError("dub_asr_unavailable", 503);
        if (language === "auto" && typeof data.language === "string")
          language = data.language;
        for (const item of data.words) {
          const startMs = Math.round(item.start * 1000) + offset;
          const endMs = Math.min(
            project.durationMs,
            Math.round(item.end * 1000) + offset,
          );
          if (!item.word?.trim()) continue;
          if (
            !Number.isFinite(startMs) ||
            !Number.isFinite(endMs) ||
            startMs < offset ||
            endMs <= startMs
          )
            throw dubError("dub_asr_missing_timestamps", 422);
          cues.push({
            id: randomUUID(),
            startMs,
            endMs,
            text: item.word,
            translations: {},
            speaker: item.speaker || "",
          });
        }
      }
    } finally {
      await fs.rm(temp, { recursive: true, force: true });
    }
    if (!cues.length) throw dubError("dub_no_speech", 422);
    return { cues, language };
  }

  async translate(project, language, overwrite, cueIds) {
    if (!project.cues.length) throw dubError("dub_no_cues", 422);
    const source = (project.detectedLanguage || project.sourceLanguage).split(
      "-",
    )[0];
    const cues = structuredClone(project.cues);
    const selected = cueIds ? new Set(cueIds) : null;
    const pending = cues.filter(
      (cue) =>
        (!selected || selected.has(cue.id)) &&
        cue.text.trim() &&
        (overwrite || !cue.translations[language]),
    );
    for (let start = 0; start < pending.length; start += 25) {
      const group = pending.slice(start, start + 25);
      let translations;
      const body = {
        q: group.map((cue) => cue.text),
        source,
        target: language.split("-")[0],
        format: "text",
      };
      if (this.translateUrl) {
        const endpoint = new URL(this.translateUrl);
        if (!["https:", "http:"].includes(endpoint.protocol))
          throw dubError("dub_translation_unconfigured", 503);
        if (endpoint.pathname === "/") endpoint.pathname = "/translate";
        try {
          const response = await this.fetchImpl(endpoint, {
            method: "POST",
            redirect: "error",
            signal: AbortSignal.timeout(90000),
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...body,
              ...(process.env.LIBRETRANSLATE_API_KEY
                ? { api_key: process.env.LIBRETRANSLATE_API_KEY }
                : {}),
            }),
          });
          if (!response.ok) throw new Error();
          translations = (await response.json()).translatedText;
        } catch {
          throw dubError("dub_translation_unavailable", 503);
        }
      } else
        translations = (
          await this.localRequest(
            "/v1/audio/translate",
            body,
            "dub_translation_unavailable",
          )
        ).translatedText;
      if (
        !Array.isArray(translations) ||
        translations.length !== group.length ||
        translations.some(
          (text) =>
            typeof text !== "string" || !text.trim() || text.length > 4000,
        )
      )
        throw dubError("dub_translation_incomplete", 422);
      group.forEach((cue, index) => {
        cue.translations[language] = translations[index];
      });
    }
    return cues;
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
