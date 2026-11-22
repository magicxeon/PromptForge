import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { DubProjectRepository } from "../server/repositories/dub-sub/DubProjectRepository.js";
import { DubProjectService } from "../server/domain/dub-sub/DubProjectService.js";
import { withWebNextCreditPolicy } from "../server/domain/credits/WorkspaceCreditPolicy.js";
import { webNextCreditRoute } from "../server/config/webNextProxy.js";
import { takePlacement } from "../server/domain/dub-sub/takePlacement.js";
import { normalizeCues } from "../server/domain/dub-sub/projectFields.js";

async function fixture(t, { free = true } = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), "dub-batch-"));
  t.after(() => rm(dir, { force: true, recursive: true }));
  const repo = new DubProjectRepository(dir);
  const actor = withWebNextCreditPolicy({ userId: "buyer" }, !free);
  const noop = async () => {};
  const project = await repo.create(actor, {
    name: "Pilot",
    targetLanguages: ["th"],
    characterMappings: { th: { Hero: "char" } },
    exports: [],
    operations: [],
    cues: [0, 1, 2].map((i) => ({
      id: "cue" + i,
      startMs: i * 2000,
      endMs: i * 2000 + 2000,
      speaker: "Hero",
      text: "source",
      translations: { th: "line" + i },
      voiceBindings: i === 1 ? { th: { dubText: "reviewed line" } } : {},
      takes: i === 0 ? { th: { id: "original" } } : {},
      suggestedDelivery: { th: { emotion: "calm" } },
      deliveryOverrides: { th: { pace: "slow" } },
    })),
  });
  const jobs = new Map(),
    requests = [],
    documents = [];
  const voiceStudio = {
    catalog: async () => ({ policy: { maxRows: 100, maxTextLength: 2000 } }),
    getSeedDubCasting: async () => ({
      characterRevision: 1,
      voiceId: "private-preset",
      voiceRevision: 1,
    }),
    createDocument: async () => ({ id: "doc" + documents.length, revision: 1 }),
    updateDocument: async (_actor, id, body) => {
      documents.push(body);
      return { id, revision: 2 };
    },
    readGeneration: async (_actor, id) => {
      if (!jobs.has(id))
        throw Object.assign(new Error(), { code: "speech_not_found" });
      return jobs.get(id);
    },
    quote: async (_actor, doc, row) => {
      const id = "quote" + doc + row;
      jobs.set(id, { id, status: "quoted" });
      return {
        id,
        totalCredits: 3,
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      };
    },
    generate: async (_actor, doc, row, request) => {
      requests.push(request);
      const op = { id: request.quoteId, status: "queued" };
      jobs.set(op.id, op);
      return op;
    },
    withDubTakePins: async (_actor, _id, _takes, commit) => commit(),
  };
  const service = new DubProjectService({ repo, voiceStudio });
  const prepare = async (mode, acceptRhythmMismatch) =>
    service.batches.prepare(
      actor,
      project.id,
      {
        language: "th",
        revision: (await repo.get(actor, project.id)).revision,
        mode,
        acceptRhythmMismatch,
      },
      noop,
    );
  const step = (id) =>
    service.batches.advance(actor, project.id, id, { confirmed: true }, noop);
  return {
    repo,
    actor,
    project,
    service,
    prepare,
    step,
    jobs,
    requests,
    documents,
    noop,
  };
}

test("confirming timed dialogue saves wording before a voice row exists", async t => {
  const f = await fixture(t);
  const project = {...f.project,durationMs:6000};
  const cue = f.project.cues[1];
  const cues = await normalizeCues([cue],project,()=>assert.fail("unexpected take lookup"));
  assert.equal(cues[0].voiceBindings.th.dubText,"reviewed line");
  assert.equal(cues[0].translations.th,"line1");
  for (const binding of [{documentId:"doc",dubText:"line"},{operationId:"op",dubText:"line"},{dubText:42}]) {
    await assert.rejects(normalizeCues([{...cue,voiceBindings:{th:binding}}],project,()=>{}),{code:"dub_invalid_input"});
  }
  await f.repo.mutate(f.actor,project.id,project.revision,p=>{p.cues=cues;});
  await f.prepare("missing");
  assert.equal(f.documents[0].rows[0].text,"reviewed line");
});

