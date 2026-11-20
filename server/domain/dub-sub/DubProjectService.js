import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  DubProjectRepository,
  dubError,
} from "../../repositories/dub-sub/DubProjectRepository.js";
import { AssetDeliveryService } from "../assets/AssetDeliveryService.js";
import {
  assertUnlocked,
  fail,
  label,
  normalizeCues,
  sourceLanguage,
  speakerSettings,
  targetList,
  tracksFor,
} from "./projectFields.js";
import { DubLanguageService } from "./DubLanguageService.js";
import { prepareMedia } from "./DubMediaService.js";
import { renderExport, renderPreview } from "./DubExportService.js";

const prefix = "/api/dub-sub/projects/";
function selectedCaptions(project, body, language, allowEmpty = false) {
  const requested = body.captionLanguages ?? body.languages ?? [language];
  if (
    !Array.isArray(requested) ||
    (!allowEmpty && !requested.length) ||
    requested.length > 2 ||
    new Set(requested).size !== requested.length ||
    requested.some(
      (lang) => !["source", ...project.targetLanguages].includes(lang),
    )
  )
    fail();
  return requested;
}
export class DubProjectService {
  constructor({
    repo = new DubProjectRepository(),
    assets = new AssetDeliveryService(),
    videoGeneration,
    voiceStudio,
    languageService = new DubLanguageService(),
    fontsDir,
  } = {}) {
    Object.assign(this, {
      repo,
      assets,
      videoGeneration,
      voiceStudio,
      languageService,
      fontsDir,
    });
    this.running = new Map();
    this.uploads = new Set();
  }

