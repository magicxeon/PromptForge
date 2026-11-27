import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";
import express from "express";
import { registerDubSubRoutes } from "../server/app/routes/dubSubRoutes.js";
import { DubProjectService } from "../server/domain/dub-sub/DubProjectService.js";
import { DubLanguageService } from "../server/domain/dub-sub/DubLanguageService.js";
import { SceneTranscriptionService, sceneTranscriptionPolicy } from "../server/domain/generation/SceneTranscriptionService.js";
import { GeminiSceneTranscriptionProvider } from "../server/providers/GeminiSceneTranscriptionProvider.js";
import { DubProjectRepository } from "../server/repositories/dub-sub/DubProjectRepository.js";

const actor = { userId: "test-operator", role: "admin", authMode: "development_bypass" };
const runtime = { enabled: true, actorId: actor.userId, role: "admin", liveGeneration: true };
const delivery = { emotion:"calm", intensity:"subtle", pace:"slow", direction:"ลดเสียงช่วงท้าย" };
const cue = { startMs: 0, endMs: 900, original: "Hello", translation: "สวัสดี", speaker: "A", delivery };
const context = { storyContext: "Friends meeting", languageStyle: "casual", sourceLanguage: "auto" };
const request = { method: "gemini-scene", preview: true, confirmed: true, requestId: "request_123", language: "th" };

function providerWith(fetchImpl) {
  return new GeminiSceneTranscriptionProvider({ fetchImpl, registry: () => ({
    environment: { TEST_KEY: "fixture" }, getProvider: () => ({ enabled: true, apiKeyEnv: "TEST_KEY" }),
    availabilityPolicy: { evaluate: () => ({ enabled: true }) },
  }) });
}

test("a failed late Luna group returns editable lines and a fresh request ID cannot repeat dispatched groups", async t => {
  const f = await fixture(t, () => assert.fail("unexpected Gemini request"));
  const project = await f.repo.mutate(actor,f.project.id,f.project.revision,p=>{
    p.cues = Array.from({length:17},(_,i)=>({id:String(i), text:"你好",startMs:i*50,endMs:(i+1)*50,
      translations:{th:"ท่านกำลังจะไปไหนหรือเจ้าคะ"}}));
  });
  const scene = f.service.languageService.sceneGeneration;
  scene.timedDirector = ()=>({});
  let calls = 0;
  scene.shorten = (_,input)=>{
    if (++calls===2) throw Object.assign(new Error(),{code:"dub_scene_outcome_unknown"});
    return {lines:input.cues.map(c=>({id:c.id,text:"ไปไหน"}))};
  };
  const check = requestId=>f.service.timingReview(actor,project.id,{...f.body,revision:project.revision,
    requestId,cueIds:project.cues.map(c=>c.id)},async()=>actor);
  for (const id of ["first_request","second_request"]) {
    const lines = await check(id);
    assert.equal(lines.length,17);
    assert.ok(lines.every(l=>l.manual));
  }
  assert.equal(calls,2);
});

test("a rejected Luna request keeps its reason and Gemini runs only on explicit selection", async t => {
  const f = await fixture(t, () => assert.fail("unexpected network request"));
  const project = await f.repo.mutate(actor,f.project.id,f.project.revision,p=>{
    p.cues = [{id:"one",text:"Hello",startMs:0,endMs:450,translations:{th:"สวัสดีเจ้าค่ะ"}}];
  });
  const scene = f.service.languageService.sceneGeneration;
  let lunaCalls=0, geminiCalls=0;
  scene.timedDirector=()=>({voiceDirection:async()=>{
    lunaCalls++;
    if (lunaCalls===1) throw Object.assign(new Error(),{isProviderError:true,status:403});
    return {lines:[{id:"one",text:"หวัดดี"}]};
  }});
  scene.provider.request=async (_policy,_schema,_directions,parts)=>{
    assert.equal(JSON.parse(parts[0].text).cues[0].id,"one");
    geminiCalls++;
    return {lines:[{id:"one",text:"สวัสดี"}]};
  };
  const check=(requestId,director)=>f.service.timingReview(actor,project.id,{...f.body,
    revision:project.revision,requestId,director,cueIds:["one"],forceSingle:true},async()=>actor);
  assert.equal((await check("request_first","luna"))[0].reason,"dub_luna_access");
  assert.deepEqual([lunaCalls,geminiCalls],[1,0]);
  assert.equal((await check("request_second","gemini"))[0].suggested,"สวัสดี");
  await check("request_third","gemini");
  assert.deepEqual([lunaCalls,geminiCalls],[1,1]);
  assert.equal((await check("request_retry","luna"))[0].suggested,"หวัดดี");
  assert.deepEqual([lunaCalls,geminiCalls],[2,1]);
});