test("remaining cues use reviewed wording, merge delivery, and resume without sending a second request", async (t) => {
  const f = await fixture(t);
  const windows = [{startMs:400,endMs:800},{startMs:1150,endMs:1800}];
  f.service.analyzeSourceRhythms = async (service,actor,project,requested)=>{
    assert.equal(actor.userId,f.actor.userId);
    return new Map(requested.filter(c=>c.id==="cue1").map(c=>[c.id,windows]));
  };
  const b = await f.prepare("missing");
  assert.deepEqual(f.documents[0].rows[0].speechWindows,windows);
  assert.equal(f.documents[0].rows[1].speechWindows,undefined);
  assert.deepEqual(await f.service.cueRhythm(f.actor,f.project.id,{revision:f.project.revision,cueId:"cue1"},f.noop),windows);
  assert.deepEqual(
    b.items.map((i) => i.cueId),
    ["cue1", "cue2"],
  );
  assert.equal(b.totalCredits, null);
  assert.equal((await f.prepare("missing")).id, b.id);
  assert.equal(f.documents.length, 1);
  assert.equal(f.documents[0].rows[0].text, "reviewed line");
  assert.equal(f.documents[0].rows[0].targetDurationMs, 2000);
  assert.deepEqual(f.documents[0].rows[0].delivery, {
    emotion: "calm",
    pace: "slow",
  });
  assert.equal(f.requests.length, 0);
  await f.step(b.id);
  await f.step(b.id);
  assert.equal(f.requests.length, 1);
  const request = f.requests[0];
  assert.equal(request.quoteId, "speech_" + request.requestId);
  f.jobs.set(request.quoteId, {
    status: "succeeded",
    take: { id: request.quoteId, audioUrl: "/test", durationMs: 1700 },
  });
  const resumed = await f.step(b.id);
  assert.equal(resumed.items[0].status, "done");
  const stored = await f.repo.get(f.actor, f.project.id);
  assert.equal(stored.cues[0].takes.th.id, "original");
  assert.equal(stored.cues[1].takes.th.id, request.quoteId);
  assert.equal(stored.cues[1].voiceBindings.th.dubText, "reviewed line");
  assert.equal(stored.cues[1].voiceBindings.th.usesSpeakerMapping, true);
  assert.equal(f.service.view(stored).dubBatches, undefined);
  await f.step(b.id);
  f.jobs.set(f.requests[1].quoteId, {
    status: "failed",
    errorCode: "speech_invalid_wav",
  });
  assert.equal((await f.step(b.id)).status, "partial");
  assert.deepEqual(
    (await f.prepare("failed")).items.map((i) => i.cueId),
    ["cue2"],
  );
});

test("a take exceeding its slot reports measured time and preserves the previous take", async t => {
  const f = await fixture(t);
  const batch = await f.prepare("all");
  await f.step(batch.id);
  f.jobs.set(f.requests[0].quoteId,{status:"succeeded",take:{id:"long",audioUrl:"/long.wav",durationMs:2900}});
  const updated = await f.step(batch.id);
  assert.deepEqual(updated.items[0],{cueId:"cue0",status:"needs_listen",errorCode:"dub_take_exceeds_window",durationMs:2900,targetMs:2000});
  assert.equal((await f.repo.get(f.actor,f.project.id)).cues[0].takes.th.id,"original");
});

test("a missing performance pause leaves a candidate for audition, retains the pinned take and continues the batch", async t => {
  const f = await fixture(t);
  const batch = await f.prepare("all");
  await f.step(batch.id);
  const opId=f.requests[0].quoteId;
  f.jobs.set(opId,{status:"succeeded",take:{id:"offbeat",audioUrl:"/offbeat.wav",durationMs:1800,
    rhythmReview:{status:"review",reasons:["pause"]}}});
  const result=await f.step(batch.id);
  assert.equal(result.items[0].errorCode,"dub_take_rhythm_pause");
  const stored=(await f.repo.get(f.actor,f.project.id)).cues[0];
  assert.equal(stored.takes.th.id,"original");
  assert.equal(stored.voiceBindings.th.operationId,opId);
  await f.step(batch.id);
  assert.equal(f.requests.length,2);
});

test("explicit performance acceptance survives resume, accepts a pause mismatch once and preserves hard limits", async t => {
  const f = await fixture(t);
  await assert.rejects(f.prepare("all","true"),{code:"dub_batch_invalid"});
  const strict = await f.prepare("all");
  const batch = await f.prepare("all",true);
  assert.notEqual(batch.id,strict.id);
  assert.equal((await f.prepare("all",true)).id,batch.id);
  await f.step(batch.id);
  const operation = f.requests[0].quoteId;
  f.jobs.set(operation,{status:"succeeded",take:{id:"offbeat",audioUrl:"/offbeat.wav",durationMs:1800,
    rhythmReview:{status:"review",reasons:["pause"]}}});
  const resumed = new DubProjectService({repo:f.repo,voiceStudio:f.service.voiceStudio});
  const result = await resumed.batches.advance(f.actor,f.project.id,batch.id,{confirmed:true},f.noop);
  assert.equal(result.items[0].status,"done");
  assert.equal(f.requests.length,1);
  assert.equal((await f.repo.get(f.actor,f.project.id)).cues[0].takes.th.id,"offbeat");
  await f.step(batch.id);
  f.jobs.set(f.requests[1].quoteId,{status:"succeeded",take:{id:"long",durationMs:3200,audioUrl:"/long.wav"}});
  assert.equal((await f.step(batch.id)).items[1].errorCode,"dub_take_overlap");
});