  view(project, summary = false) {
    const { media, operations = [], exports, ...data } = project;
    if (summary) {
      delete data.tracks;
      delete data.cues;
      delete data.characterMappings;
      delete data.mixer;
    }
    return {
      ...data,
      mediaUrl: media ? prefix + project.id + "/media" : null,
      posterUrl: media ? prefix + project.id + "/poster" : null,
      width: media?.width || 0,
      height: media?.height || 0,
      hasAudio: media?.hasAudio || false,
      exports: summary
        ? exports.filter((e) => e.revision === project.revision).slice(-1)
        : exports,
      operations: operations.slice(-12).map(({ key, ...op }) => ({
        ...op,
        status:
          op.status === "running" && !this.running.has(key)
            ? "interrupted"
            : op.status,
      })),
    };
  }
  async list(actor, query) {
    const result = await this.repo.list(actor, query);
    return { ...result, items: result.items.map((p) => this.view(p, true)) };
  }
  async get(actor, id) {
    return this.view(await this.repo.get(actor, id));
  }
  async create(actor, body, reauthorize) {
    const targets = targetList(body.targetLanguages ?? ["th"]);
    const values = {
      name: label(body.name, 100, true).trim(),
      languageStyle: label(
        body.languageStyle === undefined ? "" : body.languageStyle,
        300,
      ).trim(),
      storyContext: label(
        body.storyContext === undefined ? "" : body.storyContext,
        2000,
      ).trim(),
      sourceLanguage: sourceLanguage(body.sourceLanguage ?? "auto"),
      targetLanguages: targets,
      durationMs: 0,
      status: "draft",
      archived: false,
      cues: [],
      tracks: tracksFor({}, targets),
      characterMappings: {},
      mixer: {},
      media: null,
      exports: [],
      operations: [],
    };
    let url = body.sourceUrl;
    if (!url && !body.sourceJobId)
      return this.view(await this.repo.create(actor, values));
    if (this.uploads.size >= 4) throw dubError("dub_upload_busy", 429);
    const id = randomUUID();
    const directory = this.repo.directory(actor, id);
    this.uploads.add(id);
    let source;
    try {
      if (!url) {
        const [task] = await this.videoGeneration.getStoredTaskSummaries(
          [label(body.sourceJobId, 160, true)],
          actor,
        );
        url = task?.outputAsset?.publicUrl;
        if (!url) throw dubError("dub_source_missing", 404);
      }
      source = await this.assets.openOwnedOutput({
        outputUrl: url,
        actor,
        reauthorize,
      });
      const media = await prepareMedia(
        source.handle.createReadStream(),
        path.join(directory, "source"),
        source.reauthorize,
      );
      await source.reauthorize();
      return this.view(
        await this.repo.create(actor, {
          ...values,
          id,
          media: { ...media, folder: "source" },
          durationMs: media.durationMs,
          status: "ready",
        }),
      );
    } catch (error) {
      await fs.rm(directory, { recursive: true, force: true });
      throw error;
    } finally {
      this.uploads.delete(id);
      await source?.handle.close().catch(() => {});
    }
  }
  async upload(actor, id, stream, reauthorize) {
    const p = await this.repo.get(actor, id);
    if (p.media) throw dubError("dub_media_already_set", 409);
    if (this.uploads.has(id) || this.uploads.size >= 4)
      throw dubError("dub_upload_busy", 429);
    this.uploads.add(id);
    const folder = randomUUID();
    const directory = path.join(this.repo.directory(actor, id), folder);
    try {
      const media = await prepareMedia(stream, directory, reauthorize);
      await reauthorize?.();
      return this.view(
        await this.repo.mutate(actor, id, p.revision, (project) => {
          project.media = { ...media, folder };
          project.durationMs = media.durationMs;
          project.status = "ready";
        }),
      );
    } catch (error) {
      await fs.rm(directory, { recursive: true, force: true });
      throw error;
    } finally {
      this.uploads.delete(id);
    }
  }
  async update(actor, id, body) {
    const busy = () =>
      [...this.running.keys()].some((key) => {
        const [projectId, kind] = JSON.parse(key);
        return projectId === id && kind === "exports";
      });
    if (busy()) throw dubError("dub_operation_busy", 429);
    const previous = await this.repo.get(actor, id);
    if (previous.revision !== body.revision)
      throw dubError("dub_revision_conflict", 409);
    const targets = targetList(
      body.targetLanguages ?? previous.targetLanguages,
    );
    const tracks = tracksFor(body.tracks || previous.tracks, targets);
    const settings = await speakerSettings(
      previous,
      body,
      targets,
      (character) => this.voiceStudio.getDubCharacter(actor, character),
    );
    const rows = body.cues ?? (body.targetLanguages ? previous.cues : null);
    const cues = rows
      ? await normalizeCues(
          rows,
          { ...previous, targetLanguages: targets },
          (take) => this.voiceStudio.getDubTake(actor, take),
        )
      : undefined;
    assertUnlocked(previous, tracks, cues || previous.cues);
    const commit = () =>
      this.repo.mutate(actor, id, body.revision, (p) => {
        if (busy()) throw dubError("dub_operation_busy", 429);
        if (body.name !== undefined)
          p.name = label(body.name, 100, true).trim();
        if (body.languageStyle !== undefined)
          p.languageStyle = label(body.languageStyle, 300).trim();
        if (body.storyContext !== undefined)
          p.storyContext = label(body.storyContext, 2000).trim();
        p.targetLanguages = targets;
        Object.assign(p, settings);
        if (body.sourceLanguage !== undefined)
          p.sourceLanguage = sourceLanguage(body.sourceLanguage);
        p.tracks = tracks;
        if (body.archived !== undefined) {
          if (typeof body.archived !== "boolean") fail();
          p.archived = body.archived;
        }
        if (cues) p.cues = cues;
        p.status = p.media ? "ready" : "draft";
      });
    return this.view(await this.commitCues(actor, id, cues, commit));
  }
  commitCues(actor, id, cues, commit) {
    if (!cues) return commit();
    const ids = [
      ...new Set(
        cues.flatMap((cue) =>
          Object.values(cue.takes || {}).map((take) => take.id),
        ),
      ),
    ];
    return this.voiceStudio.withDubTakePins(actor, id, ids, commit);
  }
  async file(actor, id, kind, exportId) {
    const project = await this.repo.get(actor, id);
    const dir = this.repo.directory(actor, id);
    if (kind === "export") {
      const record = project.exports.find((e) => e.id === exportId);
      if (!record) throw dubError("dub_export_missing", 404);
      return {
        path: path.join(dir, record.id + "." + record.format),
        filename: "subtitles-" + record.revision + "." + record.format,
        type: {
          srt: "application/x-subrip",
          vtt: "text/vtt",
          wav: "audio/wav",
          mp4: "video/mp4",
        }[record.format],
      };
    }
    if (!project.media) throw dubError("dub_media_missing", 404);
    const { folder, mediaType } = project.media;
    const name = { media: "media", poster: "poster.jpg", peaks: "peaks.json" }[
      kind
    ];
    if (!name) fail();
    return {
      path: path.join(dir, folder, name),
      type: {
        media: mediaType,
        poster: "image/jpeg",
        peaks: "application/json",
      }[kind],
    };
  }
  async perform(actor, id, kind, body, reauthorize) {
    if (!Number.isInteger(body.revision)) fail();
    const p = await this.repo.get(actor, id);
    if (!p.media) throw dubError("dub_media_missing", 409);
    const language = body.language || p.targetLanguages[0];
    if (
      !p.targetLanguages.includes(language) &&
      !(kind === "exports" && language === "source")
    )
      fail();
    const format = kind === "exports" ? body.format || "srt" : "srt";
    if (kind === "exports" && !["srt", "vtt", "wav", "mp4"].includes(format))
      fail();
    const captionLanguages =
      kind === "exports" && format === "mp4"
        ? selectedCaptions(p, body, language, true)
        : [language];
    let cueIds;
    if (body.cueIds !== undefined) {
      if (
        kind !== "translate" ||
        !Array.isArray(body.cueIds) ||
        !body.cueIds.length ||
        body.cueIds.length > 3000
      )
        fail();
      const available = new Set(p.cues.map((c) => c.id));
      if (body.cueIds.some((cueId) => !available.has(cueId)))
        throw dubError("dub_cue_missing", 422);
      cueIds = [...new Set(body.cueIds)].sort();
    }
    const sourceGain =
      body.sourceGain ?? (body.includeDubbing || format === "wav" ? 0 : 1);
    const dubGain = body.dubGain ?? 1;
    if (
      !Number.isFinite(sourceGain) ||
      sourceGain < 0 ||
      sourceGain > 1 ||
      !Number.isFinite(dubGain) ||
      dubGain < 0 ||
      dubGain > 2
    )
      fail();
    const selectionHash =
      cueIds &&
      createHash("sha256").update(JSON.stringify(cueIds)).digest("hex");
    const key = JSON.stringify([
      id,
      kind,
      body.revision,
      language,
      format,
      body.burnIn === true,
      body.includeDubbing === true,
      body.overwrite === true,
      captionLanguages,
      sourceGain,
      dubGain,
      selectionHash,
    ]);
    if (this.running.has(key)) return this.running.get(key);
    const prior = p.operations.find(
      (op) => op.key === key && op.status === "succeeded",
    );
    if (prior)
      return kind === "exports"
        ? p.exports.find((e) => e.id === prior.exportId)
        : this.view(p);
    if (p.revision !== body.revision)
      throw dubError("dub_revision_conflict", 409);
    if (
      this.running.size >= 4 ||
      [...this.running.keys()].some((k) => JSON.parse(k)[0] === id)
    )
      throw dubError("dub_operation_busy", 429);
    const work = this.execute({
      actor,
      id,
      kind,
      body,
      reauthorize,
      p,
      key,
      language,
      format,
      captionLanguages,
      sourceGain,
      dubGain,
      cueIds,
    });
    this.running.set(key, work);
    try {
      return await work;
    } finally {
      this.running.delete(key);
    }
  }
  async execute({
    actor,
    id,
    kind,
    body,
    reauthorize,
    p,
    key,
    language,
    format,
    captionLanguages,
    sourceGain,
    dubGain,
    cueIds,
  }) {
    const directory = this.repo.directory(actor, id);
    const prior = p.operations.find((item) => item.key === key);
    const now = new Date().toISOString();
    const op = {
      id: prior?.id || randomUUID(),
      key,
      kind,
      language,
      revision: p.revision,
      status: "running",
      createdAt: prior?.createdAt || now,
      startedAt: now,
      attempt: (prior?.attempt || 0) + 1,
    };
    await this.repo.mutate(
      actor,
      id,
      p.revision,
      (project) => {
        project.operations = project.operations
          .filter((item) => item.key !== key)
          .slice(-49);
        project.operations.push(op);
      },
      false,
    );
    let output;
    let tmp;
    try {
      let updates = {};
      let record;
      if (kind === "transcribe") {
        if (Object.values(p.tracks).some((track) => track.locked))
          throw dubError("dub_track_locked", 409);
        if (p.cues.length && !body.overwrite)
          throw dubError("dub_confirm_replace", 409);
        const result = await this.languageService.transcribe(p, directory);
        updates = {
          cues: await normalizeCues(result.cues, p),
          detectedLanguage: result.language,
        };
      } else if (kind === "translate") {
        if (p.tracks[language]?.locked) throw dubError("dub_track_locked", 409);
        updates.cues = await this.languageService.translate(
          p,
          language,
          body.overwrite === true,
          cueIds,
        );
      } else {
        const exportId = randomUUID();
        tmp = await fs.mkdtemp(path.join(directory, "render-"));
        output = path.join(directory, exportId + "." + format);
        await renderExport({
          project: p,
          language,
          captionLanguages,
          format,
          sourceGain,
          dubGain,
          burnIn: body.burnIn === true,
          includeDubbing: body.includeDubbing === true,
          source: path.join(directory, p.media.folder, "media"),
          dir: tmp,
          output,
          fontsDir: this.fontsDir,
          openTake: async (takeId) => {
            const take = await this.voiceStudio.getDubTake(actor, takeId);
            const file = await this.assets.openOwnedOutput({
              outputUrl: take.audioUrl,
              actor,
              reauthorize,
            });
            return { ...file, durationMs: take.durationMs };
          },
        });
        record = {
          id: exportId,
          format,
          language,
          captionLanguages,
          revision: p.revision,
          createdAt: new Date().toISOString(),
          url: prefix + id + "/exports/" + exportId,
        };
      }
      await reauthorize?.();
      const commit = () =>
        this.repo.mutate(
          actor,
          id,
          p.revision,
          (project) => {
            Object.assign(project, updates, {
              status: record ? "complete" : "ready",
            });
            Object.assign(
              project.operations.find((item) => item.id === op.id),
              {
                status: "succeeded",
                ...(record ? { exportId: record.id } : {}),
              },
            );
            if (record) project.exports.push(record);
          },
          !record,
        );
      const updated = await this.commitCues(actor, id, updates.cues, commit);
      return record || this.view(updated);
    } catch (error) {
      if (output) await fs.unlink(output).catch(() => {});
      await this.repo
        .mutate(
          actor,
          id,
          null,
          (project) => {
            const current = project.operations.find(
              (item) => item.id === op.id,
            );
            if (current)
              Object.assign(current, {
                status: "failed",
                code: publicDubError(error),
              });
          },
          false,
        )
        .catch(() => {});
      throw error;
    } finally {
      if (tmp) await fs.rm(tmp, { recursive: true, force: true });
    }
  }
  async review(actor, id, kind, body, reauthorize) {
    const p = await this.repo.get(actor, id);
    if (body.revision !== p.revision)
      throw dubError("dub_revision_conflict", 409);
    if (!p.media) throw dubError("dub_media_missing", 409);
    const key = JSON.stringify([
      id,
      kind,
      p.revision,
      body.language,
      body.timeMs,
      body.captionLanguages || body.languages,
    ]);
    if (this.running.has(key)) return this.running.get(key);
    if (this.running.size >= 4) throw dubError("dub_operation_busy", 429);
    const directory = this.repo.directory(actor, id);
    const work = async () => {
      if (kind === "ocr")
        return this.languageService.scan(
          p,
          directory,
          body.language || p.detectedLanguage || p.sourceLanguage,
        );
      if (kind === "transcribe")
        return this.languageService.transcribe(p, directory);
      if (
        !Number.isFinite(body.timeMs) ||
        body.timeMs < 0 ||
        body.timeMs >= p.durationMs
      )
        fail();
      const captions = selectedCaptions(p, body, p.targetLanguages[0]);
      const temp = await fs.mkdtemp(path.join(directory, "preview-"));
      try {
        return await renderPreview(
          p,
          captions,
          body.timeMs,
          path.join(directory, p.media.folder, "media"),
          temp,
          this.fontsDir,
        );
      } finally {
        await fs.rm(temp, { recursive: true, force: true });
      }
    };
    const task = work();
    this.running.set(key, task);
    try {
      const result = await task;
      await reauthorize?.();
      return result;
    } finally {
      this.running.delete(key);
    }
  }
}

export function publicDubError(error) {
  return /^(dub_|video_probe_|auth_|output_unavailable|voice_record_not_found)/.test(
    error?.code || "",
  )
    ? error.code
    : "dub_request_failed";
}