test("timed dialogue proposes only long lines, replays Luna proposals without another call and preserves reviewed subtitles", async t => {
  const f = await fixture(t, () => assert.fail("unexpected Gemini request"));
  const project = await f.repo.mutate(actor,f.project.id,f.project.revision,p=>{
    p.cues = [
      {id:"short",text:"Yes",startMs:0,endMs:700,translations:{th:"ค่ะ"}},
      {id:"long",text:"Where are you going tonight?",startMs:700,endMs:1000,translations:{th:"คืนนี้คุณชายกำลังจะเดินทางไปที่ไหนหรือเจ้าคะ"}}
    ];
  });
  const scene = f.service.languageService.sceneGeneration;
  const speechWindows=[{startMs:40,endMs:260}];
  f.service.analyzeSourceRhythms=async()=>new Map([["long",speechWindows]]);
  scene.timedDirector = () => ({});
  let calls = 0;
  scene.shorten = (current,input) => {
    calls++;
    assert.equal(current.userId,actor.userId);
    assert.deepEqual(input.cues.map(c=>c.id),["long"]);
    assert.equal(input.cues[0].windowMs,300);
    assert.equal(input.cues[0].speakingMs,220);
    assert.equal(input.cues[0].budget,2);
    assert.deepEqual(input.cues[0].speechWindows,speechWindows);
    assert.equal(input.cues[0].before,"Yes");
    assert.equal(input.storyContext,context.storyContext);
    return {lines:[{id:"long",text:"ไปไหนเจ้าคะ"}]};
  };
  const check = (overrides={},current=actor) => f.service.timingReview(current,project.id,
    {...f.body,revision:project.revision,cueIds:["short","long"],...overrides},async()=>current);
  assert.deepEqual(await check({cueIds:["short"]}),[]);
  assert.equal(calls,0);
  const proposals = await check();
  assert.deepEqual(proposals[0].speechWindows,speechWindows);
  assert.equal(proposals[0].suggested,"ไปไหนเจ้าคะ");
  assert.deepEqual(await check({requestId:"retry_56789"}),proposals);
  assert.equal(calls,1);
  assert.deepEqual((await f.repo.get(actor,project.id)).cues,project.cues);
  await assert.rejects(check({revision:project.revision-1}),{code:"dub_revision_conflict"});
  await assert.rejects(check({}, {...actor,userId:"another"}),{code:"dub_project_missing"});
  assert.equal((await check({}, {...actor,role:"customer"}))[0].manual,true);
  assert.equal(calls,1);
});

async function fixture(t, fetchImpl) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dub-scene-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const repo = new DubProjectRepository(root);
  const generation = new SceneTranscriptionService({ runtime: () => runtime, provider: providerWith(fetchImpl) });
  const makeService = () => new DubProjectService({ repo, languageService: new DubLanguageService({ sceneGeneration: generation }),
    voiceStudio: { withDubTakePins: (_actor, _id, _takes, work) => work() } });
  const service = makeService();
  const draft = await service.create(actor, { name: "fixture", targetLanguages: ["th", "zh"], ...context });
  const project = await repo.mutate(actor, draft.id, draft.revision, p => {
    p.media = { folder: "source", hasAudio: true };
    p.durationMs = 1000;
  });
  const directory = repo.directory(actor, project.id);
  const source = path.join(directory, "source");
  await fs.mkdir(source, { recursive: true });
  await promisify(execFile)("ffmpeg", ["-nostdin", "-v", "error", "-f", "lavfi", "-i", "color=s=32x32:d=1",
    "-f", "lavfi", "-i", "sine=frequency=400:duration=1", "-metadata", "title=private-video-title",
    "-c:v", "libx264", "-c:a", "aac", "-f", "mp4", path.join(source, "media")]);
  const body = { ...request, revision: project.revision };
  const run = (changes = {}, verify = async () => actor, instance = service) =>
    instance.review(actor, project.id, "transcribe", { ...body, ...changes }, verify);
  return { service, makeService, project, repo, directory, body, run };
}

