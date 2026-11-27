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
  languages,
  normalizeCues,
  sourceLanguage,
  speakerSettings,
  targetList,
  tracksFor,
} from "./projectFields.js";
import { DubLanguageService } from "./DubLanguageService.js";
import { DubBatchService } from "./DubBatchService.js";
import { timingContext, proposeTimedDialogue } from "./timedDialogue.js";
import { sourceRhythms } from "./sourceRhythm.js";
import { prepareMedia } from "./DubMediaService.js";
import { renderExport, renderPreview } from "./DubExportService.js";
import { sceneTranscriptionPolicy } from "../generation/SceneTranscriptionService.js";

const prefix = "/api/dub-sub/projects/";
// A preparation from an earlier local server process has never reached dispatch.
const sceneProcessId = randomUUID();
function transcriptionRange(project, range) {
  if (range === undefined) return undefined;
  if (!range || !Number.isSafeInteger(range.startMs) || !Number.isSafeInteger(range.endMs) ||
      range.startMs < 0 || range.endMs <= range.startMs || range.endMs > project.durationMs ||
      !project.cues.length ||
      project.cues.some(cue => cue.startMs < range.endMs && cue.endMs > range.startMs))
    throw dubError("dub_invalid_timing", 422);
  return { startMs: range.startMs, endMs: range.endMs };
}
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
    analyzeSourceRhythms = sourceRhythms,
    fontsDir,
  } = {}) {
    Object.assign(this, {
      repo,
      assets,
      videoGeneration,
      voiceStudio,
      languageService,
      analyzeSourceRhythms,
      fontsDir,
    });
    this.running = new Map();
    this.uploads = new Set();
    this.activeProjects = new Map();
    this.deletingProjects = new Set();
    this.batches = new DubBatchService(this);
  }

  view(project, summary = false) {
    const { media, operations = [], exports, dubBatches, ...data } = project;
    if (summary) {
      delete data.tracks;
      delete data.cues;
      delete data.characterMappings;
      delete data.speakerProfiles;
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
  async useProject(actor, id, work) {
    const key = this.repo.directory(actor, id);
    if (this.deletingProjects.has(key)) throw dubError("dub_deletion_pending", 409);
    this.activeProjects.set(key, (this.activeProjects.get(key) || 0) + 1);
    try {
      return await work(await this.repo.get(actor, id));
    } finally {
      const count = this.activeProjects.get(key) - 1;
      if (count) this.activeProjects.set(key, count);
      else this.activeProjects.delete(key);
    }
  }

  async remove(actor, id, { confirmed, revision }, reauthorize) {
    if (confirmed !== true) throw dubError("dub_confirm_delete");
    if (!Number.isSafeInteger(revision) || revision < 1) fail();
    const key = this.repo.directory(actor, id);
    if (this.activeProjects.has(key) || this.deletingProjects.has(key))
      throw dubError("dub_operation_busy", 429);
    this.deletingProjects.add(key);
    try {
      const project = await this.repo.get(actor, id, { includePendingDeletion: true });
      if (Object.values(project.dubBatches || {}).some(batch =>
        batch.items.some(item => item.status === 'working' || item.status === 'review'))) throw dubError('dub_operation_busy', 429);
      if (project.revision !== revision) throw dubError("dub_revision_conflict", 409);
      await this.repo.checkedRemovalDirectory(actor, id);
      // Keep the confirmed intent until both stores finish. An owner retry can
      // safely resume after a file lock, pin write failure or server restart.
      await this.voiceStudio.withDubTakePins(actor, id, [], () =>
        this.repo.beginDeletion(actor, id, revision, reauthorize),
      );
      await this.repo.removePrivateFiles(actor, id);
      await this.repo.finishDeletion(actor, id, revision);
      return { id, deleted: true };
    } finally {
      this.deletingProjects.delete(key);
    }
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
  upload(actor, id, stream, reauthorize) {
    return this.useProject(actor, id, (p) => this.uploadMedia(actor, id, p, stream, reauthorize));
  }
  async uploadMedia(actor, id, p, stream, reauthorize) {
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
  update(actor, id, body) {
    return this.useProject(actor, id, (p) => this.updateProject(actor, id, p, body));
  }
  async updateProject(actor, id, previous, body) {
    const busy = () =>
      [...this.running.keys()].some((key) => {
        const [projectId, kind] = JSON.parse(key);
        return projectId === id && (kind === "exports" || kind === "gemini-scene");
      });
    if (busy()) throw dubError("dub_operation_busy", 429);
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
      (character, language) => this.voiceStudio.getDubCharacter(actor, character, language),
    );
    const rows = body.cues ?? (body.targetLanguages ? previous.cues : null);
    const source = body.sourceLanguage ?? previous.sourceLanguage;
    if (body.detectedLanguage !== undefined &&
        (source !== "auto" || !Array.isArray(body.cues) ||
         (body.detectedLanguage !== null && !languages.includes(body.detectedLanguage))))
      fail();
    if (body.detectedLanguage !== undefined && body.detectedLanguage !== (previous.detectedLanguage ?? null) &&
        previous.tracks.source.locked && tracks.source.locked) throw dubError("dub_track_locked", 409);
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
        if (body.sourceLanguage !== undefined) {
          p.sourceLanguage = sourceLanguage(body.sourceLanguage);
          if (p.sourceLanguage !== previous.sourceLanguage) delete p.detectedLanguage;
        }
        if (body.detectedLanguage === null) delete p.detectedLanguage;
        else if (body.detectedLanguage !== undefined) p.detectedLanguage = body.detectedLanguage;
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
    return this.projectFile(actor, project, kind, exportId);
  }
  withFile(actor, id, kind, exportId, send) {
    return this.useProject(actor, id, (project) =>
      send(this.projectFile(actor, project, kind, exportId)),
    );
  }
  projectFile(actor, project, kind, exportId) {
    const id = project.id;
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
  perform(actor, id, kind, body, reauthorize) {
    return this.useProject(actor, id, (p) => this.performOperation(actor, id, p, kind, body, reauthorize));
  }
  async performOperation(actor, id, p, kind, body, reauthorize) {
    if (kind === "translate") return this.translateProject(actor, p, body, reauthorize);
    if (kind !== "exports") fail();
    if (!Number.isInteger(body.revision)) fail();
    if (!p.media) throw dubError("dub_media_missing", 409);
    const language = body.language || p.targetLanguages[0];
    if (!p.targetLanguages.includes(language) && language !== "source") fail();
    const format = body.format || "srt";
    if (!["srt", "vtt", "wav", "mp4"].includes(format)) fail();
    const captionLanguages =
      format === "mp4"
        ? selectedCaptions(p, body, language, true)
        : [language];
    if (body.cueIds !== undefined) fail();
    if (body.sceneAudio !== undefined && typeof body.sceneAudio !== "boolean") fail();
    const sceneAudio = body.sceneAudio === true && (format === "wav" || (format === "mp4" && body.includeDubbing === true));
    const sourceGain =
      body.sourceGain ?? (sceneAudio ? 1 : body.includeDubbing || format === "wav" ? 0 : 1);
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
      sceneAudio ? "bandit-v2-confirmed" : null,
    ]);
    if (this.running.has(key)) return this.running.get(key);
    const prior = p.operations.find(
      (op) => op.key === key && op.status === "succeeded",
    );
    if (prior) return p.exports.find((e) => e.id === prior.exportId);
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
        sceneAudio: body.sceneAudio === true,
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
      const record = {
        id: exportId,
        format,
        sceneAudioProcessor: body.sceneAudio === true && sourceGain > 0 && p.media.hasAudio &&
          (format === "wav" || (format === "mp4" && body.includeDubbing === true)) ? "bandit-v2" : null,
        language,
        captionLanguages,
        revision: p.revision,
        createdAt: new Date().toISOString(),
        url: prefix + id + "/exports/" + exportId,
      };
      await reauthorize?.();
      await this.repo.mutate(actor, id, p.revision, project => {
        project.status = "complete";
        Object.assign(project.operations.find(item => item.id === op.id), { status: "succeeded", exportId: record.id });
        project.exports.push(record);
      }, false);
      return record;
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
  review(actor, id, kind, body, reauthorize) {
    return this.useProject(actor, id, (p) => this.reviewOperation(actor, id, p, kind, body, reauthorize));
  }
  async reviewOperation(actor, id, p, kind, body, reauthorize) {
    if (body.revision !== p.revision)
      throw dubError("dub_revision_conflict", 409);
    if (!p.media) throw dubError("dub_media_missing", 409);
    if (kind === "transcribe") {
      const expectedMethod = body.range === undefined ? "gemini-scene" : "gemini-scene-gap";
      if (body.method !== expectedMethod || body.preview !== true) fail();
      const preview = await this.reviewScene(actor, p, body, reauthorize);
      // Earlier private Gemini receipts predate the optional origin fields.
      return { ...preview, cues: preview.cues.map(cue => ({ ...cue, sourceOrigin: "gemini",
        translationOrigins: { ...cue.translationOrigins, [body.language]: "gemini" } })) };
    }
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

  async verifySceneActor(actor, reauthorize) {
    const current = await reauthorize?.();
    if (!current?.userId || current.userId !== actor.userId) throw dubError("auth_session_expired", 401);
    this.languageService.sceneGeneration.assertAccess(current);
    return current;
  }

  async translateProject(actor, project, body, reauthorize) {
    const { id } = project;
    const { language, cueIds, requestId, revision, overwrite = false } = body;
    if (body.confirmed !== true) throw dubError("dub_scene_confirmation_required", 400);
    if (body.method !== undefined || body.preview === true) fail();
    if (typeof requestId !== "string" || !/^[A-Za-z0-9_-]{8,128}$/.test(requestId) ||
        !Number.isSafeInteger(revision) || revision < 1 || !languages.includes(language) || typeof overwrite !== "boolean") fail();
    if (cueIds !== undefined && (!Array.isArray(cueIds) || !cueIds.length || cueIds.length > 3000 ||
        cueIds.some(cueId => typeof cueId !== "string" || !/^[\w-]{1,100}$/.test(cueId)))) fail();
    const selected = cueIds && [...new Set(cueIds)].sort();
    const scope = createHash("sha256").update(JSON.stringify(["translate", overwrite, selected || null])).digest("hex");
    const operationKey = JSON.stringify([id, "gemini-scene", actor.userId, revision, language, requestId, scope]);
    this.languageService.sceneGeneration.assertAccess(actor);
    await this.verifySceneActor(actor, reauthorize);
    const prior = project.operations.find(op => op.kind === "translate" && op.requestId === requestId);
    if (prior) {
      if (prior.key !== operationKey) throw dubError("dub_scene_request_conflict", 409);
      if (prior.status === "succeeded") return this.view(project);
    }
    if (revision !== project.revision) throw dubError("dub_revision_conflict", 409);
    if (!project.targetLanguages.includes(language)) fail();
    if (project.tracks[language]?.locked) throw dubError("dub_track_locked", 409);
    const context = this.languageService.translationContext(project, language, overwrite, selected);
    if (!context.cues.length) return this.view(project);
    try {
      return await this.reviewScene(actor, project, body, reauthorize, { context, scope });
    } catch (error) {
      if (error.code !== "dub_revision_conflict") throw error;
      const saved = await this.repo.get(actor, id);
      if (!saved.operations.some(op => op.key === operationKey && op.status === "succeeded")) throw error;
      await this.verifySceneActor(actor, reauthorize);
      return this.view(saved);
    }
  }

  async executeTranslation(actor, project, body, verify, translation, key) {
    const { id, revision } = project;
    const { requestId, language } = body;
    await this.repo.mutate(actor, id, revision, current => {
      const previous = current.operations.find(op => op.key === key);
      current.operations = [...current.operations.filter(op => op.key !== key).slice(-49),
        { id: previous?.id || randomUUID(), key, kind: "translate", status: "running", revision, language, requestId,
          createdAt: previous?.createdAt || new Date().toISOString() }];
    }, false);
    try {
      const translations = await this.executeScene(actor, project, requestId, language, verify, translation);
      const byId = new Map(translations.map(row => [row.id, row]));
      const saved = await this.repo.mutate(actor, id, revision, async current => {
        await verify(false);
        for (const cue of current.cues) {
          const row = byId.get(cue.id);
          if (!row) continue;
          cue.translations[language] = row.translation;
          if (row.delivery) (cue.suggestedDelivery ??= {})[language] = row.delivery;
          (cue.translationOrigins ??= {})[language] = "gemini";
        }
        current.status = current.media ? "ready" : "draft";
        current.operations.find(op => op.key === key).status = "succeeded";
      });
      return this.view(saved);
    } catch (error) {
      await this.repo.mutate(actor, id, null, current => {
        const op = current.operations.find(item => item.key === key);
        if (op?.status === "running") Object.assign(op, { status: "failed", code: publicDubError(error) });
      }, false);
      throw error;
    }
  }

  cueRhythm(actor,id,{cueId,revision},reauthorize) {
    return this.useProject(actor,id,async project=>{
      if (revision !== project.revision) throw dubError("dub_revision_conflict",409);
      const cue = project.cues.find(c=>c.id===cueId);
      if (!cue) throw dubError("dub_cue_missing",422);
      await reauthorize();
      const rhythms = await this.analyzeSourceRhythms(this,actor,project,[cue],reauthorize);
      return rhythms.get(cueId) ?? [];
    });
  }

  timingReview(actor,id,body,reauthorize) {
    return this.useProject(actor,id,async project => {
      const {revision,language,cueIds} = body;
      if (!project.targetLanguages.includes(language) || body.confirmed !== true || !Array.isArray(cueIds) ||
          !cueIds.length || cueIds.length > 3000 || cueIds.some(id => typeof id !== "string")) fail();
      if (revision !== project.revision) throw dubError("dub_revision_conflict",409);
      if (project.tracks[language]?.locked) throw dubError("dub_track_locked",409);
      await reauthorize();
      const requested = new Set(cueIds);
      const selectedCues = project.cues.filter(c=>requested.has(c.id));
      if (selectedCues.length !== requested.size) throw dubError("dub_cue_missing",422);
      const rhythms = await this.analyzeSourceRhythms(this,actor,project,selectedCues,reauthorize);
      const context = timingContext(project,language,cueIds,body.forceSingle === true && cueIds.length===1,rhythms);
      if (!context.cues.length) return [];
      if (context.cues.length > sceneTranscriptionPolicy.maxCues ||
          Buffer.byteLength(JSON.stringify(context)) > sceneTranscriptionPolicy.maxPreviewBytes)
        throw dubError("dub_translation_limit",413);
      const director = body.director ?? "luna";
      if (!["luna","gemini"].includes(director)) fail();
      const scope = createHash("sha256").update(JSON.stringify([director==="luna" ? "timed-dialogue" : "timed-dialogue-gemini",context])).digest("hex");
      try {
        return await this.reviewScene(actor,project,body,reauthorize,{timing:true,director,scope,context});
      } catch (error) {
        if (!["dub_scene_access_denied","dub_luna_unavailable","dub_luna_access","dub_luna_quota","dub_luna_rejected","dub_scene_provider_unavailable","dub_scene_outcome_unknown",
            "dub_scene_request_limit","dub_scene_invalid_response"].includes(error.code)) throw error;
        // Editing a project's own spoken lines remains available without operator-funded AI.
        console.warn("[DubTiming] manual_review", {requestId:body.requestId,director,code:error.code,lines:context.cues.length});
        return context.cues.map(c=>({id:c.id,original:c.text,suggested:c.text,windowMs:c.windowMs,
          ...(c.speechWindows && {speechWindows:c.speechWindows}),manual:true,reason:error.code,director}));
      }
    });
  }

  async reviewScene(actor, project, body, reauthorize, translation = null) {
    const { id, revision } = project;
    const { requestId, language } = body;
    if (body.confirmed !== true) throw dubError("dub_scene_confirmation_required", 400);
    if (typeof requestId !== "string" || !/^[A-Za-z0-9_-]{8,128}$/.test(requestId) ||
        !project.targetLanguages.includes(language)) fail();
    const range = !translation ? transcriptionRange(project, body.range) : undefined;
    const scope = range ? `gap:${range.startMs}-${range.endMs}` : translation?.scope;
    if (!translation) {
      if (!project.media?.hasAudio) throw dubError("dub_audio_missing", 422);
      if (!Number.isSafeInteger(project.durationMs) || project.durationMs <= 0 ||
          (range ? range.endMs - range.startMs : project.durationMs) > sceneTranscriptionPolicy.maxDurationMs)
        throw dubError("dub_scene_audio_limit", 413);
      if (Object.values(project.tracks).some(track => track.locked)) throw dubError("dub_track_locked", 409);
    }
    this.languageService.sceneGeneration.assertAccess(actor);
    const verify = async (checkRevision = true) => {
      const current = await this.verifySceneActor(actor, reauthorize);
      if (checkRevision && (await this.repo.get(actor, id)).revision !== revision) throw dubError("dub_revision_conflict", 409);
      return current;
    };
    await verify();
    const key = JSON.stringify([id, "gemini-scene", actor.userId, revision, language, requestId, scope]);
    if (this.running.has(key)) {
      const cached = await this.running.get(key);
      await verify(!translation || translation.timing);
      return cached;
    }
    if (this.running.size >= 4 || [...this.running.keys()].some(other => JSON.parse(other)[0] === id))
      throw dubError("dub_operation_busy", 429);
    const task = translation && !translation.timing
      ? this.executeTranslation(actor, project, body, verify, translation, key)
      : this.executeScene(actor, project, requestId, language, verify, translation, scope, range);
    this.running.set(key, task);
    try {
      const result = await task;
      await verify(!translation || translation.timing);
      return result;
    } finally {
      this.running.delete(key);
    }
  }

  async sceneProgress(actor, id, requestId) {
    this.languageService.sceneGeneration.assertAccess(actor);
    const project = await this.repo.get(actor, id);
    const records = await this.repo.readSceneReceipts(actor, id);
    const record = records.find(r => (!r.scope || r.scope.startsWith("gap:")) && r.revision === project.revision &&
      (r.requestId === requestId || r.replayIds?.includes(requestId)));
    if (!record) throw dubError("dub_scene_request_missing", 404);
    const uncertain = record.code === "dub_scene_outcome_unknown" ||
      (record.status === "dispatching" && record.processId !== sceneProcessId);
    return { total: record.totalParts || 0, done: record.doneParts || 0,
      status: uncertain ? "unknown" : record.status };
  }

  async executeScene(actor, project, requestId, language, verify, translation, scope, range) {
    const { id, revision } = project;
    const source = translation ? null : await this.repo.sceneSource(actor, project);
    const timing = translation?.timing;
    const luna = timing && translation.director !== "gemini";
    const assertAvailable = () => luna ? this.languageService.sceneGeneration.timedDirector() : this.languageService.sceneGeneration.assertAvailable();
    const receipt = apply => this.repo.sceneReceipts(actor, id, apply);
    const partPolicy = translation ? null : JSON.stringify(sceneTranscriptionPolicy);
    const claim = await receipt(records => {
      const duplicate = records.find(record => record.requestId === requestId || record.replayIds?.includes(requestId));
      if (duplicate && (duplicate.revision !== revision || duplicate.language !== language || duplicate.scope !== scope))
        throw dubError("dub_scene_request_conflict", 409);
      const matching = records.filter(record => record.revision === revision && record.language === language && record.scope === scope);
      const replay = duplicate || matching.find(record => record.status !== "failed");
      if (replay) {
        if (!duplicate) {
          replay.replayIds ??= [];
          if (replay.replayIds.length >= sceneTranscriptionPolicy.maxReplayIdsPerRequest)
            throw dubError("dub_scene_request_limit", 429);
          replay.replayIds.push(requestId);
        }
        if (replay.status === "succeeded") return { preview: replay.preview };
        if (replay.status === "preparing" && replay.processId !== sceneProcessId) {
          assertAvailable();
          replay.processId = sceneProcessId;
          return { requestId: replay.requestId, parts: replay.parts };
        }
        return { code: replay.code || "dub_scene_outcome_unknown", statusCode: replay.statusCode || 409, retryable: replay.retryable };
      }
      assertAvailable();
      const reservedCalls = timing ? Math.ceil(translation.context.cues.length / sceneTranscriptionPolicy.timedDialogue.linesPerRequest) : 0;
      if (timing && reservedCalls + records.filter(r=>r.revision===revision).reduce((n,r)=>n+(r.reservedCalls || 0),0)
          > sceneTranscriptionPolicy.timedDialogue.maxCallsPerRevision) throw dubError("dub_scene_request_limit",429);
      if (records.filter(record => record.revision === revision).length >= sceneTranscriptionPolicy.maxRequestsPerRevision)
        throw Object.assign(dubError("dub_scene_request_limit", 429), { revisionLimit: sceneTranscriptionPolicy.maxRequestsPerRevision });
      while (records.length >= sceneTranscriptionPolicy.maxRetainedRequestsPerProject) {
        const oldestStale = records.findIndex(record => record.revision < revision);
        if (oldestStale < 0) throw dubError("dub_scene_request_limit", 429);
        records.splice(oldestStale, 1);
      }
      for (const record of records) if (record.revision !== revision) {
        delete record.preview;
        delete record.parts;
      }
      const prior = !translation && matching.findLast(r => r.retryable && r.parts && r.partPolicy === partPolicy);
      const parts = prior ? prior.parts : {};
      if (prior) delete prior.parts;
      records.push({ requestId, revision, language, scope, ...(timing && {reservedCalls}), model: luna ? sceneTranscriptionPolicy.timedDialogue.model : sceneTranscriptionPolicy.model,
        ...(!translation && { parts, partPolicy, totalParts: prior?.totalParts || 0, doneParts: Object.keys(parts).length }),
        confirmedAt: new Date().toISOString(), status: "preparing", processId: sceneProcessId });
      return { requestId, parts };
    });
    if (claim.code) {
      if (timing) console.info("[DubTiming] retained_request", {requestId,director:translation.director,code:claim.code});
      throw Object.assign(dubError(claim.code, claim.statusCode), { retryable: claim.retryable });
    }
    if (claim.preview) return claim.preview;
    const update = change => receipt(records => {
      const record = records.find(item => item.requestId === claim.requestId);
      if (!record || record.processId !== sceneProcessId) throw dubError("dub_scene_request_conflict", 409);
      Object.assign(record, change);
    });
    let dispatching = false;
    let dispatchCount = 0;
    let totalParts = 0;
    const completedParts = new Set(Object.keys(claim.parts || {}).map(Number));
    const hooks = {
      range,
      cachedParts: claim.parts || {},
      onPlan: async total => {
        totalParts = total;
        await update({ totalParts: total });
      },
      onPart: (index, result) => receipt(records => {
        const record = records.find(r => r.requestId === claim.requestId);
        if (!record || record.processId !== sceneProcessId) throw dubError("dub_scene_request_conflict", 409);
        record.parts ??= {};
        record.parts[index] = result;
        record.doneParts = Object.keys(record.parts).length;
        completedParts.add(index);
      }),
    };
    try {
      const beforeDispatch = async () => {
        await update({ status: "dispatching" });
        const current = await verify();
        dispatching = true;
        dispatchCount++;
        return current;
      };
      const preview = timing ? await proposeTimedDialogue(translation.context,beforeDispatch,
        (current,input)=>this.languageService.sceneGeneration.shorten(current,input,translation.director)) : translation
        ? await this.languageService.translate(translation.context, beforeDispatch)
        : await this.languageService.transcribeScene(project, source, language, beforeDispatch, hooks);
      await update({ status: "succeeded", preview, parts: undefined });
      return preview;
    } catch (error) {
      if (!translation && error.code === "dub_scene_invalid_response")
        console.warn("[DubTranscription] preview rejected", { requestId: claim.requestId, reason: error.reason || "invalid_scene_response" });
      // A timing review may already have completed other groups before this one failed.
      const rejectedFirstGroup = timing && dispatchCount === 1 &&
        ["dub_luna_access","dub_luna_quota","dub_luna_rejected","dub_scene_provider_unavailable"].includes(error.code);
      const unknown = dispatching && !rejectedFirstGroup && (timing || !error.code?.startsWith("dub_") || error.code === "dub_scene_outcome_unknown");
      const retryable = !translation && totalParts > completedParts.size && !unknown &&
        ["dub_scene_invalid_response", "dub_scene_provider_unavailable", "dub_scene_provider_rejected"].includes(error.code);
      if (retryable) error.retryable = true;
      await update({ status: unknown ? "dispatching" : "failed",
        retryable, ...(!retryable && { parts: undefined }),
        code: unknown ? "dub_scene_outcome_unknown" : publicDubError(error), statusCode: error.statusCode || 500 });
      throw error;
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
