import { createHash, randomUUID } from "node:crypto";
import { dubError } from "../../repositories/dub-sub/DubProjectRepository.js";
import { workspaceCreditDecision } from "../credits/WorkspaceCreditPolicy.js";
import { fitTakeOffset } from "./fitTakeOffset.js";
import { takePlacement } from "./takePlacement.js";

const modelId = "dola-seed-audio";
const fingerprint = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

function hasCandidate(item) {
  return item.status === "needs_listen" || (item.status === "failed" &&
    (item.errorCode === "dub_take_exceeds_window" || item.errorCode?.startsWith("dub_take_rhythm_")));
}

async function castStillMatches(voice,actor,item,language) {
  try {
    return fingerprint(await voice.getSeedDubCasting(actor,item.characterId,language))===item.castSignature;
  } catch (error) {
    if (["voice_record_not_found","voice_language_mismatch","dub_voice_required"].includes(error.code)) return false;
    throw error;
  }
}

function place(cue, language, take, offsetMs, primaryLanguage, internalPausesAccepted=false) {
  return {...cue,offsetMs,takes:{...cue.takes,[language]:{
    id:take.id,audioUrl:take.audioUrl,durationMs:take.durationMs,...(internalPausesAccepted && {internalPausesAccepted:true})
  }},...(language===primaryLanguage && {selectedTakeId:take.id})};
}

function lineInput(project, cue, language) {
  const binding = cue.voiceBindings?.[language];
  return {
    text: (
      binding?.dubText ??
      cue.translations?.[language] ??
      (project.sourceLanguage === language ? cue.text : "")
    ).trim(),
    characterId:
      (!binding?.usesSpeakerMapping && binding?.characterId) ||
      project.characterMappings?.[language]?.[cue.speaker] ||
      "",
    delivery: {
      ...cue.suggestedDelivery?.[language],
      ...cue.deliveryOverrides?.[language],
    },
    start: cue.startMs,
    end: cue.endMs,
    ...(cue.offsetMs && {offsetMs:cue.offsetMs}),
    previousTake: cue.takes?.[language]?.id || null,
  };
}
function view(batch) {
  if (!batch) return null;
  return {
    id: batch.id,
    language: batch.language,
    status: batch.status,
    totalCredits: batch.totalCredits,
    items: batch.items.map(({ cueId, status, errorCode, durationMs, targetMs, operationId, internalPausesAccepted }) => ({
      cueId,
      status,
      ...(errorCode === "dub_take_rhythm_pause" && operationId && {takeId:operationId}),
      ...(internalPausesAccepted && {internalPausesAccepted:true}),
      ...(errorCode && { errorCode }),
      ...(errorCode === "dub_take_exceeds_window" && { durationMs, targetMs }),
    })),
  };
}
function currentBatch(project, batchId) {
  const batch = Object.values(project.dubBatches || {}).find(
    (value) => value.id === batchId,
  );
  if (!batch) throw dubError("dub_batch_changed", 409);
  return batch;
}
function summarize(batch) {
  if (batch.items.some((item) => item.status === "review")) return "partial";
  if (batch.items.some((item) => ["pending", "working"].includes(item.status)))
    return "running";
  return batch.items.some((item) => item.status === "failed" || item.status === "needs_listen")
    ? "partial"
    : "complete";
}