test("free speech placement uses only the cue length, never the source waveform",async t=>{
  const f=await fixture(t);
  const project=await f.repo.mutate(f.actor,f.project.id,f.project.revision,p=>{
    p.durationMs=6000;
    p.cues[1].voiceBindings.th={documentId:"doc",rowId:"row"};
    p.cues[1].offsetMs=300;
  });
  f.service.analyzeSourceRhythms=async()=>assert.fail("must not analyze source");
  f.service.voiceStudio.measureDubTake=async()=>assert.fail("must not match wave spikes");
  f.service.voiceStudio.getDubTake=async(_,id)=>({id,documentId:"doc",rowId:"row",audioUrl:"/take.wav",
    durationMs:id==="short"?700:2400,inputSnapshot:{boundaryTimingOnly:true}});
  const use=takeId=>f.service.batches.useTakeBoundaries(f.actor,project.id,{revision:project.revision,language:"th",cueId:"cue1",takeId},f.noop);
  await assert.rejects(use("long"),{code:/dub_take_(exceeds_window|overlap)/});
  await use("short");
  const saved=await f.repo.get(f.actor,project.id);
  assert.equal(saved.cues[1].takes.th.id,"short");
  assert.equal(saved.cues[1].offsetMs,0);
});

test("manual take acceptance checks the bound voice row and expires after changing cue timing",async t=>{
  const f=await fixture(t);
  const p=await f.repo.mutate(f.actor,f.project.id,f.project.revision,p=>{
    p.durationMs=6000;
    p.cues[0].takes={};
    p.cues[1].voiceBindings.th={documentId:"doc",rowId:"row"};
  });
  const speech=[{startMs:100,endMs:650},{startMs:1100,endMs:1800}];
  f.service.analyzeSourceRhythms=async()=>new Map([["cue1",speech]]);
  f.service.voiceStudio.getDubTake=async(_,id)=>({id,documentId:"doc",rowId:id==="wrong"?"other":"row",
    audioUrl:"/tone.wav",durationMs:1900});
  f.service.voiceStudio.measureDubTake=async()=>[{startMs:100,endMs:1800}];
  const use=takeId=>f.service.batches.useTakeBoundaries(f.actor,p.id,{revision:p.revision,language:"th",cueId:"cue1",takeId},f.noop);
  await assert.rejects(use("wrong"),{code:"dub_batch_changed"});
  await use("right");
  const saved=await f.repo.get(f.actor,p.id);
  const resolve=id=>f.service.voiceStudio.getDubTake(f.actor,id);
  const unchanged=await normalizeCues(saved.cues,saved,resolve);
  assert.equal(unchanged[1].takes.th.internalPausesAccepted,true);
  const edited=await normalizeCues(saved.cues.map(c=>c.id==="cue1"?{...c,startMs:c.startMs+50}:c),saved,resolve);
  assert.equal(edited[1].takes.th,undefined);
  assert.equal(edited[1].selectedTakeId,null);
});

test("approve only the nominated pause candidate, retaining the other candidate for review",async t=>{
  const f=await fixture(t);
  const batch=await f.prepare("all");
  const project=await f.repo.get(f.actor,f.project.id);
  const saved=await f.repo.mutate(f.actor,project.id,project.revision,p=>{
    p.durationMs=6000;
    const b=p.dubBatches.th;
    b.status="partial";
    for(const item of b.items){
      item.status="needs_listen";
      item.errorCode="dub_take_rhythm_pause";
      const binding=p.cues.find(c=>c.id===item.cueId).voiceBindings;
      binding.th={...binding.th,operationId:item.operationId};
    }
  });
  f.service.voiceStudio.getDubTake=async(_,id)=>({id,audioUrl:"/test.wav",durationMs:1900,
    inputSnapshot:{speechWindows:[{startMs:100,endMs:650},{startMs:1100,endMs:1800}]}});
  f.service.voiceStudio.measureDubTake=async()=>[{startMs:100,endMs:1800}];
  const [first,second]=saved.dubBatches.th.items;
  const approve=takeId=>f.service.batches.advance(f.actor,project.id,batch.id,{retime:true,revision:saved.revision,
    pauseException:{cueId:first.cueId,takeId}},f.noop);
  await assert.rejects(approve(second.operationId),{code:"dub_batch_changed"});
  const result=await approve(first.operationId);
  assert.deepEqual(result.items.map(i=>i.status),["done","needs_listen","needs_listen"]);
  assert.equal(result.items[0].internalPausesAccepted,true);
  assert.equal((await f.repo.get(f.actor,project.id)).cues[0].takes.th.id,first.operationId);
  assert.equal(f.requests.length,0);
});