test("gap transcription sends only selected audio, restores project time and scopes retries to that gap", async t => {
  const durations = [];
  const f = await fixture(t, async (_url, options) => {
    const input = JSON.parse(options.body).input;
    const duration = JSON.parse(input[0].text).durationMs;
    durations.push(duration);
    assert.equal(Buffer.from(input[1].data, "base64").length, 44 + 32 * duration);
    return Response.json({ status: "completed", steps: [{ type: "model_output", content: [{
      type: "text", text: JSON.stringify({language:"en", cues:[{...cue,startMs:10,endMs:duration-10}]}),
    }] }] });
  });
  const project = await f.repo.mutate(actor, f.project.id, f.project.revision, p => {
    p.cues = [{id:"saved", startMs:200, endMs:400, text:"previous subtitle", translations:{th:"saved"}}];
  });
  const run = (requestId, range) => f.run({revision:project.revision, requestId, range,
    method:range === undefined ? "gemini-scene" : "gemini-scene-gap"});
  await assert.rejects(f.run({revision:project.revision, method:"gemini-scene-gap"}), {code:"dub_invalid_input"});
  await assert.rejects(f.run({revision:project.revision, range:{startMs:0,endMs:200}}), {code:"dub_invalid_input"});
  for (const range of [null, {startMs:-1,endMs:20}, {startMs:100,endMs:300}, {startMs:0,endMs:1001}])
    await assert.rejects(run("invalid_range", range), {code:"dub_invalid_timing"});
  const range = {startMs:400,endMs:900};
  const result = await run("requested_gap", range);
  assert.deepEqual(result.range, range);
  assert.deepEqual(result.cues.map(row => [row.startMs,row.endMs]), [[410,890]]);
  assert.deepEqual(await run("replayed_gap", range), result);
  assert.equal((await f.service.sceneProgress(actor,project.id,"replayed_gap")).done, 1);
  await assert.rejects(run("requested_gap", undefined), {code:"dub_scene_request_conflict"});
  await assert.rejects(run("requested_gap", {startMs:0,endMs:200}), {code:"dub_scene_request_conflict"});
  const earlier = await run("another_gap", {startMs:0,endMs:200});
  assert.deepEqual(earlier.cues.map(row => [row.startMs,row.endMs]), [[10,190]]);
  assert.deepEqual(durations,[500,200]);
  assert.deepEqual((await f.repo.get(actor,project.id)).cues,project.cues);
});

test("part progress is private and retry after a known failure reuses completed audio", async t => {
  const f = await fixture(t, () => assert.fail("unexpected network"));
  const sent = [];
  const language = f.service.languageService;
  language.transcribeScene = async (_, __, ___, dispatch, hooks) => {
    await hooks.onPlan(2);
    for (const index of [0, 1]) {
      if (hooks.cachedParts[index]) continue;
      await dispatch();
      sent.push(index);
      if (sent.length === 2) throw Object.assign(new Error(), { code: "dub_scene_invalid_response", statusCode: 502 });
      await hooks.onPart(index, { cues: [cue] });
    }
    return { cues: [cue] };
  };
  await assert.rejects(f.run(), { code: "dub_scene_invalid_response", retryable: true });
  assert.deepEqual(await f.service.sceneProgress(actor, f.project.id, f.body.requestId),
    { total: 2, done: 1, status: "failed" });
  await assert.rejects(f.service.sceneProgress({ ...actor, userId: "different" }, f.project.id, f.body.requestId),
    { code: "dub_scene_access_denied" });
  const requestId = "retry_parts_2";
  await f.run({ requestId });
  await f.run({ requestId });
  assert.deepEqual(sent, [0, 1, 1]);
  assert.deepEqual(await f.service.sceneProgress(actor, f.project.id, requestId),
    { total: 2, done: 2, status: "succeeded" });
});