// The project owns the run manifest. Voice Studio owns documents, speech requests and take pins.
export class DubBatchService {
  constructor(projects) {
    this.projects = projects;
    this.locks = new Set();
  }
  async exclusive(actor, id, work) {
    return this.projects.useProject(actor, id, async (project) => {
      const key = this.projects.repo.directory(actor, id);
      if (this.locks.has(key)) throw dubError("dub_batch_busy", 409);
      this.locks.add(key);
      try {
        return await work(await this.projects.repo.get(actor, project.id));
      } finally {
        this.locks.delete(key);
      }
    });
  }
  async get(actor, id, language) {
    const project = await this.projects.repo.get(actor, id);
    if (!project.targetLanguages.includes(language))
      throw dubError("dub_batch_invalid", 400);
    return view(project.dubBatches?.[language]);
  }
  async prepare(actor, id, { language, revision, mode, acceptRhythmMismatch = false }, verify) {
    return this.exclusive(actor, id, async (project) => {
      if (
        !project.targetLanguages.includes(language) ||
        !["missing", "all", "failed"].includes(mode) ||
        typeof acceptRhythmMismatch !== "boolean"
      )
        throw dubError("dub_batch_invalid", 400);
      if (project.tracks?.[language]?.locked)
        throw dubError("dub_track_locked", 409);
      const previous = project.dubBatches?.[language];
      if (
        previous?.status === "running" ||
        previous?.items.some((i) => i.status === "review")
      )
        return view(previous);
      if (revision !== project.revision)
        throw dubError("dub_revision_conflict", 409);
      const free = workspaceCreditDecision(actor, "speech").creditsDisabled;
      if (
        previous?.status === "prepared" &&
        previous.timed === true &&
        previous.rhythmVersion === 1 &&
        previous.revision === revision &&
        previous.mode === mode &&
        (previous.acceptRhythmMismatch === true) === acceptRhythmMismatch &&
        (previous.totalCredits === null) === free &&
        (!previous.expiresAt || previous.expiresAt > Date.now())
      )
        return view(previous);
      const failed = new Set(
        previous?.items
          .filter((i) => i.status === "failed" || hasCandidate(i))
          .map((i) => i.cueId),
      );
      const cues = project.cues.filter((cue) =>
        mode === "failed"
          ? failed.has(cue.id) && !cue.takes?.[language]
          : mode === "all" || !cue.takes?.[language],
      );
      if (!cues.length) throw dubError("dub_batch_empty", 422);
      await verify();
      const voice = this.projects.voiceStudio;
      const catalog = await voice.catalog(actor);
      const cast = new Map();
      const lines = [];
      const reusable = [];
      const priorItems = new Map(previous?.items.map(i=>[i.cueId,i]));
      for (const cue of cues) {
        const input = lineInput(project, cue, language);
        if (
          !input.text ||
          [...input.text].length > catalog.policy.maxTextLength
        )
          throw dubError("dub_batch_text_required", 422);
        if (!input.characterId) throw dubError("dub_batch_voice_required", 422);
        if (!cast.has(input.characterId)) {
          try {
            cast.set(
              input.characterId,
              await voice.getSeedDubCasting(actor, input.characterId, language),
            );
          } catch {
            throw dubError("dub_batch_voice_required", 422);
          }
        }
        const prior = priorItems.get(cue.id);
        if (mode==="missing" && prior && hasCandidate(prior)) {
          reusable.push({...prior,status:"pending",fromExisting:true,errorCode:undefined});
        } else lines.push({ cueId: cue.id, input });
      }
      const rhythms = await this.projects.analyzeSourceRhythms(this.projects,actor,project,cues,verify);
      const batch = {
        id: randomUUID(),
        timed: true,
        rhythmVersion: 1,
        acceptRhythmMismatch,
        mode,
        language,
        revision,
        status: "prepared",
        totalCredits: free ? null : 0,
        items: reusable,
      };
      const chunkSize = catalog.policy.maxRows || 100;
      for (let start = 0; start < lines.length; start += chunkSize) {
        await verify();
        const chunk = lines.slice(start, start + chunkSize);
        const doc = await voice.createDocument(actor, {
          title: project.name,
          modelId,
          language,
        });
        const configured = await voice.updateDocument(actor, doc.id, {
          expectedRevision: doc.revision,
          rows: chunk.map(({ cueId, input }) => ({
            id: cueId,
            enabled: true,
            characterPresetId: input.characterId,
            text: input.text,
            targetDurationMs: input.end - input.start,
            ...(rhythms.has(cueId) && {speechWindows:rhythms.get(cueId)}),
            delivery: input.delivery,
            selectedTakeId: null,
          })),
        });
        for (const { cueId, input } of chunk) {
          const requestId = randomUUID();
          const quote = free
            ? null
            : await voice.quote(actor, doc.id, cueId, {
                expectedRevision: configured.revision,
              });
          if (quote) {
            batch.totalCredits += quote.totalCredits;
            batch.expiresAt = Math.min(
              batch.expiresAt || Infinity,
              Date.parse(quote.expiresAt),
            );
          }
          batch.items.push({
            cueId,
            status: "pending",
            documentId: doc.id,
            rowId: cueId,
            documentRevision: configured.revision,
            characterId: input.characterId,
            signature: fingerprint(input),
            castSignature: fingerprint(cast.get(input.characterId)),
            requestId,
            operationId: quote?.id || "speech_" + requestId,
          });
        }
      }
      const order = new Map(cues.map((cue,index)=>[cue.id,index]));
      batch.items.sort((a,b)=>order.get(a.cueId)-order.get(b.cueId));
      await verify();
      await this.projects.repo.mutate(
        actor,
        id,
        revision,
        (p) => {
          (p.dubBatches ??= {})[language] = batch;
        },
        false,
      );
      return view(batch);
    });
  }
  async useTakeBoundaries(actor,id,{revision,language,cueId,takeId,confirmedOverrunMs},verify) {
    return this.exclusive(actor,id,async project=>{
      if (typeof cueId!=="string" || typeof takeId!=="string" || !takeId || takeId.length>160)
        throw dubError("dub_invalid_input",422);
      if (revision!==project.revision) throw dubError("dub_revision_conflict",409);
      if (!project.targetLanguages.includes(language)) throw dubError("dub_invalid_input",422);
      if (project.tracks?.[language]?.locked) throw dubError("dub_track_locked",409);
      const batch=project.dubBatches?.[language];
      if (batch?.status==="running") throw dubError("dub_batch_busy",409);
      const cue=project.cues.find(c=>c.id===cueId);
      const binding=cue?.voiceBindings?.[language];
      if (!binding?.rowId || !binding.documentId) throw dubError("dub_batch_changed",409);
      await verify();
      const voice=this.projects.voiceStudio;
      const take=await voice.getDubTake(actor,takeId);
      if (take.rowId!==binding.rowId || take.documentId!==binding.documentId)
        throw dubError("dub_batch_changed",409);
      const freeTiming=take.inputSnapshot?.boundaryTimingOnly && !take.inputSnapshot.speechWindows;
      let offsetMs=freeTiming ? 0 : cue.offsetMs ?? 0;
      const explicitOverrun=confirmedOverrunMs!==undefined;
      if (explicitOverrun) {
        const placement=takePlacement({...cue,offsetMs},take.durationMs,project.durationMs);
        if (placement.start<0 || placement.fits || !(confirmedOverrunMs>0) ||
            take.durationMs-placement.availableMs!==confirmedOverrunMs)
          throw dubError("dub_take_exceeds_window",422);
      } else {
        let candidate=take;
        if (!freeTiming) {
          const rhythms=await this.projects.analyzeSourceRhythms(this.projects,actor,project,[cue],verify);
          candidate={...take,inputSnapshot:{...take.inputSnapshot,speechWindows:rhythms.get(cueId)}};
        }
        const fit=await fitTakeOffset(project,cue,language,candidate,voice,actor,false,true);
        if (fit.errorCode) throw dubError(fit.errorCode,422);
        offsetMs=fit.offsetMs;
      }
      await verify();
      const placed=place(cue,language,take,offsetMs,project.targetLanguages[0],!explicitOverrun);
      if (explicitOverrun) placed.takes[language].confirmedOverrunMs=confirmedOverrunMs;
      const cues=project.cues.map(c=>c.id===cueId ? placed : c);
      const committed=await this.projects.commitCues(actor,id,cues,()=>this.projects.repo.mutate(actor,id,revision,p=>{
        p.cues=cues;
        const b=p.dubBatches?.[language];
        const item=b?.items.find(i=>i.cueId===cueId && i.operationId===take.id && hasCandidate(i));
        if (item) {item.status="done"; delete item.errorCode; item.internalPausesAccepted=!explicitOverrun; b.status=summarize(b);}
      }));
      return this.projects.view(committed);
    });
  }
  async retime(actor,id,batchId,revision,verify,pauseException) {
    return this.exclusive(actor,id,async project=>{
      const batch = currentBatch(project,batchId);
      if (revision !== project.revision) throw dubError("dub_revision_conflict",409);
      if (project.tracks?.[batch.language]?.locked) throw dubError("dub_track_locked",409);
      if (!["complete","partial"].includes(batch.status) ||
          batch.items.some(i=>["pending","working","review"].includes(i.status))) throw dubError("dub_batch_busy",409);
      const cues = [...project.cues];
      const indices = new Map(cues.map((cue,index)=>[cue.id,index]));
      const items = batch.items.map(i=>({...i}));
      const voice = this.projects.voiceStudio;
      let candidates = items.filter(hasCandidate);
      if (pauseException !== undefined) {
        candidates = candidates.filter(item => item.cueId === pauseException?.cueId &&
          item.operationId === pauseException?.takeId && item.errorCode === "dub_take_rhythm_pause");
        if (candidates.length !== 1) throw dubError("dub_batch_changed",409);
      }
      for (const item of candidates) {
        await verify();
        const index = indices.get(item.cueId);
        const cue = cues[index];
        if (!cue) continue;
        const selected = cue.takes?.[batch.language];
        if (selected && !pauseException) {
          item.status="done"; delete item.errorCode;
          continue;
        }
        if (cue.voiceBindings?.[batch.language]?.operationId!==item.operationId ||
            fingerprint(lineInput(project,cue,batch.language))!==item.signature ||
            !await castStillMatches(voice,actor,item,batch.language)) {
          item.status="needs_listen"; item.errorCode="dub_batch_changed"; continue;
        }
        let take;
        try { take = await voice.getDubTake(actor,item.operationId); }
        catch (error) {
          if (error.code!=="voice_record_not_found") throw error;
          item.status="failed"; item.errorCode="dub_batch_changed"; continue;
        }
        if (pauseException && !take.inputSnapshot?.speechWindows) {
          const rhythms=await this.projects.analyzeSourceRhythms(this.projects,actor,project,[cue],verify);
          take={...take,inputSnapshot:{...take.inputSnapshot,speechWindows:rhythms.get(cue.id)}};
        }
        const fit = await fitTakeOffset({...project,cues},cue,batch.language,take,voice,actor,false,!!pauseException);
        if (fit.errorCode) {
          item.status="needs_listen"; item.errorCode=fit.errorCode;
          if (fit.errorCode==="dub_take_exceeds_window") Object.assign(item,{durationMs:take.durationMs,targetMs:fit.targetMs});
        } else {
          cues[index]=place(cue,batch.language,take,fit.offsetMs,project.targetLanguages[0],!!pauseException);
          if (pauseException) item.internalPausesAccepted = true;
          item.status="done"; delete item.errorCode;
        }
      }
      await verify();
      if (JSON.stringify(items)===JSON.stringify(batch.items)) return view(batch);
      const committed=await this.projects.commitCues(actor,id,cues,()=>this.projects.repo.mutate(actor,id,revision,p=>{
        p.cues=cues;
        const b=currentBatch(p,batchId);
        b.items=items; b.status=summarize(b);
      }));
      return view(currentBatch(committed,batchId));
    });
  }
  async advance(actor, id, batchId, { confirmed, retime, revision, pauseException }, verify) {
    if (retime === true) return this.retime(actor,id,batchId,revision,verify,pauseException);
    if (confirmed !== true) throw dubError("dub_batch_invalid", 400);
    return this.exclusive(actor, id, async (project) => {
      const batch = currentBatch(project, batchId);
      const item =
        batch.items.find(
          (i) => i.status === "review" || i.status === "working",
        ) || batch.items.find((i) => i.status === "pending");
      if (!item) return view(batch);
      if (
        (batch.totalCredits === null) !==
        workspaceCreditDecision(actor, "speech").creditsDisabled
      )
        throw dubError("dub_batch_price_changed", 409);
      if (batch.status === "prepared" && project.revision !== batch.revision)
        throw dubError("dub_batch_changed", 409);
      const voice = this.projects.voiceStudio;
      const setStatus = async (status, errorCode, timing) => {
        if (
          batch.status !== "prepared" &&
          item.status === status &&
          item.errorCode === errorCode
        )
          return view(batch);
        const updated = await this.projects.repo.mutate(
          actor,
          id,
          null,
          (p) => {
            const b = currentBatch(p, batchId),
              line = b.items.find((i) => i.cueId === item.cueId);
            line.status = status;
            if (timing) Object.assign(line, timing);
            if (errorCode) line.errorCode = errorCode;
            else delete line.errorCode;
            b.status = summarize(b);
          },
          false,
        );
        const latestBatch = currentBatch(updated, batchId);
        batch.status = latestBatch.status;
        item.status = status;
        item.errorCode = errorCode;
        return view(latestBatch);
      };
      await verify();
      let op;
      try {
        op = item.fromExisting ? {status:"succeeded",take:await voice.getDubTake(actor,item.operationId)}
          : await voice.readGeneration(actor, item.operationId);
      } catch (err) {
        if (item.fromExisting && err.code==="voice_record_not_found") return setStatus("failed","dub_batch_changed");
        if (err.code !== "speech_not_found") throw err;
      }
      const cue = project.cues.find((c) => c.id === item.cueId);
      const unchanged =
        cue &&
        project.targetLanguages.includes(batch.language) &&
        fingerprint(lineInput(project, cue, batch.language)) === item.signature;
      if (item.fromExisting && (!unchanged || cue.voiceBindings?.[batch.language]?.operationId!==item.operationId ||
          !await castStillMatches(voice,actor,item,batch.language)))
        return setStatus("needs_listen","dub_batch_changed");
      if (!op || op.status === "quoted") {
        if (item.fromExisting) return setStatus("failed","dub_batch_changed");
        if (!batch.timed) return setStatus("failed", "dub_batch_changed");
        if (project.tracks?.[batch.language]?.locked)
          throw dubError("dub_track_locked", 409);
        if (!unchanged) return setStatus("failed", "dub_batch_changed");
        let cast;
        try {
          cast = await voice.getSeedDubCasting(
            actor,
            item.characterId,
            batch.language,
          );
        } catch {
          return setStatus("failed", "dub_batch_voice_required");
        }
        if (fingerprint(cast) !== item.castSignature)
          return setStatus("failed", "dub_batch_changed");
        // Persist the immutable request/quote correlation before admission. After an interrupted response,
        // the next step reads this operation first and resubmits only the same idempotent request.
        await setStatus("working");
        await verify();
        const latest = await this.projects.repo.get(actor, id);
        if (latest.tracks?.[batch.language]?.locked)
          return setStatus("failed", "dub_track_locked");
        const currentCue = latest.cues.find((row) => row.id === item.cueId);
        if (
          !currentCue ||
          fingerprint(lineInput(latest, currentCue, batch.language)) !==
            item.signature
        )
          return setStatus("failed", "dub_batch_changed");
        try {
          op = await voice.generate(actor, item.documentId, item.rowId, {
            expectedRevision: item.documentRevision,
            quoteId: item.operationId,
            requestId: item.requestId,
          });
        } catch (err) {
          if (err.code === "speech_actor_busy") return setStatus("pending");
          if (err.code === "speech_provider_unavailable")
            return setStatus("failed", err.code);
          if (err.code && err.statusCode < 500)
            return setStatus("failed", err.code);
          throw err;
        }
      }
      if (op.status === "failed") return setStatus("failed", op.errorCode);
      if (op.status === "reconciliation_required")
        return setStatus("review", op.errorCode);
      if (op.status !== "succeeded") return setStatus("working");
      if (project.tracks?.[batch.language]?.locked)
        return setStatus("failed", "dub_track_locked");
      if (!unchanged || !op.take)
        return setStatus("failed", "dub_batch_changed");
      const take = op.take;
      const {offsetMs,errorCode,targetMs} = await fitTakeOffset(
        project,cue,batch.language,take,voice,actor,batch.acceptRhythmMismatch === true,
      );
      const cues = project.cues.map((row) =>
        row.id !== cue.id
          ? row
          : {
              ...(errorCode ? row : place(row,batch.language,take,offsetMs,project.targetLanguages[0])),
              voiceBindings: {
                ...row.voiceBindings,
                [batch.language]: {
                  ...row.voiceBindings?.[batch.language],
                  documentId: item.documentId,
                  rowId: item.rowId,
                  operationId: item.operationId,
                  operationRevision: item.documentRevision,
                  characterId: item.characterId,
                  usesCueDelivery: true,
                  usesSpeakerMapping:
                    row.voiceBindings?.[batch.language]?.usesSpeakerMapping ||
                    !row.voiceBindings?.[batch.language]?.characterId,
                },
              },
            },
      );
      await verify();
      const committed = await this.projects.commitCues(actor, id, cues, () =>
        this.projects.repo.mutate(actor, id, project.revision, (p) => {
          const b = currentBatch(p, batchId),
            line = b.items.find((i) => i.cueId === cue.id);
          p.cues = cues;
          line.status = errorCode ? "needs_listen" : "done";
          if (errorCode) line.errorCode = errorCode;
          else delete line.errorCode;
          if (errorCode === "dub_take_exceeds_window") Object.assign(line,{durationMs:take.durationMs,targetMs});
          b.status = summarize(b);
        }),
      );
      return view(currentBatch(committed, batchId));
    });
  }
}