test("retime an old partial batch using saved takes only; preserve chosen cues and skip dispatch",async t=>{
  const f=await fixture(t);
  const batch=await f.prepare("missing");
  const prepared=await f.repo.get(f.actor,f.project.id);
  const [first,second]=prepared.dubBatches.th.items;
  const takes=new Map();
  for(const item of [first,second]){
    takes.set(item.operationId,{id:item.operationId,audioUrl:"/test.wav",durationMs:1600,
      inputSnapshot:{speechWindows:[{startMs:100,endMs:1500}]}});
  }
  const p=await f.repo.mutate(f.actor,f.project.id,prepared.revision,p=>{
    p.durationMs=6000;
    for(const item of p.dubBatches.th.items){
      item.status="failed";item.errorCode="dub_take_rhythm_onset";
      p.cues.find(c=>c.id===item.cueId).voiceBindings.th={
        ...p.cues.find(c=>c.id===item.cueId).voiceBindings.th,operationId:item.operationId};
    }
    p.dubBatches.th.status="partial";
  });
  f.service.voiceStudio.getDubTake=async(actor,id)=>{assert.equal(actor,f.actor);return takes.get(id)};
  f.service.voiceStudio.measureDubTake=async(_,id)=>id===first.operationId
    ? [{startMs:290,endMs:1550}] : [{startMs:100,endMs:500},{startMs:880,endMs:1500}];
  const retime=revision=>f.service.batches.advance(f.actor,p.id,batch.id,{retime:true,revision},f.noop);
  await assert.rejects(retime(p.revision-1),{code:"dub_revision_conflict"});
  // The selected take in cue0 reserves only the portion it occupies.
  const settled=await f.repo.mutate(f.actor,p.id,p.revision,p=>{p.cues[0].takes.th.durationMs=1500;});
  const result=await retime(settled.revision);
  assert.deepEqual(result.items.map(i=>i.status),["done","needs_listen"]);
  const saved=await f.repo.get(f.actor,p.id);
  assert.equal(saved.cues[0].takes.th.id,"original");
  assert.equal(saved.cues[1].takes.th.id,first.operationId);
  assert.ok(saved.cues[1].offsetMs<0);
  assert.equal(result.items[1].errorCode,"dub_take_rhythm_pause");
  await retime(saved.revision);
  assert.equal((await f.repo.get(f.actor,p.id)).revision,saved.revision);
  const retry=await f.prepare("missing");
  assert.equal((await f.step(retry.id)).items[0].status,"needs_listen");
  f.service.voiceStudio.getSeedDubCasting=async()=>({characterRevision:2,voiceId:"new-preset",voiceRevision:1});
  const retimeCurrent=async revision=>f.service.batches.advance(f.actor,p.id,retry.id,{retime:true,revision},f.noop);
  const current=await f.repo.get(f.actor,p.id);
  assert.equal((await retimeCurrent(current.revision)).items[0].errorCode,"dub_batch_changed");
  const staleRetry=await f.prepare("missing");
  assert.equal((await f.step(staleRetry.id)).items[0].status,"needs_listen");
  const edited=await f.repo.get(f.actor,p.id);
  const alternative=await f.repo.mutate(f.actor,p.id,edited.revision,p=>{
    p.cues[2].takes.th={id:"chosen-by-user",durationMs:1400,audioUrl:"/chosen.wav"};
  });
  await f.service.batches.advance(f.actor,p.id,staleRetry.id,{retime:true,revision:alternative.revision},f.noop);
  const final=await f.repo.get(f.actor,p.id);
  assert.equal(final.dubBatches.th.items[0].status,"done");
  assert.equal(final.cues[2].takes.th.id,"chosen-by-user");
  assert.equal(f.documents.length,1);
  assert.equal(f.requests.length,0);
});