test("confirmed scene preview sends only extracted audio and project context once, replays after restart, then explicitly applies", async t => {
  let calls = 0;
  const f = await fixture(t, async (url, options) => {
    calls++;
    assert.equal(url, "https://generativelanguage.googleapis.com/v1beta/interactions");
    assert.equal(options.redirect, "error");
    const payload = JSON.parse(options.body);
    assert.equal(payload.model, "gemini-3.5-flash-lite");
    assert.equal(payload.store, false);
    assert.equal(payload.response_format.mime_type, "application/json");
    assert.deepEqual(JSON.parse(payload.input[0].text), { ...context, targetLanguage: "th", durationMs: 1000 });
    const audio = Buffer.from(payload.input[1].data, "base64");
    assert.equal(payload.input[1].mime_type, "audio/wav");
    assert.equal(audio.toString("ascii", 0, 4), "RIFF");
    assert.equal(audio.toString("ascii", 8, 12), "WAVE");
    assert.ok(audio.length > 30000 && audio.length < 34000);
    assert.equal(audio.includes("private-video-title"), false);
    return Response.json({ status: "completed", steps: [{ type: "model_output", content: [{
      type: "text", text: JSON.stringify({ language: "en", cues: [cue] }),
    }] }] });
  });
  const [preview, duplicate] = await Promise.all([f.run(), f.run()]);
  assert.deepEqual(duplicate, preview);
  assert.equal(preview.language, "en");
  const [row] = preview.cues;
  assert.deepEqual(row.suggestedDelivery, { th:delivery });
  assert.equal(row.sourceOrigin, "gemini");
  assert.deepEqual(row.translationOrigins, { th: "gemini" });
  assert.deepEqual([row.startMs, row.endMs, row.text, row.speaker, row.translations, row.takes],
    [0, 900, cue.original, "A", { th: cue.translation }, {}]);
  assert.deepEqual(await f.run({ requestId: "second_request" }, undefined, f.makeService()), preview);
  await assert.rejects(f.run({ requestId: "second_request", language: "zh" }), { code: "dub_scene_request_conflict" });
  await assert.rejects(f.run({ language: "zh" }), { code: "dub_scene_request_conflict" });
  assert.equal(calls, 1);
  const saved = await f.service.get(actor, f.project.id);
  assert.equal(saved.revision, f.body.revision);
  assert.deepEqual(saved.cues, []);
  assert.deepEqual((await fs.readdir(f.directory)).sort(), ["scene-previews.json", "source"]);
  assert.equal((await fs.readFile(f.repo.file(actor), "utf8")).includes(cue.original), false);
  for (const patch of [{ detectedLanguage: "en" }, { detectedLanguage: "auto", cues: preview.cues }])
    await assert.rejects(f.service.update(actor, saved.id, { ...patch, revision: saved.revision }), { code: "dub_invalid_input" });
  const applied = await f.service.update(actor, saved.id, { revision: saved.revision, cues: preview.cues, detectedLanguage: preview.language });
  assert.deepEqual(applied.cues, preview.cues);
  assert.equal(applied.detectedLanguage, "en");
  const locked = await f.service.update(actor, saved.id, { revision: applied.revision,
    tracks: { ...applied.tracks, source: { ...applied.tracks.source, locked: true } } });
  await assert.rejects(f.service.update(actor, saved.id, { revision: locked.revision,
    cues: preview.cues, detectedLanguage: null }), { code: "dub_track_locked" });
  const cleared = await f.service.update(actor, saved.id, { revision: locked.revision,
    tracks: applied.tracks, cues: [], detectedLanguage: null });
  assert.equal(cleared.detectedLanguage, undefined);
  await assert.rejects(f.run(), { code: "dub_revision_conflict" });
});

test("scene HTTP admission rejects missing consent, malformed intents, foreign access, locks, excess duration and expired sessions before dispatch", async t => {
  let calls = 0;
  const f = await fixture(t, async () => { calls++; throw new Error(); });
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.actorContext = { ...actor, userId: req.headers["x-actor"] || actor.userId,
      authMode: req.headers["x-mode"] || actor.authMode };
    req.reauthorizeIdentity = async () => req.headers["x-expired"] ? null : req.actorContext;
    next();
  });
  registerDubSubRoutes(app, { projects: f.service });
  const server = await new Promise(resolve => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const send = (changes, headers) => fetch("http://127.0.0.1:" + server.address().port + "/api/dub-sub/projects/" + f.project.id + "/transcribe",
    { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify({ ...f.body, ...changes }) });
  for (const [changes, headers, status, code] of [
    [{ confirmed: false }, {}, 400, "dub_scene_confirmation_required"],
    [{ requestId: "" }, {}, 400, "dub_invalid_input"], [{ language: "fr" }, {}, 400, "dub_invalid_input"],
    [{ preview: false }, {}, 400, "dub_invalid_input"], [{ method: "unknown" }, {}, 400, "dub_invalid_input"],
    [{ revision: 1 }, {}, 409, "dub_revision_conflict"], [{}, { "x-actor": "other" }, 404, "dub_project_missing"],
    [{}, { "x-mode": "session" }, 403, "dub_scene_access_denied"], [{}, { "x-expired": "1" }, 401, "auth_session_expired"],
  ]) {
    const response = await send(changes, headers);
    assert.equal(response.status, status);
    assert.equal((await response.json()).code, code);
  }
  let checks = 0;
  const provider = f.service.languageService.sceneGeneration.provider;
  const registry = provider.registry;
  provider.registry = () => ({ ...registry(), environment: {} });
  await assert.rejects(f.run(), { code: "dub_scene_provider_unavailable" });
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(f.directory, "scene-previews.json"))), []);
  provider.registry = registry;
  await assert.rejects(f.run({}, async () => ++checks === 1 ? actor : null), { code: "auth_session_expired" });
  const locked = await f.repo.mutate(actor, f.project.id, f.body.revision, p => { p.tracks.zh.locked = true; });
  await assert.rejects(f.run({ revision: locked.revision }), { code: "dub_track_locked" });
  const long = await f.repo.mutate(actor, f.project.id, locked.revision, p => { p.tracks.zh.locked = false; p.durationMs = 300001; });
  await assert.rejects(f.run({ revision: long.revision }), { code: "dub_scene_audio_limit" });
  const silent = await f.repo.mutate(actor, f.project.id, long.revision, p => { p.media.hasAudio = false; });
  await assert.rejects(f.run({ revision: silent.revision }), { code: "dub_audio_missing" });
  assert.equal(calls, 0);
});

test("scene preview assembles split final text and sorts complete cues by their original timestamps", async t => {
  const json = JSON.stringify({ language: "en", cues: [
    { ...cue, startMs: 500, endMs: 900 }, { ...cue, startMs: 0, endMs: 400 },
  ] });
  const f = await fixture(t, async () => Response.json({ status: "completed", output_text: "", steps: [
    { type: "model_output", content: [{ type: "text", text: json.slice(0, 32) }] },
    { type: "model_output", content: [{ type: "text", text: json.slice(32) }] },
  ] }));
  assert.deepEqual((await f.run()).cues.map(row => row.startMs), [0, 500]);
});