test("batch and manual selection honor offsets, project bounds and the export end tolerance", async t=>{
  const f=await fixture(t);
  await f.repo.mutate(f.actor,f.project.id,f.project.revision,p=>{p.cues[0].offsetMs=300;});
  const batch=await f.prepare("all");
  await f.step(batch.id);
  f.jobs.set(f.requests[0].quoteId,{status:"succeeded",take:{id:"late",audioUrl:"/late.wav",durationMs:1800}});
  assert.deepEqual((await f.step(batch.id)).items[0],{cueId:"cue0",status:"needs_listen",errorCode:"dub_take_exceeds_window",durationMs:1800,targetMs:1700});
  assert.equal((await f.repo.get(f.actor,f.project.id)).cues[0].takes.th.id,"original");
  const cue={id:"cue",startMs:500,endMs:2500,offsetMs:300,takes:{th:{id:"late"}}};
  const project={durationMs:2500,targetLanguages:["th"],cues:[]};
  const choose=(offsetMs,durationMs)=>normalizeCues([{...cue,offsetMs}],project,async()=>({id:"late",durationMs,audioUrl:"/late.wav"}));
  await assert.rejects(choose(300,1726),{code:"dub_take_exceeds_window"});
  assert.equal((await choose(300,1725))[0].takes.th.id,"late");
  assert.equal((await choose(-500,2500))[0].takes.th.id,"late");
  await assert.rejects(choose(-501,100),{code:"dub_take_exceeds_window"});
  assert.equal(takePlacement(cue,1500,2200).fits,false);
});

test("metered run requires confirmed admission and matching credit policy, and unresolved outcomes are not retried", async (t) => {
  const f = await fixture(t, { free: false });
  const b = await f.prepare("all");
  assert.equal(b.totalCredits, 9);
  assert.equal(f.requests.length, 0);
  await assert.rejects(
    f.service.batches.advance(
      f.actor,
      f.project.id,
      b.id,
      { confirmed: false },
      f.noop,
    ),
    { code: "dub_batch_invalid" },
  );
  withWebNextCreditPolicy(f.actor, false);
  await assert.rejects(f.step(b.id), { code: "dub_batch_price_changed" });
  withWebNextCreditPolicy(f.actor, true);
  await f.step(b.id);
  const id = f.requests[0].quoteId;
  f.jobs.set(id, {
    status: "reconciliation_required",
    errorCode: "speech_interrupted",
  });
  assert.equal((await f.step(b.id)).items[0].status, "review");
  assert.equal((await f.prepare("all")).id, b.id);
  await f.step(b.id);
  assert.equal(f.requests.length, 1);
  assert.equal(
    (await f.repo.get(f.actor, f.project.id)).cues[0].takes.th.id,
    "original",
  );
  assert.equal(
    webNextCreditRoute(
      "POST",
      "/api/dub-sub/projects/" +
        f.project.id +
        "/dubbing-batches/" +
        b.id +
        "/advance",
    ),
    "submit",
  );
  assert.equal(
    webNextCreditRoute(
      "POST",
      "/api/dub-sub/projects/" +
        f.project.id +
        "/dubbing-batches/" +
        b.id +
        "/other",
    ),
    null,
  );
  await assert.rejects(
    f.service.batches.get({ userId: "other" }, f.project.id, "th"),
    { code: "dub_project_missing" },
  );
});

test("locked tracks retain existing takes, and projects with outstanding speech cannot be deleted", async (t) => {
  const f = await fixture(t);
  const lock = async (value) => {
    const p = await f.repo.get(f.actor, f.project.id);
    await f.repo.mutate(f.actor, p.id, p.revision, (row) => {
      row.tracks = { th: { locked: value } };
    });
  };
  await lock(true);
  await assert.rejects(f.prepare("all"), { code: "dub_track_locked" });
  await lock(false);
  const b = await f.prepare("all");
  await f.step(b.id);
  await assert.rejects(
    f.service.remove(
      f.actor,
      f.project.id,
      { confirmed: true, revision: 3 },
      f.noop,
    ),
    { code: "dub_operation_busy" },
  );
  await lock(true);
  f.jobs.set(f.requests[0].quoteId, {
    status: "succeeded",
    take: { id: "new", audioUrl: "/new", durationMs: 1500 },
  });
  const status = await f.step(b.id);
  assert.equal(status.items[0].errorCode, "dub_track_locked");
  assert.equal(
    (await f.repo.get(f.actor, f.project.id)).cues[0].takes.th.id,
    "original",
  );
  await assert.rejects(f.step(b.id), { code: "dub_track_locked" });
  assert.equal(f.requests.length, 1);
});