test("invalid output is never applied and a transport failure cannot re-dispatch the same scene", async t => {
  let calls = 0;
  const f = await fixture(t, async () => {
    calls++;
    if (calls === 1) return Response.json({ status: "completed", output_text: JSON.stringify({
      language: "en", cues: [{ ...cue, endMs: 1001 }],
    }) });
    throw new Error("private transport details");
  });
  await assert.rejects(f.run(), { code: "dub_scene_invalid_response" });
  await assert.rejects(f.run(), { code: "dub_scene_invalid_response" });
  await assert.rejects(f.run({ requestId: "retry_request" }), { code: "dub_scene_outcome_unknown" });
  await assert.rejects(f.run({ requestId: "after_restart" }, undefined, f.makeService()), { code: "dub_scene_outcome_unknown" });
  assert.equal(calls, 2);
  assert.deepEqual((await f.service.get(actor, f.project.id)).cues, []);
  assert.equal((await fs.readFile(path.join(f.directory, "scene-previews.json"), "utf8")).includes("private transport details"), false);
  assert.deepEqual((await fs.readdir(f.directory)).sort(), ["scene-previews.json", "source"]);
});

test("retranscription retains the director's override on the matching spoken line", async t => {
  const f = await fixture(t, async () => Response.json({status:"completed", output_text:JSON.stringify({language:"en", cues:[cue]})}));
  const edited = await f.repo.mutate(actor, f.project.id, f.body.revision, project => {
    project.cues = [{id:"old-cue", startMs:20, endMs:870, text:cue.original,
      deliveryOverrides:{th:{emotion:"sad", direction:""}}}];
  });
  const result = await f.run({revision:edited.revision});
  assert.notEqual(result.cues[0].id, "old-cue");
  assert.deepEqual(result.cues[0].suggestedDelivery.th, delivery);
  assert.deepEqual(result.cues[0].deliveryOverrides.th, {emotion:"sad", direction:""});
});

test("a new server process can resume an interrupted pre-dispatch preparation", async t => {
  let calls = 0;
  const f = await fixture(t, async () => {
    calls++;
    return Response.json({ status: "completed", output_text: JSON.stringify({ language: "en", cues: [cue] }) });
  });
  await f.repo.sceneReceipts(actor, f.project.id, records => records.push({ requestId: request.requestId,
    revision: f.body.revision, language: "th", status: "preparing", processId: "previous-server" }));
  const preview = await f.run({ requestId: "reopened_dialog" });
  assert.deepEqual(await f.run(), preview);
  await assert.rejects(f.run({ requestId: "reopened_dialog", language: "zh" }, undefined, f.makeService()),
    { code: "dub_scene_request_conflict" });
  for (let index = 1; index < sceneTranscriptionPolicy.maxReplayIdsPerRequest; index++)
    assert.deepEqual(await f.run({ requestId: "duplicate_" + index }), preview);
  await assert.rejects(f.run({ requestId: "overflow_alias" }), { code: "dub_scene_request_limit" });
  assert.deepEqual(await f.run({ requestId: "reopened_dialog" }), preview);
  assert.equal(calls, 1);
});

test("failed attempts allow a fresh transcription up to the configured revision limit", async t => {
  let calls = 0;
  const f = await fixture(t, async () => {
    calls++;
    return Response.json({ status: "completed", output_text: JSON.stringify({ language: "en", cues: [cue] }) });
  });
  const limit = sceneTranscriptionPolicy.maxRequestsPerRevision;
  await f.repo.sceneReceipts(actor, f.project.id, records => {
    for (let index = 1; index < limit; index++)
      records.push({ requestId: "failed_" + index, revision: f.body.revision, language: "th", status: "failed" });
  });
  assert.equal((await f.run()).cues.length, 1);
  await assert.rejects(f.run({ requestId: "next_language", language: "zh" }), { code: "dub_scene_request_limit" });
  assert.equal(calls, 1);
});

test("receipt retention admits new revisions at capacity and preserves current unknown dispatches", async t => {
  let calls = 0;
  const f = await fixture(t, async () => {
    calls++;
    return Response.json({ status: "completed", output_text: JSON.stringify({ language: "en", cues: [cue] }) });
  });
  const limit = sceneTranscriptionPolicy.maxRetainedRequestsPerProject;
  await f.repo.sceneReceipts(actor, f.project.id, records => {
    records.push({ requestId: "current_unknown", revision: f.body.revision, language: "zh", status: "dispatching" });
    for (let index = 1; index < limit; index++)
      records.push({ requestId: "old_request_" + index, revision: f.body.revision - 1, language: "th", status: "failed" });
  });
  const preview = await f.run();
  assert.deepEqual(await f.run({ requestId: "cached_preview" }), preview);
  await assert.rejects(f.run({ requestId: "current_unknown", language: "zh" }), { code: "dub_scene_outcome_unknown" });
  await assert.rejects(f.run({ requestId: "old_request_1", revision: f.body.revision - 1 }), { code: "dub_revision_conflict" });
  const records = JSON.parse(await fs.readFile(path.join(f.directory, "scene-previews.json")));
  assert.equal(records.length, limit);
  assert.equal(records.some(record => record.requestId === "old_request_1"), false);
  assert.equal(calls, 1);
});

test("Gemini translates saved cue text only, keeps all other cue data and provenance, and replays a committed request", async t => {
  let calls = 0;
  const f = await fixture(t, async (url, options) => {
    calls++;
    const payload = JSON.parse(options.body);
    assert.equal(payload.model, "gemini-3.5-flash-lite");
    assert.deepEqual(payload.input.map(item => item.type), ["text"]);
    assert.deepEqual(JSON.parse(payload.input[0].text), { ...context, sourceLanguage: "en", targetLanguage: "th",
      cues: [{ id: "second", text: "edited source" }] });
    return Response.json({ status: "completed", output_text: JSON.stringify({
      cues: [{ id: "second", translation: "คำแปล", delivery }],
    }) });
  });
  const second = { id: "second", text: "edited source", speaker: "B", startMs: 250, endMs: 780, dubText: "private dub",
    translations: { zh: "手动翻译" }, deliveryOverrides: { th:{emotion:"angry"} },
    takes: { th: { id: "existing-private-take" } }, selectedTakeId: "existing-private-take" };
  const p = await f.repo.mutate(actor, f.project.id, f.body.revision, project => {
    project.cues = [{ id: "first", text: "manual source", startMs: 10, endMs: 230, translations: { th: "manual target" } }, second];
    project.detectedLanguage = "en";
    project.tracks.source.locked = true;
    project.tracks.zh.locked = true;
    project.media.hasAudio = false;
  });
  const body = { revision: p.revision, language: "th", requestId: "text_intent", confirmed: true, overwrite: false };
  const send = (changes = {}, verify = async () => actor, service = f.service) =>
    service.perform(actor, p.id, "translate", { ...body, ...changes }, verify);
  await assert.rejects(send({ confirmed: false }), { code: "dub_scene_confirmation_required" });
  await assert.rejects(send({ language: "zh" }), { code: "dub_track_locked" });
  await assert.rejects(send({ cueIds: ["absent"] }), { code: "dub_cue_missing" });
  await assert.rejects(send({}, async () => null), { code: "auth_session_expired" });
  assert.equal(calls, 0);
  const [saved, concurrent] = await Promise.all([send(), send()]);
  assert.equal(concurrent.revision, saved.revision);
  assert.equal(saved.revision, p.revision + 1);
  assert.deepEqual(saved.cues[0], p.cues[0]);
  assert.deepEqual(saved.cues[1], { ...second, translations: { ...second.translations, th: "คำแปล" },
    translationOrigins: { th: "gemini" }, suggestedDelivery: { th:delivery } });
  assert.deepEqual((await send({}, undefined, f.makeService())).cues, saved.cues);
  await assert.rejects(send({ overwrite: true }), { code: "dub_scene_request_conflict" });
  assert.equal(calls, 1);
});

test("Gemini selected/all translations reject mismatched IDs atomically and never repeat an uncertain dispatch", async t => {
  let calls = 0;
  const f = await fixture(t, async () => {
    calls++;
    if (calls === 1) return Response.json({ status: "completed", output_text: JSON.stringify({
      cues: [{ id: "unknown", translation: "invalid" }],
    }) });
    throw new Error("private provider detail");
  });
  const p = await f.repo.mutate(actor, f.project.id, f.body.revision, project => {
    project.cues = [{ id: "a", text: "first", translations: { th: "manual" } }, { id: "b", text: "second", translations: {} }];
  });
  const body = { revision: p.revision, language: "th", requestId: "text_invalid", confirmed: true, overwrite: true };
  const send = changes => f.service.perform(actor, p.id, "translate", { ...body, ...changes }, async () => actor);
  await assert.rejects(send({ cueIds: ["a"] }), { code: "dub_scene_invalid_response" });
  await assert.rejects(send({ cueIds: ["a"] }), { code: "dub_scene_invalid_response" });
  await assert.rejects(send({ cueIds: ["b"] }), { code: "dub_scene_request_conflict" });
  await assert.rejects(send({ requestId: "text_whole" }), { code: "dub_scene_outcome_unknown" });
  await assert.rejects(send({ requestId: "text_retry" }), { code: "dub_scene_outcome_unknown" });
  assert.deepEqual((await f.service.get(actor, p.id)).cues, p.cues);
  assert.equal(calls, 2);
});

test("selected and full overwrites match returned IDs, including out-of-order Gemini output", async t => {
  const requests = [];
  const f = await fixture(t, async (_url, options) => {
    const { cues } = JSON.parse(JSON.parse(options.body).input[0].text);
    requests.push(cues.map(cue => cue.id));
    return Response.json({ status: "completed", output_text: JSON.stringify({
      cues: cues.toReversed().map(cue => ({ id: cue.id, translation: cue.id + requests.length, delivery })),
    }) });
  });
  const initial = await f.repo.mutate(actor, f.project.id, f.body.revision, project => {
    project.cues = ["a", "b"].map((id, index) => ({ id, text: id, startMs: index * 100, endMs: (index + 1) * 100,
      translations: { th: "edited", zh: "other" } }));
  });
  const translate = (revision, requestId, options) => f.service.perform(actor, initial.id, "translate", {
    revision, requestId, language: "th", confirmed: true, overwrite: true, ...options,
  }, async () => actor);
  const selected = await translate(initial.revision, "only_selected", { cueIds: ["b"] });
  assert.deepEqual(selected.cues[0], initial.cues[0]);
  assert.deepEqual(selected.cues[1].translations, { th: "b1", zh: "other" });
  const all = await translate(selected.revision, "full_track");
  assert.deepEqual(all.cues.map(cue => cue.translations), [{ th: "a2", zh: "other" }, { th: "b2", zh: "other" }]);
  assert.deepEqual(requests, [["b"], ["a", "b"]]);
});

test("reloading during translation exposes running work and waits for the saved outcome", async t => {
  let started, finish;
  const dispatched = new Promise(resolve => { started = resolve; });
  const hold = new Promise(resolve => { finish = resolve; });
  let calls = 0;
  const f = await fixture(t, async () => {
    calls++;
    started();
    await hold;
    return Response.json({ status: "completed", output_text: JSON.stringify({ cues: [{ id: "c", translation: "out", delivery }] }) });
  });
  const draft = await f.service.create(actor, { name: "Text-only project", sourceLanguage: "en", targetLanguages: ["th"] });
  const p = await f.repo.mutate(actor, draft.id, draft.revision, project => {
    project.cues = [{ id: "c", text: "hello", startMs: 0, endMs: 750, translations: {} }];
  });
  await assert.rejects(fs.stat(f.repo.directory(actor, p.id)), { code: "ENOENT" });
  const body = { revision: p.revision, language: "th", requestId: "reload_test", confirmed: true };
  const send = () => f.service.perform(actor, p.id, "translate", body, async () => actor);
  const first = send();
  await dispatched;
  try {
    assert.equal((await f.service.get(actor, p.id)).operations.at(-1).status, "running");
    assert.equal((await f.service.list(actor, {})).items.find(item => item.id === p.id).operations.at(-1).status, "running");
    assert.equal((await f.service.list({ userId: "other" }, {})).items.length, 0);
    const joined = send();
    finish();
    const [saved, replay] = await Promise.all([first, joined]);
    assert.equal(saved.operations.at(-1).status, "succeeded");
    assert.equal(replay.cues[0].translations.th, "out");
    assert.equal((await f.service.get(actor, p.id)).status, "draft");
    assert.equal(calls, 1);
  } finally { finish(); }
});
